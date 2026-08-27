require('dotenv').config();
const mongoose = require('mongoose');
const HomeConfig = require('../models/HomeConfig');

const links = {
  whatsapp: 'https://whatsapp.com/channel/0029VbDkiqHHQbS2hjVWL72z',
  telegram: 'https://t.me/WARZONEXXSUPPORT',
  instagram: 'https://www.instagram.com/warezonearena',
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skwinn');
  const r = await HomeConfig.findOneAndUpdate(
    { key: 'main' },
    { $set: { supportLinks: links } },
    { upsert: true, new: true }
  );
  console.log('Updated supportLinks:', r.supportLinks);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
