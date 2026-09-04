const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const { notifyWalletCredited } = require('./tournamentPushEvents');
const { buildEventKey } = require('./notificationService');

/**
 * Idempotent wallet credit after verified ZapUPI SUCCESS.
 *
 * Order of operations (crash-safe):
 * 1) Ensure unique ledger row exists (transactionId = ZAP_{orderId})
 * 2) Atomically claim balanceApplied on that row
 * 3) $inc user wallet only when claim succeeds
 * 4) Mark PaymentOrder.walletCredited
 *
 * Never set walletCredited before the balance is applied.
 */
async function creditWalletForPaymentOrder(paymentOrder, { source = 'api', txnId, utr } = {}) {
  if (!paymentOrder) {
    return { credited: false, reason: 'ORDER_NOT_FOUND' };
  }

  if (!['SUCCESS', 'PAID'].includes(paymentOrder.status)) {
    return { credited: false, reason: 'NOT_SUCCESS' };
  }

  if (paymentOrder.walletCredited) {
    return {
      credited: false,
      reason: 'ALREADY_CREDITED',
      transactionId: paymentOrder.walletTransactionId,
      balance: undefined,
    };
  }

  const amount = Number(paymentOrder.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { credited: false, reason: 'INVALID_AMOUNT' };
  }

  const txnKey = `ZAP_${paymentOrder.orderId}`;
  const zapupiTxnId = paymentOrder.zapupiTxnId || (txnId ? String(txnId) : undefined);
  const zapupiUtr = paymentOrder.zapupiUtr || (utr ? String(utr) : undefined);

  let ledger;
  try {
    ledger = await WalletTransaction.findOne({ transactionId: txnKey });
    if (!ledger) {
      try {
        ledger = await WalletTransaction.create({
          userId: paymentOrder.userId,
          type: 'deposit',
          amount,
          paymentMethod: 'ZapUPI',
          transactionId: txnKey,
          description: `₹${amount} Added via ZapUPI`,
          status: 'pending',
          balanceApplied: false,
          paymentOrderId: paymentOrder._id,
          zapupiTxnId,
          zapupiUtr,
        });
      } catch (createErr) {
        if (createErr?.code !== 11000) throw createErr;
        ledger = await WalletTransaction.findOne({ transactionId: txnKey });
      }
    }
  } catch (error) {
    throw error;
  }

  if (!ledger) {
    return { credited: false, reason: 'LEDGER_CREATE_FAILED' };
  }

  // Claim the right to apply balance exactly once
  const claimed = await WalletTransaction.findOneAndUpdate(
    {
      _id: ledger._id,
      balanceApplied: { $ne: true },
    },
    {
      $set: {
        balanceApplied: true,
        status: 'completed',
        ...(zapupiTxnId ? { zapupiTxnId } : {}),
        ...(zapupiUtr ? { zapupiUtr } : {}),
      },
    },
    { new: true }
  );

  let newlyCredited = false;
  let balance;

  if (claimed) {
    const user = await User.findByIdAndUpdate(
      paymentOrder.userId,
      {
        $inc: {
          'wallet.balance': amount,
          'wallet.totalDeposited': amount,
        },
      },
      { new: true }
    );

    if (!user) {
      // Roll back claim so a later retry can re-attempt after user exists / is fixed
      await WalletTransaction.findByIdAndUpdate(claimed._id, {
        balanceApplied: false,
        status: 'pending',
      });
      return { credited: false, reason: 'USER_NOT_FOUND' };
    }

    newlyCredited = true;
    balance = user.wallet.balance;

    try {
      await notifyWalletCredited(paymentOrder.userId, amount, {
        eventKey: buildEventKey(['wallet_zapupi', claimed._id]),
        description: `₹${amount} has been credited to your wallet.`,
      });
    } catch (_) {
      /* non-fatal */
    }

    await PaymentLog.create({
      orderId: paymentOrder.orderId,
      paymentOrderId: paymentOrder._id,
      userId: paymentOrder.userId,
      event: 'WALLET_CREDITED',
      source,
      message: `Credited ₹${amount} to wallet`,
      success: true,
      responsePayload: {
        balance,
        transactionId: claimed._id,
      },
    }).catch(() => {});
  } else {
    const user = await User.findById(paymentOrder.userId).select('wallet.balance');
    balance = user?.wallet?.balance;
  }

  const updatedOrder = await PaymentOrder.findByIdAndUpdate(
    paymentOrder._id,
    {
      $set: {
        walletCredited: true,
        walletTransactionId: (claimed || ledger)._id,
        status: 'SUCCESS',
        lastVerifiedAt: new Date(),
        ...(zapupiTxnId ? { zapupiTxnId } : {}),
        ...(zapupiUtr ? { zapupiUtr } : {}),
      },
    },
    { new: true }
  );

  // Keep in-memory doc in sync for callers
  if (updatedOrder) {
    paymentOrder.walletCredited = true;
    paymentOrder.walletTransactionId = updatedOrder.walletTransactionId;
    paymentOrder.status = 'SUCCESS';
  }

  return {
    credited: newlyCredited,
    reason: newlyCredited ? 'CREDITED' : 'ALREADY_CREDITED',
    balance,
    transactionId: (claimed || ledger)._id,
    amount,
  };
}

module.exports = {
  creditWalletForPaymentOrder,
};
