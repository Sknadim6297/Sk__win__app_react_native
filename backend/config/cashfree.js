const truthy = (v) => String(v || '').toLowerCase() === 'true' || v === '1';

function getCashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || '';
  const secretKey = process.env.CASHFREE_SECRET_KEY || '';
  const env = (process.env.CASHFREE_ENV || 'production').toLowerCase();
  const enabled = truthy(process.env.CASHFREE_ENABLED);
  const configured = Boolean(appId && secretKey);

  const baseUrl =
    env === 'sandbox'
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';

  // Cashfree order_expiry_time must be > 15 minutes and < 30 days
  const rawExpiry = parseInt(process.env.CASHFREE_QR_EXPIRY_MINUTES || '20', 10) || 20;
  const qrExpiryMinutes = Math.min(Math.max(rawExpiry, 16), 60 * 24 * 29);

  return {
    enabled,
    configured,
    ready: enabled && configured,
    appId,
    secretKey,
    env: env === 'sandbox' ? 'sandbox' : 'production',
    baseUrl,
    apiVersion: process.env.CASHFREE_API_VERSION || '2023-08-01',
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || secretKey,
    qrExpiryMinutes,
    minAmount: 10,
    maxAmount: 10000,
    currency: 'INR',
  };
}

function assertCashfreeReady() {
  const cfg = getCashfreeConfig();
  if (!cfg.enabled) {
    const err = new Error('Cashfree QR payments are not enabled. Set CASHFREE_ENABLED=true in backend/.env');
    err.code = 'CASHFREE_DISABLED';
    err.status = 503;
    throw err;
  }
  if (!cfg.configured) {
    const err = new Error(
      'Cashfree credentials missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in backend/.env'
    );
    err.code = 'CASHFREE_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  return cfg;
}

module.exports = {
  getCashfreeConfig,
  assertCashfreeReady,
};
