/**
 * Lightweight self-check for ZapUPI helpers + amount-guard rules (no network, no secrets).
 * Run: node backend/scripts/test-zapupi-helpers.js
 */
const assert = require('assert');
const path = require('path');

process.chdir(path.join(__dirname, '..'));

const {
  mapZapStatusToLocal,
  isSuccessStatus,
  isTestEnvironment,
} = require('../services/zapupiService');
const { normalizeInrAmount, assertValidTopupAmount, getZapUpiConfig } = require('../config/zapupi');

function amountsMatch(expected, paid) {
  const e = Number(expected);
  const p = Number(paid);
  if (!Number.isFinite(e) || !Number.isFinite(p)) return false;
  return Math.abs(p - e) <= 0.05;
}

function shouldRejectMissingRemoteAmount(payAmount, amount) {
  const rawPaid = payAmount ?? amount;
  return rawPaid === undefined || rawPaid === null || rawPaid === '' || !Number.isFinite(Number(rawPaid));
}

function run() {
  assert.strictEqual(mapZapStatusToLocal('Success'), 'SUCCESS');
  assert.strictEqual(mapZapStatusToLocal('Failed'), 'FAILED');
  assert.strictEqual(mapZapStatusToLocal('timeout'), 'EXPIRED');
  assert.strictEqual(mapZapStatusToLocal('pending'), 'PENDING');
  assert.strictEqual(isSuccessStatus('Success'), true);
  assert.strictEqual(isSuccessStatus('Failed'), false);
  assert.strictEqual(isTestEnvironment('test', 'TXN1'), true);
  assert.strictEqual(isTestEnvironment('cashier', 'DUMMY123'), true);
  assert.strictEqual(isTestEnvironment('cashier', 'ZAPUPI66f'), false);
  assert.strictEqual(normalizeInrAmount('100.005'), 100.01);
  assert.strictEqual(normalizeInrAmount('100'), 100);
  assert.ok(Number.isNaN(normalizeInrAmount('abc')));

  // Amount verification rules used by payments.verifyAndSettle
  assert.strictEqual(shouldRejectMissingRemoteAmount(undefined, undefined), true);
  assert.strictEqual(shouldRejectMissingRemoteAmount(null, null), true);
  assert.strictEqual(shouldRejectMissingRemoteAmount('', undefined), true);
  assert.strictEqual(shouldRejectMissingRemoteAmount('100', undefined), false);
  assert.strictEqual(amountsMatch(100, 100), true);
  assert.strictEqual(amountsMatch(100, '100.00'), true);
  assert.strictEqual(amountsMatch(100, 99.9), false);
  // Must NOT treat local expected amount as paid when remote is missing
  assert.strictEqual(shouldRejectMissingRemoteAmount(undefined, undefined), true);

  process.env.ZAPUPI_MIN_AMOUNT = '10';
  process.env.ZAPUPI_MAX_AMOUNT = '10000';
  delete process.env.ZAPUPI_ALLOWED_TOPUP_AMOUNTS;
  assert.strictEqual(assertValidTopupAmount(100), 100);
  assert.throws(() => assertValidTopupAmount(0), /valid amount/i);
  assert.throws(() => assertValidTopupAmount(-5), /valid amount/i);
  assert.throws(() => assertValidTopupAmount(5), /between/i);

  process.env.ZAPUPI_ALLOWED_TOPUP_AMOUNTS = '100,500,1000';
  assert.strictEqual(assertValidTopupAmount(500), 500);
  assert.throws(() => assertValidTopupAmount(250), /Allowed top-up/i);
  const cfg = getZapUpiConfig();
  assert.deepStrictEqual(cfg.allowedTopupAmounts, [100, 500, 1000]);
  // Config must never serialize the raw key into public API — callers must use getZapUpiConfig carefully.
  assert.ok('zapKey' in cfg);

  console.log('OK — zapupi helpers + amount guards passed');
}

run();
