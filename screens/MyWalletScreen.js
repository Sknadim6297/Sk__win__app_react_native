import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import BrandCoin from '../components/ui/BrandCoin';
import AddCoinsModal from '../components/AddCoinsModal';
import CenterDialog from '../components/CenterDialog';
import { walletService, userService, paymentService } from '../services/api';
import { clearWalletReturnParams } from '../utils/walletFlow';
import { isPaymentEnabled, WITHDRAW_DISABLED_MESSAGE } from '../utils/paymentConfig';

const formatAmount = (value) => {
  const n = Number(value) || 0;
  return Math.round(n).toLocaleString('en-IN');
};

const MyWalletScreen = ({ navigation, route }) => {
  const paymentInFlight = useRef(false);
  const returnTournamentRef = useRef(null);
  const returnScreenRef = useRef('TournamentDetails');
  const [walletData, setWalletData] = useState({
    balance: 0,
    bonusBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalWinnings: 0,
  });
  const [stats, setStats] = useState({
    totalWinnings: 0,
    tournamentsJoined: 0,
    tournamentsWon: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const sanitizeAmountInput = (value) => {
    const cleaned = (value || '').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length <= 1) return parts[0];
    return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
  };

  const loadWalletData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [balanceData, historyData, profileData] = await Promise.all([
        walletService.getBalance().catch(() => ({})),
        walletService.getHistory().catch(() => ({ transactions: [] })),
        userService.getProfile().catch(() => ({})),
      ]);

      setWalletData({
        balance: balanceData?.balance || 0,
        bonusBalance: balanceData?.bonusBalance || 0,
        totalDeposited: balanceData?.totalDeposited || 0,
        totalWithdrawn: balanceData?.totalWithdrawn || 0,
        totalWinnings: balanceData?.totalWinnings || 0,
      });

      const tournamentStats = profileData?.tournament || {};
      setStats({
        totalWinnings: tournamentStats.earnings || 0,
        tournamentsJoined: tournamentStats.participatedCount || 0,
        tournamentsWon: tournamentStats.wins || 0,
      });
      setTransactions(Array.isArray(historyData?.transactions) ? historyData.transactions : []);
    } catch (error) {
      console.error('Error loading wallet:', error.message);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
      if (route.params?.returnToTournamentId) {
        returnTournamentRef.current = route.params.returnToTournamentId;
      }
      if (route.params?.returnScreen) {
        returnScreenRef.current = route.params.returnScreen;
      }
      if (route.params?.openAddCoins) {
        setShowAddMoneyModal(true);
        clearWalletReturnParams(navigation);
      }
    }, [
      loadWalletData,
      route.params?.openAddCoins,
      route.params?.returnToTournamentId,
      route.params?.returnScreen,
      navigation,
    ])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData(true);
  };

  const isCreditTransaction = (type) =>
    ['deposit', 'tournament_reward', 'refund', 'referral_bonus'].includes(type);

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString('en-IN')} · ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handleAddMoney = async () => {
    if (paymentInFlight.current || processing) return;
    const amountNum = parseFloat(addAmount.trim());
    if (!addAmount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
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
      setProcessing(true);

      // Testing (PAYMENT_ENABLED=false): credit dummy coins immediately — no Cashfree / no block alert.
      if (!isPaymentEnabled()) {
        const res = await walletService.topup({
          amount: amountNum,
          paymentMethod: 'testing',
        });
        setShowAddMoneyModal(false);
        setAddAmount('');
        await loadWalletData(true);
        Alert.alert('Success', res?.message || `₹${amountNum} added to your wallet`);
        return;
      }

      const cfg = await paymentService.getConfig();
      if (cfg?.enabled) {
        setShowAddMoneyModal(false);
        setAddAmount('');
        navigation.navigate('CashfreeQrPayment', {
          amount: amountNum,
          walletBalance: walletData.balance + walletData.bonusBalance,
          returnToTournamentId: returnTournamentRef.current,
          returnScreen: returnScreenRef.current,
        });
        return;
      }

      const res = await walletService.topup({
        amount: amountNum,
        paymentMethod: 'testing',
      });
      setShowAddMoneyModal(false);
      setAddAmount('');
      await loadWalletData(true);
      Alert.alert('Success', res?.message || `₹${amountNum} added to your wallet`);
    } catch (err) {
      Alert.alert('Could not add coins', err.message || 'Check your connection and try again.');
    } finally {
      setProcessing(false);
      paymentInFlight.current = false;
    }
  };

  const handleWithdraw = async () => {
    if (processing) return;
    if (!isPaymentEnabled()) {
      Alert.alert('Testing mode', WITHDRAW_DISABLED_MESSAGE);
      return;
    }
    const amountNum = parseFloat(withdrawAmount.trim());
    if (!withdrawAmount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amountNum > walletData.totalWinnings) {
      Alert.alert('Error', 'Only winnings can be withdrawn');
      return;
    }
    if (amountNum < 25) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹25');
      return;
    }

    try {
      setProcessing(true);
      await walletService.withdraw({ amount: amountNum, method: 'upi' });
      Alert.alert('Success', `Withdrawal of ₹${amountNum} requested`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      await loadWalletData(true);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const totalBalance = walletData.balance + walletData.bonusBalance;

  if (loading) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ScreenHeader title="My Wallet" onBack={() => navigation.goBack()} />
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
          <Text style={pageStyles.loadingText}>Loading wallet…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="My Wallet" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={pageStyles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Balance</Text>
          <View style={styles.heroAmountRow}>
            <BrandCoin size={32} />
            <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
              {formatAmount(totalBalance)}
            </Text>
          </View>
          <View style={styles.heroSplit}>
            <View style={styles.heroSplitItem}>
              <Text style={styles.heroSplitLabel}>Real</Text>
              <Text style={styles.heroSplitValue} numberOfLines={1}>
                ₹{formatAmount(walletData.balance)}
              </Text>
            </View>
            <View style={styles.heroSplitDivider} />
            <View style={styles.heroSplitItem}>
              <Text style={styles.heroSplitLabel}>Bonus</Text>
              <Text style={styles.heroSplitValue} numberOfLines={1}>
                ₹{formatAmount(walletData.bonusBalance)}
              </Text>
            </View>
          </View>
        </View>

        <View style={pageStyles.card}>
          <View style={pageStyles.row}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="trophy" size={22} color={PAGE.gold} />
              <Text style={pageStyles.label}>Winnings</Text>
            </View>
            <Text style={pageStyles.value}>₹{formatAmount(walletData.totalWinnings || stats.totalWinnings)}</Text>
          </View>
          <View style={pageStyles.row}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="tournament" size={22} color="#60A5FA" />
              <Text style={pageStyles.label}>Joined</Text>
            </View>
            <Text style={pageStyles.value}>{stats.tournamentsJoined}</Text>
          </View>
          <View style={[pageStyles.row, pageStyles.rowLast]}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="trophy-award" size={22} color="#A78BFA" />
              <Text style={pageStyles.label}>Tournaments Won</Text>
            </View>
            <Text style={pageStyles.value}>{stats.tournamentsWon}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: PAGE.green }]}
            onPress={() => setShowAddMoneyModal(true)}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="wallet-plus" size={22} color={COLORS.white} />
            <Text style={styles.actionText}>Add Coins</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: PAGE.purple }]}
            onPress={() => {
              if (!isPaymentEnabled()) {
                Alert.alert('Testing mode', WITHDRAW_DISABLED_MESSAGE);
                return;
              }
              setShowWithdrawModal(true);
            }}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="export" size={22} color={COLORS.white} />
            <Text style={styles.actionText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        <Text style={pageStyles.sectionTitle}>Recent Transactions</Text>
        <View style={pageStyles.card}>
          {transactions.length === 0 ? (
            <View style={pageStyles.emptyWrap}>
              <MaterialCommunityIcons name="receipt" size={40} color={PAGE.mutedDim} />
              <Text style={pageStyles.emptyTitle}>No transactions yet</Text>
            </View>
          ) : (
            transactions.slice(0, 20).map((tx, index, arr) => {
              const credit = isCreditTransaction(tx.type);
              const last = index === Math.min(arr.length, 20) - 1;
              return (
                <View key={tx._id || index} style={[pageStyles.row, last && pageStyles.rowLast]}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txDesc} numberOfLines={2}>
                      {tx.description || tx.type}
                    </Text>
                    <Text style={pageStyles.caption}>{formatDateTime(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txAmount, credit ? styles.txPos : styles.txNeg]}>
                    {credit ? '+' : '-'}₹{formatAmount(tx.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <AddCoinsModal
        visible={showAddMoneyModal}
        onClose={() => {
          if (processing) return;
          setShowAddMoneyModal(false);
          setAddAmount('');
        }}
        amount={addAmount}
        onChangeAmount={(t) => setAddAmount(sanitizeAmountInput(t))}
        onSubmit={handleAddMoney}
        processing={processing}
        title="Add Money"
        hint="Enter amount to add (₹10 – ₹10,000)"
        submitLabel="Add Money"
      />

      <CenterDialog
        visible={showWithdrawModal}
        onClose={() => !processing && setShowWithdrawModal(false)}
        dismissOnOverlay={!processing}
      >
        <Text style={styles.modalTitle}>Withdraw Winnings</Text>
        <Text style={styles.withdrawHint}>
          Available: ₹{formatAmount(walletData.totalWinnings)} · Min ₹25
        </Text>
        <View style={styles.inputWrap}>
          <Text style={styles.currency}>₹</Text>
          <TextInput
            style={styles.withdrawInput}
            placeholder="Amount"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={withdrawAmount}
            onChangeText={(t) => setWithdrawAmount(sanitizeAmountInput(t))}
            editable={!processing}
          />
        </View>
        <TouchableOpacity
          style={[pageStyles.primaryBtn, processing && { opacity: 0.65 }]}
          onPress={handleWithdraw}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={pageStyles.primaryBtnText}>Request Withdrawal</Text>
          )}
        </TouchableOpacity>
      </CenterDialog>
    </SafeAreaView>
  );
};

export default MyWalletScreen;

const styles = StyleSheet.create({
  heroCard: {
    ...pageStyles.heroCard,
    minHeight: 170,
    justifyContent: 'center',
  },
  heroLabel: {
    ...TEXT.label,
    color: PAGE.muted,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heroAmount: {
    flexShrink: 1,
    fontFamily: FONTS.bold,
    fontSize: 48,
    lineHeight: 58,
    color: COLORS.white,
  },
  heroSplit: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: PAGE.border,
  },
  heroSplitItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  heroSplitDivider: { width: 1, backgroundColor: PAGE.border },
  heroSplitLabel: { ...TEXT.caption, color: PAGE.mutedDim, marginBottom: 6 },
  heroSplitValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
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
  actionText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  txLeft: { flex: 1, minWidth: 0 },
  txDesc: { ...TEXT.bodyMedium, color: COLORS.white },
  txAmount: { fontFamily: FONTS.bold, fontSize: 15 },
  txPos: { color: '#4ADE80' },
  txNeg: { color: '#F87171' },
  modalTitle: { ...TEXT.h3, fontFamily: FONTS.bold, color: COLORS.white },
  withdrawHint: { ...TEXT.body, color: PAGE.muted, marginTop: 8, marginBottom: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAGE.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  currency: { fontFamily: FONTS.bold, fontSize: 18, color: PAGE.muted, marginRight: 6 },
  withdrawInput: { flex: 1, color: COLORS.white, ...TEXT.bodyLg, paddingVertical: 14 },
});
