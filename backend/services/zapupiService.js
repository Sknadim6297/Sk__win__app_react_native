const { assertZapUpiReady, getZapUpiConfig } = require('../config/zapupi');

function createdLogSafe(orderId) {
  return String(orderId || '').slice(0, 24);
}

async function zapupiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.message || data.error || `ZapUPI HTTP ${res.status}`);
    err.status = res.status >= 400 && res.status < 500 ? res.status : 502;
    err.code = 'ZAPUPI_API_ERROR';
    err.payload = data;
    throw err;
  }
  return data;
}

function amountString(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount || '');
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

/**
 * POST https://pay.zapupi.com/api/create-order
 * zap_key stays on the server.
 */
async function createOrder({
  orderId,
  amount,
  customerMobile,
  remark,
  webhookUrl,
}) {
  const cfg = assertZapUpiReady();
  const payload = {
    zap_key: cfg.zapKey,
    order_id: orderId,
    amount: amountString(amount),
    success_url: cfg.successUrl,
    failed_url: cfg.failedUrl,
    timeout_url: cfg.timeoutUrl,
  };
  if (customerMobile) payload.customer_mobile = String(customerMobile).replace(/\D/g, '').slice(-10);
  if (remark) payload.remark = String(remark);
  if (webhookUrl) payload.webhook_url = webhookUrl;

  const data = await zapupiPost(cfg.createOrderUrl, payload);
  const status = String(data.status || data.result || '').toLowerCase();
  const paymentUrl =
    data.payment_url ||
    data.paymentUrl ||
    data.data?.payment_url ||
    data.data?.paymentUrl ||
    data.url;
  const failed =
    status &&
    !['success', 'ok', 'true', '1', 'pending', 'created'].includes(status) &&
    status !== 'pay';
  if (failed) {
    const err = new Error(data.message || data.error || 'ZapUPI create-order failed');
    err.status = 502;
    err.code = 'ZAPUPI_API_ERROR';
    err.payload = { ...data, zap_key: undefined };
    throw err;
  }
  if (!paymentUrl) {
    const err = new Error(data.message || 'ZapUPI did not return a payment_url');
    err.status = 502;
    err.code = 'ZAPUPI_API_ERROR';
    err.payload = { status: data.status, message: data.message };
    throw err;
  }
  console.log('[ZAPUPI] order created', createdLogSafe(data.order_id || orderId));
  return {
    paymentUrl,
    orderId: data.order_id || orderId,
    raw: { status: data.status, order_id: data.order_id || orderId },
  };
}

/**
 * POST https://pay.zapupi.com/api/order-status
 */
async function getOrderStatus(orderId) {
  const cfg = assertZapUpiReady();
  const data = await zapupiPost(cfg.orderStatusUrl, {
    zap_key: cfg.zapKey,
    order_id: orderId,
  });
  const inner = data.data && typeof data.data === 'object' ? data.data : data;
  return {
    ok: String(data.status || '').toLowerCase() === 'success' || Boolean(inner.status),
    orderId: inner.order_id || orderId,
    status: inner.status || data.order_status || '',
    amount: inner.amount,
    payAmount: inner.pay_amount,
    txnId: inner.txn_id || inner.txnId || '',
    utr: inner.utr || '',
    environment: inner.environment || '',
    raw: data,
  };
}

function mapZapStatusToLocal(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'success' || s === 'paid' || s === 'completed') return 'SUCCESS';
  if (s === 'failed' || s === 'failure' || s === 'fail') return 'FAILED';
  if (s === 'timeout' || s === 'expired') return 'EXPIRED';
  if (s === 'cancelled' || s === 'canceled') return 'CANCELLED';
  if (s === 'pending' || s === 'created' || s === 'initiated') return 'PENDING';
  return 'PENDING';
}

function isSuccessStatus(status) {
  return mapZapStatusToLocal(status) === 'SUCCESS';
}

function isTestEnvironment(environment, txnId) {
  const e = String(environment || '').toLowerCase();
  const t = String(txnId || '');
  return e === 'test' || t.startsWith('DUMMY');
}

module.exports = {
  createOrder,
  getOrderStatus,
  mapZapStatusToLocal,
  isSuccessStatus,
  isTestEnvironment,
  getZapUpiConfig,
};
