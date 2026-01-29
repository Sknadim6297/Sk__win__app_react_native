import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';
import { userService, walletService } from '../services/api';

const WalletScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(0);
  const [totals, setTotals] = useState({ totalDeposited: 0, totalWithdrawn: 0 });
  const [stats, setStats] = useState({ totalWinnings: 0, tournamentsJoined: 0, tournamentsWon: 0 });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const loadWalletData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      const [balanceData, historyData, profileData] = await Promise.all([
        walletService.getBalance(),
        walletService.getHistory(),
        userService.getProfile(),
      ]);

      setBalance(balanceData?.balance ?? 0);
      setTotals({
        totalDeposited: balanceData?.totalDeposited ?? 0,
        totalWithdrawn: balanceData?.totalWithdrawn ?? 0,
      });

      const tournamentStats = profileData?.tournament || {};
      setStats({
        totalWinnings: tournamentStats.earnings ?? 0,
        tournamentsJoined: tournamentStats.participatedCount ?? 0,
        tournamentsWon: tournamentStats.wins ?? 0,
      });

      setTransactions(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      Alert.alert('Wallet Error', error.message || 'Failed to load wallet data');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
    }, [loadWalletData])
  );

  const handleDeposit = async () => {
    const parsedAmount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (parsedAmount < 10) {
      Alert.alert('Minimum Deposit', 'Minimum deposit amount is ₹10');
      return;
    }
    if (parsedAmount > 10000) {
      Alert.alert('Maximum Deposit', 'Maximum deposit amount is ₹10,000 per transaction');
      return;
    }

    try {
      setIsSubmitting(true);
      const transactionId = `MANUAL-${Date.now()}`;
      await walletService.topup(parsedAmount, 'manual', transactionId);
      setShowDepositModal(false);
      setDepositAmount('');
      await loadWalletData(true);
      Alert.alert('Success!', `₹${parsedAmount} has been added to your wallet`);
    } catch (error) {
      Alert.alert('Deposit Failed', error.message || 'Unable to add money right now');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const parsedAmount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (parsedAmount > balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your current balance');
      return;
    }
    if (parsedAmount < 50) {
      Alert.alert('Minimum Withdrawal', 'Minimum withdrawal amount is ₹50');
      return;
    }

    try {
      setIsSubmitting(true);
      await walletService.withdraw(parsedAmount, {});
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      await loadWalletData(true);
      Alert.alert('Success!', `₹${parsedAmount} withdrawal request has been submitted`);
    } catch (error) {
      Alert.alert('Withdrawal Failed', error.message || 'Unable to withdraw right now');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'tournament_reward': return 'trophy';
      case 'deposit': return 'add-circle';
      case 'tournament_entry': return 'game-controller';
      case 'withdraw': return 'remove-circle';
      case 'refund': return 'refresh-circle';
      default: return 'cash';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'tournament_reward': return '#FFD700';
      case 'deposit': return COLORS.success;
      case 'tournament_entry': return COLORS.error;
      case 'withdraw': return COLORS.error;
      case 'refund': return COLORS.accent;
      default: return COLORS.gray;
    }
  };

  const isCreditTransaction = (type) => {
    return ['deposit', 'tournament_reward', 'refund'].includes(type);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const dateText = date.toLocaleDateString();
    const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateText} • ${timeText}`;
  };

  const TransactionItem = ({ transaction }) => {
    const signedAmount = isCreditTransaction(transaction.type)
      ? transaction.amount
      : -transaction.amount;

    return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(transaction.type) + '20' }]}>
          <Ionicons 
            name={getTransactionIcon(transaction.type)} 
            size={20} 
            color={getTransactionColor(transaction.type)} 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>
            {transaction.description || 'Wallet transaction'}
          </Text>
          <Text style={styles.transactionDate}>{formatDateTime(transaction.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: signedAmount >= 0 ? COLORS.success : COLORS.error }
        ]}>
          {signedAmount >= 0 ? '+' : ''}₹{Math.abs(signedAmount)}
        </Text>
        <Text style={styles.transactionStatus}>
          {(transaction.status || 'completed').toUpperCase()}
        </Text>
      </View>
    </View>
    );
  };

  const DepositModal = () => (
    <Modal
      visible={showDepositModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDepositModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Money</Text>
            <TouchableOpacity onPress={() => setShowDepositModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.amountInput}>
            <Text style={styles.inputLabel}>Enter Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="₹0"
              placeholderTextColor={COLORS.gray}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.quickAmounts}>
            {[100, 500, 1000, 2000].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setDepositAmount(quickAmount.toString())}
              >
                <Text style={styles.quickAmountText}>₹{quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.depositButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleDeposit}
            disabled={isSubmitting}
          >
            <Text style={styles.depositButtonText}>Add Money</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const WithdrawModal = () => (
    <Modal
      visible={showWithdrawModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowWithdrawModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Withdraw Money</Text>
            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.balanceInfo}>
            <Text style={styles.availableBalanceText}>Available Balance: ₹{balance}</Text>
          </View>

          <View style={styles.amountInput}>
            <Text style={styles.inputLabel}>Enter Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="₹0"
              placeholderTextColor={COLORS.gray}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.withdrawButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleWithdraw}
            disabled={isSubmitting}
          >
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SKWinLogo size={110} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Wallet</Text>
            <Text style={styles.headerSubtitle}>Manage your funds</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadWalletData()}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <MaterialCommunityIcons name="wallet" size={32} color={COLORS.accent} />
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>₹{balance.toLocaleString()}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.depositActionButton}
              onPress={() => {
                setDepositAmount('');
                setShowDepositModal(true);
              }}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.withdrawActionButton}
              onPress={() => {
                setWithdrawAmount('');
                setShowWithdrawModal(true);
              }}
            >
              <Ionicons name="remove" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trending-up" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>₹{stats.totalWinnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Winnings</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="tournament" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.tournamentsJoined}</Text>
            <Text style={styles.statLabel}>Tournaments Joined</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trophy-award" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{stats.tournamentsWon}</Text>
            <Text style={styles.statLabel}>Tournaments Won</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <TransactionItem key={transaction._id || transaction.id} transaction={transaction} />
            ))
          )}
        </View>
      </ScrollView>

      <DepositModal />
      <WithdrawModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: COLORS.gray,
    marginLeft: 12,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  depositActionButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawActionButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
  },
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
  },
  emptyHistory: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  emptyHistoryText: {
    color: COLORS.gray,
    fontSize: 13,
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionStatus: {
    fontSize: 12,
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  balanceInfo: {
    marginBottom: 16,
  },
  availableBalanceText: {
    fontSize: 14,
    color: COLORS.accent,
    textAlign: 'center',
  },
  amountInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.white,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountButton: {
    backgroundColor: COLORS.darkGray,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  quickAmountText: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  depositButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  depositButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  withdrawButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WalletScreen;