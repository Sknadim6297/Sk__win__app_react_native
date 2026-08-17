/** India Standard Time helpers. Never rely on the host server timezone. */
const TIMEZONE = 'Asia/Kolkata';
const OFFSET = '+05:30';

function getDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function normalizeTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '10:00';

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    const isPm = ampm[3].toUpperCase() === 'PM';
    if (hours === 12) hours = isPm ? 12 : 0;
    else if (isPm) hours += 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '10:00';
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildStartDate(dateStr, timeStr) {
  const time = normalizeTime(timeStr);
  const date = new Date(`${dateStr}T${time}:00${OFFSET}`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid start date/time: ${dateStr} ${timeStr}`);
  }
  return date;
}

function addDays(dateStr, days) {
  const noon = new Date(`${dateStr}T12:00:00${OFFSET}`);
  noon.setTime(noon.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000);
  return getDateString(noon);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T12:00:00${OFFSET}`);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime12(timeStr) {
  const [hours, minutes] = normalizeTime(timeStr).split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

module.exports = {
  TIMEZONE,
  OFFSET,
  getDateString,
  normalizeTime,
  buildStartDate,
  addDays,
  formatDisplayDate,
  formatTime12,
};
