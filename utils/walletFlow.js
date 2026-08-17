import { walletService } from '../services/api';
import { getPaymentSplit } from './tournamentHelpers';
import { isPaymentEnabled } from './paymentConfig';

export const CASHFREE_MIN_TOPUP = 10;

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
    qrAmount: remaining > 0 ? Math.max(CASHFREE_MIN_TOPUP, remaining) : 0,
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
  const amount = Math.max(CASHFREE_MIN_TOPUP, remaining);
  const tournamentId = opts.tournamentId || null;
  const returnScreen = opts.returnScreen || 'TournamentDetails';
  const pendingJoin = opts.pendingJoin || null;

  if (isPaymentEnabled()) {
    root.navigate('CashfreeQrPayment', {
      amount,
      returnToTournamentId: tournamentId,
      returnScreen,
      pendingJoin,
    });
    return;
  }

  navigateToAddCoins(navigation, {
    tournamentId,
    returnScreen,
    openAddCoins: true,
    suggestedAmount: amount,
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
