import { API_BASE } from './api';
import { APP_RELEASE } from './release';

export const DEFAULT_RULES = [
  'Minimum level 40+ required to join.',
  'Room ID and password shared 8–10 minutes before match.',
  'No hacks, emulators, or teaming — instant disqualification.',
  'Wrong gaming ID / UID = no refund.',
  'Review prize pool distribution before joining.',
];

export function mediaUrl(src) {
  if (!src) return '';
  if (typeof src === 'object' && src.uri) return mediaUrl(src.uri);
  const s = String(src);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return `${API_BASE}${s}`;
  return `${API_BASE}/${s.replace(/^\//, '')}`;
}

export function inr(n) {
  return Math.round(Number(n) || 0).toLocaleString('en-IN');
}

export function matchLabel(text) {
  if (text == null || text === '') return text;
  return String(text).replace(/Custom Match/gi, 'Clash Squad');
}

export function statusBucket(t) {
  const s = String(t?.displayStatus || t?.lifecycleStatus || t?.status || '').toLowerCase();
  if (['ongoing', 'live'].includes(s)) return 'live';
  if (['completed', 'result_published'].includes(s)) return 'completed';
  return 'upcoming';
}

export function statusLabel(t) {
  const b = statusBucket(t);
  if (b === 'live') return 'Live';
  if (b === 'completed') return 'Completed';
  return 'Upcoming';
}

export function prizePool(t) {
  const configured = Number(t?.prizePool) || 0;
  const prizes = t?.prizes || {};
  const split =
    Number(prizes.first || 0) + Number(prizes.second || 0) + Number(prizes.third || 0);
  return configured > 0 ? configured : split;
}

export function scheduleLine(dateString) {
  if (!dateString) return 'Schedule TBA';
  const date = new Date(dateString);
  const d = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const tm = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${d} · ${tm}`;
}

export function parseRules(rules) {
  if (!rules) return DEFAULT_RULES;
  const list = Array.isArray(rules)
    ? rules.flatMap((r) => String(r).split('\n'))
    : String(rules).split('\n');
  const cleaned = list.map((r) => r.trim()).filter(Boolean);
  return cleaned.length ? cleaned : DEFAULT_RULES;
}

export function bannerOf(t) {
  return (
    mediaUrl(t?.bannerImage) ||
    mediaUrl(t?.gameMode?.image) ||
    mediaUrl(t?.game?.image) ||
    '/banner.jpg'
  );
}

export function modeName(t) {
  if (t?.matchTypeName) return matchLabel(t.matchTypeName);
  if (t?.matchType && typeof t.matchType === 'object' && t.matchType.name) {
    return matchLabel(t.matchType.name);
  }
  if (typeof t?.matchType === 'string' && t.matchType && !/^[a-f0-9]{24}$/i.test(t.matchType)) {
    return matchLabel(t.matchType);
  }
  return matchLabel(t?.gameMode?.name || 'Match');
}

/** Player Format: Solo / Duo / Squad — never labeled "Format" alone in UI. */
export function formatName(t) {
  if (t?.playerFormatLabel) return t.playerFormatLabel;
  if (t?.modeLabel && /^(Solo|Duo|Squad|Team)$/i.test(String(t.modeLabel))) return t.modeLabel;
  const mode = String(t?.playerFormat || t?.mode || '').toLowerCase();
  if (mode === 'solo') return 'Solo';
  if (mode === 'duo') return 'Duo';
  if (mode === 'squad') return 'Squad';
  if (mode === 'team') return 'Team';
  return t?.formatLabel || 'Solo';
}

export function brandLogoUrl() {
  return API_BASE ? `${API_BASE}/brand/logo.png?v=app` : '/logo.png?v=app';
}

export function apkHref(releaseInfo) {
  const fileName = releaseInfo?.fileName || APP_RELEASE.fileName || 'WAREZONE-v1.0.2.apk';
  const version = releaseInfo?.version || APP_RELEASE.version || '1.0.0';
  const cache = `v=${encodeURIComponent(version)}`;

  const raw = releaseInfo?.downloadUrl ? String(releaseInfo.downloadUrl) : '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.includes('?') ? `${raw}&${cache}` : `${raw}?${cache}`;
  }
  if (raw.startsWith('/')) {
    const path = raw.includes('?') ? `${raw}&${cache}` : `${raw}?${cache}`;
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  const path = `/downloads/${encodeURIComponent(fileName)}?${cache}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}
