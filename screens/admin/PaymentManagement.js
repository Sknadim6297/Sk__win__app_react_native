import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { adminService } from '../../services/api';
import Toast from '../../components/Toast';

const PaymentManagement = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? { limit: 200 } : { type: filter, limit: 200 };
      const data = await adminService.getTransactions(params);
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
    } catch (error) {
      setToast({ visible: true, message: error.message || 'Failed to load transactions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const summary = transactions.reduce(
    (acc, transaction) => {
      acc.total += 1;
      acc.amount += Number(transaction.amount || 0);
      acc.byType[transaction.type] = (acc.byType[transaction.type] || 0) + 1;
      return acc;
    },
    { total: 0, amount: 0, byType: {} }
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading payment records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>PAYMENT MANAGEMENT</Text>
          <Text style={styles.headerSubtitle}>{summary.total} transactions</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {['all', 'deposit', 'withdraw', 'tournament_reward', 'tournament_entry'].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item === 'all' ? 'All' : item.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Records</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>₹{summary.amount.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Volume</Text>
          </View>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-multiple" size={56} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptyText}>Try a different filter or refresh the data.</Text>
          </View>
        ) : (
          transactions.map((transaction) => {
            const user = transaction.userId;
            const isCredit = transaction.type === 'deposit' || transaction.type === 'tournament_reward' || transaction.type === 'referral_bonus';

            return (
              <View key={transaction._id} style={styles.transactionCard}>
                <View style={styles.transactionTopRow}>
                  <View style={styles.iconBubble}>
                    <MaterialCommunityIcons
                      name={isCredit ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle'}
                      size={24}
                      color={isCredit ? COLORS.success : COLORS.error}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>{transaction.type?.replace('_', ' ')}</Text>
                    <Text style={styles.transactionUser}>{user?.username || 'Unknown user'}</Text>
                    <Text style={styles.transactionMeta}>{user?.email || 'No email'}</Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: isCredit ? COLORS.success : COLORS.error }]}>
                    {isCredit ? '+' : '-'}₹{Number(transaction.amount || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.transactionDescription}>{transaction.description || 'No description available'}</Text>
                <View style={styles.transactionFooter}>
                  <Text style={styles.transactionMeta}>{new Date(transaction.createdAt).toLocaleString()}</Text>
                  <Text style={styles.statusBadge}>{transaction.status || 'pending'}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTextBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    color: `${COLORS.white}80`,
    marginTop: 3,
    fontSize: 12,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  filterChipActive: {
    backgroundColor: `${COLORS.accent}20`,
    borderColor: COLORS.accent,
  },
  filterText: {
    color: COLORS.gray,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },
  transactionCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  transactionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkGray,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  transactionUser: {
    color: COLORS.accent,
    marginTop: 2,
    fontSize: 12,
  },
  transactionMeta: {
    color: COLORS.gray,
    marginTop: 2,
    fontSize: 11,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  transactionDescription: {
    color: COLORS.white,
    marginTop: 10,
    fontSize: 13,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadge: {
    color: COLORS.accent,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default PaymentManagement;