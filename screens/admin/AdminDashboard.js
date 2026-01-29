import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { adminService } from '../../services/api';
import { COLORS } from '../../styles/theme';

const AdminDashboard = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Landing');
  };

  const navigateTo = (screen) => {
    navigation.navigate(screen);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}>
              <MaterialCommunityIcons name="shield-crown" size={24} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>ADMIN PANEL</Text>
              <Text style={styles.headerSubtitle}>@{user?.username}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>📊 QUICK STATS</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <Ionicons name="people" size={32} color={COLORS.white} />
            <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={[styles.statCard, styles.infoCard]}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.white} />
            <Text style={styles.statValue}>{stats?.verifiedUsers || 0}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>

          <View style={[styles.statCard, styles.successCard]}>
            <MaterialCommunityIcons name="shield-check" size={32} color={COLORS.white} />
            <Text style={styles.statValue}>{stats?.kycVerifiedUsers || 0}</Text>
            <Text style={styles.statLabel}>KYC Done</Text>
          </View>

          <View style={[styles.statCard, styles.warningCard]}>
            <FontAwesome5 name="ban" size={28} color={COLORS.white} />
            <Text style={styles.statValue}>{(stats?.suspendedUsers || 0) + (stats?.bannedUsers || 0)}</Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
        </View>

        {/* Wallet Stats */}
        <View style={styles.walletCard}>
          <MaterialCommunityIcons name="wallet" size={32} color={COLORS.accent} />
          <View style={styles.walletContent}>
            <Text style={styles.walletLabel}>Total Wallet Balance</Text>
            <Text style={styles.walletAmount}>₹{stats?.totalWalletBalance?.toLocaleString() || 0}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateTo('UserManagement')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="people" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>User Management</Text>
            <Text style={styles.actionSubtitle}>Manage all users</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateTo('TournamentHistory')}
          >
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="history" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>Tournament History</Text>
            <Text style={styles.actionSubtitle}>View all tournaments</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateTo('PaymentManagement')}
          >
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="cash-multiple" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>Payment Management</Text>
            <Text style={styles.actionSubtitle}>{stats.pendingPayments} pending</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateTo('ReportedIssues')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="warning" size={28} color={COLORS.error} />
            </View>
            <Text style={styles.actionTitle}>Reported Issues</Text>
            <Text style={styles.actionSubtitle}>{stats.reportedIssues} new reports</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>🔔 RECENT ACTIVITY</Text>
        <View style={styles.activityContainer}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-add" size={20} color={COLORS.success} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New user registered</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <MaterialCommunityIcons name="trophy" size={20} color={COLORS.accent} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Tournament "Squad Battle" completed</Text>
              <Text style={styles.activityTime}>15 minutes ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <FontAwesome5 name="money-bill-wave" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Payment received - ₹5,000</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    backgroundColor: COLORS.lightGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.darkGray,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 25,
    marginBottom: 15,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
  },
  successCard: {
    backgroundColor: COLORS.success,
  },
  infoCard: {
    backgroundColor: COLORS.secondary,
  },
  warningCard: {
    backgroundColor: COLORS.darkBlue,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 5,
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    position: 'absolute',
    left: 80,
    bottom: 15,
  },
  activityContainer: {
    marginBottom: 30,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: COLORS.white,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.gray,
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
  walletCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    alignItems: 'center',
  },
  walletContent: {
    marginLeft: 12,
    flex: 1,
  },
  walletLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  walletAmount: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default AdminDashboard;
