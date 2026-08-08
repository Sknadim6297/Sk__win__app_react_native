/**
 * Master payment switch for testing phase.
 * When PAYMENT_ENABLED=false, no real-money payment / top-up / gateway calls run.
 * Set PAYMENT_ENABLED=true in backend/.env to re-enable (still requires Cashfree credentials).
 */

const truthy = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
};

const PAYMENT_DISABLED_MESSAGE =
  'Payment is currently disabled for testing. Real-money deposits and gateway payments are turned off.';

const WITHDRAW_DISABLED_MESSAGE =
  'Withdrawals are currently disabled for testing. Payment features will return when testing is complete.';

/**
 * Master switch. Defaults to false when unset (safe for testing).
 */
function isPaymentEnabled() {
  const raw = process.env.PAYMENT_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return false;
  }
  return truthy(raw);
}

function assertPaymentsEnabled() {
  if (!isPaymentEnabled()) {
    const err = new Error(PAYMENT_DISABLED_MESSAGE);
    err.code = 'PAYMENT_DISABLED';
    err.status = 503;
    throw err;
  }
}

/** Express middleware — blocks payment-related routes while testing. */
function requirePaymentsEnabled(req, res, next) {
  if (!isPaymentEnabled()) {
    return res.status(503).json({
      success: false,
      code: 'PAYMENT_DISABLED',
      enabled: false,
      message: PAYMENT_DISABLED_MESSAGE,
    });
  }
  return next();
}

module.exports = {
  isPaymentEnabled,
  assertPaymentsEnabled,
  requirePaymentsEnabled,
  PAYMENT_DISABLED_MESSAGE,
  WITHDRAW_DISABLED_MESSAGE,
};
