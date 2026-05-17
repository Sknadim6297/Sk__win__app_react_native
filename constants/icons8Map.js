/**
 * Icons8 Fluent Color ("fluency") — consistent official-style mobile icons.
 * @see https://icons8.com/icons/fluency
 *
 * CDN assets are fetched at 2× display size for sharp rendering on retina screens.
 * For production, download licensed PNG/SVG packs from Icons8 and bundle locally.
 */

export const ICONS8_STYLE = 'fluency';

/** @type {Record<string, string>} App icon name → Icons8 slug */
export const ICON_NAME_TO_SLUG = {
  // Navigation & shell
  home: 'home',
  'home-variant': 'home',
  dashboard: 'dashboard',
  menu: 'menu',
  search: 'search',
  settings: 'settings',
  'arrow-back': 'left',
  'chevron-right': 'forward',
  'chevron-left': 'back',
  forward: 'forward',
  back: 'back',
  close: 'close',
  add: 'plus',
  plus: 'plus',
  minus: 'minus',

  // Profile & account
  account: 'user-male-circle',
  'account-outline': 'user-male-circle',
  'account-circle': 'user-male-circle',
  'account-circle-outline': 'user-male-circle',
  profile: 'user-male-circle',
  'user-settings': 'user-settings',
  at: 'at-sign',
  users: 'group',
  'account-lock': 'lock',
  pencil: 'edit',
  edit: 'edit',
  logout: 'logout-rounded',

  // Communication & social (Fluent Color brand-style)
  whatsapp: 'whatsapp',
  telegram: 'telegram-app',
  instagram: 'instagram-new',
  'instagram-new': 'instagram-new',
  send: 'sent',
  'message-text': 'sms',
  email: 'mail',
  mail: 'mail',

  // Support & info
  headset: 'customer-support',
  support: 'customer-support',
  'help-circle': 'help',
  help: 'help',
  information: 'info',
  info: 'info',
  'alert-circle': 'error',
  'alert-circle-outline': 'error',
  'close-circle': 'cancel',
  'information-circle': 'info',
  warning: 'warning-shield',
  'currency-inr': 'indian-rupee',
  rupee: 'indian-rupee',

  // Wallet & money
  wallet: 'wallet',
  'wallet-plus-outline': 'wallet',
  'wallet-plus': 'wallet',
  'cash-multiple': 'money-bag',
  'cash-alert': 'money-bag',
  'circle-multiple': 'coins',
  coins: 'coins',
  'circle-multiple': 'coins',

  upcoming: 'clock',
  ongoing: 'live-tv',
  completed: 'checkmark',

  // Tournaments & games
  trophy: 'trophy',
  'trophy-outline': 'trophy',
  'trophy-alert': 'trophy',
  'trophy-variant': 'trophy',
  'gamepad-variant': 'game-controller',
  'game-controller': 'game-controller',
  podium: 'podium',
  'podium-gold': 'podium',
  history: 'rewind-time',
  'clock-outline': 'clock',
  clock: 'clock',
  broadcast: 'youtube-live',
  'live-tv': 'live-tv',
  'youtube-live': 'youtube-live',
  'check-circle-outline': 'checkmark',
  'check-circle': 'checkmark',
  checkmark: 'checkmark',
  'check-decagram': 'verified-account',
  'shield-check': 'verified-account',
  'shield-crown': 'crown',

  // Actions
  'share-variant': 'share',
  share: 'share',
  download: 'download',
  upload: 'upload',
  delete: 'delete',
  trash: 'delete',
  'trash-outline': 'delete',
  copy: 'copy',
  refresh: 'refresh',
  filter: 'filter',
  sort: 'sort',

  // Notifications & content
  bell: 'appointment-reminders',
  notifications: 'appointment-reminders',
  'bullhorn': 'megaphone',
  'bullhorn-outline': 'megaphone',
  megaphone: 'megaphone',
  advertising: 'advertising',
  'view-carousel': 'carousel',
  image: 'image',
  'image-off-outline': 'no-image',
  video: 'video',
  play: 'play',

  // Analytics & stats / tab offers
  'chart-bar': 'combo-chart',
  'chart-line': 'line-chart',
  'chart-timeline-variant': 'positive-dynamic',
  percentage: 'positive-dynamic',
  analytics: 'combo-chart',
  statistics: 'statistics',
  podium: 'podium',

  // Documents
  'file-document': 'document',
  document: 'document',
  'shield-check-outline': 'privacy',

  // Misc UI
  'cellphone-cog': 'mobile',
  'cash-register': 'buy',
  ticket: 'ticket',
  'ticket-outline': 'ticket',
  ban: 'cancel',
  'checkmark-circle': 'checkmark',
  'checkmark-circle-outline': 'checkmark',
  star: 'star',
  heart: 'like',
  eye: 'visible',
  'eye-off': 'invisible',
  lock: 'lock',
  'lock-outline': 'lock',
  'lock-check-outline': 'password',
  unlock: 'unlock',
  'gift-outline': 'gift',
  gift: 'gift',
  calendar: 'calendar',
  location: 'marker',
  link: 'link',
  'open-outline': 'external-link',
  'external-link': 'external-link',
  facebook: 'facebook-new',
  twitter: 'twitter',
  'log-out': 'logout-rounded',
  'chatbubbles-outline': 'chat',
  chat: 'chat',
};

export function resolveIconSlug(name) {
  if (!name) return 'help';
  const key = String(name).trim();
  if (ICON_NAME_TO_SLUG[key]) return ICON_NAME_TO_SLUG[key];
  if (key.includes('/')) return key;
  return key.replace(/_/g, '-');
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.light] White glyph (iOS style)
 * @param {string} [opts.accent] Hex color without # for tinted line icons
 */
export function getIcons8Uri(slug, displaySize = 24, opts = {}) {
  const safeSlug = resolveIconSlug(slug);
  const fetchSize = Math.max(48, Math.round(displaySize * 2));
  if (opts.light) {
    return `https://img.icons8.com/ios/${fetchSize}/FFFFFF/${safeSlug}.png`;
  }
  if (opts.accent) {
    const hex = String(opts.accent).replace('#', '').toUpperCase();
    return `https://img.icons8.com/ios/${fetchSize}/${hex}/${safeSlug}.png`;
  }
  return `https://img.icons8.com/${ICONS8_STYLE}/${fetchSize}/${safeSlug}.png`;
}
