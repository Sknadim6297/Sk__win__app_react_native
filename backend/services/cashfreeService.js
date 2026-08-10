const crypto = require('crypto');
const {
  assertCashfreeReady,
  getCashfreeConfig,
  logCashfreeAuthDiagnostics,
} = require('../config/cashfree');
const { assertPaymentsEnabled } = require('../config/payments');

async function cashfreeFetch(path, { method = 'GET', body } = {}) {
  assertPaymentsEnabled();
  const cfg = assertCashfreeReady();
  const url = `${cfg.baseUrl}${path}`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-api-version': cfg.apiVersion,
    'x-client-id': cfg.appId,
    'x-client-secret': cfg.secretKey,
  };

  logCashfreeAuthDiagnostics({ path: `${method} ${url}` });

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const rawMessage =
      data?.message ||
      data?.error?.message ||
      (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
      `Cashfree API error (${res.status})`;

    logCashfreeAuthDiagnostics({
      path: `${method} ${url}`,
      httpStatus: res.status,
      message: String(rawMessage).slice(0, 200),
    });

    const isAuthFail =
      res.status === 401 ||
      /authentication\s*failed/i.test(String(rawMessage));

    const message = isAuthFail
      ? 'Cashfree authentication Failed. Use Payment Gateway (PG) Test API keys from Payments → Developers → API Keys — NOT Payouts API keys. Keys must match sandbox.cashfree.com/pg.'
      : rawMessage;

    const err = new Error(message);
    err.status = res.status;
    err.code = isAuthFail ? 'CASHFREE_AUTH_FAILED' : data?.code || 'CASHFREE_API_ERROR';
    err.payload = data;
    throw err;
  }

  return data;
}

/**
 * Create Cashfree order → returns payment_session_id
 * POST https://sandbox.cashfree.com/pg/orders
 * Headers: x-client-id, x-client-secret, x-api-version
 */
async function createOrder({ orderId, amount, currency, customer, notifyUrl, returnUrl }) {
  const cfg = assertCashfreeReady();
  const expiry = new Date(Date.now() + cfg.qrExpiryMinutes * 60 * 1000);

  const body = {
    order_id: orderId,
    order_amount: Number(amount),
    order_currency: currency || cfg.currency,
    order_expiry_time: expiry.toISOString(),
    customer_details: {
      customer_id: String(customer.id).slice(0, 50),
      customer_phone: normalizePhone(customer.phone),
      customer_email: customer.email || undefined,
      customer_name: customer.name || undefined,
    },
    order_meta: {
      notify_url: notifyUrl || undefined,
      return_url: returnUrl || undefined,
      payment_methods: 'upi',
    },
    order_note: 'WAREZONE tournament / wallet payment',
  };

  const order = await cashfreeFetch('/orders', { method: 'POST', body });
  return { order, expiry };
}

/**
 * S2S Order Pay — UPI QR channel.
 * Merchant dashboard must have Server-to-Server (S2S) enabled for QR.
 */
async function createUpiQrPayment(paymentSessionId, expiryMinutes) {
  assertCashfreeReady();
  const body = {
    payment_session_id: paymentSessionId,
    payment_method: {
      upi: {
        channel: 'qrcode',
        upi_expiry_minutes: expiryMinutes || getCashfreeConfig().qrExpiryMinutes,
      },
    },
  };

  const pay = await cashfreeFetch('/orders/sessions', { method: 'POST', body });
  return {
    pay,
    qr: extractQrDetails(pay),
  };
}

function extractQrDetails(pay) {
  const data = pay?.data || {};
  const payload = data.payload;

  let qrPayload = null;
  let qrImageUrl = null;

  const asImageIfLarge = (value) => {
    if (value == null) return;
    const s = String(value).trim();
    if (!s) return;
    if (s.startsWith('data:image') || /^https?:\/\//i.test(s)) {
      qrImageUrl = qrImageUrl || s;
      return;
    }
    if (/^upi:\/\//i.test(s) && s.length <= 800) {
      qrPayload = qrPayload || s;
      return;
    }
    // Cashfree often returns raw base64 PNG for UPI QR (too large for client QR lib)
    if (s.length > 800 || /^[A-Za-z0-9+/=\s]{200,}$/.test(s)) {
      qrImageUrl =
        qrImageUrl ||
        (s.startsWith('data:') ? s : `data:image/png;base64,${s.replace(/\s/g, '')}`);
      return;
    }
    qrPayload = qrPayload || s;
  };

  if (typeof payload === 'string') {
    asImageIfLarge(payload);
  } else if (payload && typeof payload === 'object') {
    asImageIfLarge(
      payload.qrcode || payload.qr_code || payload.qr || payload.upi_qr || payload.intent || null
    );
    const img =
      payload.qrcode_url ||
      payload.qr_url ||
      payload.image ||
      payload.url ||
      payload.base64 ||
      null;
    if (img) asImageIfLarge(img);
  }

  if (!qrImageUrl && typeof data.url === 'string') {
    asImageIfLarge(data.url);
  }

  return {
    cfPaymentId: pay?.cf_payment_id != null ? String(pay.cf_payment_id) : null,
    channel: pay?.channel || 'qrcode',
    action: pay?.action,
    qrPayload,
    qrImageUrl,
    rawData: {
      ...data,
      // Avoid persisting huge base64 twice in logs/DB consumers of rawData
      payload:
        typeof data.payload === 'string' && data.payload.length > 200
          ? `[omitted ${data.payload.length} chars]`
          : data.payload,
    },
  };
}

async function getOrder(orderId) {
  return cashfreeFetch(`/orders/${encodeURIComponent(orderId)}`);
}

async function getOrderPayments(orderId) {
  return cashfreeFetch(`/orders/${encodeURIComponent(orderId)}/payments`);
}

/**
 * Cashfree webhook signature verification (timestamp + raw body).
 * @see https://www.cashfree.com/docs/payments/online/webhooks/signature-verification
 */
function verifyWebhookSignature({ rawBody, timestamp, signature }) {
  const cfg = getCashfreeConfig();
  if (!cfg.configured) return false;
  if (!timestamp || !signature || rawBody == null) return false;

  const signedPayload = `${timestamp}${rawBody}`;
  const expected = crypto
    .createHmac('sha256', cfg.webhookSecret)
    .update(signedPayload)
    .digest('base64');

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  // Cashfree requires a phone; placeholder only when profile incomplete
  return '9999999999';
}

function mapCfStatusToLocal(orderStatus, paymentStatus) {
  const ps = String(paymentStatus || '').toUpperCase();
  const os = String(orderStatus || '').toUpperCase();

  if (['SUCCESS', 'PAID'].includes(ps) || os === 'PAID') return 'SUCCESS';
  if (['FAILED', 'CANCELLED', 'EXPIRED', 'USER_DROPPED'].includes(ps)) return ps;
  if (['ACTIVE', 'PENDING', 'NOT_ATTEMPTED'].includes(ps) || ['ACTIVE', 'PENDING'].includes(os)) {
    return 'PENDING';
  }
  if (os === 'EXPIRED') return 'EXPIRED';
  return 'PENDING';
}

module.exports = {
  createOrder,
  createUpiQrPayment,
  getOrder,
  getOrderPayments,
  verifyWebhookSignature,
  extractQrDetails,
  mapCfStatusToLocal,
  getCashfreeConfig,
};
