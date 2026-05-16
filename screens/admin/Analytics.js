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

const Analytics = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>ANALYTICS</Text>
          <Text style={styles.headerSubtitle}>Platform overview</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Live Admin Metrics</Text>
          <Text style={styles.heroCopy}>Quick view of user base, moderation, and wallet balances.</Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="account-group" size={26} color={COLORS.primary} />
            <Text style={styles.metricValue}>{stats?.totalUsers || 0}</Text>
            <Text style={styles.metricLabel}>Total Users</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: COLORS.success }]}>
            <MaterialCommunityIcons name="shield-check" size={26} color={COLORS.success} />
            <Text style={styles.metricValue}>{stats?.verifiedUsers || 0}</Text>
            <Text style={styles.metricLabel}>Verified</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: COLORS.error }]}>
            <MaterialCommunityIcons name="alert-octagon" size={26} color={COLORS.error} />
            <Text style={styles.metricValue}>{(stats?.suspendedUsers || 0) + (stats?.bannedUsers || 0)}</Text>
            <Text style={styles.metricLabel}>Blocked</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: COLORS.accent }]}>
            <MaterialCommunityIcons name="wallet" size={26} color={COLORS.accent} />
            <Text style={styles.metricValue}>₹{Number(stats?.totalWalletBalance || 0).toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Wallet Total</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Next steps</Text>
          <Text style={styles.noteText}>This screen is wired to live admin stats. If you want charts and trend lines, the backend will need daily aggregation endpoints.</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 12,
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
    fontSize: 12,
    marginTop: 3,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    marginBottom: 16,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  heroCopy: {
    color: COLORS.gray,
    marginTop: 8,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    borderLeftWidth: 4,
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  metricLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },
  noteCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: `${COLORS.accent}10`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
  },
  noteTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  noteText: {
    color: COLORS.white,
    marginTop: 8,
    lineHeight: 20,
  },
});

export default Analytics;