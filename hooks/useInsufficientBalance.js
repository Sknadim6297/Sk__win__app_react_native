import React, { useCallback, useState } from 'react';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import { navigateToAddCoins } from '../utils/walletFlow';

/**
 * Hook: show a centered insufficient-balance modal and deep-link to Add Coins.
 *
 * Usage:
 *   const { showInsufficientBalance, InsufficientBalanceDialog } = useInsufficientBalance(navigation);
 *   showInsufficientBalance({ tournamentId, returnScreen, requiredAmount, balance, forTeam: true });
 *   return (... <>{InsufficientBalanceDialog}</>);
 */
export function useInsufficientBalance(navigation) {
  const [state, setState] = useState({
    visible: false,
    tournamentId: null,
    returnScreen: 'TournamentDetails',
    requiredAmount: null,
    currentBalance: null,
    forTeam: false,
  });

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const showInsufficientBalance = useCallback((opts = {}) => {
    setState({
      visible: true,
      tournamentId: opts.tournamentId || null,
      returnScreen: opts.returnScreen || 'TournamentDetails',
      requiredAmount: opts.requiredAmount ?? opts.realRequired ?? null,
      currentBalance: opts.currentBalance ?? opts.balance ?? null,
      forTeam: Boolean(opts.forTeam),
    });
  }, []);

  const handleAddCoins = useCallback(() => {
    const { tournamentId, returnScreen } = state;
    setState((s) => ({ ...s, visible: false }));
    navigateToAddCoins(navigation, {
      tournamentId,
      returnScreen,
      openAddCoins: true,
    });
  }, [navigation, state]);

  const message = state.forTeam
    ? "You don't have enough coins to register your team for this tournament. Please add coins to continue."
    : "You don't have enough coins to join this tournament. Please add coins to continue.";

  const InsufficientBalanceDialog = (
    <InsufficientBalanceModal
      visible={state.visible}
      onClose={hide}
      onAddCoins={handleAddCoins}
      message={message}
      requiredAmount={state.requiredAmount}
      currentBalance={state.currentBalance}
    />
  );

  return { showInsufficientBalance, hideInsufficientBalance: hide, InsufficientBalanceDialog };
}
