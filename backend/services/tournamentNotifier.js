const Notification = require('../models/Notification');
const Tournament = require('../models/Tournament');
const {
  notifyTournamentParticipants,
  buildEventKey,
  SCREENS,
} = require('./notificationService');

const REMINDER_MINUTES = [30, 15, 5, 2];

const buildMessage = (tournamentName, minutes) => {
  if (minutes === 2) {
    return `${tournamentName} starts soon. Get ready!`;
  }
  return `${tournamentName} starts in ${minutes} minutes. Get ready!`;
};

const runTournamentNotifier = async () => {
  const now = new Date();
  const upcoming = await Tournament.find({
    status: { $in: ['incoming', 'upcoming'] },
    startDate: { $gte: now },
  }).select('_id name startDate status');

  for (const tournament of upcoming) {
    const diffMs = tournament.startDate - now;
    const diffMinutes = Math.round(diffMs / 60000);

    if (!REMINDER_MINUTES.includes(diffMinutes)) continue;

    const name = tournament.name || 'Tournament';
    await notifyTournamentParticipants(tournament._id, {
      title: 'Match Starting Soon ⏰',
      message: buildMessage(name, diffMinutes),
      type: 'tournament_reminder',
      scheduleMinutes: diffMinutes,
      eventKeyBase: buildEventKey([
        'match_starting_soon',
        tournament._id,
        diffMinutes,
      ]),
      deepLink: SCREENS.TOURNAMENT_DETAILS,
      data: {
        screen: SCREENS.TOURNAMENT_DETAILS,
        tournamentId: String(tournament._id),
      },
    });
  }
};

module.exports = { runTournamentNotifier };
