const {
  notifyUser,
  notifyUsers,
  notifyTournamentParticipants,
  getTournamentParticipantUserIds,
  buildEventKey,
  SCREENS,
} = require('./notificationService');

async function notifyTournamentJoined(userId, tournament) {
  const name = tournament.name || 'Tournament';
  const fee = Number(tournament.entryFee) || 0;
  await notifyUser({
    userId,
    title: 'Tournament Joined 🎮',
    message: `You have successfully joined ${name}. Entry fee ₹${fee} has been deducted.`,
    type: 'tournament',
    tournamentId: tournament._id,
    eventKey: buildEventKey(['tournament_joined', tournament._id, userId]),
    deepLink: SCREENS.TOURNAMENT_DETAILS,
    data: { screen: SCREENS.TOURNAMENT_DETAILS, tournamentId: String(tournament._id) },
  });
  if (fee > 0) {
    await notifyUser({
      userId,
      title: 'Entry Fee Deducted',
      message: `₹${fee} entry fee deducted for ${name}.`,
      type: 'wallet',
      tournamentId: tournament._id,
      eventKey: buildEventKey(['entry_fee_deducted', tournament._id, userId]),
      deepLink: SCREENS.WALLET,
      data: { screen: SCREENS.WALLET },
    });
  }
}

async function notifyRoomCredentialsAvailable(tournament) {
  const name = tournament.name || 'Tournament';
  return notifyTournamentParticipants(tournament._id, {
    title: 'Room Details Available 🔐',
    message: `Room ID and password for ${name} are now available. Tap to view.`,
    type: 'tournament_update',
    eventKeyBase: buildEventKey(['room_credentials', tournament._id]),
    deepLink: SCREENS.TOURNAMENT_DETAILS,
    data: { screen: SCREENS.TOURNAMENT_DETAILS, tournamentId: String(tournament._id) },
  });
}

async function notifyMatchLive(tournament) {
  const name = tournament.name || 'Tournament';
  return notifyTournamentParticipants(tournament._id, {
    title: 'Match is LIVE 🔴',
    message: `${name} is now live. Join the room and start playing.`,
    type: 'tournament_update',
    eventKeyBase: buildEventKey(['match_live', tournament._id]),
    deepLink: SCREENS.TOURNAMENT_DETAILS,
    data: { screen: SCREENS.TOURNAMENT_DETAILS, tournamentId: String(tournament._id) },
  });
}

async function notifyMatchCompleted(tournament) {
  const name = tournament.name || 'Tournament';
  return notifyTournamentParticipants(tournament._id, {
    title: 'Match Completed 🏁',
    message: `${name} has been completed. Results will be available soon.`,
    type: 'tournament_update',
    eventKeyBase: buildEventKey(['match_completed', tournament._id]),
    deepLink: SCREENS.TOURNAMENT_DETAILS,
    data: { screen: SCREENS.TOURNAMENT_DETAILS, tournamentId: String(tournament._id) },
  });
}

async function notifyResultsPublished(tournament, { winnerUserIds = [], winnerAmounts = {} } = {}) {
  const name = tournament.name || 'Tournament';
  const allIds = await getTournamentParticipantUserIds(tournament._id);
  const winnerSet = new Set((winnerUserIds || []).map(String));

  for (const userId of allIds) {
    const isWinner = winnerSet.has(String(userId));
    const amount = Number(winnerAmounts[String(userId)]) || 0;
    // eslint-disable-next-line no-await-in-loop
    await notifyUser({
      userId,
      title: 'Results Published 🏆',
      message: isWinner && amount > 0
        ? `Congratulations! You won ₹${amount} in ${name}.`
        : `Results for ${name} have been published. Tap to view your result.`,
      type: 'result',
      tournamentId: tournament._id,
      eventKey: buildEventKey(['results_published', tournament._id, userId]),
      deepLink: SCREENS.TOURNAMENT_RESULTS,
      data: {
        screen: SCREENS.TOURNAMENT_RESULTS,
        tournamentId: String(tournament._id),
      },
    });
  }
}

async function notifyWinningCredited(userId, tournament, amount, payoutId) {
  const name = tournament?.name || 'Tournament';
  return notifyUser({
    userId,
    title: 'Winning Amount Credited 💰',
    message: `₹${amount} has been credited to your wallet for ${name}.`,
    type: 'wallet',
    tournamentId: tournament?._id || tournament,
    eventKey: buildEventKey(['winning_credited', payoutId || tournament?._id, userId]),
    deepLink: SCREENS.WALLET,
    data: { screen: SCREENS.WALLET },
  });
}

async function notifyWinningReversed(userId, tournament, amount, payoutId) {
  const name = tournament?.name || 'Tournament';
  return notifyUser({
    userId,
    title: 'Winning Payment Reversed',
    message: `Your ₹${amount} winning amount from ${name} has been reversed by the administrator.`,
    type: 'wallet',
    tournamentId: tournament?._id || tournament,
    eventKey: buildEventKey(['winning_reversed', payoutId || tournament?._id, userId]),
    deepLink: SCREENS.WALLET,
    data: { screen: SCREENS.WALLET },
  });
}

async function notifyTournamentCancelled(tournament, { refundedUserIds = [], refundAmount = 0 } = {}) {
  const name = tournament.name || 'Tournament';
  await notifyTournamentParticipants(tournament._id, {
    title: 'Tournament Cancelled ❌',
    message: `${name} has been cancelled.`,
    type: 'tournament_update',
    eventKeyBase: buildEventKey(['tournament_cancelled', tournament._id]),
    deepLink: SCREENS.HISTORY,
    data: { screen: SCREENS.HISTORY, tournamentId: String(tournament._id) },
  });

  if (refundAmount > 0 && refundedUserIds.length) {
    await notifyUsers(refundedUserIds, {
      title: 'Wallet Credited 💰',
      message: `₹${refundAmount} has been refunded to your wallet.`,
      type: 'wallet',
      tournamentId: tournament._id,
      eventKeyBase: buildEventKey(['cancel_refund', tournament._id]),
      deepLink: SCREENS.WALLET,
      data: { screen: SCREENS.WALLET },
    });
  }
}

async function notifyWalletCredited(userId, amount, { eventKey, description } = {}) {
  return notifyUser({
    userId,
    title: 'Wallet Credited 💰',
    message: description || `₹${amount} has been credited to your wallet.`,
    type: 'wallet',
    eventKey: eventKey || buildEventKey(['wallet_credit', userId, amount, Date.now()]),
    deepLink: SCREENS.WALLET,
    data: { screen: SCREENS.WALLET },
  });
}

async function notifyWalletDebited(userId, amount, { eventKey, description } = {}) {
  return notifyUser({
    userId,
    title: 'Wallet Debited',
    message: description || `₹${amount} has been deducted from your wallet.`,
    type: 'wallet',
    eventKey: eventKey || buildEventKey(['wallet_debit', userId, amount, Date.now()]),
    deepLink: SCREENS.WALLET,
    data: { screen: SCREENS.WALLET },
  });
}

module.exports = {
  notifyTournamentJoined,
  notifyRoomCredentialsAvailable,
  notifyMatchLive,
  notifyMatchCompleted,
  notifyResultsPublished,
  notifyWinningCredited,
  notifyWinningReversed,
  notifyTournamentCancelled,
  notifyWalletCredited,
  notifyWalletDebited,
};
