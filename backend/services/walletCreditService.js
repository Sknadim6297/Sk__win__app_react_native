const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const { notifyWalletCredited } = require('./tournamentPushEvents');
const { buildEventKey } = require('./notificationService');

/**
 * Idempotent wallet credit after verified ZapUPI SUCCESS.
 * Uses atomic findOneAndUpdate (no replica-set transactions required).
 */
async function creditWalletForPaymentOrder(paymentOrder, { source = 'api', txnId, utr } = {}) {
  if (!paymentOrder) {
    return { credited: false, reason: 'ORDER_NOT_FOUND' };
  }

  if (paymentOrder.walletCredited) {
    return {
      credited: false,
      reason: 'ALREADY_CREDITED',
      transactionId: paymentOrder.walletTransactionId,
    };
  }

  if (!['SUCCESS', 'PAID'].includes(paymentOrder.status)) {
    return { credited: false, reason: 'NOT_SUCCESS' };
  }

  const claim = await PaymentOrder.findOneAndUpdate(
    {
      _id: paymentOrder._id,
      walletCredited: false,
      status: { $in: ['SUCCESS', 'PAID'] },
    },
    {
      $set: {
        walletCredited: true,
        ...(txnId ? { zapupiTxnId: String(txnId) } : {}),
        ...(utr ? { zapupiUtr: String(utr) } : {}),
        lastVerifiedAt: new Date(),
        status: 'SUCCESS',
      },
    },
    { new: true }
  );

  if (!claim) {
    const again = await PaymentOrder.findById(paymentOrder._id);
    return {
      credited: false,
      reason: 'ALREADY_CREDITED',
      transactionId: again?.walletTransactionId,
    };
  }

  const amount = Number(claim.amount);
  const txnKey = `ZAP_${claim.orderId}`;

  try {
    const existingTxn = await WalletTransaction.findOne({ transactionId: txnKey });
    if (existingTxn) {
      claim.walletTransactionId = existingTxn._id;
      await claim.save();
      return { credited: false, reason: 'ALREADY_CREDITED', transactionId: existingTxn._id };
    }

    const user = await User.findById(claim.userId);
    if (!user) {
      await PaymentOrder.findByIdAndUpdate(claim._id, {
        walletCredited: false,
        failureReason: 'USER_NOT_FOUND',
      });
      return { credited: false, reason: 'USER_NOT_FOUND' };
    }

    const transaction = await WalletTransaction.create({
      userId: claim.userId,
      type: 'deposit',
      amount,
      paymentMethod: 'ZapUPI',
      transactionId: txnKey,
      description: `₹${amount} Added via ZapUPI`,
      status: 'completed',
      paymentOrderId: claim._id,
      zapupiTxnId: claim.zapupiTxnId || (txnId ? String(txnId) : undefined),
      zapupiUtr: claim.zapupiUtr || (utr ? String(utr) : undefined),
    });

    user.wallet.balance = (user.wallet.balance || 0) + amount;
    user.wallet.totalDeposited = (user.wallet.totalDeposited || 0) + amount;
    await user.save();

    claim.walletTransactionId = transaction._id;
    await claim.save();

    await PaymentLog.create({
      orderId: claim.orderId,
      paymentOrderId: claim._id,
      userId: claim.userId,
      event: 'WALLET_CREDITED',
      source,
      message: `Credited ₹${amount} to wallet`,
      success: true,
      responsePayload: {
        balance: user.wallet.balance,
        transactionId: transaction._id,
      },
    });

    try {
      await notifyWalletCredited(claim.userId, amount, {
        eventKey: buildEventKey(['wallet_zapupi', transaction._id]),
        description: `₹${amount} has been credited to your wallet.`,
      });
    } catch (_) {
      /* non-fatal */
    }

    return {
      credited: true,
      balance: user.wallet.balance,
      transactionId: transaction._id,
      amount,
    };
  } catch (error) {
    if (error?.code === 11000) {
      const again = await PaymentOrder.findById(paymentOrder._id);
      return {
        credited: false,
        reason: 'DUPLICATE',
        transactionId: again?.walletTransactionId,
      };
    }

    await PaymentOrder.findByIdAndUpdate(paymentOrder._id, {
      walletCredited: false,
      failureReason: error.message,
    });
    throw error;
  }
}

module.exports = {
  creditWalletForPaymentOrder,
};
