const mongoose = require('mongoose');

const homeConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    latestNews: {
      text: { type: String, default: '🏆 Tournaments Are Back! 🎮' },
      isActive: { type: Boolean, default: true },
    },
    banners: [
      {
        title: { type: String, default: 'HOW TO ADD COINS' },
        subtitle: { type: String, default: 'CLICK HERE' },
        action: { type: String, enum: ['wallet', 'link', 'none'], default: 'wallet' },
        linkUrl: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
      },
    ],
    supportLinks: {
      whatsapp: { type: String, default: '' },
      telegram: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
    walletFooterNote: {
      type: String,
      default: 'Only winnings can be redeemed.',
    },
    walletSecurityNote: {
      type: String,
      default: 'Coins Ki Suraksha Bilkul Bank Jaisa!',
    },
    appIcons: {
      appLogo: { type: String, default: '' },
      support: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      telegram: { type: String, default: '' },
      instagram: { type: String, default: '' },
      wallet: { type: String, default: '' },
      upcoming: { type: String, default: '' },
      ongoing: { type: String, default: '' },
      completed: { type: String, default: '' },
      share: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomeConfig', homeConfigSchema);
