const express = require('express');
const CoinPack = require('../models/CoinPack');
const HomeConfig = require('../models/HomeConfig');
const TutorialVideo = require('../models/TutorialVideo');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const WalletTransaction = require('../models/WalletTransaction');
const GameMode = require('../models/GameMode');
const { normalizeMediaUrl } = require('../utils/publicUrl');
const { sortBySortOrder } = require('../utils/sortBySortOrder');

const router = express.Router();

const DEFAULT_SUPPORT_LINKS = {
  whatsapp: 'https://whatsapp.com/channel/0029VbDkiqHHQbS2hjVWL72z',
  telegram: 'https://t.me/WARZONEXXSUPPORT',
  instagram: 'https://www.instagram.com/warezonearena',
};

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
  supportLinks: { ...DEFAULT_SUPPORT_LINKS },
};

const DEFAULT_PACKS = [
  { label: '550 COINS', coins: 500, bonusCoins: 50, priceInr: 500, isBest: true, sortOrder: 1 },
  { label: '15 COINS', coins: 15, bonusCoins: 0, priceInr: 15, isBest: false, sortOrder: 2 },
  { label: '100 COINS', coins: 90, bonusCoins: 10, priceInr: 100, isBest: false, sortOrder: 3 },
];

function resolveSupportLinks(raw = {}) {
  return {
    whatsapp: String(raw.whatsapp || '').trim() || DEFAULT_SUPPORT_LINKS.whatsapp,
    telegram: String(raw.telegram || '').trim() || DEFAULT_SUPPORT_LINKS.telegram,
    instagram: String(raw.instagram || '').trim() || DEFAULT_SUPPORT_LINKS.instagram,
  };
}

async function getOrCreateHomeConfig() {
  let config = await HomeConfig.findOne({ key: 'main' });
  if (!config) {
    config = await HomeConfig.create(DEFAULT_HOME);
    return config;
  }

  const next = resolveSupportLinks(config.supportLinks || {});
  const prev = config.supportLinks || {};
  if (
    prev.whatsapp !== next.whatsapp ||
    prev.telegram !== next.telegram ||
    prev.instagram !== next.instagram
  ) {
    config.supportLinks = next;
    await config.save();
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
      supportLinks: resolveSupportLinks(config.supportLinks || {}),
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

function publicPlayerName(user) {
  const raw = String(user?.name || user?.username || 'Player').trim();
  const first = raw.split(/\s+/)[0];
  return first.slice(0, 18) || 'Player';
}

function modeBlurb(name, description) {
  if (description && String(description).trim()) return String(description).trim();
  const n = String(name || '').toLowerCase();
  if (/per.?kill|kill/.test(n)) return 'Earn per kill. Fast-paced matches.';
  if (/survival|last/.test(n)) return 'Top 3 share prize pool. Play smart, last long.';
  if (/1\s*v\s*1|duel/.test(n)) return 'Quick matches with instant winners.';
  if (/clash|squad/.test(n)) return 'Short Clash Squad matches with real rewards.';
  if (/battle|royale|full.?map/.test(n)) return 'Battle Royale tournaments with prize pools.';
  return 'Join this mode from the official WAREZONE app.';
}

router.get('/site', async (req, res) => {
  try {
    const [totalUsers, tournamentCount, playAgg, winAgg, withdrawals, modes] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Tournament.countDocuments({}),
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$tournament.participatedCount', 0] } } } },
      ]),
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$wallet.totalWinnings', 0] } } } },
      ]),
      WalletTransaction.find({
        type: 'withdraw',
        status: { $in: ['completed', 'pending'] },
      })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('userId', 'username name')
        .select('amount status createdAt userId')
        .lean(),
      GameMode.find({ status: 'active' }).lean(),
    ]);

    const matchesPlayed = Number(playAgg[0]?.total || 0);
    const totalWinnings = Math.round(Number(winAgg[0]?.total || 0));
    const sortedModes = sortBySortOrder(modes).slice(0, 8);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalMatches: matchesPlayed > 0 ? matchesPlayed : tournamentCount,
        totalTournaments: tournamentCount,
        totalWinnings,
      },
      recentWithdrawals: withdrawals.map((w) => ({
        name: publicPlayerName(w.userId),
        amount: Math.round(Number(w.amount) || 0),
        status: w.status,
        at: w.createdAt,
      })),
      modes: sortedModes.map((m) => ({
        id: String(m._id),
        name: m.name,
        description: modeBlurb(m.name, m.description),
        image: normalizeMediaUrl(m.image, req),
        sortOrder: Number.isFinite(Number(m.sortOrder)) ? Number(m.sortOrder) : 0,
      })),
    });
  } catch (error) {
    console.error('site stats:', error);
    res.status(500).json({ error: 'Failed to load site stats' });
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
