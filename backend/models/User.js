const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: '',
  },
  password: {
    type: String,
    minlength: 6,
    default: '',
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  name: {
    type: String,
    trim: true,
  },
  gameUsername: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
  },
  profilePhoto: {
    type: String,
    default: '',
  },
  fcmToken: {
    type: String,
    default: null,
  },
  /** Multiple device tokens (Expo or FCM). fcmToken stays as latest primary. */
  pushTokens: [
    {
      token: { type: String, required: true },
      platform: { type: String, default: 'unknown' },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  /** When false, skip push + in-app creation from notify service. */
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
    },
    bonusBalance: {
      type: Number,
      default: 0,
    },
    bonusUsed: {
      type: Number,
      default: 0,
    },
    /** Sum of active WalletFreeze amounts — not withdrawable */
    frozenBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDeposited: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    totalWinnings: {
      type: Number,
      default: 0,
    },
  },
  tournament: {
    participatedCount: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    earnings: {
      type: Number,
      default: 0,
    },
  },
  gameStats: {
    totalKills: {
      type: Number,
      default: 0,
    },
    totalDeaths: {
      type: Number,
      default: 0,
    },
    lastMatchDate: {
      type: Date,
    },
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
  },
  banReason: String,
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bannedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  /**
   * Increment this when the user's password changes (admin resets included),
   * so we can invalidate previously issued admin JWTs.
   */
  authVersion: { type: Number, default: 0, index: true },
});

module.exports = mongoose.model('User', userSchema);
