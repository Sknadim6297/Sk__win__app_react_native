const User = require('../models/User');

const generateReferralCode = (username) => {
  const base = (username || 'SKWIN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'SKWN';
  const random = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `SK${base}${random}`;
};

const getUniqueReferralCode = async (username) => {
  for (let i = 0; i < 12; i += 1) {
    const candidate = generateReferralCode(username);
    const exists = await User.findOne({ referralCode: candidate }).select('_id');
    if (!exists) {
      return candidate;
    }
  }

  return `SK${Date.now().toString(16).slice(-8).toUpperCase()}`;
};

const ensureUserReferralCode = async (user) => {
  if (user?.referralCode) {
    return user.referralCode;
  }

  const code = await getUniqueReferralCode(user?.username);
  user.referralCode = code;
  user.updatedAt = new Date();
  await user.save();
  return code;
};

module.exports = {
  getUniqueReferralCode,
  ensureUserReferralCode,
};
