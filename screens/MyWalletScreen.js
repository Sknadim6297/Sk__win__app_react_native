import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import { walletService, userService } from '../services/api';

const MyWalletScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalWinnings: 0,
  });
  const [stats, setStats] = useState({ 
    totalWinnings: 0, 
    tournamentsJoined: 0, 
    tournamentsWon: 0 
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
    }, [])
  );

  const loadWalletData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      console.log('Loading wallet data...');

      // Load each service separately for better error isolation
      let balanceData = { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalWinnings: 0 };
      let historyData = { transactions: [] };
      let profileData = { tournament: {} };

      try {
        console.log('Fetching balance...');
        balanceData = await walletService.getBalance();
        console.log('Balance fetched:', balanceData);
      } catch (error) {
        console.error('Error fetching balance:', error.message);
      }

      try {
        console.log('Fetching history...');
        historyData = await walletService.getHistory();
        console.log('History fetched successfully:', historyData);
      } catch (error) {
        console.error('Error fetching history:', error.message);
        historyData = { transactions: [] };
      }

      try {
        console.log('Fetching profile...');
        profileData = await userService.getProfile();
        console.log('Profile fetched:', profileData);
      } catch (error) {
        console.error('Error fetching profile:', error.message);
        profileData = { tournament: {} };
      }

      setWalletData({
        balance: balanceData?.balance || 0,
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

      // Handle transaction history
      if (historyData && Array.isArray(historyData.transactions)) {
        setTransactions(historyData.transactions);
      } else {
        setTransactions([]);
      }

      console.log('Wallet data loaded successfully');
    } catch (error) {
      console.error('Error loading wallet:', error.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWalletData(true);
  }, []);

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
      case 'deposit': return '#4CAF50';
      case 'tournament_entry': return '#FF6B6B';
      case 'withdraw': return '#FF6B6B';
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

  const handleAddMoney = async () => {
    const trimmedAmount = amount.trim();
    const amountNum = parseFloat(trimmedAmount);
    
    if (!trimmedAmount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountNum < 10) {
      Alert.alert('Error', 'Minimum deposit amount is ₹10');
      return;
    }

    if (amountNum > 10000) {
      Alert.alert('Error', 'Maximum deposit amount is ₹10,000 per transaction');
      return;
    }

    try {
      setProcessing(true);
      const transactionId = `TXN_${Date.now()}`;
      const response = await walletService.topup({ 
        amount: amountNum,
        paymentMethod: 'manual',
        transactionId: transactionId 
      });
      
      if (response && response.success) {
        Alert.alert('Success', `₹${amountNum} added to your wallet successfully`);
        setShowAddMoneyModal(false);
        setAmount('');
        await loadWalletData(true);
      } else {
        const errorMsg = response?.message || 'Failed to add money. Please try again.';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error adding money:', error);
      Alert.alert('Error', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const trimmedAmount = amount.trim();
    const amountNum = parseFloat(trimmedAmount);
    
    if (!trimmedAmount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountNum > walletData.balance) {
      Alert.alert('Error', 'Insufficient balance. You cannot withdraw more than your current balance.');
      return;
    }

    if (amountNum < 50) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹50');
      return;
    }

    try {
      setProcessing(true);
      const response = await walletService.withdraw({ 
        amount: amountNum,
        bankDetails: {} 
      });
      
      if (response && response.success) {
        Alert.alert('Success', `Withdrawal of ₹${amountNum} initiated successfully`);
        setShowWithdrawModal(false);
        setAmount('');
        await loadWalletData(true);
      } else {
        const errorMsg = response?.message || 'Failed to process withdrawal. Please try again.';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      Alert.alert('Error', error.message || 'Failed to process withdrawal. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{walletData.balance.toFixed(2)}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowAddMoneyModal(true)}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.white} />
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowWithdrawModal(true)}
            >
              <MaterialCommunityIcons name="minus-circle" size={20} color={COLORS.white} />
              <Text style={styles.actionText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trending-up" size={24} color="#4CAF50" />
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

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            transactions.map((transaction, index) => {
              const signedAmount = isCreditTransaction(transaction.type)
                ? transaction.amount
                : -transaction.amount;
              
              return (
                <View key={transaction._id || index} style={styles.transactionItem}>
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
                      { color: signedAmount >= 0 ? '#4CAF50' : '#FF6B6B' }
                    ]}>
                      {signedAmount >= 0 ? '+' : ''}₹{Math.abs(signedAmount)}
                    </Text>
                    <Text style={styles.transactionStatus}>
                      {(transaction.status || 'completed').toUpperCase()}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            loading ? (
              <View style={styles.emptyHistory}>
                <ActivityIndicator size="small" color={COLORS.accent} />
              </View>
            ) : (
              <View style={styles.emptyHistory}>
                <Text style={styles.noTransactions}>No transactions yet</Text>
              </View>
            )
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add Money Modal */}
      <Modal
        visible={showAddMoneyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddMoneyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Money</Text>
            <Text style={styles.modalSubtitle}>Enter amount to add to your wallet</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                editable={!processing}
              />
            </View>

            <View style={styles.quickAmounts}>
              {[100, 500, 1000, 2000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.quickAmountBtn}
                  onPress={() => setAmount(val.toString())}
                  disabled={processing}
                >
                  <Text style={styles.quickAmountText}>₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddMoneyModal(false);
                  setAmount('');
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddMoney}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Add Money</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Money</Text>
            <Text style={styles.modalSubtitle}>
              Available Balance: ₹{walletData.balance.toFixed(2)}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                editable={!processing}
              />
            </View>

            <Text style={styles.minAmountText}>Minimum withdrawal: ₹50</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowWithdrawModal(false);
                  setAmount('');
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleWithdraw}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Withdraw</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: COLORS.accent,
    margin: 15,
    padding: 25,
    borderRadius: 15,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: {
    color: COLORS.white,
    marginLeft: 8,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.darkGray,
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
  transactionsSection: {
    paddingHorizontal: 15,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  viewAll: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
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
  emptyHistory: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  noTransactions: {
    color: COLORS.gray,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    paddingVertical: 15,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickAmountBtn: {
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  quickAmountText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  minAmountText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  confirmButton: {
    backgroundColor: COLORS.accent,
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyWalletScreen;
