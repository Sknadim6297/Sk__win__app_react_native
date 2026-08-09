import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../../styles/theme';
import { adminService, tournamentManagementService } from '../../services/api';
import Toast from '../../components/Toast';

const TABS = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Completed' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'txns', label: 'Transactions' },
];

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRemaining(ms) {
  if (!ms || ms <= 0) return 'Due';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function PaymentManagement({ navigation }) {
  const [tab, setTab] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const paymentStats = await adminService.getPaymentStats().catch(() => null);
      setStats(paymentStats);

      if (tab === 'refunds') {
        const data = await adminService.getRefunds({ limit: 50 });
        setRefunds(data.refunds || []);
      } else if (tab === 'txns') {
        const data = await adminService.getTransactions({ limit: 50 });
        setTransactions(data.transactions || []);
      } else {
        const data = await tournamentManagementService.listAllPayouts({
          status: tab,
          limit: 50,
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        setPayouts(data.payouts || []);
      }
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmWithReason = (title, message, action) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Select reason', 'Required for audit log.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Rule violation',
              onPress: () => action('Rule violation'),
            },
            {
              text: 'Suspicious activity',
              onPress: () => action('Suspicious activity'),
            },
            {
              text: 'Other / investigate',
              onPress: () => action('Under investigation'),
            },
          ]);
        },
      },
    ]);
  };

  const runPayoutAction = async (fn, successMsg) => {
    try {
      await fn();
      setToast({ visible: true, message: successMsg, type: 'success' });
      await load();
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Action failed', type: 'error' });
    }
  };

  const renderPayout = (p) => (
    <View key={String(p._id)} style={styles.card}>
      <Text style={styles.cardTitle}>{p.username || 'Winner'}</Text>
      <Text style={styles.meta}>{p.tournamentName || p.tournamentId?.name || 'Tournament'}</Text>
      <Text style={styles.meta}>
        ₹{p.amount} · {p.status}
        {p.status === 'PENDING' ? ` · Wait ${formatRemaining(p.remainingMs)}` : ''}
      </Text>
      <Text style={styles.metaSmall}>
        Published: {formatTime(p.winnerPublishedAt)} · Due: {formatTime(p.scheduledPayoutAt)}
      </Text>
      {p.status === 'PENDING' ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnWarn]}
            onPress={() =>
              confirmWithReason('Block payout', 'Block automatic credit for this winner?', (reason) =>
                runPayoutAction(
                  () => tournamentManagementService.blockPayout(p._id, reason),
                  'Payout blocked'
                )
              )
            }
          >
            <Text style={styles.btnText}>Block</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={() =>
              confirmWithReason('Cancel payout', 'Cancel this pending payout?', (reason) =>
                runPayoutAction(
                  () => tournamentManagementService.stopPayout(p._id, reason),
                  'Payout cancelled'
                )
              )
            }
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnMuted]}
            onPress={() =>
              confirmWithReason('Reject payout', 'Reject this pending payout?', (reason) =>
                runPayoutAction(
                  () => tournamentManagementService.rejectPayout(p._id, reason),
                  'Payout rejected'
                )
              )
            }
          >
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {p.status === 'PAID' ? (
        <TouchableOpacity
          style={[styles.btn, styles.btnWarn, { marginTop: 8, alignSelf: 'flex-start' }]}
          onPress={() =>
            confirmWithReason(
              'Freeze amount',
              'Freeze this paid amount (no blind reverse)?',
              (reason) =>
                runPayoutAction(
                  () =>
                    adminService.freezeWallet({
                      userId: p.userId?._id || p.userId,
                      amount: p.amount,
                      reason,
                      payoutId: p._id,
                    }),
                  'Amount frozen'
                )
            )
          }
        >
          <Text style={styles.btnText}>Freeze amount</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ visible: false, message: '', type: 'error' })}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {stats ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>{stats.payouts?.pending ?? 0}</Text>
            <Text style={styles.statLbl}>Pending</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>{stats.payouts?.paid ?? 0}</Text>
            <Text style={styles.statLbl}>Paid</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>{stats.payouts?.blocked ?? 0}</Text>
            <Text style={styles.statLbl}>Blocked</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>{stats.refunds?.failed ?? 0}</Text>
            <Text style={styles.statLbl}>Refund fail</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>₹{stats.payouts?.totalPrizePaid ?? 0}</Text>
            <Text style={styles.statLbl}>Prize paid</Text>
          </View>
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab !== 'refunds' && tab !== 'txns' ? (
        <TextInput
          style={styles.search}
          placeholder="Search winner username"
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {tab === 'refunds'
            ? (refunds.length ? refunds : []).map((r) => (
                <View key={String(r._id)} style={styles.card}>
                  <Text style={styles.cardTitle}>{r.userId?.username || 'User'}</Text>
                  <Text style={styles.meta}>
                    {r.tournamentId?.name || 'Tournament'} · ₹{r.amount} · {r.status}
                  </Text>
                  {r.status === 'failed' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnWarn, { marginTop: 8, alignSelf: 'flex-start' }]}
                      onPress={() =>
                        runPayoutAction(() => adminService.retryRefund(r._id), 'Refund retried')
                      }
                    >
                      <Text style={styles.btnText}>Retry</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            : tab === 'txns'
              ? (transactions.length ? transactions : []).map((t) => (
                  <View key={String(t._id)} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {t.userId?.username || 'User'} · {t.type}
                    </Text>
                    <Text style={styles.meta}>
                      ₹{t.amount} · {t.status} · {formatTime(t.createdAt)}
                    </Text>
                  </View>
                ))
              : payouts.map(renderPayout)}

          {!loading &&
          ((tab === 'refunds' && !refunds.length) ||
            (tab === 'txns' && !transactions.length) ||
            (!['refunds', 'txns'].includes(tab) && !payouts.length)) ? (
            <Text style={styles.empty}>No records in this tab.</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontFamily: FONTS.bold },
  statsRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  statChip: {
    backgroundColor: '#151D36',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 88,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statVal: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  statLbl: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  tabs: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#151D36',
  },
  tabActive: { backgroundColor: 'rgba(91,57,168,0.4)', borderColor: '#7B61FF', borderWidth: 1 },
  tabText: { color: COLORS.gray, fontSize: 12, fontFamily: FONTS.semiBold },
  tabTextActive: { color: COLORS.white },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#151D36',
    borderRadius: 10,
    padding: 12,
    color: COLORS.white,
  },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#151D36',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 15 },
  meta: { color: COLORS.gray, marginTop: 4, fontSize: 13 },
  metaSmall: { color: '#64748b', marginTop: 4, fontSize: 11 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnWarn: { backgroundColor: '#B45309' },
  btnDanger: { backgroundColor: '#DC2626' },
  btnMuted: { backgroundColor: '#475569' },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  empty: { color: COLORS.gray, textAlign: 'center', marginTop: 40 },
});
