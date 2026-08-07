import { StyleSheet } from 'react-native';
import { COLORS, FONTS, TEXT } from './theme';

/** Shared look for Wallet / Home / Account stack screens */
export const PAGE = {
  bg: '#0B0E1E',
  card: '#151D36',
  cardAlt: '#121B33',
  border: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(123,97,255,0.28)',
  muted: COLORS.gray,
  mutedDim: COLORS.grayDim,
  accent: COLORS.purple,
  green: '#00B368',
  purple: '#5B39A8',
  cyan: '#4FD1C5',
  gold: '#FBBF24',
};

export const pageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: PAGE.muted,
    ...TEXT.body,
  },
  heroCard: {
    backgroundColor: PAGE.card,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
  },
  card: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PAGE.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: PAGE.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 12,
  },
  label: {
    ...TEXT.label,
    color: PAGE.muted,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.white,
  },
  caption: {
    ...TEXT.caption,
    color: PAGE.mutedDim,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PAGE.green,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 56,
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PAGE.purple,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 56,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: PAGE.cardAlt,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  chipActive: {
    backgroundColor: PAGE.purple,
    borderColor: PAGE.purple,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.white,
    marginTop: 14,
  },
  emptyText: {
    ...TEXT.body,
    color: PAGE.mutedDim,
    textAlign: 'center',
    marginTop: 8,
  },
});
