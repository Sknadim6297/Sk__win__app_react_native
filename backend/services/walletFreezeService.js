const User = require('../models/User');
const WalletFreeze = require('../models/WalletFreeze');
const { logAdminAction } = require('./adminAudit');
const { notifyUser, buildEventKey, SCREENS } = require('./notificationService');

async function getWithdrawableBalance(userId) {
  const user = await User.findById(userId).select('wallet');
  const balance = Number(user?.wallet?.balance) || 0;
  const frozen = Number(user?.wallet?.frozenBalance) || 0;
  return Math.max(0, balance - frozen);
}

async function freezeAmount({
  userId,
  amount,
  reason,
  adminId,
  payoutId,
  transactionId,
}) {
  const amt = Number(amount) || 0;
  if (amt <= 0) {
    const err = new Error('Freeze amount must be positive');
    err.status = 400;
    throw err;
  }

  const available = await getWithdrawableBalance(userId);
  if (available < amt) {
    const err = new Error(
      `Cannot freeze ₹${amt}. Available (balance − frozen) is ₹${available}.`
    );
    err.code = 'INSUFFICIENT_AVAILABLE';
    err.status = 400;
    throw err;
  }

  const freeze = await WalletFreeze.create({
    userId,
    amount: amt,
    reason: reason || 'Disputed amount',
    adminId,
    payoutId,
    transactionId,
    status: 'active',
  });

  await User.updateOne({ _id: userId }, { $inc: { 'wallet.frozenBalance': amt } });

  await logAdminAction({
    adminId,
    action: 'WITHDRAWAL_FROZEN',
    userId,
    payoutId,
    amount: amt,
    reason,
  });

  await notifyUser({
    userId,
    title: 'Withdrawal Amount Frozen',
    message: `₹${amt} in your wallet has been frozen by admin. Reason: ${reason || 'Under review'}.`,
    type: 'wallet',
    eventKey: buildEventKey(['wallet_freeze', freeze._id]),
    deepLink: SCREENS.WALLET,
    data: { screen: SCREENS.WALLET },
  }).catch(() => {});

  return freeze;
}

async function releaseFreeze(freezeId, adminId) {
  const freeze = await WalletFreeze.findOneAndUpdate(
    { _id: freezeId, status: 'active' },
    {
      $set: {
        status: 'released',
        releasedAt: new Date(),
        releasedByAdminId: adminId,
      },
    },
    { new: true }
  );
  if (!freeze) {
    const err = new Error('Active freeze not found');
    err.status = 404;
    throw err;
  }

  await User.updateOne(
    { _id: freeze.userId, 'wallet.frozenBalance': { $gte: freeze.amount } },
    { $inc: { 'wallet.frozenBalance': -freeze.amount } }
  );

  const user = await User.findById(freeze.userId).select('wallet.frozenBalance');
  if (user && (user.wallet.frozenBalance || 0) < 0) {
    user.wallet.frozenBalance = 0;
    await user.save();
  }

  await logAdminAction({
    adminId,
    action: 'WITHDRAWAL_UNFROZEN',
    userId: freeze.userId,
    amount: freeze.amount,
    meta: { freezeId },
  });

  return freeze;
}

module.exports = { freezeAmount, releaseFreeze, getWithdrawableBalance };
