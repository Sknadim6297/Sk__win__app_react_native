/** Admin-managed icon keys + vector fallbacks when no image URL is set. */
export const APP_ICON_SLOTS = [
  { key: 'appLogo', label: 'App Logo (profile sections)', fallback: 'account-circle' },
  { key: 'support', label: 'Support', fallback: 'headset' },
  { key: 'whatsapp', label: 'WhatsApp', fallback: 'whatsapp' },
  { key: 'telegram', label: 'Telegram', fallback: 'telegram' },
  { key: 'instagram', label: 'Instagram', fallback: 'instagram' },
  { key: 'wallet', label: 'My Wallet', fallback: 'wallet' },
  { key: 'upcoming', label: 'Upcoming contests', fallback: 'clock-outline' },
  { key: 'ongoing', label: 'Ongoing contests', fallback: 'broadcast' },
  { key: 'completed', label: 'Completed contests', fallback: 'check-circle-outline' },
  { key: 'share', label: 'Share', fallback: 'share-variant' },
];

export const EMPTY_APP_ICONS = APP_ICON_SLOTS.reduce((acc, slot) => {
  acc[slot.key] = '';
  return acc;
}, {});
