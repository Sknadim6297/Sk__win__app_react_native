import { walletService } from '../services/api';
import { getPaymentSplit } from './tournamentHelpers';
import { isPaymentEnabled } from './paymentConfig';

export const ZAPUPI_MIN_TOPUP = 10;

const WALLET_CREDIT_TYPES = new Set([
  'deposit',
  'tournament_reward',
  'winning',
  'refund',
  'referral_bonus',
]);

const WALLET_DEBIT_TYPES = new Set([
  'withdraw',
  'tournament_entry',
  'winning_reversal',
]);

/** Winner prizes use type `winning` — treat them as credits, not deductions. */
export function isWalletCredit(type) {
  const t = String(type || '').toLowerCase();
  if (WALLET_CREDIT_TYPES.has(t)) return true;
  if (WALLET_DEBIT_TYPES.has(t)) return false;
  return false;
}

/** Walk up to the root stack navigator. */
export function getRootNavigation(navigation) {
  if (!navigation) return null;
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

/** Fetch wallet and check if user can pay tournament entry (real balance after bonus). */
export async function fetchWalletForEntry(entryFee) {
  const w = await walletService.getBalance();
  const bonusBalance = w?.bonusBalance ?? 0;
  const balance = w?.balance ?? 0;
  const split = getPaymentSplit(entryFee, bonusBalance);
  const remaining = Math.max(0, split.realRequired - balance);
  return {
    balance,
    bonusBalance,
    realRequired: split.realRequired,
    totalPayable: split.totalPayable,
    remaining,
    qrAmount: remaining > 0 ? Math.max(ZAPUPI_MIN_TOPUP, remaining) : 0,
    sufficient: balance >= split.realRequired,
    totalBalance: w?.totalBalance ?? balance + bonusBalance,
  };
}

/**
 * If wallet is short, open QR for the remaining coins (or Add Coins when gateway is off).
 * After payment, return to the join screen and auto-complete join.
 */
export function openRemainingJoinPayment(navigation, opts = {}) {
  const root = getRootNavigation(navigation);
  if (!root) return;

  const remaining = Math.max(0, Number(opts.remainingAmount ?? opts.qrAmount) || 0);
  const amount = Math.max(ZAPUPI_MIN_TOPUP, remaining);
  const tournamentId = opts.tournamentId || null;
  const returnScreen = opts.returnScreen || 'TournamentDetails';
  const pendingJoin = opts.pendingJoin || null;

  root.navigate('ZapUpiPayment', {
    purpose: 'wallet_topup',
    amount,
    returnToTournamentId: tournamentId,
    returnScreen,
    pendingJoin,
  });
}

/**
 * Navigate to Wallet tab and open Add Coins.
 * @param {object} navigation
 * @param {string|object} tournamentIdOrOpts - tournament id or options bag
 */
export function navigateToAddCoins(navigation, tournamentIdOrOpts) {
  const root = getRootNavigation(navigation);
  if (!root) return;

  const opts =
    typeof tournamentIdOrOpts === 'object' && tournamentIdOrOpts !== null
      ? tournamentIdOrOpts
      : { tournamentId: tournamentIdOrOpts };

  root.navigate('Wallet', {
    returnToTournamentId: opts.tournamentId || null,
    returnScreen: opts.returnScreen || 'TournamentDetails',
    openAddCoins: opts.openAddCoins !== false,
    suggestedAmount: opts.suggestedAmount,
    pendingJoin: opts.pendingJoin || null,
  });
}

/**
 * @deprecated Prefer useInsufficientBalance hook for centered modal UI.
 * Kept as a thin wrapper that navigates to Add Coins (legacy Alert removed from call sites).
 */
export function promptInsufficientBalance(navigation, tournamentId, returnScreen = 'TournamentDetails') {
  navigateToAddCoins(navigation, { tournamentId, returnScreen, openAddCoins: true });
}

/** Open ZapUPI in-app WebView to pay tournament entry (after slot / team details). */
export function startTournamentZapUpiPayment(navigation, params = {}) {
  const root = getRootNavigation(navigation);
  if (!root) return;
  root.navigate('ZapUpiPayment', {
    purpose: 'tournament_entry',
    ...params,
  });
}

/** After successful top-up, return user to the originating tournament screen. */
export function navigateAfterWalletTopup(
  navigation,
  returnToTournamentId,
  returnScreen = 'TournamentDetails',
  pendingJoin = null
) {
  if (!returnToTournamentId) return false;

  const root = getRootNavigation(navigation);
  if (!root) return false;

  const screen = returnScreen || 'TournamentDetails';
  const params = {
    tournamentId: returnToTournamentId,
    walletRecharged: true,
    pendingJoin: pendingJoin || undefined,
  };

  if (screen === 'CustomMatchTeamRegister') {
    root.navigate('CustomMatchTeamRegister', params);
  } else if (screen === 'TournamentSlotBooking') {
    root.navigate('TournamentSlotBooking', params);
  } else {
    root.navigate('TournamentDetails', params);
  }
  return true;
}

export function clearWalletReturnParams(navigation) {
  try {
    navigation.setParams?.({
      openAddCoins: false,
      returnToTournamentId: undefined,
      returnScreen: undefined,
      suggestedAmount: undefined,
      pendingJoin: undefined,
    });
  } catch {
    /* tab navigator may not support setParams in some cases */
  }
}
