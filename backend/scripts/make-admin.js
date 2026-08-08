/**
 * Promote a user to admin (for PC web admin panel testing).
 *
 * Usage (from /backend):
 *   node scripts/make-admin.js your-email@example.com
 *
 * Or set ADMIN_EMAIL in backend/.env and run:
 *   node scripts/make-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skwinn';
  await mongoose.connect(uri);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    console.error('Register that account in the app first, then run this again.');
    process.exit(1);
  }

  user.role = 'admin';
  await user.save();
  console.log(`OK — ${user.email} (@${user.username}) is now role=admin`);
  console.log('Log out and log in again on the web admin to see the dashboard.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
