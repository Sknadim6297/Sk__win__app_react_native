import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';

const WalletScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(1250);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');

  // Mock transaction history
  const transactions = [
    {
      id: 1,
      type: 'win',
      amount: 500,
      description: 'Tournament Win - Elite Battle Royale',
      date: '2025-10-29',
      time: '14:30',
      status: 'completed',
    },
    {
      id: 2,
      type: 'deposit',
      amount: 1000,
      description: 'Wallet Deposit via UPI',
      date: '2025-10-28',
      time: '10:15',
      status: 'completed',
    },
    {
      id: 3,
      type: 'entry',
      amount: -50,
      description: 'Tournament Entry - Free Fire Champions',
      date: '2025-10-28',
      time: '09:45',
      status: 'completed',
    },
    {
      id: 4,
      type: 'withdraw',
      amount: -200,
      description: 'Withdrawal to Bank Account',
      date: '2025-10-27',
      time: '16:20',
      status: 'completed',
    },
    {
      id: 5,
      type: 'win',
      amount: 150,
      description: 'Tournament Win - Quick Clash',
      date: '2025-10-26',
      time: '20:00',
      status: 'completed',
    },
  ];

  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);
    if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (depositAmount < 10) {
      Alert.alert('Minimum Deposit', 'Minimum deposit amount is ₹10');
      return;
    }
    if (depositAmount > 10000) {
      Alert.alert('Maximum Deposit', 'Maximum deposit amount is ₹10,000 per transaction');
      return;
    }

    setBalance(prev => prev + depositAmount);
    setAmount('');
    setShowDepositModal(false);
    Alert.alert('Success!', `₹${depositAmount} has been added to your wallet`);
  };

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (withdrawAmount > balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your current balance');
      return;
    }
    if (withdrawAmount < 50) {
      Alert.alert('Minimum Withdrawal', 'Minimum withdrawal amount is ₹50');
      return;
    }

    setBalance(prev => prev - withdrawAmount);
    setAmount('');
    setShowWithdrawModal(false);
    Alert.alert('Success!', `₹${withdrawAmount} withdrawal request has been submitted`);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'win': return 'trophy';
      case 'deposit': return 'add-circle';
      case 'entry': return 'game-controller';
      case 'withdraw': return 'remove-circle';
      default: return 'cash';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'win': return '#FFD700';
      case 'deposit': return COLORS.success;
      case 'entry': return COLORS.error;
      case 'withdraw': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  const TransactionItem = ({ transaction }) => (
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
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
          <Text style={styles.transactionDate}>{transaction.date} • {transaction.time}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: transaction.amount > 0 ? COLORS.success : COLORS.error }
        ]}>
          {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount)}
        </Text>
        <Text style={styles.transactionStatus}>Completed</Text>
      </View>
    </View>
  );

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
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.quickAmounts}>
            {[100, 500, 1000, 2000].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <Text style={styles.quickAmountText}>₹{quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.depositButton} onPress={handleDeposit}>
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
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
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
          <SKWinLogo size={70} />
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
              onPress={() => setShowDepositModal(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.withdrawActionButton}
              onPress={() => setShowWithdrawModal(true)}
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
            <Text style={styles.statValue}>₹650</Text>
            <Text style={styles.statLabel}>Total Winnings</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="tournament" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Tournaments Joined</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trophy-award" size={24} color="#FFD700" />
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Tournaments Won</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Transaction History</Text>
          
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
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