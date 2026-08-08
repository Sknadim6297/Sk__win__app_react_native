const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    index: true,
  },
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  type: {
    type: String,
    enum: [
      'tournament_reminder',
      'tournament_update',
      'tournament',
      'wallet',
      'result',
      'announcement',
      'system',
    ],
    default: 'tournament_update',
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  /** Unique per user+event — prevents duplicate sends */
  eventKey: {
    type: String,
    index: true,
  },
  /** Deep-link payload for client (screen + params). Never store secrets. */
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  deepLink: {
    type: String,
  },
  scheduleMinutes: {
    type: Number,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  pushSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

notificationSchema.index(
  { userId: 1, eventKey: 1 },
  {
    unique: true,
    partialFilterExpression: { eventKey: { $type: 'string' } },
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
