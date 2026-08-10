const truthy = (v) => String(v || '').toLowerCase() === 'true' || v === '1';

function getCashfreeConfig() {
  const appId = String(
    process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || ''
  ).trim();
  const secretKey = String(
    process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET || ''
  ).trim();
  const env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase();
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
    env: env === 'production' ? 'production' : 'sandbox',
    baseUrl,
    apiVersion: process.env.CASHFREE_API_VERSION || '2023-08-01',
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || secretKey,
    qrExpiryMinutes,
    minAmount: 10,
    maxAmount: 10000,
    currency: 'INR',
  };
}

/** Safe auth diagnostics — never logs the secret value */
function logCashfreeAuthDiagnostics(extra = {}) {
  const cfg = getCashfreeConfig();
  console.log(`[CASHFREE] ENV=${cfg.env}`);
  console.log(`[CASHFREE] CLIENT_ID_PRESENT=${Boolean(cfg.appId)}`);
  console.log(`[CASHFREE] CLIENT_SECRET_PRESENT=${Boolean(cfg.secretKey)}`);
  console.log(`[CASHFREE] CLIENT_ID_PREFIX=${cfg.appId ? String(cfg.appId).slice(0, 8) + '…' : '(missing)'}`);
  console.log(`[CASHFREE] API_VERSION=${cfg.apiVersion}`);
  console.log(`[CASHFREE] BASE_URL=${cfg.baseUrl}`);
  if (extra.httpStatus != null) {
    console.log(`[CASHFREE] Cashfree HTTP status=${extra.httpStatus}`);
  }
  if (extra.path) {
    console.log(`[CASHFREE] PATH=${extra.path}`);
  }
  if (extra.message) {
    console.log(`[CASHFREE] RESPONSE_MESSAGE=${extra.message}`);
  }
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
      'Cashfree credentials missing. Set CASHFREE_APP_ID (or CASHFREE_CLIENT_ID) and CASHFREE_SECRET_KEY (or CASHFREE_CLIENT_SECRET) in backend/.env'
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
  logCashfreeAuthDiagnostics,
};
