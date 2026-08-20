const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const WalletTransaction = require('../models/WalletTransaction');
const TournamentRefund = require('../models/TournamentRefund');
const { logAdminAction } = require('./adminAudit');
const { notifyUser, buildEventKey, SCREENS } = require('./notificationService');
const matchStructure = require('./matchStructure');

/**
 * Cancel tournament + idempotent entry-fee refunds for all paid participants.
 */
async function cancelTournamentWithRefunds(tournamentId, adminId, reason = 'Cancelled by admin') {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    const err = new Error('Tournament not found');
    err.status = 404;
    throw err;
  }

  if (String(tournament.status) === 'cancelled') {
    // Still attempt any missing refunds (safe / idempotent)
  } else {
    const WinnerPayout = require('../models/WinnerPayout');
    const paidCount = await WinnerPayout.countDocuments({
      tournamentId,
      status: 'PAID',
    });
    if (paidCount > 0) {
      const err = new Error(
        'Cannot cancel tournament: winner payout already paid. Use freeze/dispute workflow.'
      );
      err.code = 'PAYOUT_ALREADY_PAID';
      err.status = 400;
      throw err;
    }

    // Cancel any pending payouts
    await WinnerPayout.updateMany(
      { tournamentId, status: 'PENDING' },
      {
        $set: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledByAdminId: adminId,
          cancelReason: 'Tournament cancelled',
          updatedAt: new Date(),
        },
      }
    );

    tournament.status = 'cancelled';
    tournament.statusOverride = true;
    await tournament.save();
  }

  const charge = matchStructure.resolveEntryCharge(tournament);
  const entryFee = charge.totalAmount;
  const userIds = new Set();

  const participants = await TournamentParticipant.find({ tournamentId });
  participants.forEach((p) => userIds.add(String(p.userId)));

  const teams = await Team.find({ tournamentId, status: { $in: ['registered', 'withdrawn'] } });
  teams.forEach((t) => {
    if (t.captainUserId) userIds.add(String(t.captainUserId));
  });

  const refundResults = [];
  for (const userId of userIds) {
    // eslint-disable-next-line no-await-in-loop
    const r = await refundParticipant({
      tournamentId,
      userId,
      amount: entryFee,
      adminId,
      tournamentName: tournament.name,
    });
    refundResults.push(r);
  }

  await TournamentParticipant.updateMany(
    { tournamentId },
    { status: 'disqualified' }
  ).catch(() => {});
  await Team.updateMany({ tournamentId }, { status: 'withdrawn' }).catch(() => {});

  await logAdminAction({
    adminId,
    action: 'TOURNAMENT_CANCELLED',
    tournamentId,
    reason,
    meta: {
      refunded: refundResults.filter((r) => r.ok && r.status === 'completed').length,
      failed: refundResults.filter((r) => r.status === 'failed').length,
      skipped: refundResults.filter((r) => r.skipped).length,
    },
  });

  await notifyUser({
    userId: adminId,
    title: 'Tournament Cancelled',
    message: `${tournament.name} cancelled. Refunds processed.`,
    type: 'system',
    eventKey: buildEventKey(['admin_cancel_ack', tournamentId, Date.now()]),
    sendPushNotification: false,
  }).catch(() => {});

  return {
    tournament,
    refundResults,
    completed: refundResults.filter((r) => r.ok && r.status === 'completed').length,
    failed: refundResults.filter((r) => r.status === 'failed').length,
    skipped: refundResults.filter((r) => r.skipped).length,
  };
}

async function refundParticipant({
  tournamentId,
  userId,
  amount,
  adminId,
  tournamentName,
}) {
  const fee = Number(amount) || 0;
  if (fee <= 0) {
    return { ok: true, skipped: true, reason: 'ZERO_AMOUNT' };
  }

  let refund;
  try {
    refund = await TournamentRefund.findOneAndUpdate(
      { tournamentId, userId, kind: 'entry_refund' },
      {
        $setOnInsert: {
          tournamentId,
          userId,
          amount: fee,
          status: 'pending',
          kind: 'entry_refund',
          adminId,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    if (e?.code === 11000) {
      refund = await TournamentRefund.findOne({ tournamentId, userId, kind: 'entry_refund' });
    } else throw e;
  }

  if (!refund) {
    return { ok: false, reason: 'REFUND_CREATE_FAILED' };
  }

  if (refund.status === 'completed') {
    return { ok: true, skipped: true, reason: 'ALREADY_REFUNDED', refund };
  }

  const claimed = await TournamentRefund.findOneAndUpdate(
    { _id: refund._id, status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'processing', updatedAt: new Date() } },
    { new: true }
  );

  if (!claimed) {
    const current = await TournamentRefund.findById(refund._id);
    if (current?.status === 'completed') {
      return { ok: true, skipped: true, reason: 'ALREADY_REFUNDED', refund: current };
    }
    return { ok: false, reason: 'BUSY', refund: current };
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      claimed.status = 'failed';
      claimed.failureReason = 'User not found';
      claimed.failedAt = new Date();
      await claimed.save();
      return { ok: false, status: 'failed', reason: 'USER_NOT_FOUND', refund: claimed };
    }

    user.wallet = user.wallet || {};
    user.wallet.balance = (user.wallet.balance || 0) + fee;
    await user.save();

    const txn = await WalletTransaction.create({
      userId,
      type: 'refund',
      amount: fee,
      tournamentId,
      description: `Refund for cancelled tournament: ${tournamentName || tournamentId}`,
      status: 'completed',
      paymentMethod: 'admin_refund',
      transactionId: `REFUND_${claimed._id}_${Date.now()}`,
      adminId,
      reason: 'Tournament cancelled',
    });

    claimed.status = 'completed';
    claimed.walletTransactionId = txn._id;
    claimed.completedAt = new Date();
    claimed.failureReason = undefined;
    await claimed.save();

    await notifyUser({
      userId,
      title: 'Tournament Cancelled ❌',
      message: `The tournament has been cancelled and your entry fee of ₹${fee} has been refunded to your wallet.`,
      type: 'wallet',
      tournamentId,
      eventKey: buildEventKey(['cancel_refund', tournamentId, userId]),
      deepLink: SCREENS.WALLET,
      data: { screen: SCREENS.WALLET },
    }).catch(() => {});

    await logAdminAction({
      adminId,
      action: 'REFUND_COMPLETED',
      userId,
      tournamentId,
      refundId: claimed._id,
      amount: fee,
      previousStatus: 'processing',
      newStatus: 'completed',
    });

    return { ok: true, status: 'completed', refund: claimed };
  } catch (error) {
    await TournamentRefund.updateOne(
      { _id: claimed._id },
      {
        $set: {
          status: 'failed',
          failureReason: error.message,
          failedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    await logAdminAction({
      adminId,
      action: 'REFUND_FAILED',
      userId,
      tournamentId,
      refundId: claimed._id,
      amount: fee,
      reason: error.message,
    });
    return { ok: false, status: 'failed', reason: error.message, refund: claimed };
  }
}

async function retryFailedRefund(refundId, adminId) {
  const refund = await TournamentRefund.findById(refundId);
  if (!refund) {
    const err = new Error('Refund not found');
    err.status = 404;
    throw err;
  }
  if (refund.status === 'completed') {
    const err = new Error('Refund already completed');
    err.status = 400;
    throw err;
  }
  const tournament = await Tournament.findById(refund.tournamentId);
  return refundParticipant({
    tournamentId: refund.tournamentId,
    userId: refund.userId,
    amount: refund.amount,
    adminId,
    tournamentName: tournament?.name,
  });
}

module.exports = {
  cancelTournamentWithRefunds,
  refundParticipant,
  retryFailedRefund,
};
