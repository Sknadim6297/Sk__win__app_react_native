import { walletService } from '../services/api';
import { getPaymentSplit } from './tournamentHelpers';

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
  return {
    balance,
    bonusBalance,
    realRequired: split.realRequired,
    totalPayable: split.totalPayable,
    sufficient: balance >= split.realRequired,
    totalBalance: w?.totalBalance ?? balance + bonusBalance,
  };
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

  root.navigate('MainApp', {
    screen: 'WalletTab',
    params: {
      returnToTournamentId: opts.tournamentId || null,
      returnScreen: opts.returnScreen || 'TournamentDetails',
      openAddCoins: opts.openAddCoins !== false,
    },
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
export function navigateAfterWalletTopup(navigation, returnToTournamentId, returnScreen = 'TournamentDetails') {
  if (!returnToTournamentId) return false;

  const root = getRootNavigation(navigation);
  if (!root) return false;

  const screen = returnScreen || 'TournamentDetails';
  const params = {
    tournamentId: returnToTournamentId,
    walletRecharged: true,
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
    });
  } catch {
    /* tab navigator may not support setParams in some cases */
  }
}
