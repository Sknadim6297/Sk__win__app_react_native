const truthy = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
};

/** Normalize INR amount for comparison / storage (2 decimal places max). */
function normalizeInrAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100) / 100;
}

function getZapUpiConfig() {
  // Prefer ZAPUPI_KEY; accept aliases so dashboard docs naming still works.
  const zapKey = String(
    process.env.ZAPUPI_KEY || process.env.ZAPUPI_ZAP_KEY || process.env.ZAP_KEY || ''
  ).trim();
  const env = String(process.env.ZAPUPI_ENV || 'test').trim().toLowerCase();
  const enabled = process.env.ZAPUPI_ENABLED === undefined || process.env.ZAPUPI_ENABLED === ''
    ? true
    : truthy(process.env.ZAPUPI_ENABLED);
  const configured = Boolean(zapKey);

  const minAmount = Math.max(1, parseInt(process.env.ZAPUPI_MIN_AMOUNT || '1', 10) || 1);
  const maxAmount = Math.max(minAmount, parseInt(process.env.ZAPUPI_MAX_AMOUNT || '10000', 10) || 10000);

  // Optional comma list. Empty = any amount within min/max is allowed.
  const allowedRaw = String(process.env.ZAPUPI_ALLOWED_TOPUP_AMOUNTS || '').trim();
  const allowedTopupAmounts = allowedRaw
    ? allowedRaw
        .split(',')
        .map((x) => normalizeInrAmount(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];

  return {
    enabled,
    configured,
    ready: enabled && configured,
    zapKey,
    env: env === 'production' || env === 'cashier' || env === 'zappay' ? env : 'test',
    acceptTestWebhooks: env !== 'production' && env !== 'cashier' && env !== 'zappay',
    baseUrl: 'https://pay.zapupi.com/api',
    createOrderUrl: 'https://pay.zapupi.com/api/create-order',
    orderStatusUrl: 'https://pay.zapupi.com/api/order-status',
    successUrl: 'https://zapupi.com/payment?s=s',
    failedUrl: 'https://zapupi.com/payment?s=f',
    timeoutUrl: 'https://zapupi.com/payment?s=t',
    minAmount,
    maxAmount,
    allowedTopupAmounts,
    currency: 'INR',
    orderExpiryMinutes: Math.min(Math.max(parseInt(process.env.ZAPUPI_ORDER_EXPIRY_MINUTES || '20', 10) || 20, 5), 60),
  };
}

function assertValidTopupAmount(amount) {
  const cfg = getZapUpiConfig();
  const amountNum = normalizeInrAmount(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    const err = new Error('Please enter a valid amount.');
    err.code = 'INVALID_AMOUNT';
    err.status = 400;
    throw err;
  }
  if (amountNum < cfg.minAmount || amountNum > cfg.maxAmount) {
    const err = new Error(`Enter an amount between ₹${cfg.minAmount} and ₹${cfg.maxAmount}.`);
    err.code = 'INVALID_AMOUNT';
    err.status = 400;
    throw err;
  }
  if (cfg.allowedTopupAmounts.length && !cfg.allowedTopupAmounts.includes(amountNum)) {
    const err = new Error(
      `Allowed top-up amounts: ₹${cfg.allowedTopupAmounts.join(', ₹')}`
    );
    err.code = 'INVALID_AMOUNT';
    err.status = 400;
    throw err;
  }
  return amountNum;
}

function assertZapUpiReady() {
  const cfg = getZapUpiConfig();
  if (!cfg.enabled) {
    const err = new Error('ZapUPI payments are not enabled. Set ZAPUPI_ENABLED=true in backend/.env');
    err.code = 'ZAPUPI_DISABLED';
    err.status = 503;
    throw err;
  }
  if (!cfg.configured) {
    const err = new Error('ZapUPI is not configured. Set ZAPUPI_KEY in backend/.env (never put the key in the app).');
    err.code = 'ZAPUPI_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  return cfg;
}

module.exports = {
  getZapUpiConfig,
  assertZapUpiReady,
  assertValidTopupAmount,
  normalizeInrAmount,
};
