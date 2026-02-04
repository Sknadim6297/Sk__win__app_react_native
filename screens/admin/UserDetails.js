import React, { useState, useEffect } from 'react';
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

const UserDetails = ({ navigation, route }) => {
  const { userId, username } = route.params;
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const [selectedTab, setSelectedTab] = useState('tournaments');

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching user details for userId:', userId);
      const data = await adminService.getUserDetails(userId);
      console.log('User details fetched successfully:', data);
      setUserDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      showToast(error.message || 'Failed to fetch user details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserDetails();
    setRefreshing(false);
  };

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const getTournamentStatus = (tournament) => {
    if (!tournament) return 'Unknown';
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = tournament.endDate ? new Date(tournament.endDate) : null;

    if (endDate && now > endDate) return 'Completed';
    if (now >= startDate && (!endDate || now <= endDate)) return 'Ongoing';
    if (now < startDate) return 'Upcoming';
    return 'Unknown';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'upcoming': return COLORS.accent;
      case 'ongoing': return '#FF3B30';
      case 'completed': return '#34C759';
      case 'winner': return '#FFD700';
      case 'joined': return COLORS.primary;
      default: return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={60} color={COLORS.error} />
          <Text style={styles.errorText}>Failed to load user details</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user, tournaments, transactions, tournamentStats, walletStats } = userDetails;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type}
        onHide={hideToast}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{username}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: `${COLORS.primary}40` }]}>
              <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name || user.username}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              {user.gameUsername && (
                <Text style={styles.gameUsername}>🎮 {user.gameUsername}</Text>
              )}
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color={user.verified ? COLORS.success : COLORS.gray} />
              <Text style={styles.statLabel}>Verified</Text>
              <Text style={[styles.statValue, { color: user.verified ? COLORS.success : COLORS.gray }]}>
                {user.verified ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={20} color={COLORS.accent} />
              <Text style={styles.statLabel}>Joined</Text>
              <Text style={styles.statValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Wallet Stats */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Wallet Summary</Text>
          <View style={styles.walletGrid}>
            <View style={styles.walletBox}>
              <MaterialCommunityIcons name="wallet" size={24} color={COLORS.accent} />
              <Text style={styles.walletValue}>₹{walletStats.balance}</Text>
              <Text style={styles.walletLabel}>Current Balance</Text>
            </View>
            <View style={styles.walletBox}>
              <MaterialCommunityIcons name="cash-plus" size={24} color={COLORS.success} />
              <Text style={styles.walletValue}>₹{walletStats.totalDeposited}</Text>
              <Text style={styles.walletLabel}>Total Deposited</Text>
            </View>
            <View style={styles.walletBox}>
              <MaterialCommunityIcons name="cash-minus" size={24} color={COLORS.error} />
              <Text style={styles.walletValue}>₹{walletStats.totalWithdrawn}</Text>
              <Text style={styles.walletLabel}>Total Withdrawn</Text>
            </View>
            <View style={styles.walletBox}>
              <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.walletValue}>₹{walletStats.totalWinnings}</Text>
              <Text style={styles.walletLabel}>Total Winnings</Text>
            </View>
          </View>
        </View>

        {/* Tournament Stats */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tournament Stats</Text>
          <View style={styles.tournamentStatsGrid}>
            <View style={styles.tournamentStatBox}>
              <Text style={styles.statNumber}>{tournamentStats.total}</Text>
              <Text style={styles.statCaption}>Total</Text>
            </View>
            <View style={styles.tournamentStatBox}>
              <Text style={[styles.statNumber, { color: COLORS.accent }]}>{tournamentStats.upcoming}</Text>
              <Text style={styles.statCaption}>Upcoming</Text>
            </View>
            <View style={styles.tournamentStatBox}>
              <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{tournamentStats.ongoing}</Text>
              <Text style={styles.statCaption}>Ongoing</Text>
            </View>
            <View style={styles.tournamentStatBox}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{tournamentStats.completed}</Text>
              <Text style={styles.statCaption}>Completed</Text>
            </View>
            <View style={styles.tournamentStatBox}>
              <Text style={[styles.statNumber, { color: '#FFD700' }]}>{tournamentStats.won}</Text>
              <Text style={styles.statCaption}>Won</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'tournaments' && styles.activeTab]}
            onPress={() => setSelectedTab('tournaments')}
          >
            <Text style={[styles.tabText, selectedTab === 'tournaments' && styles.activeTabText]}>
              Tournaments ({tournaments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'transactions' && styles.activeTab]}
            onPress={() => setSelectedTab('transactions')}
          >
            <Text style={[styles.tabText, selectedTab === 'transactions' && styles.activeTabText]}>
              Transactions ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tournament List */}
        {selectedTab === 'tournaments' && (
          <View style={styles.listSection}>
            {tournaments.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="tournament" size={48} color={COLORS.gray} />
                <Text style={styles.emptyText}>No tournaments joined yet</Text>
              </View>
            ) : (
              tournaments.map((item) => (
                <View key={item._id} style={styles.tournamentCard}>
                  <View style={styles.tournamentHeader}>
                    <Text style={styles.tournamentName}>{item.tournament?.name || 'Unknown Tournament'}</Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(getTournamentStatus(item.tournament)) }]}>
                      <Text style={styles.badgeText}>{getTournamentStatus(item.tournament)}</Text>
                    </View>
                  </View>
                  <View style={styles.tournamentDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={14} color={COLORS.gray} />
                      <Text style={styles.detailText}>
                        Joined: {new Date(item.joinedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="trophy" size={14} color={COLORS.gray} />
                      <Text style={styles.detailText}>
                        Rank: {item.rank ? `#${item.rank}` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="cash" size={14} color={COLORS.gray} />
                      <Text style={styles.detailText}>
                        Prize: ₹{item.prizeAmount || 0}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status), marginTop: 8 }]}>
                      <Text style={styles.badgeText}>{item.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Transaction List */}
        {selectedTab === 'transactions' && (
          <View style={styles.listSection}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="wallet" size={48} color={COLORS.gray} />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((txn) => (
                <View key={txn._id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIcon}>
                      <MaterialCommunityIcons 
                        name={txn.type === 'deposit' || txn.type === 'tournament_reward' ? 'arrow-down' : 'arrow-up'} 
                        size={20} 
                        color={txn.type === 'deposit' || txn.type === 'tournament_reward' ? COLORS.success : COLORS.error} 
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionType}>{txn.type?.replace('_', ' ').toUpperCase()}</Text>
                      <Text style={styles.transactionDesc}>{txn.description}</Text>
                      <Text style={styles.transactionDate}>
                        {new Date(txn.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: txn.type === 'deposit' || txn.type === 'tournament_reward' ? COLORS.success : COLORS.error }
                    ]}>
                      {txn.type === 'deposit' || txn.type === 'tournament_reward' ? '+' : '-'}₹{txn.amount}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
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
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 10,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}40`,
    backgroundColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 2,
  },
  gameUsername: {
    fontSize: 13,
    color: COLORS.accent,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primary}20`,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  walletBox: {
    width: '48%',
    backgroundColor: `${COLORS.primary}15`,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  walletValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
  },
  walletLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  tournamentStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tournamentStatBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statCaption: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 15,
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  listSection: {
    marginHorizontal: 15,
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 10,
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tournamentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  tournamentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  transactionCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  transactionDesc: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 10,
    color: COLORS.gray,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserDetails;
