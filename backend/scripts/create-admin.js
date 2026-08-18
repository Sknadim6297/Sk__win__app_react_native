/**
 * Create or reset the admin account without deleting other users.
 *
 * Usage (from /backend):
 *   node scripts/create-admin.js <email> <password>
 *
 * Or set in backend/.env then run:
 *   ADMIN_EMAIL=sknadim6297@gmail.com
 *   ADMIN_PASSWORD=YourSecurePassword123
 *   node scripts/create-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ensureUserReferralCode } = require('../utils/referral');

async function main() {
  const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.argv[3] || process.env.ADMIN_PASSWORD || '').trim();

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password>');
    console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skwinn';
  await mongoose.connect(uri);

  let user = await User.findOne({ email });
  const hash = await bcrypt.hash(password, 10);

  if (user) {
    user.role = 'admin';
    user.password = hash;
    user.authProvider = 'local';
    user.status = 'active';
    user.verified = true;
    user.authVersion = (user.authVersion || 0) + 1;
    await user.save();
    await ensureUserReferralCode(user);
    console.log(`Updated existing user → admin: ${user.email} (@${user.username})`);
  } else {
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'admin';
    let username = baseUsername.slice(0, 20);
    let n = 0;
    while (await User.findOne({ username })) {
      n += 1;
      username = `${baseUsername.slice(0, 16)}${n}`;
    }

    user = await User.create({
      username,
      email,
      password: hash,
      role: 'admin',
      authProvider: 'local',
      verified: true,
      status: 'active',
      wallet: { balance: 0, bonusBalance: 0, frozenBalance: 0 },
    });
    await ensureUserReferralCode(user);
    console.log(`Created new admin: ${user.email} (@${user.username})`);
  }

  console.log('\nAdmin panel login:');
  console.log(`  URL:      ${process.env.PUBLIC_BASE_URL || 'http://localhost:5000'}/admin/`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('\nChange this password after first login if this was a one-time setup password.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
