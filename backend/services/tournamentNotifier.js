const Notification = require('../models/Notification');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const User = require('../models/User');
const { sendPush } = require('./fcm');

const REMINDER_MINUTES = [30, 15, 5, 2];

const buildMessage = (minutes) => {
  if (minutes === 2) return 'Join now — match starting soon';
  return `Tournament starts in ${minutes} minutes`;
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

    const participants = await TournamentParticipant.find({
      tournamentId: tournament._id,
    }).select('userId');

    if (!participants.length) continue;

    const userIds = participants.map(p => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('fcmToken');

    for (const userId of userIds) {
      const alreadySent = await Notification.findOne({
        userId,
        tournamentId: tournament._id,
        type: 'tournament_reminder',
        scheduleMinutes: diffMinutes,
      });

      if (alreadySent) continue;

      const title = tournament.name || 'Tournament Reminder';
      const message = buildMessage(diffMinutes);

      await Notification.create({
        userId,
        tournamentId: tournament._id,
        type: 'tournament_reminder',
        title,
        message,
        scheduleMinutes: diffMinutes,
      });
    }

    for (const user of users) {
      if (!user.fcmToken) continue;
      await sendPush(user.fcmToken, tournament.name || 'Tournament Reminder', buildMessage(diffMinutes), {
        tournamentId: tournament._id.toString(),
        minutes: String(diffMinutes),
      });
    }
  }
};

module.exports = { runTournamentNotifier };
