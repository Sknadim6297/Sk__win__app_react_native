import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import AppHeader from '../components/navigation/AppHeader';
import BrandCoin from '../components/ui/BrandCoin';
import AddCoinsModal from '../components/AddCoinsModal';
import CenterDialog from '../components/CenterDialog';
import { walletService, configService, paymentService } from '../services/api';
import { clearWalletReturnParams } from '../utils/walletFlow';
import { isPaymentEnabled, WITHDRAW_DISABLED_MESSAGE } from '../utils/paymentConfig';

/** Testing: credit wallet directly. Live: Cashfree QR when gateway is on. */
async function creditOrOpenGateway({ amount, balance, navigation, returnTournamentId, returnScreen }) {
  if (!isPaymentEnabled()) {
    return walletService.topup({ amount, paymentMethod: 'testing' });
  }
  const cfg = await paymentService.getConfig();
  if (cfg?.enabled) {
    return { openCashfree: true, amount, balance, returnTournamentId, returnScreen };
  }
  // Gateway flag on but Cashfree not ready — still allow test credit
  return walletService.topup({ amount, paymentMethod: 'testing' });
}

const WalletScreen = ({ navigation, route }) => {
  const [balance, setBalance] = useState({
    totalBalance: 0,
    balance: 0,
    bonusBalance: 0,
    totalDeposited: 0,
    totalWinnings: 0,
  });
  const [footerNote, setFooterNote] = useState('Only winnings can be redeemed.');
  const [securityNote, setSecurityNote] = useState('Coins Ki Suraksha Bilkul Bank Jaisa!');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showAddCoins, setShowAddCoins] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addingCoins, setAddingCoins] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const paymentInFlight = useRef(false);
  const returnTournamentRef = useRef(null);
  const returnScreenRef = useRef('TournamentDetails');

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [bal, ui, history] = await Promise.all([
        walletService.getBalance().catch(() => ({})),
        configService.getWalletUi().catch(() => ({})),
        walletService.getHistory().catch(() => ({ transactions: [] })),
      ]);

      setBalance({
        totalBalance: bal.totalBalance ?? (bal.balance || 0) + (bal.bonusBalance || 0),
        balance: bal.balance || 0,
        bonusBalance: bal.bonusBalance || 0,
        totalDeposited: bal.totalDeposited || 0,
        totalWinnings: bal.totalWinnings || 0,
      });
      setFooterNote(ui.footerNote || 'Only winnings can be redeemed.');
      setSecurityNote(ui.securityNote || 'Coins Ki Suraksha Bilkul Bank Jaisa!');
      setTransactions(history.transactions || []);
    } catch (e) {
      console.error('Wallet load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (route.params?.returnToTournamentId) {
        returnTournamentRef.current = route.params.returnToTournamentId;
      }
      if (route.params?.returnScreen) {
        returnScreenRef.current = route.params.returnScreen;
      }
      if (route.params?.openAddCoins) {
        setShowAddCoins(true);
        clearWalletReturnParams(navigation);
      }
    }, [loadData, route.params?.openAddCoins, route.params?.returnToTournamentId, route.params?.returnScreen, navigation])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const sanitizeAmountInput = (value) => {
    const cleaned = (value || '').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length <= 1) return parts[0];
    return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
  };

  const handleAddCoins = async () => {
    if (paymentInFlight.current || addingCoins) return;

    const trimmed = addAmount.trim();
    const amountNum = parseFloat(trimmed);
    if (!trimmed || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount');
      return;
    }
    if (amountNum < 10) {
      Alert.alert('Minimum deposit', 'Minimum add amount is ₹10');
      return;
    }
    if (amountNum > 10000) {
      Alert.alert('Maximum deposit', 'Maximum add amount is ₹10,000 per transaction');
      return;
    }

    try {
      paymentInFlight.current = true;
      setAddingCoins(true);

      const result = await creditOrOpenGateway({
        amount: amountNum,
        balance: balance.totalBalance ?? balance.balance,
        navigation,
        returnTournamentId: returnTournamentRef.current,
        returnScreen: returnScreenRef.current,
      });

      setShowAddCoins(false);
      setAddAmount('');

      if (result?.openCashfree) {
        navigation.navigate('CashfreeQrPayment', {
          amount: amountNum,
          walletBalance: balance.totalBalance ?? balance.balance,
          returnToTournamentId: returnTournamentRef.current,
          returnScreen: returnScreenRef.current,
        });
        return;
      }

      await loadData(true);
      Alert.alert('Success', result?.message || `₹${amountNum} added to your wallet`);
    } catch (err) {
      Alert.alert(
        'Could not add coins',
        err.message || 'Check your connection and try again.'
      );
    } finally {
      setAddingCoins(false);
      paymentInFlight.current = false;
    }
  };

  const closeAddCoins = () => {
    if (addingCoins) return;
    setShowAddCoins(false);
    setAddAmount('');
  };

  const handleWithdraw = async () => {
    if (withdrawing) return;
    if (!isPaymentEnabled()) {
      Alert.alert('Testing mode', WITHDRAW_DISABLED_MESSAGE);
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid', 'Enter a valid amount');
      return;
    }
    if (amount > balance.totalWinnings) {
      Alert.alert('Error', 'Only winnings can be withdrawn');
      return;
    }
    try {
      setWithdrawing(true);
      await walletService.withdraw({ amount, method: 'upi' });
      Alert.alert('Success', 'Withdrawal request submitted');
      setShowWithdraw(false);
      setWithdrawAmount('');
      await loadData(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <AppHeader navigation={navigation} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Loading wallet…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatAmount = (value) => {
    const n = Number(value) || 0;
    return Math.round(n).toLocaleString('en-IN');
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1224" translucent={false} />
      <AppHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
        }
        contentContainerStyle={styles.scroll}
        bounces
      >
        <View style={styles.body}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Total Balance</Text>
            <View style={styles.heroAmountRow}>
              <BrandCoin size={32} />
              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {formatAmount(balance.totalBalance)}
              </Text>
            </View>
            <View style={styles.heroSplit}>
              <View style={styles.heroSplitItem}>
                <Text style={styles.heroSplitLabel}>Real</Text>
                <Text style={styles.heroSplitValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  ₹{formatAmount(balance.balance)}
                </Text>
              </View>
              <View style={styles.heroSplitDivider} />
              <View style={styles.heroSplitItem}>
                <Text style={styles.heroSplitLabel}>Bonus</Text>
                <Text style={styles.heroSplitValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  ₹{formatAmount(balance.bonusBalance)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsList}>
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <MaterialCommunityIcons name="bank-transfer-in" size={22} color="#60A5FA" />
                <Text style={styles.statLabel}>Deposited</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                ₹{formatAmount(balance.totalDeposited)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <MaterialCommunityIcons name="trophy" size={22} color="#FBBF24" />
                <Text style={styles.statLabel}>Winnings</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                ₹{formatAmount(balance.totalWinnings)}
              </Text>
            </View>
            <View style={[styles.statRow, styles.statRowLast]}>
              <View style={styles.statLeft}>
                <MaterialCommunityIcons name="gift" size={22} color="#A78BFA" />
                <Text style={styles.statLabel}>Bonus</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                ₹{formatAmount(balance.bonusBalance)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGreen]}
            onPress={() => setShowAddCoins(true)}
            activeOpacity={0.88}
          >
              <MaterialCommunityIcons name="wallet-plus" size={22} color={COLORS.white} />
              <Text style={styles.actionText}>Add Coins</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPurple]}
            onPress={() => {
              if (!isPaymentEnabled()) {
                Alert.alert('Testing mode', WITHDRAW_DISABLED_MESSAGE);
                return;
              }
              setShowWithdraw(true);
            }}
            activeOpacity={0.88}
          >
              <MaterialCommunityIcons name="export" size={22} color={COLORS.white} />
              <Text style={styles.actionText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setShowTransactions(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="history" size={22} color={COLORS.purple} />
            <Text style={styles.historyText}>Transaction History</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.gray} />
          </TouchableOpacity>

          <View style={styles.footerBlock}>
            <Text style={styles.footerNote}>{footerNote}</Text>
            <Text style={styles.securityNote}>{securityNote}</Text>
          </View>
        </View>
      </ScrollView>

      <CenterDialog
        visible={showTransactions}
        onClose={() => setShowTransactions(false)}
        style={styles.txDialog}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Transactions</Text>
          <TouchableOpacity onPress={() => setShowTransactions(false)} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {transactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="receipt" size={40} color={COLORS.grayDim} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx._id || tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txDesc} numberOfLines={2}>
                    {tx.description || tx.type}
                  </Text>
                  <Text style={styles.txDate}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.type === 'withdraw' || tx.type === 'tournament_entry'
                      ? styles.txNeg
                      : styles.txPos,
                  ]}
                  numberOfLines={1}
                >
                  {tx.type === 'withdraw' || tx.type === 'tournament_entry' ? '-' : '+'}₹
                  {formatAmount(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </CenterDialog>

      <AddCoinsModal
        visible={showAddCoins}
        onClose={closeAddCoins}
        amount={addAmount}
        onChangeAmount={(v) => setAddAmount(sanitizeAmountInput(v))}
        onSubmit={handleAddCoins}
        processing={addingCoins}
      />

      <CenterDialog
        visible={showWithdraw}
        onClose={() => !withdrawing && setShowWithdraw(false)}
        dismissOnOverlay={!withdrawing}
      >
        <Text style={styles.modalTitle}>Withdraw Winnings</Text>
        <Text style={styles.withdrawHint}>Available: ₹{formatAmount(balance.totalWinnings)}</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.currency}>₹</Text>
          <TextInput
            style={styles.withdrawInput}
            placeholder="Amount"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            editable={!withdrawing}
          />
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, withdrawing && styles.submitDisabled]}
          onPress={handleWithdraw}
          disabled={withdrawing}
        >
          {withdrawing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>Request Withdrawal</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setShowWithdraw(false)}
          disabled={withdrawing}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </CenterDialog>
    </SafeAreaView>
  );
};

export default WalletScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E1E',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    ...TEXT.body,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  body: {
    flexGrow: 1,
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: '#151D36',
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.28)',
    minHeight: 180,
    justifyContent: 'center',
  },
  heroLabel: {
    ...TEXT.label,
    color: COLORS.gray,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
  },
  heroAmount: {
    flexShrink: 1,
    fontFamily: FONTS.bold,
    fontSize: 48,
    lineHeight: 58,
    color: COLORS.white,
    textAlign: 'center',
  },
  heroSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  heroSplitItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroSplitDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroSplitLabel: {
    ...TEXT.caption,
    color: COLORS.grayDim,
    marginBottom: 6,
  },
  heroSplitValue: {
    width: '100%',
    fontFamily: FONTS.bold,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.white,
    textAlign: 'center',
  },
  statsList: {
    backgroundColor: '#121B33',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 18,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  statLabel: {
    ...TEXT.label,
    color: COLORS.gray,
  },
  statValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 26,
    color: COLORS.white,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 56,
  },
  actionGreen: { backgroundColor: '#00B368' },
  actionPurple: { backgroundColor: '#5B39A8' },
  actionText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121B33',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  historyText: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
  footerBlock: {
    marginTop: 'auto',
    paddingTop: 28,
    paddingBottom: 8,
  },
  footerNote: {
    ...TEXT.body,
    color: COLORS.white,
    textAlign: 'center',
  },
  securityNote: {
    ...TEXT.label,
    color: '#4FD1C5',
    marginTop: 8,
    textAlign: 'center',
  },
  txDialog: {
    maxHeight: '75%',
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    ...TEXT.h3,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  modalScroll: {
    maxHeight: 360,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    ...TEXT.body,
    color: COLORS.gray,
    marginTop: 10,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  txLeft: { flex: 1 },
  txDesc: {
    ...TEXT.bodyMedium,
    color: COLORS.white,
  },
  txDate: {
    ...TEXT.caption,
    color: COLORS.grayDim,
    marginTop: 4,
  },
  txAmount: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 0,
    maxWidth: '42%',
    textAlign: 'right',
  },
  txPos: { color: '#4ADE80' },
  txNeg: { color: '#F87171' },
  withdrawHint: {
    ...TEXT.body,
    color: COLORS.gray,
    marginTop: 8,
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
  },
  currency: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.gray,
    marginRight: 6,
  },
  withdrawInput: {
    flex: 1,
    color: COLORS.white,
    ...TEXT.bodyLg,
    paddingVertical: 14,
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: '#00B368',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.65 },
  submitText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
  },
  cancelText: {
    ...TEXT.label,
    color: COLORS.gray,
  },
});
