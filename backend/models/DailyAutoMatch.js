const mongoose = require('mongoose');

const dailyAutoMatchSchema = new mongoose.Schema(
  {
    autoMatchNumber: {
      type: Number,
      unique: true,
      required: true,
    },
    displayId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    bannerImage: {
      type: String,
      default: '',
    },
    bannerTitle: {
      type: String,
      default: '',
      trim: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    gameMode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameMode',
      required: true,
    },
    mode: {
      type: String,
      enum: ['solo', 'duo', 'squad'],
      default: 'solo',
    },
    category: {
      type: String,
      enum: ['battle_royale', 'custom', 'custom_match'],
      default: 'battle_royale',
    },
    map: {
      type: String,
      default: 'Bermuda',
    },
    rules: [{ type: String }],
    entryFee: {
      type: Number,
      required: true,
      default: 0,
    },
    prizePool: {
      type: Number,
      default: 0,
    },
    perKill: {
      type: Number,
      default: 0,
    },
    prizes: {
      first: Number,
      second: Number,
      third: Number,
    },
    minimumBalance: {
      type: Number,
      default: 0,
    },
    roomId: {
      type: String,
      default: '',
    },
    roomPassword: {
      type: String,
      default: '',
    },
    showRoomCredentials: {
      type: Boolean,
      default: false,
    },
    /** Daily match time in 24h HH:mm, interpreted as Asia/Kolkata. */
    startTime: {
      type: String,
      required: true,
      default: '10:00',
    },
    repeat: {
      type: String,
      enum: ['daily'],
      default: 'daily',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    publishOnGenerate: {
      type: Boolean,
      default: true,
    },
    lastGeneratedDate: {
      type: String,
      default: '',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

dailyAutoMatchSchema.index({ isActive: 1, deletedAt: 1 });
dailyAutoMatchSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DailyAutoMatch', dailyAutoMatchSchema);
