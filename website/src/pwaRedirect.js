import { PWA_URL } from './release';

/** True when this tab was launched from Home Screen / installed PWA chrome. */
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const display = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const ios = window.navigator?.standalone === true;
  return Boolean(display || ios);
}

/**
 * Marketing site is NOT the playable app. If a user "Add to Home Screen"'d
 * sk-win-web by mistake, send them to the real Expo PWA login.
 */
export function redirectStandaloneMarketingToPwa() {
  if (typeof window === 'undefined') return false;
  if (!isStandaloneDisplay()) return false;
  if (!PWA_URL) return false;

  const here = String(window.location?.origin || '').replace(/\/$/, '');
  const pwa = String(PWA_URL).replace(/\/$/, '');
  if (!pwa || here === pwa) return false;

  window.location.replace(`${pwa}/login`);
  return true;
}
