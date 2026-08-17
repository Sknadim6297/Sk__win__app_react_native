const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const TeamMember = require('../models/TeamMember');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const { authMiddleware } = require('../middleware/auth');
const { getCashfreeConfig, assertCashfreeReady } = require('../config/cashfree');
const {
  isPaymentEnabled,
  requirePaymentsEnabled,
  PAYMENT_DISABLED_MESSAGE,
} = require('../config/payments');
const cashfree = require('../services/cashfreeService');
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

async function writeLog(entry) {
  try {
    await PaymentLog.create(entry);
  } catch (e) {
    console.error('[payments] log failed:', e.message);
  }
}

function userFacingError(code, fallback) {
  const map = {
    PAYMENT_DISABLED: PAYMENT_DISABLED_MESSAGE,
    CASHFREE_DISABLED: 'QR payments are temporarily unavailable. Please try again later.',
    CASHFREE_NOT_CONFIGURED: 'Payment gateway is not configured yet. Please contact support.',
    CASHFREE_API_ERROR: 'Unable to reach the payment gateway. Please try again.',
    CASHFREE_AUTH_FAILED:
      'Cashfree authentication failed. Use Payment Gateway Test API keys (Payments → Developers), not Payouts keys.',
    INVALID_AMOUNT: 'Please enter a valid amount between ₹10 and ₹10,000.',
    ORDER_NOT_FOUND: 'Payment order not found.',
    ORDER_EXPIRED: 'This QR code has expired. Please generate a new one.',
    PAYMENT_FAILED: 'Payment failed. Please try again.',
    PAYMENT_CANCELLED: 'Payment was cancelled.',
    PAYMENT_PENDING: 'Payment is still pending. Complete the UPI payment and wait a moment.',
    INVALID_SIGNATURE: 'Invalid payment webhook signature.',
    INVALID_ORDER: 'Invalid payment order.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Payment verification timed out. If money was deducted, contact support with your Order ID.',
    DUPLICATE_CALLBACK: 'This payment was already processed.',
    ALREADY_JOINED: 'You have already joined this tournament.',
    TOURNAMENT_CLOSED: 'Registration is not open for this tournament.',
    TOURNAMENT_FULL: 'Tournament is full.',
  };
  return map[code] || fallback || 'Something went wrong with the payment.';
}

function slimPayResponse(pay) {
  try {
    const clone = JSON.parse(JSON.stringify(pay));
    if (clone?.data?.payload && typeof clone.data.payload === 'string' && clone.data.payload.length > 180) {
      clone.data.payload = `[omitted ${clone.data.payload.length} chars]`;
    }
    return clone;
  } catch {
    return { cf_payment_id: pay?.cf_payment_id, channel: pay?.channel };
  }
}

async function createCashfreeQrOrder({
  req,
  user,
  amountNum,
  purpose = 'wallet_topup',
  tournamentId = null,
  metadata = {},
}) {
  const cfg = assertCashfreeReady();
  const orderId = `SKW_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.slice(0, 45);
  const notifyUrl = `${publicBaseUrl(req)}/api/payments/cashfree/webhook`;

  await writeLog({
    orderId,
    userId: user._id,
    event: purpose === 'tournament_entry' ? 'CREATE_ORDER_REQUESTED' : 'CREATE_QR_REQUESTED',
    source: 'api',
    requestPayload: { amount: amountNum, purpose, tournamentId },
  });

  const { order, expiry } = await cashfree.createOrder({
    orderId,
    amount: amountNum,
    currency: cfg.currency,
    customer: {
      id: user._id,
      phone: user.phone || user.mobile || user.phoneNumber,
      email: user.email,
      name: user.name || user.username || 'SK Win Player',
    },
    notifyUrl,
  });

  const paymentSessionId = order.payment_session_id;
  if (!paymentSessionId) {
    const err = new Error(userFacingError('CASHFREE_API_ERROR'));
    err.status = 502;
    err.code = 'CASHFREE_API_ERROR';
    throw err;
  }

  const { pay, qr } = await cashfree.createUpiQrPayment(paymentSessionId, cfg.qrExpiryMinutes);
  if (!qr.qrPayload && !qr.qrImageUrl) {
    const err = new Error(
      'QR could not be generated. Ensure Cashfree S2S / UPI QR is enabled on your merchant account.'
    );
    err.status = 502;
    err.code = 'CASHFREE_API_ERROR';
    throw err;
  }

  const paymentOrder = await PaymentOrder.create({
    orderId,
    userId: user._id,
    purpose,
    tournamentId: tournamentId || undefined,
    amount: amountNum,
    currency: cfg.currency,
    status: 'PENDING',
    paymentMethod: 'cashfree_qr',
    cashfreeOrderId: order.cf_order_id != null ? String(order.cf_order_id) : orderId,
    cashfreePaymentId: qr.cfPaymentId || undefined,
    paymentSessionId,
    qrPayload: qr.qrPayload || undefined,
    qrImageUrl: qr.qrImageUrl || undefined,
    qrExpiresAt: expiry,
    cfOrderStatus: order.order_status,
    rawCreateResponse: order,
    rawPayResponse: slimPayResponse(pay),
    metadata: { channel: qr.channel, action: qr.action, purpose, ...metadata },
  });

  await writeLog({
    orderId,
    paymentOrderId: paymentOrder._id,
    userId: user._id,
    event: 'QR_CREATED',
    source: 'api',
    success: true,
    responsePayload: {
      purpose,
      cfPaymentId: qr.cfPaymentId,
      hasPayload: Boolean(qr.qrPayload),
      hasImage: Boolean(qr.qrImageUrl),
    },
  });

  return { paymentOrder, expiry };
}

async function settleSuccessfulPayment(paymentOrder, { source, cfPaymentId } = {}) {
  const purpose = paymentOrder.purpose || paymentOrder.metadata?.purpose || 'wallet_topup';

  if (purpose === 'tournament_entry') {
    if (!['SUCCESS', 'PAID'].includes(paymentOrder.status)) {
      paymentOrder.status = 'SUCCESS';
      await paymentOrder.save();
    }
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
  const credit = await creditWalletForPaymentOrder(paymentOrder, { source, cfPaymentId });
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
  if (
    purpose === 'tournament_entry' &&
    (paymentOrder.tournamentJoined || status === 'SUCCESS' || status === 'PAID')
  ) {
    if (paymentOrder.tournamentJoined) status = 'PAID';
  }
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
    ...extra,
  };
}

/** Public status for app — no secrets */
router.get('/config', authMiddleware, async (req, res) => {
  const cfg = getCashfreeConfig();
  const paymentsOn = isPaymentEnabled();
  res.json({
    success: true,
    enabled: paymentsOn && cfg.ready,
    paymentEnabled: paymentsOn,
    cashfreeReady: cfg.ready,
    environment: cfg.env,
    minAmount: cfg.minAmount,
    maxAmount: cfg.maxAmount,
    currency: cfg.currency,
    qrExpiryMinutes: cfg.qrExpiryMinutes,
    paymentMethod: 'cashfree_qr',
    supportsTournamentPayJoin: true,
    message: paymentsOn
      ? cfg.ready
        ? 'Payments enabled'
        : 'Payment gateway is not configured yet'
      : 'Testing mode: use wallet top-up (dummy coins). Cashfree is off.',
  });
});

/**
 * Create Cashfree order + UPI QR for wallet top-up.
 * POST /api/payments/cashfree/create-qr
 */
router.post('/cashfree/create-qr', authMiddleware, requirePaymentsEnabled, async (req, res) => {
  try {
    const cfg = assertCashfreeReady();
    const amountNum = parseFloat(req.body?.amount);

    if (!amountNum || Number.isNaN(amountNum) || amountNum < cfg.minAmount || amountNum > cfg.maxAmount) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_AMOUNT',
        message: userFacingError('INVALID_AMOUNT'),
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

    const { paymentOrder, expiry } = await createCashfreeQrOrder({
      req,
      user,
      amountNum,
      purpose: 'wallet_topup',
    });

    res.json({
      success: true,
      orderId: paymentOrder.orderId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      status: paymentOrder.status,
      purpose: 'wallet_topup',
      paymentMethod: 'Cashfree QR',
      qrPayload: paymentOrder.qrPayload,
      qrImageUrl: paymentOrder.qrImageUrl,
      expiresAt: paymentOrder.qrExpiresAt,
      expiresInSeconds: Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000)),
      walletBalance: (user.wallet?.balance || 0) + (user.wallet?.bonusBalance || 0),
      message: 'Scan the QR with any UPI app to pay',
    });
  } catch (error) {
    console.error('[payments] create-qr error:', error.message, error.payload || '');
    await writeLog({
      userId: req.userId,
      event: 'CREATE_QR_FAILED',
      source: 'api',
      success: false,
      message: error.message,
      errorCode: error.code || 'CASHFREE_API_ERROR',
      responsePayload: error.payload,
    });
    res.status(error.status || 500).json({
      success: false,
      code: error.code || 'CASHFREE_API_ERROR',
      message: userFacingError(error.code, error.message),
    });
  }
});

/**
 * Pay & Join — Cashfree Sandbox order for tournament entry fee.
 * POST /api/payments/cashfree/create-order
 */
router.post('/cashfree/create-order', authMiddleware, requirePaymentsEnabled, async (req, res) => {
  try {
    const cfg = assertCashfreeReady();
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
      const settle = await settleSuccessfulPayment(paidPendingJoin, { source: 'api_resume' });
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
      qrExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (existingPending?.qrPayload || existingPending?.qrImageUrl) {
      return res.json({
        success: true,
        orderId: existingPending.orderId,
        amount: existingPending.amount,
        currency: existingPending.currency,
        status: 'PENDING',
        purpose: 'tournament_entry',
        tournamentId: tournament._id,
        paymentMethod: 'Cashfree QR',
        qrPayload: existingPending.qrPayload,
        qrImageUrl: existingPending.qrImageUrl,
        expiresAt: existingPending.qrExpiresAt,
        expiresInSeconds: Math.max(
          0,
          Math.floor((new Date(existingPending.qrExpiresAt).getTime() - Date.now()) / 1000)
        ),
        resumed: true,
        message: 'Complete payment with the existing QR',
      });
    }

    const isTeam =
      lifecycle.isCustomMatch(tournament) || lifecycle.usesTeamRegistration(tournament);
    const amountNum = Number(tournament.entryFee) || 0;
    if (!amountNum || amountNum < cfg.minAmount || amountNum > cfg.maxAmount) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_AMOUNT',
        message:
          amountNum < cfg.minAmount
            ? `Entry fee must be at least ₹${cfg.minAmount} for Cashfree Sandbox QR`
            : userFacingError('INVALID_AMOUNT'),
      });
    }

    let metadata = {
      purpose: 'tournament_entry',
      tournamentName: tournament.name,
      joinKind: isTeam ? 'team' : 'solo',
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

    const { paymentOrder, expiry } = await createCashfreeQrOrder({
      req,
      user,
      amountNum,
      purpose: 'tournament_entry',
      tournamentId: tournament._id,
      metadata,
    });

    res.json({
      success: true,
      orderId: paymentOrder.orderId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      status: paymentOrder.status,
      purpose: 'tournament_entry',
      tournamentId: tournament._id,
      tournamentName: tournament.name,
      paymentMethod: 'Cashfree QR',
      qrPayload: paymentOrder.qrPayload,
      qrImageUrl: paymentOrder.qrImageUrl,
      expiresAt: paymentOrder.qrExpiresAt,
      expiresInSeconds: Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000)),
      message: 'Scan the QR and pay the entry fee to join',
    });
  } catch (error) {
    console.error('[payments] create-order error:', error.message, error.payload || '');
    await writeLog({
      userId: req.userId,
      event: 'CREATE_ORDER_FAILED',
      source: 'api',
      success: false,
      message: error.message,
      errorCode: error.code || 'CASHFREE_API_ERROR',
      responsePayload: error.payload,
    });
    res.status(error.status || 500).json({
      success: false,
      code: error.code || 'CASHFREE_API_ERROR',
      message: userFacingError(error.code, error.message),
    });
  }
});

/**
 * Poll / verify payment status. Credits wallet OR joins tournament (idempotent).
 * GET /api/payments/cashfree/status/:orderId
 */
router.get('/cashfree/status/:orderId', authMiddleware, requirePaymentsEnabled, async (req, res) => {
  try {
    assertCashfreeReady();
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

    let cfOrder;
    let payments = [];
    try {
      cfOrder = await cashfree.getOrder(orderId);
      const paymentsRes = await cashfree.getOrderPayments(orderId);
      payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.payments || [];
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

    const latestPayment = [...payments].sort(
      (a, b) => new Date(b.payment_time || 0) - new Date(a.payment_time || 0)
    )[0];

    const localStatus = cashfree.mapCfStatusToLocal(
      cfOrder?.order_status,
      latestPayment?.payment_status
    );

    paymentOrder.cfOrderStatus = cfOrder?.order_status;
    paymentOrder.cfPaymentStatus = latestPayment?.payment_status;
    paymentOrder.lastVerifiedAt = new Date();
    if (latestPayment?.cf_payment_id) {
      paymentOrder.cashfreePaymentId = String(latestPayment.cf_payment_id);
    }

    const paidAmount = Number(
      latestPayment?.payment_amount ?? cfOrder?.order_amount ?? paymentOrder.amount
    );
    if (localStatus === 'SUCCESS' && Math.abs(paidAmount - Number(paymentOrder.amount)) > 0.009) {
      paymentOrder.status = 'FAILED';
      paymentOrder.failureReason = 'AMOUNT_MISMATCH';
      await paymentOrder.save();
      await writeLog({
        orderId,
        paymentOrderId: paymentOrder._id,
        userId: req.userId,
        event: 'AMOUNT_MISMATCH',
        source: 'poll',
        success: false,
        responsePayload: { expected: paymentOrder.amount, paid: paidAmount },
        errorCode: 'AMOUNT_MISMATCH',
      });
      return res.status(400).json({
        success: false,
        code: 'INVALID_ORDER',
        message: userFacingError('INVALID_ORDER'),
        status: 'FAILED',
      });
    }

    if (localStatus === 'SUCCESS') {
      paymentOrder.status = 'SUCCESS';
      await paymentOrder.save();
      const settle = await settleSuccessfulPayment(paymentOrder, {
        source: 'poll',
        cfPaymentId: paymentOrder.cashfreePaymentId,
      });
      const fresh = await PaymentOrder.findById(paymentOrder._id);
      const user = await User.findById(req.userId);

      if (purpose === 'tournament_entry') {
        return res.json(
          buildStatusPayload(fresh, {
            status: settle.tournamentJoined ? 'PAID' : 'SUCCESS',
            tournamentJoined: settle.tournamentJoined,
            message: settle.tournamentJoined
              ? 'Payment successful. You have joined the tournament.'
              : settle.fulfill?.message || 'Payment received. Completing join…',
          })
        );
      }

      return res.json(
        buildStatusPayload(fresh, {
          status: 'SUCCESS',
          walletCredited: true,
          newlyCredited: settle.credit?.credited,
          balance: user?.wallet?.balance,
          message:
            settle.credit?.reason === 'ALREADY_CREDITED' || settle.credit?.reason === 'DUPLICATE'
              ? 'Payment already processed. Wallet is up to date.'
              : 'Payment successful. Wallet updated.',
        })
      );
    }

    if (['FAILED', 'CANCELLED', 'EXPIRED', 'USER_DROPPED'].includes(localStatus)) {
      paymentOrder.status = localStatus === 'USER_DROPPED' ? 'CANCELLED' : localStatus;
      paymentOrder.failureReason = latestPayment?.payment_message || localStatus;
      await paymentOrder.save();

      const code =
        localStatus === 'EXPIRED'
          ? 'ORDER_EXPIRED'
          : localStatus === 'CANCELLED' || localStatus === 'USER_DROPPED'
            ? 'PAYMENT_CANCELLED'
            : 'PAYMENT_FAILED';

      return res.json(
        buildStatusPayload(paymentOrder, {
          code,
          message: userFacingError(code),
        })
      );
    }

    paymentOrder.status = 'PENDING';
    await paymentOrder.save();

    return res.json(
      buildStatusPayload(paymentOrder, {
        status: 'PENDING',
        code: 'PAYMENT_PENDING',
        message: userFacingError('PAYMENT_PENDING'),
        expiresAt: paymentOrder.qrExpiresAt,
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
});

/**
 * User cancels waiting on QR (does not void Cashfree order remotely).
 * POST /api/payments/cashfree/cancel/:orderId
 */
router.post('/cashfree/cancel/:orderId', authMiddleware, async (req, res) => {
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

    if (!['FAILED', 'EXPIRED', 'CANCELLED'].includes(paymentOrder.status)) {
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
      status: 'CANCELLED',
      message: userFacingError('PAYMENT_CANCELLED'),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: userFacingError('NETWORK_ERROR'),
    });
  }
});

/**
 * Cashfree webhook — signature verified; credits wallet or joins tournament idempotently.
 * POST /api/payments/cashfree/webhook
 */
router.post('/cashfree/webhook', async (req, res) => {
  try {
    if (!isPaymentEnabled()) {
      await writeLog({
        event: 'WEBHOOK_REJECTED_PAYMENT_DISABLED',
        source: 'webhook',
        success: false,
        errorCode: 'PAYMENT_DISABLED',
      });
      return res.status(503).json({
        success: false,
        code: 'PAYMENT_DISABLED',
        message: PAYMENT_DISABLED_MESSAGE,
      });
    }

    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : JSON.stringify(req.body || {});

    const signature = req.get('x-webhook-signature') || req.get('x-cashfree-signature');
    const timestamp = req.get('x-webhook-timestamp') || req.get('x-cashfree-timestamp');

    const cfg = getCashfreeConfig();
    if (cfg.configured) {
      const valid = cashfree.verifyWebhookSignature({ rawBody, timestamp, signature });
      if (!valid) {
        await writeLog({
          event: 'WEBHOOK_INVALID_SIGNATURE',
          source: 'webhook',
          success: false,
          errorCode: 'INVALID_SIGNATURE',
          headers: { signature: Boolean(signature), timestamp: Boolean(timestamp) },
        });
        return res.status(401).json({
          success: false,
          code: 'INVALID_SIGNATURE',
          message: userFacingError('INVALID_SIGNATURE'),
        });
      }
    }

    const payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody || '{}');

    const data = payload?.data || payload;
    const orderId = data?.order?.order_id || data?.order_id || payload?.orderId;
    const paymentStatus =
      data?.payment?.payment_status ||
      data?.payment_status ||
      payload?.payment_status;
    const cfPaymentId =
      data?.payment?.cf_payment_id ||
      data?.cf_payment_id ||
      payload?.cf_payment_id;
    const orderAmount = Number(
      data?.order?.order_amount || data?.payment?.payment_amount || data?.order_amount
    );

    await writeLog({
      orderId,
      event: payload?.type || payload?.event || 'WEBHOOK_RECEIVED',
      source: 'webhook',
      requestPayload: payload,
      success: true,
    });

    if (!orderId) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const paymentOrder = await PaymentOrder.findOne({ orderId });
    if (!paymentOrder) {
      await writeLog({
        orderId,
        event: 'WEBHOOK_UNKNOWN_ORDER',
        source: 'webhook',
        success: false,
        errorCode: 'INVALID_ORDER',
      });
      return res.status(200).json({ success: true, ignored: true });
    }

    const purpose = paymentOrder.purpose || paymentOrder.metadata?.purpose || 'wallet_topup';

    if (
      (purpose === 'wallet_topup' && paymentOrder.walletCredited) ||
      (purpose === 'tournament_entry' && paymentOrder.tournamentJoined)
    ) {
      await writeLog({
        orderId,
        paymentOrderId: paymentOrder._id,
        userId: paymentOrder.userId,
        event: 'WEBHOOK_DUPLICATE',
        source: 'webhook',
        message: 'Already processed',
        errorCode: 'DUPLICATE_CALLBACK',
      });
      return res.status(200).json({ success: true, duplicate: true });
    }

    const localStatus = cashfree.mapCfStatusToLocal(
      data?.order?.order_status,
      paymentStatus
    );

    if (cfPaymentId) paymentOrder.cashfreePaymentId = String(cfPaymentId);
    paymentOrder.cfPaymentStatus = paymentStatus;
    paymentOrder.lastVerifiedAt = new Date();

    if (
      localStatus === 'SUCCESS' &&
      !Number.isNaN(orderAmount) &&
      Math.abs(orderAmount - Number(paymentOrder.amount)) > 0.009
    ) {
      paymentOrder.status = 'FAILED';
      paymentOrder.failureReason = 'AMOUNT_MISMATCH';
      await paymentOrder.save();
      return res.status(200).json({ success: false, code: 'AMOUNT_MISMATCH' });
    }

    if (localStatus === 'SUCCESS') {
      paymentOrder.status = 'SUCCESS';
      await paymentOrder.save();
      await settleSuccessfulPayment(paymentOrder, {
        source: 'webhook',
        cfPaymentId: paymentOrder.cashfreePaymentId,
      });
      return res.status(200).json({ success: true });
    }

    if (['FAILED', 'CANCELLED', 'EXPIRED', 'USER_DROPPED'].includes(localStatus)) {
      paymentOrder.status = localStatus === 'USER_DROPPED' ? 'CANCELLED' : localStatus;
      await paymentOrder.save();
    }

    return res.status(200).json({ success: true, status: paymentOrder.status });
  } catch (error) {
    console.error('[payments] webhook error:', error.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
