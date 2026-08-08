const mongoose = require('mongoose');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const WinnerPayout = require('../models/WinnerPayout');
const WalletTransaction = require('../models/WalletTransaction');
const { notifyWinningCredited, notifyWinningReversed } = require('./tournamentPushEvents');

/** Admin can stop pending / reverse paid payouts only within this window after publish. */
const PAYOUT_CONTROL_WINDOW_MS = 10 * 60 * 1000;

function getControlWindow(tournament) {
  const publishedAt = tournament?.resultsPublishedAt
    ? new Date(tournament.resultsPublishedAt)
    : null;
  if (!publishedAt || Number.isNaN(publishedAt.getTime())) {
    return {
      open: false,
      publishedAt: null,
      expiresAt: null,
      remainingMs: 0,
      windowMs: PAYOUT_CONTROL_WINDOW_MS,
    };
  }
  const expiresAt = new Date(publishedAt.getTime() + PAYOUT_CONTROL_WINDOW_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  return {
    open: remainingMs > 0,
    publishedAt,
    expiresAt,
    remainingMs,
    windowMs: PAYOUT_CONTROL_WINDOW_MS,
  };
}

function assertWithinControlWindow(tournament) {
  const window = getControlWindow(tournament);
  if (!window.open) {
    const err = new Error(
      'Payout control window expired. Reverse/Stop is only allowed within 10 minutes of result publish.'
    );
    err.code = 'PAYOUT_WINDOW_EXPIRED';
    err.status = 403;
    throw err;
  }
  return window;
}

/**
 * Create PENDING payouts (idempotent). Does not credit wallet.
 */
async function ensurePayoutRecords(items = []) {
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
            amount,
            status: 'PENDING',
            usernameSnapshot: item.usernameSnapshot || '',
            description: item.description || 'Tournament winning',
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: true }
      );
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
 * Credit a single PENDING payout to the user wallet (TEST/dummy wallet — no Cashfree).
 * Atomic claim via status PENDING → PROCESSING → PAID.
 */
async function processPayoutCredit(payoutId, { tournamentName } = {}) {
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
        `Winner prize — ${tournamentName || 'tournament'}`,
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
      { _id: claimed.tournamentId, name: tournamentName },
      amount,
      claimed._id
    ).catch(() => {});

    return { ok: true, payout: claimed, transaction: txn, balance: user.wallet.balance };
  } catch (error) {
    // Release claim so admin can retry / stop
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
 * Process all PENDING payouts for a tournament when Auto Payment is ON.
 */
async function autoCreditPendingForTournament(tournamentId, { tournamentName } = {}) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return { credited: 0, results: [] };
  if (tournament.autoPaymentEnabled === false) {
    return { credited: 0, skipped: true, reason: 'AUTO_PAYMENT_OFF', results: [] };
  }

  const pending = await WinnerPayout.find({ tournamentId, status: 'PENDING' });
  const results = [];
  for (const p of pending) {
    // eslint-disable-next-line no-await-in-loop
    const r = await processPayoutCredit(p._id, {
      tournamentName: tournamentName || tournament.name,
    });
    results.push(r);
  }
  return {
    credited: results.filter((r) => r.ok && !r.skipped).length,
    results,
  };
}

/**
 * Stop a PENDING payout (no wallet credit).
 */
async function stopPendingPayout(payoutId, adminId, reason = 'Stopped by admin') {
  const tournament = await Tournament.findById(
    (await WinnerPayout.findById(payoutId))?.tournamentId
  );
  if (!tournament) {
    const err = new Error('Payout or tournament not found');
    err.status = 404;
    throw err;
  }
  assertWithinControlWindow(tournament);

  const stopped = await WinnerPayout.findOneAndUpdate(
    { _id: payoutId, status: 'PENDING' },
    {
      $set: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByAdminId: adminId,
        cancelReason: reason,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!stopped) {
    const current = await WinnerPayout.findById(payoutId).populate('userId', 'username wallet');
    const err = new Error(
      current?.status === 'CANCELLED'
        ? 'Payout is already cancelled.'
        : current?.status === 'PAID'
          ? 'Payout already paid. Use Reverse Payment instead.'
          : 'Payout cannot be stopped in its current status.'
    );
    err.code = 'STOP_NOT_ALLOWED';
    err.status = 400;
    err.payout = current;
    throw err;
  }

  return stopped;
}

/**
 * Reverse a PAID payout if full wallet balance is available. Never goes negative.
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
  assertWithinControlWindow(tournament);

  // Atomic claim: only one admin can reverse
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
  const user = await User.findById(claimed.userId);
  if (!user) {
    await WinnerPayout.updateOne(
      { _id: claimed._id },
      { $set: { status: 'PAID', updatedAt: new Date() } }
    );
    const err = new Error('Winner user not found');
    err.status = 404;
    throw err;
  }

  const balance = Number(user.wallet?.balance) || 0;
  if (balance < amount) {
    // Restore PAID — do not reverse, do not partial deduct
    await WinnerPayout.updateOne(
      { _id: claimed._id, status: 'PROCESSING' },
      { $set: { status: 'PAID', updatedAt: new Date() } }
    );
    const err = new Error('Unable to reverse payout. Insufficient wallet balance.');
    err.code = 'INSUFFICIENT_BALANCE';
    err.status = 400;
    err.details = {
      required: amount,
      currentBalance: balance,
      username: user.username,
    };
    throw err;
  }

  // Atomic deduct — only if still >= amount
  const updatedUser = await User.findOneAndUpdate(
    { _id: claimed.userId, 'wallet.balance': { $gte: amount } },
    {
      $inc: {
        'wallet.balance': -amount,
        'wallet.totalWinnings': -amount,
        'tournament.earnings': -amount,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    await WinnerPayout.updateOne(
      { _id: claimed._id, status: 'PROCESSING' },
      { $set: { status: 'PAID', updatedAt: new Date() } }
    );
    const fresh = await User.findById(claimed.userId).select('wallet.balance username');
    const err = new Error('Unable to reverse payout. Insufficient wallet balance.');
    err.code = 'INSUFFICIENT_BALANCE';
    err.status = 400;
    err.details = {
      required: amount,
      currentBalance: Number(fresh?.wallet?.balance) || 0,
      username: fresh?.username,
    };
    throw err;
  }

  // Never allow negative (belt + suspenders)
  if ((updatedUser.wallet.balance || 0) < 0) {
    await User.updateOne({ _id: updatedUser._id }, { $inc: { 'wallet.balance': amount } });
    await WinnerPayout.updateOne(
      { _id: claimed._id },
      { $set: { status: 'PAID', updatedAt: new Date() } }
    );
    const err = new Error('Unable to reverse payout. Insufficient wallet balance.');
    err.code = 'INSUFFICIENT_BALANCE';
    err.status = 400;
    throw err;
  }

  if ((updatedUser.wallet.totalWinnings || 0) < 0) {
    updatedUser.wallet.totalWinnings = 0;
    await updatedUser.save();
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
  claimed.updatedAt = new Date();
  await claimed.save();

  await notifyWinningReversed(claimed.userId, tournament, amount, claimed._id).catch(() => {});

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

  const window = getControlWindow(tournament);

  return {
    tournamentId,
    autoPaymentEnabled: tournament.autoPaymentEnabled !== false,
    controlWindow: window,
    payouts: payouts.map((p) => {
      const balance = Number(p.userId?.wallet?.balance) || 0;
      const amount = Number(p.amount) || 0;
      const canStop = window.open && p.status === 'PENDING';
      const canReverse =
        window.open && p.status === 'PAID' && balance >= amount;
      const reverseBlockedReason =
        p.status === 'REVERSED'
          ? 'ALREADY_REVERSED'
          : p.status !== 'PAID'
            ? 'NOT_PAID'
            : !window.open
              ? 'WINDOW_EXPIRED'
              : balance < amount
                ? 'INSUFFICIENT_BALANCE'
                : null;

      return {
        ...p,
        username: p.userId?.username || p.usernameSnapshot,
        currentWalletBalance: balance,
        canStop,
        canReverse,
        reverseBlockedReason,
        afterReverseBalance: canReverse ? balance - amount : null,
      };
    }),
  };
}

async function setAutoPayment(tournamentId, enabled) {
  const tournament = await Tournament.findByIdAndUpdate(
    tournamentId,
    { $set: { autoPaymentEnabled: !!enabled, updatedAt: new Date() } },
    { new: true }
  );
  return tournament;
}

module.exports = {
  PAYOUT_CONTROL_WINDOW_MS,
  getControlWindow,
  ensurePayoutRecords,
  processPayoutCredit,
  autoCreditPendingForTournament,
  stopPendingPayout,
  reversePaidPayout,
  listTournamentPayouts,
  setAutoPayment,
  assertWithinControlWindow,
};
