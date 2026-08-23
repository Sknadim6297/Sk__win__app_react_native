const Notification = require('../models/Notification');
const User = require('../models/User');
const TournamentParticipant = require('../models/TournamentParticipant');
const TeamMember = require('../models/TeamMember');
const { sendPushToMany } = require('./fcm');

const SCREENS = {
  TOURNAMENT_DETAILS: 'TournamentDetails',
  TOURNAMENT_RESULTS: 'TournamentResults',
  WALLET: 'MyWallet',
  ANNOUNCEMENTS: 'ImportantUpdates',
  NOTIFICATIONS: 'Notifications',
  HISTORY: 'History',
};

function buildEventKey(parts = []) {
  return parts
    .filter((p) => p !== undefined && p !== null && p !== '')
    .map((p) => String(p))
    .join(':');
}

function collectUserTokens(user) {
  if (!user) return [];
  const tokens = new Set();
  if (user.fcmToken) tokens.add(user.fcmToken);
  (user.pushTokens || []).forEach((t) => {
    if (t?.token) tokens.add(t.token);
  });
  return [...tokens];
}

async function clearInvalidToken(userId, token) {
  if (!userId || !token) return;
  await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token } } });
  await User.updateOne(
    { _id: userId, fcmToken: token },
    { $set: { fcmToken: null } }
  );
}

/**
 * Create in-app notification + send real device push.
 * Deduped by unique (userId, eventKey) when eventKey is provided.
 */
async function notifyUser({
  userId,
  title,
  message,
  type = 'tournament_update',
  tournamentId = null,
  resultId = null,
  matchId = null,
  eventKey = null,
  deepLink = null,
  data = {},
  scheduleMinutes = undefined,
  // Real device push (background / killed) + in-app inbox row.
  sendPushNotification = true,
}) {
  if (!userId || !title || !message) {
    return { ok: false, reason: 'INVALID_ARGS' };
  }

  const user = await User.findById(userId).select(
    'fcmToken pushTokens notificationsEnabled'
  );
  if (!user) return { ok: false, reason: 'USER_NOT_FOUND' };

  if (user.notificationsEnabled === false) {
    return { ok: false, reason: 'NOTIFICATIONS_DISABLED' };
  }

  const payloadData = {
    type,
    ...(tournamentId ? { tournamentId: String(tournamentId) } : {}),
    ...(resultId ? { resultId: String(resultId) } : {}),
    ...(matchId ? { matchId: String(matchId) } : {}),
    ...(deepLink ? { deepLink: String(deepLink) } : {}),
    screen: data.screen || deepLink || undefined,
    ...data,
  };

  let notification;
  try {
    notification = await Notification.create({
      userId,
      tournamentId: tournamentId || undefined,
      resultId: resultId || undefined,
      matchId: matchId || undefined,
      type,
      title,
      message,
      eventKey: eventKey || undefined,
      deepLink: deepLink || undefined,
      data: payloadData,
      scheduleMinutes,
      isRead: false,
      pushSent: false,
    });
  } catch (error) {
    if (error?.code === 11000 && eventKey) {
      const existing = await Notification.findOne({ userId, eventKey });
      return { ok: false, reason: 'DUPLICATE', notification: existing };
    }
    throw error;
  }

  if (!sendPushNotification) {
    return { ok: true, notification, pushed: false };
  }

  const tokens = collectUserTokens(user);
  if (!tokens.length) {
    return { ok: true, notification, pushed: false, reason: 'NO_TOKEN' };
  }

  const unreadCount = await Notification.countDocuments({
    userId,
    isRead: false,
  });

  const results = await sendPushToMany(tokens, title, message, payloadData, {
    sound: 'default',
    badge: unreadCount,
    channelId: 'default',
  });

  for (const r of results) {
    if (r.invalidToken) {
      // eslint-disable-next-line no-await-in-loop
      await clearInvalidToken(userId, r.token);
    }
  }

  const pushed = results.some((r) => r.ok);
  if (pushed) {
    notification.pushSent = true;
    await notification.save().catch(() => {});
  }

  return { ok: true, notification, pushed, pushResults: results };
}

async function notifyUsers(userIds, payload) {
  const unique = [...new Set((userIds || []).map((id) => String(id)))];
  const results = [];
  for (const userId of unique) {
    const baseKey = payload.eventKeyBase || payload.eventKey;
    // eslint-disable-next-line no-await-in-loop
    results.push(
      await notifyUser({
        ...payload,
        userId,
        eventKey: baseKey
          ? buildEventKey([baseKey, userId])
          : undefined,
      })
    );
  }
  return results;
}

async function getTournamentParticipantUserIds(tournamentId) {
  const [parts, members] = await Promise.all([
    TournamentParticipant.find({
      tournamentId,
      status: { $in: ['joined', 'winner', 'confirmed'] },
    }).select('userId'),
    TeamMember.find({ tournamentId }).select('userId'),
  ]);
  return [
    ...new Set(
      [...parts, ...members]
        .map((p) => (p.userId ? String(p.userId) : null))
        .filter(Boolean)
    ),
  ];
}

async function notifyTournamentParticipants(tournamentId, payload) {
  const userIds = await getTournamentParticipantUserIds(tournamentId);
  return notifyUsers(userIds, {
    ...payload,
    tournamentId,
  });
}

module.exports = {
  SCREENS,
  buildEventKey,
  notifyUser,
  notifyUsers,
  notifyTournamentParticipants,
  getTournamentParticipantUserIds,
  collectUserTokens,
};
