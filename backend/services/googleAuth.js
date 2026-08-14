const { OAuth2Client } = require('google-auth-library');

function getGoogleAudiences() {
  const ids = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function isGoogleAuthConfigured() {
  return getGoogleAudiences().length > 0;
}

/**
 * Verify Google ID token from mobile OAuth (expo-auth-session).
 * Never trust client profile fields without verifying the token server-side.
 */
async function verifyGoogleIdToken(idToken) {
  const audiences = getGoogleAudiences();
  if (!audiences.length) {
    const err = new Error('Google Sign-In is not configured on the server');
    err.status = 503;
    err.code = 'GOOGLE_NOT_CONFIGURED';
    throw err;
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken: String(idToken),
    audience: audiences,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    const err = new Error('Invalid Google token payload');
    err.status = 401;
    err.code = 'GOOGLE_TOKEN_INVALID';
    throw err;
  }
  if (payload.email_verified === false) {
    const err = new Error('Google email is not verified');
    err.status = 401;
    err.code = 'GOOGLE_EMAIL_UNVERIFIED';
    throw err;
  }
  return payload;
}

module.exports = {
  getGoogleAudiences,
  isGoogleAuthConfigured,
  verifyGoogleIdToken,
};
