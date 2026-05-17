import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import AppIcon from '../components/ui/AppIcon';
import { walletService, configService } from '../services/api';

const { width } = Dimensions.get('window');
const PACK_WIDTH = width * 0.42;

const WalletScreen = ({ navigation }) => {
  const [balance, setBalance] = useState({
    totalBalance: 0,
    balance: 0,
    bonusBalance: 0,
    totalDeposited: 0,
    totalWinnings: 0,
  });
  const [coinPacks, setCoinPacks] = useState([]);
  const [footerNote, setFooterNote] = useState('Only winnings can be redeemed.');
  const [securityNote, setSecurityNote] = useState('Coins Ki Suraksha Bilkul Bank Jaisa!');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [bal, ui, history] = await Promise.all([
        walletService.getBalance().catch(() => ({})),
        configService.getWalletUi().catch(() => ({ coinPacks: [] })),
        walletService.getHistory().catch(() => ({ transactions: [] })),
      ]);

      setBalance({
        totalBalance: bal.totalBalance ?? (bal.balance || 0) + (bal.bonusBalance || 0),
        balance: bal.balance || 0,
        bonusBalance: bal.bonusBalance || 0,
        totalDeposited: bal.totalDeposited || 0,
        totalWinnings: bal.totalWinnings || 0,
      });
      setCoinPacks(ui.coinPacks || []);
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
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleBuyPack = async (pack) => {
    Alert.alert(
      'Buy Coins',
      `Purchase ${pack.label} for ₹${pack.priceInr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            try {
              setBuyingPackId(pack.id);
              const res = await walletService.buyPack(pack.id);
              Alert.alert('Success', res.message || 'Coins added!');
              await loadData(true);
            } catch (err) {
              Alert.alert('Error', err.message || 'Purchase failed');
            } finally {
              setBuyingPackId(null);
            }
          },
        },
      ]
    );
  };

  const handleWithdraw = async () => {
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

  const scrollToPacks = () => {
    // packs are below — user scrolls manually; optional haptic
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0E1E" />

      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => navigation.navigate('SupportTickets')}
        >
          <AppIcon name="headset" size="md" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceValue}>{balance.totalBalance.toFixed(0)}</Text>
            </View>
            <TouchableOpacity style={styles.btnPurple} onPress={() => setShowTransactions(true)}>
              <MaterialCommunityIcons name="history" size={16} color={COLORS.white} />
              <Text style={styles.btnPurpleText}>Transaction</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Deposited</Text>
              <Text style={styles.balanceValue}>{balance.totalDeposited.toFixed(0)}</Text>
            </View>
            <TouchableOpacity style={styles.btnGreen} onPress={scrollToPacks}>
              <MaterialCommunityIcons name="wallet-plus" size={16} color={COLORS.white} />
              <Text style={styles.btnGreenText}>Add Coins</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Winning</Text>
              <Text style={styles.balanceValue}>{balance.totalWinnings.toFixed(0)}</Text>
            </View>
            <TouchableOpacity style={styles.btnPurple} onPress={() => setShowWithdraw(true)}>
              <MaterialCommunityIcons name="export" size={16} color={COLORS.white} />
              <Text style={styles.btnPurpleText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Bonus</Text>
              <Text style={styles.balanceValue}>{balance.bonusBalance.toFixed(0)}</Text>
            </View>
          </View>

          <Text style={styles.footerNote}>{footerNote}</Text>
          <Text style={styles.securityNote}>{securityNote}</Text>
        </View>

        <Text style={styles.packsTitle}>Buy Coins</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.packsRow}
        >
          {coinPacks.map((pack) => (
            <View key={pack.id} style={styles.packCard}>
              {pack.isBest && (
                <View style={styles.bestRibbon}>
                  <Text style={styles.bestText}>BEST</Text>
                </View>
              )}
              <MaterialCommunityIcons name="circle-multiple" size={56} color="#FBBF24" />
              <Text style={styles.packLabel}>{pack.label}</Text>
              {pack.bonusCoins > 0 && (
                <View style={styles.extraBadge}>
                  <Text style={styles.extraText}>Includes +{pack.bonusCoins} Extra</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.priceBtn}
                onPress={() => handleBuyPack(pack)}
                disabled={buyingPackId === pack.id}
              >
                {buyingPackId === pack.id ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.priceText}>₹ {pack.priceInr}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal visible={showTransactions} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transactions</Text>
              <TouchableOpacity onPress={() => setShowTransactions(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {transactions.length === 0 ? (
                <Text style={styles.emptyText}>No transactions yet</Text>
              ) : (
                transactions.map((tx) => (
                  <View key={tx._id || tx.id} style={styles.txRow}>
                    <View>
                      <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
                      <Text style={styles.txDate}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.type === 'withdraw' ? styles.txNeg : styles.txPos,
                      ]}
                    >
                      {tx.type === 'withdraw' ? '-' : '+'}₹{tx.amount}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWithdraw} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Withdraw Winnings</Text>
            <Text style={styles.withdrawHint}>
              Available: ₹{balance.totalWinnings.toFixed(0)}
            </Text>
            <TextInput
              style={styles.withdrawInput}
              placeholder="Amount"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <TouchableOpacity
              style={[styles.priceBtn, { marginTop: 16, width: '100%' }]}
              onPress={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.priceText}>Request Withdrawal</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWithdraw(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSide: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    ...TEXT.h3,
    color: COLORS.white,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: '#121B33',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  balanceLabel: {
    ...TEXT.label,
    color: COLORS.gray,
  },
  balanceValue: {
    ...TEXT.stat,
    color: COLORS.white,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  btnPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B39A8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
    minHeight: 44,
  },
  btnPurpleText: {
    ...TEXT.labelSm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  btnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B368',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
    minHeight: 44,
  },
  btnGreenText: {
    ...TEXT.labelSm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  footerNote: {
    ...TEXT.body,
    color: COLORS.white,
    marginTop: 16,
    textAlign: 'center',
  },
  securityNote: {
    ...TEXT.label,
    color: '#4FD1C5',
    marginTop: 8,
    textAlign: 'center',
  },
  packsTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    marginBottom: 14,
  },
  packsRow: {
    gap: 12,
    paddingRight: 16,
  },
  packCard: {
    width: PACK_WIDTH,
    backgroundColor: '#121B33',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  bestRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
  },
  bestText: {
    ...TEXT.overline,
    fontSize: 11,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  packLabel: {
    ...TEXT.buttonSm,
    color: COLORS.white,
    marginTop: 10,
    textAlign: 'center',
  },
  extraBadge: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#00B368',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  extraText: {
    ...TEXT.labelSm,
    color: '#4ADE80',
  },
  priceBtn: {
    marginTop: 14,
    backgroundColor: '#00B368',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  priceText: {
    ...TEXT.buttonSm,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#121B33',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...TEXT.h3,
    color: COLORS.white,
  },
  modalScroll: {
    maxHeight: 400,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
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
    ...TEXT.buttonSm,
    fontFamily: FONTS.bold,
  },
  txPos: { color: '#4ADE80' },
  txNeg: { color: '#F87171' },
  emptyText: {
    ...TEXT.body,
    color: COLORS.gray,
    textAlign: 'center',
    paddingVertical: 24,
  },
  withdrawHint: {
    ...TEXT.body,
    color: COLORS.gray,
    marginTop: 8,
  },
  withdrawInput: {
    marginTop: 12,
    backgroundColor: '#0B0E1E',
    borderRadius: 10,
    padding: 16,
    color: COLORS.white,
    ...TEXT.bodyLg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    ...TEXT.label,
    color: COLORS.gray,
  },
});
