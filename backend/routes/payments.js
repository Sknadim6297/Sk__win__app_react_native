const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const TeamMember = require('../models/TeamMember');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const { authMiddleware } = require('../middleware/auth');
const { getZapUpiConfig, assertZapUpiReady } = require('../config/zapupi');
const {
  isPaymentEnabled,
  requirePaymentsEnabled,
  PAYMENT_DISABLED_MESSAGE,
} = require('../config/payments');
const zapupi = require('../services/zapupiService');
const { creditWalletForPaymentOrder } = require('../services/walletCreditService');
const { fulfillTournamentEntryPayment } = require('../services/tournamentEntryFulfillment');
const lifecycle = require('../services/tournamentLifecycle');

const router = express.Router();

function publicBaseUrl(req) {
  const fromEnv = (
    process.env.PUBLIC_BASE_URL ||
    process.env.BACKEND_URL ||
    ''
  ).replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}

function webhookUrl(req) {
  return `${publicBaseUrl(req)}/api/payments/zapupi/webhook`;
}

async function writeLog(entry) {
  try {
    await PaymentLog.create(entry);
  } catch (e) {
    console.error('[payments] log failed:', e.message);
  }
}

function uniqueOrderId() {
  return `SKW${Date.now()}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

function userFacingError(code, fallback) {
  const map = {
    PAYMENT_DISABLED: PAYMENT_DISABLED_MESSAGE,
    ZAPUPI_DISABLED: 'UPI payments are temporarily unavailable. Please try again later.',
    ZAPUPI_NOT_CONFIGURED: 'Payment gateway is not configured yet. Please contact support.',
    ZAPUPI_API_ERROR: 'Unable to reach the payment gateway. Please try again.',
    INVALID_AMOUNT: 'Please enter a valid amount.',
    ORDER_NOT_FOUND: 'Payment order not found.',
    ORDER_EXPIRED: 'This payment session expired. Please try again.',
    PAYMENT_FAILED: 'Payment failed. Please try again.',
    PAYMENT_CANCELLED: 'Payment was cancelled.',
    PAYMENT_PENDING: 'Payment is still pending. Complete UPI and wait a moment.',
    INVALID_ORDER: 'Invalid payment order.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Payment timed out. If money was deducted, wait or contact support with your Order ID.',
    DUPLICATE_CALLBACK: 'This payment was already processed.',
    ALREADY_JOINED: 'You have already joined this tournament.',
    TOURNAMENT_CLOSED: 'Registration is not open for this tournament.',
    TOURNAMENT_FULL: 'Tournament is full.',
  };
  return map[code] || fallback || 'Something went wrong with the payment.';
}

function customerMobile(user) {
  const raw = user?.phone || user?.mobile || user?.phoneNumber || user?.whatsapp || '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

async function settleSuccessfulPayment(paymentOrder, { source, txnId, utr } = {}) {
  const purpose = paymentOrder.purpose || paymentOrder.metadata?.purpose || 'wallet_topup';

  if (txnId) paymentOrder.zapupiTxnId = paymentOrder.zapupiTxnId || String(txnId);
  if (utr) paymentOrder.zapupiUtr = paymentOrder.zapupiUtr || String(utr);

  if (purpose === 'tournament_entry') {
    if (!['SUCCESS', 'PAID'].includes(paymentOrder.status)) {
      paymentOrder.status = 'SUCCESS';
    }
    await paymentOrder.save();
    const fulfill = await fulfillTournamentEntryPayment(paymentOrder, { source });
    const joined =
      paymentOrder.tournamentJoined || fulfill.joined || fulfill.reason === 'ALREADY_JOINED';
    return {
      purpose,
      status: joined ? 'PAID' : 'SUCCESS',
      walletCredited: false,
      tournamentJoined: Boolean(joined),
      fulfill,
    };
  }

  paymentOrder.status = 'SUCCESS';
  await paymentOrder.save();
  const credit = await creditWalletForPaymentOrder(paymentOrder, {
    source,
    txnId: paymentOrder.zapupiTxnId,
    utr: paymentOrder.zapupiUtr,
  });
  return {
    purpose: 'wallet_topup',
    status: 'SUCCESS',
    walletCredited: true,
    tournamentJoined: false,
    credit,
  };
}

function buildStatusPayload(paymentOrder, extra = {}) {
  const purpose = paymentOrder.purpose || paymentOrder.metadata?.purpose || 'wallet_topup';
  let status = paymentOrder.status;
  if (purpose === 'tournament_entry' && paymentOrder.tournamentJoined) status = 'PAID';
  return {
    success: true,
    orderId: paymentOrder.orderId,
    status,
    purpose,
    amount: paymentOrder.amount,
    currency: paymentOrder.currency,
    tournamentId: paymentOrder.tournamentId || null,
    walletCredited: Boolean(paymentOrder.walletCredited),
    tournamentJoined: Boolean(paymentOrder.tournamentJoined),
    utr: paymentOrder.zapupiUtr || null,
    ...extra,
  };
}

async function verifyAndSettle(paymentOrder, { source } = {}) {
  const remote = await zapupi.getOrderStatus(paymentOrder.orderId);
  paymentOrder.lastStatusPayload = remote.raw;
  paymentOrder.lastVerifiedAt = new Date();
  if (remote.txnId) paymentOrder.zapupiTxnId = String(remote.txnId);
  if (remote.utr) paymentOrder.zapupiUtr = String(remote.utr);
  if (remote.environment) paymentOrder.zapupiEnvironment = String(remote.environment);

  const cfg = getZapUpiConfig();
  if (
    !cfg.acceptTestWebhooks &&
    zapupi.isTestEnvironment(remote.environment || paymentOrder.zapupiEnvironment, remote.txnId || paymentOrder.zapupiTxnId)
  ) {
    paymentOrder.failureReason = 'TEST_WEBHOOK_IGNORED_IN_PRODUCTION';
    await paymentOrder.save();
    return { ignored: true, localStatus: 'PENDING', remote };
  }

  const localStatus = zapupi.mapZapStatusToLocal(remote.status);
  const paidAmount = Number(remote.payAmount ?? remote.amount ?? paymentOrder.amount);

  if (localStatus === 'SUCCESS' && Math.abs(paidAmount - Number(paymentOrder.amount)) > 0.05) {
    paymentOrder.status = 'FAILED';
    paymentOrder.failureReason = 'AMOUNT_MISMATCH';
    await paymentOrder.save();
    await writeLog({
      orderId: paymentOrder.orderId,
      paymentOrderId: paymentOrder._id,
      userId: paymentOrder.userId,
      event: 'AMOUNT_MISMATCH',
      source,
      success: false,
      responsePayload: { expected: paymentOrder.amount, paid: paidAmount },
      errorCode: 'AMOUNT_MISMATCH',
    });
    return { localStatus: 'FAILED', mismatch: true, remote };
  }

  if (localStatus === 'SUCCESS') {
    paymentOrder.status = 'SUCCESS';
    await paymentOrder.save();
    const settle = await settleSuccessfulPayment(paymentOrder, {
      source,
      txnId: remote.txnId,
      utr: remote.utr,
    });
    return { localStatus: 'SUCCESS', settle, remote };
  }

  if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(localStatus)) {
    if (!['SUCCESS', 'PAID'].includes(paymentOrder.status)) {
      paymentOrder.status = localStatus;
      paymentOrder.failureReason = remote.status || localStatus;
      await paymentOrder.save();
    }
  } else {
    paymentOrder.status = paymentOrder.status === 'CREATED' ? 'PENDING' : paymentOrder.status;
    await paymentOrder.save();
  }

  return { localStatus, remote };
}

async function createZapUpiOrder({
  req,
  user,
  amountNum,
  purpose = 'wallet_topup',
  tournamentId = null,
  metadata = {},
}) {
  const cfg = assertZapUpiReady();
  const orderId = uniqueOrderId();
  const notifyUrl = webhookUrl(req);
  const expiry = new Date(Date.now() + cfg.orderExpiryMinutes * 60 * 1000);

  await writeLog({
    orderId,
    userId: user._id,
    event: purpose === 'tournament_entry' ? 'CREATE_ORDER_REQUESTED' : 'CREATE_QR_REQUESTED',
    source: 'api',
    requestPayload: { amount: amountNum, purpose, tournamentId },
  });

  const remarkParts = [
    purpose === 'tournament_entry' ? 'Tournament entry' : 'Wallet top-up',
    String(user._id),
    tournamentId ? String(tournamentId) : '',
  ].filter(Boolean);

  const created = await zapupi.createOrder({
    orderId,
    amount: amountNum,
    customerMobile: customerMobile(user),
    remark: remarkParts.join(' | '),
    webhookUrl: notifyUrl,
  });

  const paymentOrder = await PaymentOrder.create({
    orderId: created.orderId || orderId,
    userId: user._id,
    purpose,
    tournamentId: tournamentId || undefined,
    amount: amountNum,
    currency: cfg.currency,
    status: 'PENDING',
    paymentMethod: 'zapupi',
    paymentUrl: created.paymentUrl,
    qrExpiresAt: expiry,
    zapupiEnvironment: cfg.env,
    rawCreateResponse: created.raw,
    metadata: { purpose, ...metadata },
  });

  await writeLog({
    orderId: paymentOrder.orderId,
    paymentOrderId: paymentOrder._id,
    userId: user._id,
    event: 'ORDER_CREATED',
    source: 'api',
    success: true,
    responsePayload: { purpose, hasPaymentUrl: Boolean(created.paymentUrl) },
  });

  return { paymentOrder, expiry };
}

function orderPublicFields(paymentOrder, extra = {}) {
  return {
    success: true,
    orderId: paymentOrder.orderId,
    amount: paymentOrder.amount,
    currency: paymentOrder.currency,
    status: paymentOrder.status,
    purpose: paymentOrder.purpose,
    tournamentId: paymentOrder.tournamentId || null,
    paymentMethod: 'ZapUPI',
    paymentUrl: paymentOrder.paymentUrl,
    expiresAt: paymentOrder.qrExpiresAt,
    expiresInSeconds: paymentOrder.qrExpiresAt
      ? Math.max(0, Math.floor((new Date(paymentOrder.qrExpiresAt).getTime() - Date.now()) / 1000))
      : 0,
    ...extra,
  };
}

/** Public status for app — no secrets */
router.get('/config', authMiddleware, async (req, res) => {
  const cfg = getZapUpiConfig();
  const paymentsOn = isPaymentEnabled();
  res.json({
    success: true,
    enabled: paymentsOn && cfg.ready,
    paymentEnabled: paymentsOn,
    zapupiReady: cfg.ready,
    environment: cfg.env,
    minAmount: cfg.minAmount,
    maxAmount: cfg.maxAmount,
    currency: cfg.currency,
    paymentMethod: 'zapupi',
    supportsTournamentPayJoin: true,
    message: paymentsOn
      ? cfg.ready
        ? 'Payments enabled'
        : 'Payment gateway is not configured yet'
      : 'Testing mode: use wallet top-up (dummy coins). ZapUPI is off.',
  });
});

/**
 * Create ZapUPI order for wallet top-up.
 * POST /api/payments/zapupi/create-qr
 */
async function handleCreateWalletOrder(req, res) {
  try {
    const cfg = assertZapUpiReady();
    const amountNum = parseFloat(req.body?.amount);

    if (!amountNum || Number.isNaN(amountNum) || amountNum < cfg.minAmount || amountNum > cfg.maxAmount) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_AMOUNT',
        message: `Enter an amount between ₹${cfg.minAmount} and ₹${cfg.maxAmount}.`,
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Session expired — please log in again',
      });
    }

    const { paymentOrder } = await createZapUpiOrder({
      req,
      user,
      amountNum,
      purpose: 'wallet_topup',
    });

    res.json(
      orderPublicFields(paymentOrder, {
        purpose: 'wallet_topup',
        walletBalance: (user.wallet?.balance || 0) + (user.wallet?.bonusBalance || 0),
        message: 'Open the payment page and scan the UPI QR',
      })
    );
  } catch (error) {
    console.error('[payments] create wallet order error:', error.message, error.payload || '');
    await writeLog({
      userId: req.userId,
      event: 'CREATE_QR_FAILED',
      source: 'api',
      success: false,
      message: error.message,
      errorCode: error.code || 'ZAPUPI_API_ERROR',
      responsePayload: error.payload,
    });
    res.status(error.status || 500).json({
      success: false,
      code: error.code || 'ZAPUPI_API_ERROR',
      message: userFacingError(error.code, error.message),
    });
  }
}

/**
 * Pay & Join — ZapUPI order for tournament entry fee.
 */
async function handleCreateTournamentOrder(req, res) {
  try {
    const cfg = assertZapUpiReady();
    const tournamentId = req.body?.tournamentId;
    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ORDER',
        message: 'tournamentId is required',
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Session expired — please log in again',
      });
    }
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Admins cannot join as participants',
      });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Account is not active',
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        code: 'INVALID_ORDER',
        message: 'Tournament not found',
      });
    }

    const tStatus = lifecycle.getEffectiveStatus(tournament);
    if (!lifecycle.canJoin(tStatus)) {
      return res.status(400).json({
        success: false,
        code: 'TOURNAMENT_CLOSED',
        message: userFacingError('TOURNAMENT_CLOSED'),
      });
    }

    const alreadyParticipant = await TournamentParticipant.findOne({
      tournamentId: tournament._id,
      userId: user._id,
    });
    const alreadyMember = await TeamMember.findOne({
      tournamentId: tournament._id,
      userId: user._id,
    });
    if (alreadyParticipant || alreadyMember) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_JOINED',
        message: userFacingError('ALREADY_JOINED'),
        tournamentJoined: true,
      });
    }

    const paidPendingJoin = await PaymentOrder.findOne({
      userId: user._id,
      tournamentId: tournament._id,
      purpose: 'tournament_entry',
      status: { $in: ['SUCCESS', 'PAID'] },
      tournamentJoined: false,
    }).sort({ createdAt: -1 });
    if (paidPendingJoin) {
      const settle = await settleSuccessfulPayment(paidPendingJoin, { source: 'api' });
      return res.json({
        success: true,
        orderId: paidPendingJoin.orderId,
        status: 'PAID',
        purpose: 'tournament_entry',
        tournamentId: tournament._id,
        tournamentJoined: settle.tournamentJoined,
        amount: paidPendingJoin.amount,
        message: settle.tournamentJoined
          ? 'Payment already verified. You have joined the tournament.'
          : 'Payment verified earlier — completing join…',
        alreadyPaid: true,
      });
    }

    const existingPending = await PaymentOrder.findOne({
      userId: user._id,
      tournamentId: tournament._id,
      purpose: 'tournament_entry',
      status: { $in: ['PENDING', 'CREATED', 'ACTIVE'] },
      paymentUrl: { $exists: true, $ne: '' },
      qrExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (existingPending?.paymentUrl) {
      return res.json(
        orderPublicFields(existingPending, {
          purpose: 'tournament_entry',
          tournamentName: tournament.name,
          resumed: true,
          message: 'Complete payment with the existing ZapUPI order',
        })
      );
    }

    const isTeam =
      lifecycle.isCustomMatch(tournament) || lifecycle.usesTeamRegistration(tournament);
    const charge = lifecycle.resolveEntryCharge(tournament);
    const amountNum = Number(charge.totalAmount) || 0;
    if (!amountNum || amountNum < cfg.minAmount || amountNum > cfg.maxAmount) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_AMOUNT',
        message:
          amountNum < cfg.minAmount
            ? `Entry fee must be at least ₹${cfg.minAmount}`
            : userFacingError('INVALID_AMOUNT'),
      });
    }

    let metadata = {
      purpose: 'tournament_entry',
      tournamentName: tournament.name,
      joinKind: isTeam ? 'team' : 'solo',
      feePerPlayer: charge.feePerPlayer,
      playersCharged: charge.playersCharged,
      totalAmount: charge.totalAmount,
    };

    if (isTeam) {
      const teamName = String(req.body?.teamName || '').trim();
      const players = Array.isArray(req.body?.players) ? req.body.players : [];
      const requiredPlayers = lifecycle.getPlayersPerTeam(tournament.mode);
      if (!teamName) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ORDER',
          message: 'Team name is required',
        });
      }
      if (players.length !== requiredPlayers) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ORDER',
          message: `Provide exactly ${requiredPlayers} players with Game ID + UID`,
        });
      }
      const normalizedPlayers = players.map((p) => ({
        name: String(p?.name || p?.gamingUsername || '').trim(),
        gamingUID: String(p?.gamingUID || p?.uid || '').trim(),
      }));
      if (normalizedPlayers.some((p) => p.name.length < 3 || p.gamingUID.length < 3)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ORDER',
          message: 'Every player needs Game ID and UID (min 3 characters)',
        });
      }
      metadata = {
        ...metadata,
        teamName,
        teamSide: req.body?.teamSide || req.body?.side || null,
        slotNumber: req.body?.slotNumber || null,
        players: normalizedPlayers,
      };
    } else {
      const gamingUsername = String(
        req.body?.gamingUsername || req.body?.gamingID || ''
      ).trim();
      const gamingUID = String(req.body?.gamingUID || '').trim();
      if (gamingUsername.length < 3 || gamingUID.length < 3) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ORDER',
          message: 'Game ID and UID are required (min 3 characters)',
        });
      }
      metadata = { ...metadata, gamingUsername, gamingUID, slotNumber: req.body?.slotNumber || null };
    }

    const { paymentOrder } = await createZapUpiOrder({
      req,
      user,
      amountNum,
      purpose: 'tournament_entry',
      tournamentId: tournament._id,
      metadata,
    });

    res.json(
      orderPublicFields(paymentOrder, {
        purpose: 'tournament_entry',
        tournamentName: tournament.name,
        message: 'Scan the QR on the ZapUPI page to pay the entry fee',
      })
    );
  } catch (error) {
    console.error('[payments] create tournament order error:', error.message, error.payload || '');
    await writeLog({
      userId: req.userId,
      event: 'CREATE_ORDER_FAILED',
      source: 'api',
      success: false,
      message: error.message,
      errorCode: error.code || 'ZAPUPI_API_ERROR',
      responsePayload: error.payload,
    });
    res.status(error.status || 500).json({
      success: false,
      code: error.code || 'ZAPUPI_API_ERROR',
      message: userFacingError(error.code, error.message),
    });
  }
}

async function handleStatus(req, res) {
  try {
    assertZapUpiReady();
    const { orderId } = req.params;
    const paymentOrder = await PaymentOrder.findOne({ orderId, userId: req.userId });
    if (!paymentOrder) {
      return res.status(404).json({
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: userFacingError('ORDER_NOT_FOUND'),
      });
    }

    const purpose = paymentOrder.purpose || paymentOrder.metadata?.purpose || 'wallet_topup';

    if (purpose === 'tournament_entry' && paymentOrder.tournamentJoined) {
      return res.json(
        buildStatusPayload(paymentOrder, {
          status: 'PAID',
          message: 'Payment successful. You have joined the tournament.',
        })
      );
    }

    if (purpose === 'wallet_topup' && (paymentOrder.walletCredited || paymentOrder.status === 'SUCCESS')) {
      const user = await User.findById(req.userId);
      return res.json(
        buildStatusPayload(paymentOrder, {
          status: 'SUCCESS',
          walletCredited: true,
          balance: user?.wallet?.balance,
          message: 'Payment successful. Wallet updated.',
        })
      );
    }

    if (
      purpose === 'tournament_entry' &&
      ['SUCCESS', 'PAID'].includes(paymentOrder.status) &&
      !paymentOrder.tournamentJoined
    ) {
      const settle = await settleSuccessfulPayment(paymentOrder, { source: 'poll' });
      const fresh = await PaymentOrder.findById(paymentOrder._id);
      return res.json(
        buildStatusPayload(fresh, {
          status: settle.tournamentJoined ? 'PAID' : fresh.status,
          tournamentJoined: settle.tournamentJoined,
          message: settle.tournamentJoined
            ? 'Payment successful. You have joined the tournament.'
            : settle.fulfill?.message || 'Payment verified. Completing join…',
        })
      );
    }

    if (paymentOrder.qrExpiresAt && paymentOrder.qrExpiresAt.getTime() < Date.now()) {
      try {
        const verified = await verifyAndSettle(paymentOrder, { source: 'poll' });
        if (verified.localStatus === 'SUCCESS') {
          const fresh = await PaymentOrder.findById(paymentOrder._id);
          const user = await User.findById(req.userId);
          return res.json(
            buildStatusPayload(fresh, {
              status: purpose === 'tournament_entry' && fresh.tournamentJoined ? 'PAID' : 'SUCCESS',
              tournamentJoined: Boolean(fresh.tournamentJoined),
              walletCredited: Boolean(fresh.walletCredited),
              balance: user?.wallet?.balance,
              message:
                purpose === 'tournament_entry'
                  ? fresh.tournamentJoined
                    ? 'Payment successful. You have joined the tournament.'
                    : 'Payment received. Completing join…'
                  : 'Payment successful. Wallet updated.',
            })
          );
        }
      } catch (_) {
        /* fall through to expired */
      }
      if (!['SUCCESS', 'PAID', 'FAILED'].includes(paymentOrder.status)) {
        paymentOrder.status = 'EXPIRED';
        await paymentOrder.save();
      }
      if (paymentOrder.status === 'EXPIRED') {
        return res.json(
          buildStatusPayload(paymentOrder, {
            status: 'EXPIRED',
            code: 'ORDER_EXPIRED',
            message: userFacingError('ORDER_EXPIRED'),
          })
        );
      }
    }

    let verified;
    try {
      verified = await verifyAndSettle(paymentOrder, { source: 'poll' });
    } catch (apiErr) {
      await writeLog({
        orderId,
        paymentOrderId: paymentOrder._id,
        userId: req.userId,
        event: 'STATUS_POLL_FAILED',
        source: 'poll',
        success: false,
        message: apiErr.message,
        errorCode: apiErr.code,
      });
      return res.status(502).json({
        success: false,
        code: 'NETWORK_ERROR',
        message: userFacingError('NETWORK_ERROR'),
        status: paymentOrder.status,
      });
    }

    const fresh = await PaymentOrder.findById(paymentOrder._id);
    const user = await User.findById(req.userId);

    if (verified.localStatus === 'SUCCESS') {
      if (purpose === 'tournament_entry') {
        return res.json(
          buildStatusPayload(fresh, {
            status: fresh.tournamentJoined ? 'PAID' : 'SUCCESS',
            tournamentJoined: Boolean(fresh.tournamentJoined),
            message: fresh.tournamentJoined
              ? 'Payment successful. You have joined the tournament.'
              : verified.settle?.fulfill?.message || 'Payment received. Completing join…',
          })
        );
      }
      return res.json(
        buildStatusPayload(fresh, {
          status: 'SUCCESS',
          walletCredited: true,
          newlyCredited: verified.settle?.credit?.credited,
          balance: user?.wallet?.balance,
          message: 'Payment successful. Wallet updated.',
        })
      );
    }

    if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(verified.localStatus)) {
      const code =
        verified.localStatus === 'EXPIRED'
          ? 'ORDER_EXPIRED'
          : verified.localStatus === 'CANCELLED'
            ? 'PAYMENT_CANCELLED'
            : 'PAYMENT_FAILED';
      return res.json(
        buildStatusPayload(fresh, {
          status: verified.localStatus,
          code,
          message: userFacingError(code),
        })
      );
    }

    return res.json(
      buildStatusPayload(fresh, {
        status: 'PENDING',
        message: userFacingError('PAYMENT_PENDING'),
      })
    );
  } catch (error) {
    console.error('[payments] status error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      code: error.code || 'NETWORK_ERROR',
      message: userFacingError(error.code, error.message),
    });
  }
}

async function handleCancel(req, res) {
  try {
    const paymentOrder = await PaymentOrder.findOne({
      orderId: req.params.orderId,
      userId: req.userId,
    });
    if (!paymentOrder) {
      return res.status(404).json({
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: userFacingError('ORDER_NOT_FOUND'),
      });
    }

    if (
      paymentOrder.walletCredited ||
      paymentOrder.tournamentJoined ||
      paymentOrder.status === 'SUCCESS' ||
      paymentOrder.status === 'PAID'
    ) {
      return res.json({
        success: true,
        status: paymentOrder.tournamentJoined ? 'PAID' : 'SUCCESS',
        message: 'Payment already completed.',
        tournamentJoined: Boolean(paymentOrder.tournamentJoined),
      });
    }

    try {
      const verified = await verifyAndSettle(paymentOrder, { source: 'api' });
      if (verified.localStatus === 'SUCCESS') {
        const fresh = await PaymentOrder.findById(paymentOrder._id);
        return res.json({
          success: true,
          status: fresh.tournamentJoined ? 'PAID' : 'SUCCESS',
          message: 'Payment already completed.',
          tournamentJoined: Boolean(fresh.tournamentJoined),
          walletCredited: Boolean(fresh.walletCredited),
        });
      }
    } catch (_) {
      /* still allow local cancel */
    }

    if (!['FAILED', 'EXPIRED', 'CANCELLED', 'SUCCESS', 'PAID'].includes(paymentOrder.status)) {
      paymentOrder.status = 'CANCELLED';
      paymentOrder.failureReason = 'USER_CANCELLED';
      await paymentOrder.save();
    }

    await writeLog({
      orderId: paymentOrder.orderId,
      paymentOrderId: paymentOrder._id,
      userId: req.userId,
      event: 'USER_CANCELLED',
      source: 'api',
    });

    res.json({
      success: true,
      status: paymentOrder.status,
      message: userFacingError('PAYMENT_CANCELLED'),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: userFacingError('NETWORK_ERROR'),
    });
  }
}

/**
 * ZapUPI webhook. Always 200 + {status:'ok'}. Never trust this payload alone —
 * confirm with Order Status API before joining / crediting.
 */
router.post('/zapupi/webhook', async (req, res) => {
  const ack = () => res.status(200).json({ status: 'ok' });
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const orderId = payload.order_id || payload.orderId;
    const txnId = payload.txn_id || payload.txnId;
    const utr = payload.utr;
    const environment = payload.environment;

    await writeLog({
      orderId,
      event: 'WEBHOOK_RECEIVED',
      source: 'webhook',
      requestPayload: payload,
      success: true,
    });

    if (!orderId) return ack();

    const paymentOrder = await PaymentOrder.findOne({ orderId });
    if (!paymentOrder) {
      await writeLog({
        orderId,
        event: 'WEBHOOK_UNKNOWN_ORDER',
        source: 'webhook',
        success: false,
        errorCode: 'INVALID_ORDER',
      });
      return ack();
    }

    if (paymentOrder.walletCredited || paymentOrder.tournamentJoined) {
      await writeLog({
        orderId,
        paymentOrderId: paymentOrder._id,
        userId: paymentOrder.userId,
        event: 'WEBHOOK_DUPLICATE',
        source: 'webhook',
        message: 'Already processed',
        errorCode: 'DUPLICATE_CALLBACK',
      });
      return ack();
    }

    if (txnId) paymentOrder.zapupiTxnId = String(txnId);
    if (utr) paymentOrder.zapupiUtr = String(utr);
    if (environment) paymentOrder.zapupiEnvironment = String(environment);
    paymentOrder.lastVerifiedAt = new Date();
    await paymentOrder.save();

    if (!isPaymentEnabled()) {
      await writeLog({
        orderId,
        event: 'WEBHOOK_REJECTED_PAYMENT_DISABLED',
        source: 'webhook',
        success: false,
        errorCode: 'PAYMENT_DISABLED',
      });
      return ack();
    }

    const cfg = getZapUpiConfig();
    if (!cfg.acceptTestWebhooks && zapupi.isTestEnvironment(environment, txnId)) {
      await writeLog({
        orderId,
        event: 'WEBHOOK_TEST_IGNORED',
        source: 'webhook',
        success: false,
        errorCode: 'TEST_IGNORED',
      });
      return ack();
    }

    try {
      await verifyAndSettle(paymentOrder, { source: 'webhook' });
    } catch (verifyErr) {
      console.error('[payments] webhook verify error:', verifyErr.message);
    }

    return ack();
  } catch (error) {
    console.error('[payments] webhook error:', error.message);
    return ack();
  }
});

router.post('/zapupi/create-qr', authMiddleware, requirePaymentsEnabled, handleCreateWalletOrder);
router.post('/zapupi/create-order', authMiddleware, requirePaymentsEnabled, handleCreateTournamentOrder);
router.get('/zapupi/status/:orderId', authMiddleware, requirePaymentsEnabled, handleStatus);
router.post('/zapupi/cancel/:orderId', authMiddleware, handleCancel);

module.exports = router;
