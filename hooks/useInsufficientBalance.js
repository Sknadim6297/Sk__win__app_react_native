import React, { useCallback, useState } from 'react';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import { navigateToAddCoins, openRemainingJoinPayment } from '../utils/walletFlow';
import { isPaymentEnabled } from '../utils/paymentConfig';

/**
 * Hook: show remaining coins, then QR (or Add Coins) so join can complete after payment.
 */
export function useInsufficientBalance(navigation) {
  const [state, setState] = useState({
    visible: false,
    tournamentId: null,
    returnScreen: 'TournamentDetails',
    requiredAmount: null,
    currentBalance: null,
    remainingAmount: null,
    qrAmount: null,
    forTeam: false,
    pendingJoin: null,
  });

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const showInsufficientBalance = useCallback((opts = {}) => {
    const required = opts.requiredAmount ?? opts.realRequired ?? null;
    const current = opts.currentBalance ?? opts.balance ?? null;
    const remaining =
      opts.remainingAmount ??
      (required != null && current != null ? Math.max(0, Number(required) - Number(current)) : null);
    setState({
      visible: true,
      tournamentId: opts.tournamentId || null,
      returnScreen: opts.returnScreen || 'TournamentDetails',
      requiredAmount: required,
      currentBalance: current,
      remainingAmount: remaining,
      qrAmount: opts.qrAmount ?? remaining,
      forTeam: Boolean(opts.forTeam),
      pendingJoin: opts.pendingJoin || null,
    });
  }, []);

  const handleAddCoins = useCallback(() => {
    const { tournamentId, returnScreen, remainingAmount, qrAmount, pendingJoin } = state;
    setState((s) => ({ ...s, visible: false }));
    if (isPaymentEnabled()) {
      openRemainingJoinPayment(navigation, {
        tournamentId,
        returnScreen,
        remainingAmount: qrAmount || remainingAmount,
        pendingJoin,
      });
      return;
    }
    navigateToAddCoins(navigation, {
      tournamentId,
      returnScreen,
      openAddCoins: true,
      suggestedAmount: qrAmount || remainingAmount,
      pendingJoin,
    });
  }, [navigation, state]);

  const remaining = Number(state.remainingAmount) || 0;
  const message = state.forTeam
    ? remaining > 0
      ? `You need ₹${remaining.toLocaleString('en-IN')} more coins to register this team. Pay the remaining amount, then you will join automatically.`
      : "You don't have enough coins to register your team. Add coins to continue."
    : remaining > 0
      ? `You need ₹${remaining.toLocaleString('en-IN')} more coins to join. Pay the remaining amount, then you will join automatically.`
      : "You don't have enough coins to join this tournament. Add coins to continue.";

  const InsufficientBalanceDialog = (
    <InsufficientBalanceModal
      visible={state.visible}
      onClose={hide}
      onAddCoins={handleAddCoins}
      message={message}
      requiredAmount={state.requiredAmount}
      currentBalance={state.currentBalance}
      remainingAmount={state.remainingAmount}
      payLabel={
        remaining > 0
          ? `Pay remaining ₹${Number(state.qrAmount || remaining).toLocaleString('en-IN')}`
          : 'Add Coins'
      }
    />
  );

  return { showInsufficientBalance, hideInsufficientBalance: hide, InsufficientBalanceDialog };
}
