import React, { useState, useContext, useEffect } from 'react';
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
    // Just call logout - conditional rendering in AppNavigator will handle the navigation
    await logout();
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
        style={styles.scrollView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.adminBadge}>
              <MaterialCommunityIcons name="shield-crown" size={28} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>SK ADMIN</Text>
              <Text style={styles.headerSubtitle}>@{user?.username || 'Admin'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={handleLogout} 
            style={[styles.logoutButton, { backgroundColor: `${COLORS.error}30` }]}
          >
            <Ionicons name="log-out" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Key Metrics */}
          <Text style={styles.sectionTitle}>KEY METRICS</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
              <View style={[styles.metricIcon, { backgroundColor: `${COLORS.primary}20` }]}>
                <Ionicons name="people" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{stats?.totalUsers || 0}</Text>
                <Text style={styles.metricLabel}>Total Users</Text>
              </View>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: COLORS.success }]}>
              <View style={[styles.metricIcon, { backgroundColor: `${COLORS.success}20` }]}>
                <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{stats?.verifiedUsers || 0}</Text>
                <Text style={styles.metricLabel}>Verified</Text>
              </View>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: COLORS.error }]}>
              <View style={[styles.metricIcon, { backgroundColor: `${COLORS.error}20` }]}>
                <Ionicons name="ban" size={28} color={COLORS.error} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{(stats?.suspendedUsers || 0) + (stats?.bannedUsers || 0)}</Text>
                <Text style={styles.metricLabel}>Blocked</Text>
              </View>
            </View>
          </View>

          {/* Wallet Summary */}
          <View style={styles.walletCard}>
            <View style={styles.walletIcon}>
              <MaterialCommunityIcons name="wallet" size={32} color={COLORS.accent} />
            </View>
            <View style={styles.walletContent}>
              <Text style={styles.walletLabel}>Total Wallet Balance</Text>
              <Text style={styles.walletAmount}>₹{stats?.totalWalletBalance?.toLocaleString() || 0}</Text>
            </View>
          </View>

          {/* Main Actions */}
          <Text style={styles.sectionTitle}>MANAGEMENT</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigateTo('UserManagement')}
            >
              <View style={[styles.actionGradient, { backgroundColor: `${COLORS.primary}15` }]}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionCardIcon, { backgroundColor: `${COLORS.primary}30` }]}>
                    <Ionicons name="people" size={32} color={COLORS.primary} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>User Management</Text>
                    <Text style={styles.actionCardSubtitle}>Manage {stats?.totalUsers || 0} users</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigateTo('TournamentManagement')}
            >
              <View style={[styles.actionGradient, { backgroundColor: `${COLORS.accent}15` }]}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionCardIcon, { backgroundColor: `${COLORS.accent}30` }]}>
                    <MaterialCommunityIcons name="tournament" size={32} color={COLORS.accent} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Tournament Management</Text>
                    <Text style={styles.actionCardSubtitle}>Create & manage tournaments</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.accent} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigateTo('TutorialManagement')}
            >
              <View style={[styles.actionGradient, { backgroundColor: `#00BCD415` }]}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionCardIcon, { backgroundColor: `#00BCD430` }]}>
                    <MaterialCommunityIcons name="play-box-multiple" size={32} color="#00BCD4" />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>How To Play</Text>
                    <Text style={styles.actionCardSubtitle}>Manage tutorial videos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigateTo('TournamentHistory')}
            >
              <View style={[styles.actionGradient, { backgroundColor: `#FF980015` }]}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionCardIcon, { backgroundColor: `#FF980030` }]}>
                    <MaterialCommunityIcons name="history" size={32} color="#FF9800" />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Tournament History</Text>
                    <Text style={styles.actionCardSubtitle}>View all tournaments</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#FF9800" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigateTo('GameManagement')}
            >
              <View style={[styles.actionGradient, { backgroundColor: `#9C27B015` }]}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionCardIcon, { backgroundColor: `#9C27B030` }]}>
                    <MaterialCommunityIcons name="gamepad-variant" size={32} color="#9C27B0" />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Game Management</Text>
                    <Text style={styles.actionCardSubtitle}>Manage games & modes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Secondary Actions */}
          <Text style={styles.sectionTitle}>OTHER</Text>
          <View style={styles.secondaryActions}>
            <TouchableOpacity 
              style={[styles.secondaryBtn, { borderLeftColor: COLORS.primary }]}
              onPress={() => navigateTo('PaymentManagement')}
            >
              <MaterialCommunityIcons name="cash-multiple" size={24} color={COLORS.primary} style={styles.secondaryIcon} />
              <View style={styles.secondaryContent}>
                <Text style={styles.secondaryTitle}>Payment Management</Text>
                <Text style={styles.secondarySubtitle}>Manage transactions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryBtn, { borderLeftColor: COLORS.error }]}
              onPress={() => navigateTo('ReportedIssues')}
            >
              <Ionicons name="warning" size={24} color={COLORS.error} style={styles.secondaryIcon} />
              <View style={styles.secondaryContent}>
                <Text style={styles.secondaryTitle}>Reported Issues</Text>
                <Text style={styles.secondarySubtitle}>View user reports</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryBtn, { borderLeftColor: COLORS.accent }]}
              onPress={() => navigateTo('Analytics')}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color={COLORS.accent} style={styles.secondaryIcon} />
              <View style={styles.secondaryContent}>
                <Text style={styles.secondaryTitle}>Analytics</Text>
                <Text style={styles.secondarySubtitle}>View statistics</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>

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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 15,
    backgroundColor: COLORS.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.darkGray}60`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: `${COLORS.white}80`,
    marginTop: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 24,
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  walletCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent,
  },
  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: `${COLORS.accent}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletContent: {
    flex: 1,
  },
  walletLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  walletAmount: {
    color: COLORS.accent,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  actionsGrid: {
    marginBottom: 24,
  },
  actionCardWide: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 0,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  actionCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  secondaryActions: {
    marginBottom: 20,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  secondaryIcon: {
    marginRight: 12,
  },
  secondaryContent: {
    flex: 1,
  },
  secondaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondarySubtitle: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
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
});

export default AdminDashboard;
