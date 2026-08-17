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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { adminService } from '../../services/api';
import { getApiUrl } from '../../utils/apiConfig';
import { COLORS } from '../../styles/theme';

const ORANGE = COLORS.primary;
const CARD = '#12182B';
const BG = '#0B0E1B';

function Metric({ icon, iconColor, borderColor, value, label }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: borderColor }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${iconColor}22` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function NavTile({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.tileIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={ORANGE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={ORANGE} />
    </TouchableOpacity>
  );
}

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [webRedirecting, setWebRedirecting] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    try {
      const api = getApiUrl();
      const origin = String(api || '').replace(/\/api\/?$/, '');
      if (origin) {
        window.location.replace(`${origin}/admin`);
        return undefined;
      }
    } catch (e) {
      console.warn('Admin web redirect failed', e);
    }
    setWebRedirecting(false);
    return undefined;
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setStats(await adminService.getStats());
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    fetchStats();
  }, []);

  if (webRedirecting || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
          {webRedirecting ? (
            <Text style={{ color: '#9AA4B8', marginTop: 12 }}>Opening Arena Control…</Text>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const blocked = (stats?.suspendedUsers || 0) + (stats?.bannedUsers || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shield-crown" size={22} color={ORANGE} />
          </View>
          <View>
            <Text style={styles.headerTitle}>WARZONE ADMIN</Text>
            <Text style={styles.headerSub}>@{user?.username || 'admin'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await fetchStats();
            setRefreshing(false);
          }} tintColor={ORANGE} />
        }
        contentContainerStyle={styles.content}
      >
        <Text style={styles.section}>KEY METRICS</Text>
        <View style={styles.metrics}>
          <Metric icon="people" iconColor={ORANGE} borderColor={ORANGE} value={stats?.totalUsers || 0} label="Total Users" />
          <Metric icon="checkmark-circle" iconColor="#22C55E" borderColor="#22C55E" value={stats?.verifiedUsers || 0} label="Verified" />
          <Metric icon="ban" iconColor="#EF4444" borderColor="#EF4444" value={blocked} label="Blocked" />
        </View>

        <View style={styles.wallet}>
          <View style={styles.walletIcon}>
            <MaterialCommunityIcons name="wallet" size={26} color={ORANGE} />
          </View>
          <View>
            <Text style={styles.walletLabel}>Total Wallet Balance</Text>
            <Text style={styles.walletValue}>₹{(stats?.totalWalletBalance || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <Text style={styles.section}>MANAGEMENT</Text>
        <NavTile
          icon="account-group"
          title="User Management"
          subtitle={`Manage ${stats?.totalUsers || 0} users`}
          onPress={() => navigation.navigate('UserManagement')}
        />
        <NavTile
          icon="tournament"
          title="Tournament Management"
          subtitle="Create & manage matches"
          onPress={() => navigation.navigate('TournamentManagement')}
        />
        <NavTile
          icon="history"
          title="Tournament History"
          subtitle="Slots, payments & results"
          onPress={() => navigation.navigate('TournamentHistory')}
        />
        <NavTile
          icon="gamepad-variant"
          title="Games & Modes"
          subtitle="Titles players can join"
          onPress={() => navigation.navigate('GameManagement')}
        />
        <NavTile
          icon="cash-multiple"
          title="Payments"
          subtitle="Wallet transactions"
          onPress={() => navigation.navigate('PaymentManagement')}
        />

        <Text style={styles.section}>OTHER</Text>
        <NavTile icon="map" title="Maps" subtitle="Match maps" onPress={() => navigation.navigate('MapManagement')} />
        <NavTile icon="play-box-multiple" title="How To Play" subtitle="Tutorial videos" onPress={() => navigation.navigate('TutorialManagement')} />
        <NavTile icon="view-carousel" title="Home Banners" subtitle="Image slides" onPress={() => navigation.navigate('SliderManagement')} />
        <NavTile icon="bullhorn" title="Announcements" subtitle="Home updates" onPress={() => navigation.navigate('AnnouncementManagement')} />
        <NavTile icon="headset" title="Support" subtitle="Player tickets" onPress={() => navigation.navigate('SupportManagement')} />
        <NavTile icon="bell-ring" title="Push Notifications" subtitle="Send alerts" onPress={() => navigation.navigate('AdminPushNotifications')} />
        <NavTile icon="cellphone-cog" title="App Content" subtitle="Home & coin packs" onPress={() => navigation.navigate('AppContentManagement')} />
        <NavTile icon="chart-line" title="Analytics" subtitle="App statistics" onPress={() => navigation.navigate('Analytics')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    ...(Platform.OS === 'web' ? { minHeight: '100vh', width: '100%' } : null),
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1A1208',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  logout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    ...(Platform.OS === 'web' ? { maxWidth: 920, width: '100%', alignSelf: 'center' } : null),
  },
  section: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.6,
    fontSize: 13,
    marginBottom: 10,
    marginTop: 8,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metricCard: {
    flexGrow: 1,
    minWidth: Platform.OS === 'web' ? 200 : '47%',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metricValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  metricLabel: { color: '#9AA4B8', fontSize: 11, marginTop: 2 },
  wallet: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: { color: '#9AA4B8', fontSize: 12, fontWeight: '600' },
  walletValue: { color: ORANGE, fontSize: 26, fontWeight: '800', marginTop: 2 },
  tile: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tileSub: { color: '#9AA4B8', fontSize: 12, marginTop: 2 },
});
