const express = require('express');
const CoinPack = require('../models/CoinPack');
const HomeConfig = require('../models/HomeConfig');
const TutorialVideo = require('../models/TutorialVideo');
const Announcement = require('../models/Announcement');
const { normalizeMediaUrl } = require('../utils/publicUrl');

const router = express.Router();

const DEFAULT_HOME = {
  key: 'main',
  latestNews: { text: '🏆 Tournaments Are Back! 🎮', isActive: true },
  banners: [
    {
      title: 'HOW TO ADD COINS',
      subtitle: 'CLICK HERE',
      action: 'wallet',
      linkUrl: '',
      isActive: true,
    },
  ],
  supportLinks: { whatsapp: '', telegram: '', instagram: '' },
  appIcons: {
    appLogo: '',
    support: '',
    whatsapp: '',
    telegram: '',
    instagram: '',
    wallet: '',
    upcoming: '',
    ongoing: '',
    completed: '',
    share: '',
  },
};

const ICON_KEYS = [
  'appLogo',
  'support',
  'whatsapp',
  'telegram',
  'instagram',
  'wallet',
  'upcoming',
  'ongoing',
  'completed',
  'share',
];

function normalizeAppIcons(raw, req) {
  const icons = raw || {};
  const out = {};
  ICON_KEYS.forEach((key) => {
    const val = icons[key];
    out[key] = val ? normalizeMediaUrl(val, req) : '';
  });
  return out;
}

const DEFAULT_PACKS = [
  { label: '550 COINS', coins: 500, bonusCoins: 50, priceInr: 500, isBest: true, sortOrder: 1 },
  { label: '15 COINS', coins: 15, bonusCoins: 0, priceInr: 15, isBest: false, sortOrder: 2 },
  { label: '100 COINS', coins: 90, bonusCoins: 10, priceInr: 100, isBest: false, sortOrder: 3 },
];

async function getOrCreateHomeConfig() {
  let config = await HomeConfig.findOne({ key: 'main' });
  if (!config) {
    config = await HomeConfig.create(DEFAULT_HOME);
  }
  return config;
}

async function getOrCreateCoinPacks() {
  const count = await CoinPack.countDocuments();
  if (count === 0) {
    await CoinPack.insertMany(DEFAULT_PACKS);
  }
  return CoinPack.find({ isActive: true }).sort({ sortOrder: 1, priceInr: 1 });
}

router.get('/home', async (req, res) => {
  try {
    const config = await getOrCreateHomeConfig();
    const carouselTutorials = await TutorialVideo.find({
      isActive: true,
      showOnHome: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .select('title description videoLink thumbnail ctaText carouselAction linkUrl order');

    const latestAnnouncement = await Announcement.findOne({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('title');

    res.json({
      latestNews: config.latestNews,
      latestAnnouncementTitle: latestAnnouncement?.title || '',
      banners: (config.banners || []).filter((b) => b.isActive),
      supportLinks: config.supportLinks || {},
      appIcons: normalizeAppIcons(config.appIcons, req),
      carousel: carouselTutorials.map((t) => ({
        id: t._id,
        title: t.title,
        subtitle: t.ctaText || 'CLICK HERE',
        description: t.description || '',
        thumbnail: normalizeMediaUrl(t.thumbnail, req),
        videoLink: t.videoLink,
        action: t.carouselAction || 'video',
        linkUrl: t.linkUrl || '',
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load home config' });
  }
});

router.get('/wallet-ui', async (req, res) => {
  try {
    const config = await getOrCreateHomeConfig();
    const packs = await getOrCreateCoinPacks();
    res.json({
      footerNote: config.walletFooterNote,
      securityNote: config.walletSecurityNote,
      coinPacks: packs.map((p) => ({
        id: p._id,
        label: p.label,
        coins: p.coins,
        bonusCoins: p.bonusCoins,
        totalCoins: p.coins + p.bonusCoins,
        priceInr: p.priceInr,
        isBest: p.isBest,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load wallet config' });
  }
});

module.exports = router;
