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
  password: {
    type: String,
    required: true,
    minlength: 6,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
