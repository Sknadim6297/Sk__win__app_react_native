const User = require('../models/User');
const Tournament = require('../models/Tournament');
const WinnerPayout = require('../models/WinnerPayout');
const WalletTransaction = require('../models/WalletTransaction');
const { notifyWinningCredited, notifyWinningReversed } = require('./tournamentPushEvents');
const { notifyUser, buildEventKey, SCREENS } = require('./notificationService');
const { logAdminAction } = require('./adminAudit');
const { getWithdrawableBalance } = require('./walletFreezeService');

/** Waiting period after winner publish before auto wallet credit. */
const PAYOUT_WAIT_MS = 10 * 60 * 1000;
/** Alias for older callers / UI that referred to control window */
const PAYOUT_CONTROL_WINDOW_MS = PAYOUT_WAIT_MS;

function getPayoutSchedule(fromDate = new Date()) {
  const publishedAt = new Date(fromDate);
  const scheduledPayoutAt = new Date(publishedAt.getTime() + PAYOUT_WAIT_MS);
  const remainingMs = Math.max(0, scheduledPayoutAt.getTime() - Date.now());
  return {
    winnerPublishedAt: publishedAt,
    scheduledPayoutAt,
    remainingMs,
    open: remainingMs > 0,
    waiting: remainingMs > 0,
    windowMs: PAYOUT_WAIT_MS,
    publishedAt,
    expiresAt: scheduledPayoutAt,
  };
}

/** Per-payout waiting window (preferred). Falls back to tournament.resultsPublishedAt. */
function getControlWindow(tournament, payout) {
  if (payout?.scheduledPayoutAt) {
    const scheduled = new Date(payout.scheduledPayoutAt);
    const published = payout.winnerPublishedAt
      ? new Date(payout.winnerPublishedAt)
      : new Date(scheduled.getTime() - PAYOUT_WAIT_MS);
    const remainingMs = Math.max(0, scheduled.getTime() - Date.now());
    return {
      open: remainingMs > 0 && payout.status === 'PENDING',
      waiting: remainingMs > 0 && payout.status === 'PENDING',
      publishedAt: published,
      expiresAt: scheduled,
      remainingMs,
      windowMs: PAYOUT_WAIT_MS,
      due: remainingMs <= 0,
    };
  }
  const publishedAt = tournament?.resultsPublishedAt
    ? new Date(tournament.resultsPublishedAt)
    : null;
  if (!publishedAt || Number.isNaN(publishedAt.getTime())) {
    return {
      open: false,
      waiting: false,
      publishedAt: null,
      expiresAt: null,
      remainingMs: 0,
      windowMs: PAYOUT_WAIT_MS,
      due: false,
    };
  }
  const expiresAt = new Date(publishedAt.getTime() + PAYOUT_WAIT_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  return {
    open: remainingMs > 0,
    waiting: remainingMs > 0,
    publishedAt,
    expiresAt,
    remainingMs,
    windowMs: PAYOUT_WAIT_MS,
    due: remainingMs <= 0,
  };
}

/**
 * Create PENDING payouts with 10-minute scheduled credit. Does NOT credit wallet.
 */
async function ensurePayoutRecords(items = []) {
  const now = new Date();
  const schedule = getPayoutSchedule(now);
  const created = [];

  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount <= 0 || !item.userId || !item.tournamentId || !item.resultId) continue;

    try {
      const doc = await WinnerPayout.findOneAndUpdate(
        {
          tournamentId: item.tournamentId,
          resultId: item.resultId,
          userId: item.userId,
        },
        {
          $setOnInsert: {
            tournamentId: item.tournamentId,
            userId: item.userId,
            resultId: item.resultId,
            resultModel: item.resultModel,
            matchType: item.matchType || 'other',
            amount,
            status: 'PENDING',
            winnerPublishedAt: schedule.winnerPublishedAt,
            scheduledPayoutAt: schedule.scheduledPayoutAt,
            usernameSnapshot: item.usernameSnapshot || '',
            description: item.description || 'Tournament winning',
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        { upsert: true, new: true }
      );

      // Backfill schedule on existing PENDING without schedule
      if (
        doc.status === 'PENDING' &&
        (!doc.scheduledPayoutAt || !doc.winnerPublishedAt)
      ) {
        doc.winnerPublishedAt = doc.winnerPublishedAt || schedule.winnerPublishedAt;
        doc.scheduledPayoutAt = doc.scheduledPayoutAt || schedule.scheduledPayoutAt;
        await doc.save();
      }

      created.push(doc);
    } catch (e) {
      if (e?.code === 11000) {
        const existing = await WinnerPayout.findOne({
          tournamentId: item.tournamentId,
          resultId: item.resultId,
          userId: item.userId,
        });
        if (existing) created.push(existing);
        continue;
      }
      throw e;
    }
  }
  return created;
}

/**
 * After publish: schedule only (no immediate credit). Kept name for callers.
 */
async function autoCreditPendingForTournament(tournamentId) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return { credited: 0, scheduled: 0, results: [] };

  const pending = await WinnerPayout.find({ tournamentId, status: 'PENDING' });
  const now = new Date();
  const schedule = getPayoutSchedule(tournament.resultsPublishedAt || now);

  for (const p of pending) {
    if (!p.scheduledPayoutAt || !p.winnerPublishedAt) {
      p.winnerPublishedAt = schedule.winnerPublishedAt;
      p.scheduledPayoutAt = schedule.scheduledPayoutAt;
      // eslint-disable-next-line no-await-in-loop
      await p.save();
    }
  }

  // Notify winners that payout is pending (once)
  for (const p of pending) {
    // eslint-disable-next-line no-await-in-loop
    await notifyUser({
      userId: p.userId,
      title: 'Results Published 🏆',
      message: `Results for ${tournament.name} have been published. Winning payout (if any) will be processed after verification.`,
      type: 'result',
      tournamentId,
      eventKey: buildEventKey(['winner_payout_pending_notice', p._id]),
      deepLink: SCREENS.TOURNAMENT_RESULTS,
      data: { screen: SCREENS.TOURNAMENT_RESULTS, tournamentId: String(tournamentId) },
    }).catch(() => {});
  }

  return {
    credited: 0,
    scheduled: pending.length,
    results: pending,
    scheduledPayoutAt: schedule.scheduledPayoutAt,
  };
}

/**
 * Credit a PENDING payout only if due (scheduledPayoutAt <= now) OR force=true (admin).
 * Atomic PENDING → PROCESSING → PAID.
 */
async function processPayoutCredit(payoutId, { tournamentName, force = false } = {}) {
  const existing = await WinnerPayout.findById(payoutId);
  if (!existing) {
    return { ok: false, code: 'NOT_FOUND' };
  }

  if (existing.status !== 'PENDING') {
    return {
      ok: false,
      code: existing.status === 'PAID' ? 'ALREADY_PAID' : 'NOT_PENDING',
      payout: existing,
    };
  }

  if (!force) {
    const dueAt = existing.scheduledPayoutAt
      ? new Date(existing.scheduledPayoutAt).getTime()
      : 0;
    if (dueAt && dueAt > Date.now()) {
      return { ok: false, code: 'NOT_DUE', payout: existing };
    }
  }

  const tournament = await Tournament.findById(existing.tournamentId);
  if (tournament && tournament.autoPaymentEnabled === false && !force) {
    return { ok: false, code: 'AUTO_PAYMENT_OFF', payout: existing };
  }

  if (tournament && String(tournament.status) === 'cancelled') {
    return { ok: false, code: 'TOURNAMENT_CANCELLED', payout: existing };
  }

  const claimed = await WinnerPayout.findOneAndUpdate(
    { _id: payoutId, status: 'PENDING' },
    { $set: { status: 'PROCESSING', updatedAt: new Date() } },
    { new: true }
  );

  if (!claimed) {
    const current = await WinnerPayout.findById(payoutId);
    return {
      ok: false,
      code: current?.status === 'PAID' ? 'ALREADY_PAID' : 'NOT_PENDING',
      payout: current,
    };
  }

  const amount = Number(claimed.amount) || 0;
  if (amount <= 0) {
    claimed.status = 'CANCELLED';
    claimed.cancelReason = 'Zero amount';
    claimed.cancelledAt = new Date();
    await claimed.save();
    return { ok: true, skipped: true, payout: claimed };
  }

  try {
    const user = await User.findById(claimed.userId);
    if (!user) {
      claimed.status = 'FAILED';
      claimed.failReason = 'User not found';
      claimed.failedAt = new Date();
      await claimed.save();
      return { ok: false, code: 'USER_NOT_FOUND', payout: claimed };
    }

    user.wallet = user.wallet || {};
    user.wallet.balance = (user.wallet.balance || 0) + amount;
    user.wallet.totalWinnings = (user.wallet.totalWinnings || 0) + amount;
    user.tournament = user.tournament || {};
    user.tournament.wins = (user.tournament.wins || 0) + 1;
    user.tournament.earnings = (user.tournament.earnings || 0) + amount;
    await user.save();

    const txn = await WalletTransaction.create({
      userId: claimed.userId,
      type: 'winning',
      amount,
      tournamentId: claimed.tournamentId,
      description:
        claimed.description ||
        `Winner prize — ${tournamentName || tournament?.name || 'tournament'}`,
      status: 'completed',
      paymentMethod: 'testing',
      transactionId: `WIN_${claimed._id}_${Date.now()}`,
      payoutId: claimed._id,
    });

    claimed.status = 'PAID';
    claimed.paidAt = new Date();
    claimed.walletTransactionId = txn._id;
    claimed.updatedAt = new Date();
    await claimed.save();

    await notifyWinningCredited(
      claimed.userId,
      { _id: claimed.tournamentId, name: tournamentName || tournament?.name },
      amount,
      claimed._id
    ).catch(() => {});

    await logAdminAction({
      action: 'PAYOUT_PAID',
      adminId: claimed.userId,
      userId: claimed.userId,
      tournamentId: claimed.tournamentId,
      payoutId: claimed._id,
      amount,
      previousStatus: 'PROCESSING',
      newStatus: 'PAID',
      reason: force ? 'Forced/admin' : 'Scheduled auto payout',
    });

    return { ok: true, payout: claimed, transaction: txn, balance: user.wallet.balance };
  } catch (error) {
    await WinnerPayout.updateOne(
      { _id: claimed._id, status: 'PROCESSING' },
      {
        $set: {
          status: 'PENDING',
          failReason: error.message,
          updatedAt: new Date(),
        },
      }
    );
    throw error;
  }
}

/**
 * Cron: credit all due PENDING payouts (scheduledPayoutAt <= now).
 */
async function processDuePayouts() {
  const due = await WinnerPayout.find({
    status: 'PENDING',
    scheduledPayoutAt: { $lte: new Date() },
  })
    .limit(50)
    .select('_id tournamentId');

  const results = [];
  for (const p of due) {
    const tournament = await Tournament.findById(p.tournamentId).select('name autoPaymentEnabled');
    if (tournament && tournament.autoPaymentEnabled === false) {
      results.push({ payoutId: p._id, ok: false, code: 'AUTO_PAYMENT_OFF' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const r = await processPayoutCredit(p._id, {
      tournamentName: tournament?.name,
      force: false,
    });
    results.push({ payoutId: p._id, ...r });
  }
  return {
    processed: results.filter((r) => r.ok && !r.skipped).length,
    results,
  };
}

async function updatePendingStatus(payoutId, adminId, { status, reasonField, reason, action }) {
  const existing = await WinnerPayout.findById(payoutId);
  if (!existing) {
    const err = new Error('Payout not found');
    err.status = 404;
    throw err;
  }
  if (existing.status === 'PAID') {
    const err = new Error(
      'Payout already paid. Do not deduct blindly — use freeze/dispute workflow.'
    );
    err.code = 'ALREADY_PAID';
    err.status = 400;
    throw err;
  }
  if (existing.status !== 'PENDING') {
    const err = new Error(`Payout is ${existing.status} and cannot be changed.`);
    err.code = 'INVALID_STATUS';
    err.status = 400;
    throw err;
  }

  const set = {
    status,
    updatedAt: new Date(),
    [reasonField]: reason || action,
  };
  if (status === 'BLOCKED') {
    set.blockedAt = new Date();
    set.blockedByAdminId = adminId;
  } else if (status === 'CANCELLED') {
    set.cancelledAt = new Date();
    set.cancelledByAdminId = adminId;
  } else if (status === 'REJECTED') {
    set.rejectedAt = new Date();
    set.rejectedByAdminId = adminId;
  }

  const updated = await WinnerPayout.findOneAndUpdate(
    { _id: payoutId, status: 'PENDING' },
    { $set: set },
    { new: true }
  );

  if (!updated) {
    const err = new Error('Payout status changed concurrently. Refresh and try again.');
    err.code = 'RACE';
    err.status = 409;
    throw err;
  }

  const tournament = await Tournament.findById(updated.tournamentId).select('name');
  const titleMap = {
    BLOCKED: 'Winning Payout Blocked',
    CANCELLED: 'Winning Payout Cancelled',
    REJECTED: 'Winning Payout Rejected',
  };
  await notifyUser({
    userId: updated.userId,
    title: titleMap[status] || 'Payout Update',
    message: `Your winning payout for ${tournament?.name || 'the tournament'} was ${status.toLowerCase()}. ${reason || ''}`.trim(),
    type: 'wallet',
    tournamentId: updated.tournamentId,
    eventKey: buildEventKey(['payout', status.toLowerCase(), updated._id]),
    deepLink: SCREENS.WALLET,
    data: { screen: SCREENS.WALLET },
  }).catch(() => {});

  await logAdminAction({
    adminId,
    action,
    userId: updated.userId,
    tournamentId: updated.tournamentId,
    payoutId: updated._id,
    amount: updated.amount,
    previousStatus: 'PENDING',
    newStatus: status,
    reason,
  });

  return updated;
}

async function blockPayout(payoutId, adminId, reason) {
  return updatePendingStatus(payoutId, adminId, {
    status: 'BLOCKED',
    reasonField: 'blockReason',
    reason,
    action: 'PAYOUT_BLOCKED',
  });
}

async function rejectPayout(payoutId, adminId, reason) {
  return updatePendingStatus(payoutId, adminId, {
    status: 'REJECTED',
    reasonField: 'rejectReason',
    reason,
    action: 'PAYOUT_REJECTED',
  });
}

async function stopPendingPayout(payoutId, adminId, reason = 'Stopped by admin') {
  return updatePendingStatus(payoutId, adminId, {
    status: 'CANCELLED',
    reasonField: 'cancelReason',
    reason,
    action: 'PAYOUT_CANCELLED',
  });
}

/**
 * Reverse PAID only if full balance available (legacy control). Prefer freeze for disputes.
 */
async function reversePaidPayout(payoutId, adminId, reason = 'Reversed by admin') {
  const existing = await WinnerPayout.findById(payoutId);
  if (!existing) {
    const err = new Error('Payout not found');
    err.status = 404;
    throw err;
  }
  if (existing.status === 'REVERSED') {
    const err = new Error('Payment has already been reversed.');
    err.code = 'ALREADY_REVERSED';
    err.status = 400;
    throw err;
  }

  const tournament = await Tournament.findById(existing.tournamentId);
  if (!tournament) {
    const err = new Error('Tournament not found');
    err.status = 404;
    throw err;
  }

  const claimed = await WinnerPayout.findOneAndUpdate(
    { _id: payoutId, status: 'PAID' },
    { $set: { status: 'PROCESSING', updatedAt: new Date() } },
    { new: true }
  );

  if (!claimed) {
    const current = await WinnerPayout.findById(payoutId);
    const err = new Error(
      current?.status === 'REVERSED'
        ? 'Payment has already been reversed.'
        : 'Payout is not in PAID status and cannot be reversed.'
    );
    err.code = current?.status === 'REVERSED' ? 'ALREADY_REVERSED' : 'REVERSE_NOT_ALLOWED';
    err.status = 400;
    throw err;
  }

  const amount = Number(claimed.amount) || 0;
  const available = await getWithdrawableBalance(claimed.userId);
  if (available < amount) {
    await WinnerPayout.updateOne(
      { _id: claimed._id, status: 'PROCESSING' },
      { $set: { status: 'PAID', updatedAt: new Date() } }
    );
    const err = new Error(
      'Unable to reverse payout. Insufficient available wallet balance. Use freeze instead.'
    );
    err.code = 'INSUFFICIENT_BALANCE';
    err.status = 400;
    err.details = { required: amount, currentBalance: available };
    throw err;
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: claimed.userId,
      'wallet.balance': { $gte: amount },
    },
    {
      $inc: {
        'wallet.balance': -amount,
        'wallet.totalWinnings': -amount,
        'tournament.earnings': -amount,
      },
    },
    { new: true }
  );

  if (!updatedUser || (updatedUser.wallet.balance || 0) < 0) {
    if (updatedUser && (updatedUser.wallet.balance || 0) < 0) {
      await User.updateOne({ _id: updatedUser._id }, { $inc: { 'wallet.balance': amount } });
    }
    await WinnerPayout.updateOne(
      { _id: claimed._id },
      { $set: { status: 'PAID', updatedAt: new Date() } }
    );
    const err = new Error('Unable to reverse payout. Insufficient wallet balance.');
    err.code = 'INSUFFICIENT_BALANCE';
    err.status = 400;
    throw err;
  }

  const reversalTxn = await WalletTransaction.create({
    userId: claimed.userId,
    type: 'winning_reversal',
    amount,
    tournamentId: claimed.tournamentId,
    description: `Winning reversal — ${tournament.name}`,
    status: 'completed',
    paymentMethod: 'admin_reversal',
    transactionId: `REV_${claimed._id}_${Date.now()}`,
    payoutId: claimed._id,
    originalTransactionId: claimed.walletTransactionId,
    adminId,
    reason: reason || 'Reversed by admin',
  });

  if (claimed.walletTransactionId) {
    await WalletTransaction.updateOne(
      { _id: claimed.walletTransactionId },
      { $set: { status: 'reversed' } }
    );
  }

  claimed.status = 'REVERSED';
  claimed.reversedAt = new Date();
  claimed.reversedByAdminId = adminId;
  claimed.reverseReason = reason || 'Reversed by admin';
  claimed.reversalTransactionId = reversalTxn._id;
  await claimed.save();

  await notifyWinningReversed(claimed.userId, tournament, amount, claimed._id).catch(() => {});
  await logAdminAction({
    adminId,
    action: 'PAYOUT_REVERSED',
    userId: claimed.userId,
    tournamentId: claimed.tournamentId,
    payoutId: claimed._id,
    amount,
    previousStatus: 'PAID',
    newStatus: 'REVERSED',
    reason,
  });

  return {
    payout: claimed,
    reversalTransaction: reversalTxn,
    walletBalance: updatedUser.wallet.balance,
    amountReversed: amount,
  };
}

async function listTournamentPayouts(tournamentId) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return null;

  const payouts = await WinnerPayout.find({ tournamentId })
    .populate('userId', 'username email wallet')
    .sort({ createdAt: 1 })
    .lean();

  return {
    tournamentId,
    autoPaymentEnabled: tournament.autoPaymentEnabled !== false,
    controlWindow: getControlWindow(tournament),
    payouts: payouts.map((p) => {
      const balance = Number(p.userId?.wallet?.balance) || 0;
      const frozen = Number(p.userId?.wallet?.frozenBalance) || 0;
      const available = Math.max(0, balance - frozen);
      const amount = Number(p.amount) || 0;
      const window = getControlWindow(tournament, p);
      const canStop = p.status === 'PENDING';
      const canBlock = p.status === 'PENDING';
      const canReject = p.status === 'PENDING';
      const canReverse = p.status === 'PAID' && available >= amount;

      return {
        ...p,
        username: p.userId?.username || p.usernameSnapshot,
        currentWalletBalance: balance,
        availableBalance: available,
        remainingMs: window.remainingMs,
        scheduledPayoutAt: p.scheduledPayoutAt,
        canStop,
        canBlock,
        canReject,
        canReverse,
        reverseBlockedReason:
          p.status === 'REVERSED'
            ? 'ALREADY_REVERSED'
            : p.status !== 'PAID'
              ? 'NOT_PAID'
              : available < amount
                ? 'INSUFFICIENT_BALANCE'
                : null,
        afterReverseBalance: canReverse ? available - amount : null,
      };
    }),
  };
}

async function listPayoutsAdmin({ status, page = 1, limit = 30, search } = {}) {
  const q = {};
  if (status && status !== 'all') {
    q.status = String(status).toUpperCase();
  }
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  const lim = Math.min(100, Math.max(1, limit));

  let userFilter = null;
  if (search) {
    const users = await User.find({
      username: new RegExp(String(search).trim(), 'i'),
    })
      .select('_id')
      .limit(50);
    userFilter = users.map((u) => u._id);
    if (userFilter.length) q.userId = { $in: userFilter };
    else q.userId = null;
  }

  const [items, total] = await Promise.all([
    WinnerPayout.find(q)
      .populate('userId', 'username email wallet')
      .populate('tournamentId', 'name category entryFee prizePool')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    WinnerPayout.countDocuments(q),
  ]);

  return {
    payouts: items.map((p) => ({
      ...p,
      username: p.userId?.username || p.usernameSnapshot,
      tournamentName: p.tournamentId?.name,
      remainingMs: getControlWindow(null, p).remainingMs,
    })),
    page: Math.max(1, page),
    limit: lim,
    total,
    pages: Math.ceil(total / lim) || 1,
  };
}

async function setAutoPayment(tournamentId, enabled) {
  return Tournament.findByIdAndUpdate(
    tournamentId,
    { $set: { autoPaymentEnabled: !!enabled, updatedAt: new Date() } },
    { new: true }
  );
}

module.exports = {
  PAYOUT_CONTROL_WINDOW_MS,
  PAYOUT_WAIT_MS,
  getControlWindow,
  getPayoutSchedule,
  ensurePayoutRecords,
  processPayoutCredit,
  processDuePayouts,
  autoCreditPendingForTournament,
  stopPendingPayout,
  blockPayout,
  rejectPayout,
  reversePaidPayout,
  listTournamentPayouts,
  listPayoutsAdmin,
  setAutoPayment,
  getWithdrawableBalance,
};
