import Constants from 'expo-constants';

/**
 * Master payment switch (testing phase).
 * Set EXPO_PUBLIC_PAYMENT_ENABLED=true in root .env / eas.json to re-enable.
 * Defaults to false when unset (safe for testing — no accidental real payments).
 */

export const PAYMENT_DISABLED_MESSAGE =
  'Payment is currently disabled for testing. Real-money deposits are turned off.';

export const WITHDRAW_DISABLED_MESSAGE =
  'Withdrawals are currently disabled for testing.';

function readFlag() {
  const fromEnv = process.env.EXPO_PUBLIC_PAYMENT_ENABLED;
  const fromExtra = Constants.expoConfig?.extra?.paymentEnabled;
  if (fromEnv !== undefined && fromEnv !== null && String(fromEnv).trim() !== '') {
    return fromEnv;
  }
  if (fromExtra !== undefined && fromExtra !== null && String(fromExtra).trim() !== '') {
    return fromExtra;
  }
  return 'false';
}

export function isPaymentEnabled() {
  const s = String(readFlag()).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

export function getPaymentDisabledError(kind = 'deposit') {
  const message = kind === 'withdraw' ? WITHDRAW_DISABLED_MESSAGE : PAYMENT_DISABLED_MESSAGE;
  const err = new Error(message);
  err.code = 'PAYMENT_DISABLED';
  return err;
}
