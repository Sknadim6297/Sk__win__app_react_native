const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const { authMiddleware } = require('../middleware/auth');
const { getCashfreeConfig, assertCashfreeReady } = require('../config/cashfree');
const cashfree = require('../services/cashfreeService');
const { creditWalletForPaymentOrder } = require('../services/walletCreditService');

const router = express.Router();

function publicBaseUrl(req) {
  const fromEnv = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
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
    CASHFREE_DISABLED: 'QR payments are temporarily unavailable. Please try again later.',
    CASHFREE_NOT_CONFIGURED: 'Payment gateway is not configured yet. Please contact support.',
    CASHFREE_API_ERROR: 'Unable to reach the payment gateway. Please try again.',
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
  };
  return map[code] || fallback || 'Something went wrong with the payment.';
}

/** Public status for app — no secrets */
router.get('/config', authMiddleware, async (req, res) => {
  const cfg = getCashfreeConfig();
  res.json({
    success: true,
    enabled: cfg.ready,
    environment: cfg.env,
    minAmount: cfg.minAmount,
    maxAmount: cfg.maxAmount,
    currency: cfg.currency,
    qrExpiryMinutes: cfg.qrExpiryMinutes,
    paymentMethod: 'cashfree_qr',
  });
});

/**
 * Create Cashfree order + UPI QR for wallet top-up.
 * POST /api/payments/cashfree/create-qr
 * body: { amount }
 */
router.post('/cashfree/create-qr', authMiddleware, async (req, res) => {
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

    const orderId = `SKW_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.slice(0, 45);
    const notifyUrl = `${publicBaseUrl(req)}/api/payments/cashfree/webhook`;

    await writeLog({
      orderId,
      userId: req.userId,
      event: 'CREATE_QR_REQUESTED',
      source: 'api',
      requestPayload: { amount: amountNum },
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
      await writeLog({
        orderId,
        userId: req.userId,
        event: 'CREATE_ORDER_NO_SESSION',
        source: 'api',
        success: false,
        responsePayload: order,
        errorCode: 'NO_PAYMENT_SESSION',
      });
      return res.status(502).json({
        success: false,
        code: 'CASHFREE_API_ERROR',
        message: userFacingError('CASHFREE_API_ERROR'),
      });
    }

    const { pay, qr } = await cashfree.createUpiQrPayment(paymentSessionId, cfg.qrExpiryMinutes);

    if (!qr.qrPayload && !qr.qrImageUrl) {
      await writeLog({
        orderId,
        userId: req.userId,
        event: 'QR_MISSING_IN_RESPONSE',
        source: 'api',
        success: false,
        responsePayload: pay,
        errorCode: 'QR_MISSING',
      });
      return res.status(502).json({
        success: false,
        code: 'CASHFREE_API_ERROR',
        message:
          'QR could not be generated. Ensure Cashfree S2S / UPI QR is enabled on your merchant account.',
      });
    }

    const slimPay = (() => {
      try {
        const clone = JSON.parse(JSON.stringify(pay));
        if (clone?.data?.payload && typeof clone.data.payload === 'string' && clone.data.payload.length > 180) {
          clone.data.payload = `[omitted ${clone.data.payload.length} chars]`;
        }
        return clone;
      } catch {
        return { cf_payment_id: pay?.cf_payment_id, channel: pay?.channel };
      }
    })();

    const paymentOrder = await PaymentOrder.create({
      orderId,
      userId: req.userId,
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
      rawPayResponse: slimPay,
      metadata: { channel: qr.channel, action: qr.action },
    });

    await writeLog({
      orderId,
      paymentOrderId: paymentOrder._id,
      userId: req.userId,
      event: 'QR_CREATED',
      source: 'api',
      success: true,
      responsePayload: {
        cfPaymentId: qr.cfPaymentId,
        hasPayload: Boolean(qr.qrPayload),
        hasImage: Boolean(qr.qrImageUrl),
      },
    });

    res.json({
      success: true,
      orderId: paymentOrder.orderId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      status: paymentOrder.status,
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
 * Poll / verify payment status. Credits wallet on SUCCESS (idempotent).
 * GET /api/payments/cashfree/status/:orderId
 */
router.get('/cashfree/status/:orderId', authMiddleware, async (req, res) => {
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

    if (paymentOrder.walletCredited || paymentOrder.status === 'SUCCESS') {
      const user = await User.findById(req.userId);
      return res.json({
        success: true,
        orderId,
        status: 'SUCCESS',
        amount: paymentOrder.amount,
        walletCredited: true,
        balance: user?.wallet?.balance,
        message: 'Payment successful. Wallet updated.',
      });
    }

    if (paymentOrder.qrExpiresAt && paymentOrder.qrExpiresAt.getTime() < Date.now()) {
      if (!['SUCCESS', 'PAID', 'FAILED'].includes(paymentOrder.status)) {
        paymentOrder.status = 'EXPIRED';
        await paymentOrder.save();
      }
      if (paymentOrder.status === 'EXPIRED') {
        return res.json({
          success: true,
          orderId,
          status: 'EXPIRED',
          amount: paymentOrder.amount,
          walletCredited: false,
          code: 'ORDER_EXPIRED',
          message: userFacingError('ORDER_EXPIRED'),
        });
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

    // Amount integrity: never credit mismatched amounts
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

      const credit = await creditWalletForPaymentOrder(paymentOrder, {
        source: 'poll',
        cfPaymentId: paymentOrder.cashfreePaymentId,
      });

      const user = await User.findById(req.userId);
      return res.json({
        success: true,
        orderId,
        status: 'SUCCESS',
        amount: paymentOrder.amount,
        walletCredited: true,
        newlyCredited: credit.credited,
        balance: user?.wallet?.balance,
        message:
          credit.reason === 'ALREADY_CREDITED' || credit.reason === 'DUPLICATE'
            ? 'Payment already processed. Wallet is up to date.'
            : 'Payment successful. Wallet updated.',
      });
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

      return res.json({
        success: true,
        orderId,
        status: paymentOrder.status,
        amount: paymentOrder.amount,
        walletCredited: false,
        code,
        message: userFacingError(code),
      });
    }

    paymentOrder.status = 'PENDING';
    await paymentOrder.save();

    return res.json({
      success: true,
      orderId,
      status: 'PENDING',
      amount: paymentOrder.amount,
      walletCredited: false,
      code: 'PAYMENT_PENDING',
      message: userFacingError('PAYMENT_PENDING'),
      expiresAt: paymentOrder.qrExpiresAt,
    });
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

    if (paymentOrder.walletCredited || paymentOrder.status === 'SUCCESS') {
      return res.json({
        success: true,
        status: 'SUCCESS',
        message: 'Payment already completed.',
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
 * Cashfree webhook — signature verified; credits wallet idempotently.
 * POST /api/payments/cashfree/webhook
 * Note: mount with express.raw or capture rawBody for signature (see server.js).
 */
router.post('/cashfree/webhook', async (req, res) => {
  try {
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

    if (paymentOrder.walletCredited) {
      await writeLog({
        orderId,
        paymentOrderId: paymentOrder._id,
        userId: paymentOrder.userId,
        event: 'WEBHOOK_DUPLICATE',
        source: 'webhook',
        message: 'Already credited',
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
      await creditWalletForPaymentOrder(paymentOrder, {
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
