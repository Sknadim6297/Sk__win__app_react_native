/**
 * Repair wallet top-ups that received ZapUPI Success webhooks but were never credited
 * because order-status API returned "Order not found" (common in test/sandbox).
 *
 * Usage: node scripts/repair-zapupi-stuck-credits.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const PaymentOrder = require('../models/PaymentOrder');
  const PaymentLog = require('../models/PaymentLog');
  const User = require('../models/User');
  const { creditWalletForPaymentOrder } = require('../services/walletCreditService');
  const zapupi = require('../services/zapupiService');

  const stuck = await PaymentOrder.find({
    purpose: 'wallet_topup',
    walletCredited: false,
    status: { $in: ['PENDING', 'CANCELLED', 'CREATED', 'EXPIRED'] },
  }).sort({ createdAt: -1 });

  console.log(`Found ${stuck.length} uncredited wallet orders`);

  let credited = 0;
  for (const order of stuck) {
    let payload = order.lastWebhookPayload;
    if (!payload) {
      const log = await PaymentLog.findOne({
        orderId: order.orderId,
        event: 'WEBHOOK_RECEIVED',
      }).sort({ createdAt: -1 });
      payload = log?.requestPayload || null;
      if (payload) {
        order.lastWebhookPayload = payload;
        if (payload.txn_id) order.zapupiTxnId = String(payload.txn_id);
        if (payload.utr) order.zapupiUtr = String(payload.utr);
        if (payload.environment) order.zapupiEnvironment = String(payload.environment);
        await order.save();
      }
    }

    if (!payload || !zapupi.isSuccessStatus(payload.status)) {
      console.log('SKIP (no success webhook)', order.orderId, order.status, order.amount);
      continue;
    }

    const paid = Number(payload.pay_amount ?? payload.amount);
    const expected = Number(order.amount);
    if (!Number.isFinite(paid) || Math.abs(paid - expected) > 0.05) {
      console.log('SKIP (amount mismatch)', order.orderId, { paid, expected });
      continue;
    }

    order.status = 'SUCCESS';
    order.failureReason = undefined;
    await order.save();

    const result = await creditWalletForPaymentOrder(order, {
      source: 'repair_script',
      txnId: payload.txn_id || payload.txnId,
      utr: payload.utr,
    });

    const user = await User.findById(order.userId).select('wallet.balance username email');
    console.log('CREDITED', {
      orderId: order.orderId,
      amount: order.amount,
      reason: result.reason,
      newlyCredited: result.credited,
      balance: result.balance ?? user?.wallet?.balance,
      user: user?.username || user?.email || String(order.userId),
    });
    if (result.credited || result.reason === 'ALREADY_CREDITED') credited += 1;
  }

  console.log(`Done. Settled ${credited} order(s).`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
