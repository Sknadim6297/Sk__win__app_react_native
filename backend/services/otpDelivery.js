/**
 * OTP delivery — SMS, WhatsApp, email.
 * Configure any of: Twilio SMS/WhatsApp, Fast2SMS, SMTP.
 */

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(input) {
  let digits = digitsOnly(input);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

function toE164(input) {
  const n = normalizePhone(input);
  return n ? `+${n}` : '';
}

function maskPhone(input) {
  const n = normalizePhone(input);
  if (n.length < 4) return '****';
  return `******${n.slice(-4)}`;
}

function maskEmail(email) {
  const raw = String(email || '');
  const at = raw.indexOf('@');
  if (at < 1) return raw;
  const name = raw.slice(0, at);
  const domain = raw.slice(at);
  const keep = name.slice(0, Math.min(2, name.length));
  return `${keep}***${domain}`;
}

function otpMessage(otp) {
  return `WAREZONE: Your password reset OTP is ${otp}. Valid for 10 minutes. Do not share this code.`;
}

async function postForm(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data, text };
}

async function sendSmsTwilio(phone, otp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) return { sent: false, skipped: true, channel: 'sms' };

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const result = await postForm(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    new URLSearchParams({ To: toE164(phone), From: from, Body: otpMessage(otp) }),
    {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  );
  if (!result.ok) {
    console.error('[otp] Twilio SMS failed:', result.status, result.text?.slice(0, 240));
    return { sent: false, channel: 'sms', error: result.data?.message || 'SMS failed' };
  }
  return { sent: true, channel: 'sms' };
}

async function sendWhatsAppTwilio(phone, otp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !fromRaw) return { sent: false, skipped: true, channel: 'whatsapp' };

  const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const result = await postForm(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    new URLSearchParams({
      To: `whatsapp:${toE164(phone)}`,
      From: from,
      Body: otpMessage(otp),
    }),
    {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  );
  if (!result.ok) {
    console.error('[otp] Twilio WhatsApp failed:', result.status, result.text?.slice(0, 240));
    return { sent: false, channel: 'whatsapp', error: result.data?.message || 'WhatsApp failed' };
  }
  return { sent: true, channel: 'whatsapp' };
}

async function sendSmsFast2Sms(phone, otp) {
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return { sent: false, skipped: true, channel: 'sms' };

  const ten = normalizePhone(phone).replace(/^91/, '');
  const url =
    `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(key)}` +
    `&route=otp&variables_values=${encodeURIComponent(otp)}&flash=0&numbers=${encodeURIComponent(ten)}`;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.return === false) {
      console.error('[otp] Fast2SMS failed:', data);
      return { sent: false, channel: 'sms', error: data.message || 'SMS failed' };
    }
    return { sent: true, channel: 'sms' };
  } catch (err) {
    console.error('[otp] Fast2SMS error:', err.message);
    return { sent: false, channel: 'sms', error: err.message };
  }
}

async function sendEmailOtp(email, otp) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@warezone.app';
  if (!host || !user || !pass || !email) return { sent: false, skipped: true, channel: 'email' };

  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: email,
      subject: 'WAREZONE — Password reset OTP',
      text: otpMessage(otp),
      html: `<p>Your WAREZONE password reset OTP is <strong>${otp}</strong>.</p><p>Valid for 10 minutes. Do not share this code.</p>`,
    });
    return { sent: true, channel: 'email' };
  } catch (err) {
    console.error('[otp] email send failed:', err.message);
    return { sent: false, channel: 'email', error: err.message };
  }
}

function smsConfigured() {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM) ||
      process.env.FAST2SMS_API_KEY
  );
}

function whatsappConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM
  );
}

function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function deliverOtp({ email, phone, otp, channel = 'auto' }) {
  const want = String(channel || 'auto').toLowerCase();
  const results = [];

  const trySms = want === 'sms' || want === 'auto' || want === 'both';
  const tryWa = want === 'whatsapp' || want === 'auto' || want === 'both';
  const tryEmail = want === 'email' || want === 'auto';

  if (tryWa && phone) {
    results.push(await sendWhatsAppTwilio(phone, otp));
  }
  if (trySms && phone) {
    const twilio = await sendSmsTwilio(phone, otp);
    if (twilio.skipped) results.push(await sendSmsFast2Sms(phone, otp));
    else results.push(twilio);
  }
  if (tryEmail && email) {
    results.push(await sendEmailOtp(email, otp));
  }

  const sent = results.filter((r) => r.sent).map((r) => r.channel);
  if (!sent.length) {
    console.log(`[otp] FALLBACK ${email || phone} => ${otp} (no provider, or send failed)`);
  }

  return {
    sent: sent.length > 0,
    channels: sent,
    destinations: {
      ...(phone && (trySms || tryWa) ? { phone: maskPhone(phone) } : {}),
      ...(email && tryEmail ? { email: maskEmail(email) } : {}),
    },
    results,
  };
}

module.exports = {
  digitsOnly,
  normalizePhone,
  toE164,
  maskPhone,
  maskEmail,
  otpMessage,
  smsConfigured,
  whatsappConfigured,
  emailConfigured,
  deliverOtp,
};
