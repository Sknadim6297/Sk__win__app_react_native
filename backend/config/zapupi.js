const truthy = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
};

function getZapUpiConfig() {
  const zapKey = String(process.env.ZAPUPI_KEY || process.env.ZAP_KEY || '').trim();
  const env = String(process.env.ZAPUPI_ENV || 'test').trim().toLowerCase();
  const enabled = process.env.ZAPUPI_ENABLED === undefined || process.env.ZAPUPI_ENABLED === ''
    ? true
    : truthy(process.env.ZAPUPI_ENABLED);
  const configured = Boolean(zapKey);

  const minAmount = Math.max(1, parseInt(process.env.ZAPUPI_MIN_AMOUNT || '1', 10) || 1);
  const maxAmount = Math.max(minAmount, parseInt(process.env.ZAPUPI_MAX_AMOUNT || '10000', 10) || 10000);

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
    currency: 'INR',
    orderExpiryMinutes: Math.min(Math.max(parseInt(process.env.ZAPUPI_ORDER_EXPIRY_MINUTES || '20', 10) || 20, 5), 60),
  };
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
};
