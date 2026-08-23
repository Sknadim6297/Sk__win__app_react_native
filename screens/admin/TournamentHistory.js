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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { tournamentService } from '../../services/api';
import Toast from '../../components/Toast';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function statusColor(status) {
  if (status === 'completed') return COLORS.gray;
  if (status === 'ongoing' || status === 'live') return '#FF3B30';
  if (status === 'incoming' || status === 'upcoming') return '#FF9500';
  if (status === 'cancelled') return COLORS.gray;
  return COLORS.gray;
}

function payColor(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'PAID' || s === 'COVERED') return '#34C759';
  if (s === 'PENDING') return '#FF9500';
  if (s === 'AVAILABLE') return COLORS.gray;
  return '#FF3B30';
}

export default function TournamentHistory({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [showSlots, setShowSlots] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournamentHistory();
      setTournaments(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error.message || 'Failed to fetch tournament history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const openSlots = async (tournament) => {
    setSelected(tournament);
    setShowSlots(true);
    try {
      setLoadingSlots(true);
      const data = await tournamentService.getTournamentParticipants(tournament._id);
      setSelected(data.tournament || tournament);
      setSlots(data.slots || []);
    } catch (error) {
      showToast(error.message || 'Failed to load slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const filtered = tournaments.filter((t) => {
    const status = t.status || t.lifecycleStatus;
    if (filter === 'all') return true;
    if (filter === 'incoming') return status === 'incoming' || status === 'upcoming';
    if (filter === 'ongoing') return status === 'ongoing' || status === 'live';
    return status === filter;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TOURNAMENT HISTORY</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOURNAMENT HISTORY</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tournaments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tournaments.filter((t) => t.status === 'ongoing' || t.status === 'live').length}
          </Text>
          <Text style={styles.statLabel}>Ongoing</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tournaments.filter((t) => t.status === 'incoming' || t.status === 'upcoming').length}
          </Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tournaments.filter((t) => t.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'ALL' },
          { key: 'completed', label: 'DONE' },
          { key: 'ongoing', label: 'ONGOING' },
          { key: 'incoming', label: 'UPCOMING' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.activeFilter]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterText, filter === tab.key && styles.activeFilterText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No tournaments found</Text>
          </View>
        ) : (
          filtered.map((t) => {
            const isCustom = t.matchKind === 'team_vs_team' || t.formatLabel === '1v1' || t.formatLabel === '2v2' || t.formatLabel === '4v4';
            return (
              <View key={t._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{t.name}</Text>
                    <Text style={styles.sub}>
                      {(t.matchType || '').replace(/Custom Match/gi, 'Clash Squad') || (isCustom ? 'Clash Squad' : 'Battle Royale')} · {t.formatLabel || t.modeLabel || t.mode}
                      {t.matchKind === 'battle_royale' ? ` · ${t.modeLabel || ''}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: statusColor(t.status) }]}>
                    <Text style={[styles.statusText, { color: statusColor(t.status) }]}>
                      {String(t.status || '').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.grid}>
                  <Stat label="Slots" value={`${t.bookedSlots ?? t.totalJoined ?? 0}/${t.totalSlots || t.maxParticipants || 0}`} />
                  <Stat label="Available" value={String(t.availableSlots ?? '—')} />
                  <Stat label="Entry" value={rupee(t.entryFee)} />
                  <Stat label="Collected" value={rupee(t.collectedAmount)} />
                  <Stat label="Prize pool" value={rupee(t.prizePool)} />
                  <Stat label="Match date" value={formatDate(t.startDate)} />
                </View>

                {t.hasKillRewards ? (
                  <View style={styles.killRow}>
                    <Text style={styles.killText}>Per kill {rupee(t.perKill)}</Text>
                    <Text style={styles.killText}>Kills {t.totalKills || 0}</Text>
                    <Text style={styles.killText}>Kill rewards {rupee(t.killRewardsDistributed)}</Text>
                  </View>
                ) : (
                  <Text style={styles.note}>Team vs team — no per-kill rewards</Text>
                )}

                <Text style={styles.payLine}>Payments: {t.paymentStatus || '—'}</Text>

                <TouchableOpacity style={styles.viewBtn} onPress={() => openSlots(t)}>
                  <Ionicons name="grid-outline" size={18} color={COLORS.white} />
                  <Text style={styles.viewBtnText}>
                    View {isCustom ? 'teams' : 'slots'} ({t.bookedSlots ?? 0})
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showSlots} animationType="slide" transparent onRequestClose={() => setShowSlots(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selected?.name || 'Slots'}</Text>
                <Text style={styles.modalSub}>
                  {(selected?.matchType || '').replace(/Custom Match/gi, 'Clash Squad')} · {selected?.formatLabel}
                  {selected?.hasKillRewards ? ` · per kill ${rupee(selected?.perKill)}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSlots(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {loadingSlots ? (
              <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={slots}
                keyExtractor={(item, index) => String(item.slotNumber || item.side || index)}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No slot records</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.slotCard}>
                    <View style={styles.slotHead}>
                      <Text style={styles.slotLabel}>{item.label || `Slot ${item.slotNumber}`}</Text>
                      <Text style={[styles.payBadge, { color: payColor(item.paymentStatus) }]}>
                        {item.available ? 'AVAILABLE' : item.paymentStatus || item.teamName || 'JOINED'}
                      </Text>
                    </View>
                    {item.teamName ? <Text style={styles.teamName}>{item.teamName}</Text> : null}
                    {(item.players || []).map((p, idx) => (
                      <View key={`${item.slotNumber}-${idx}`} style={styles.playerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playerName}>
                            {p.role === 'captain' ? 'Captain · ' : ''}
                            {p.displayName || p.gamingUsername}
                          </Text>
                          <Text style={styles.playerMeta}>
                            UID {p.gamingUID || '—'}
                            {p.userId ? ` · User ${String(p.userId).slice(-6)}` : ''}
                          </Text>
                          <Text style={styles.playerMeta}>
                            {p.orderId ? `Order ${p.orderId}` : p.transactionId ? `Txn ${p.transactionId}` : 'No payment id'}
                            {' · '}
                            {p.joinedAt ? formatDateTime(p.joinedAt) : '—'}
                          </Text>
                          {p.kills != null ? (
                            <Text style={styles.playerMeta}>
                              Kills {p.kills} · Kill reward {rupee(p.killReward)} · Winnings {rupee(p.finalWinnings)}
                            </Text>
                          ) : p.finalWinnings ? (
                            <Text style={styles.playerMeta}>Winnings {rupee(p.finalWinnings)}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.payBadge, { color: payColor(p.paymentStatus) }]}>
                          {p.paymentStatus}
                        </Text>
                      </View>
                    ))}
                    {item.available ? <Text style={styles.availableHint}>Open — not joined, not collected</Text> : null}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statCellLabel}>{label}</Text>
      <Text style={styles.statCellValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.accent },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  activeFilter: { backgroundColor: COLORS.accent },
  filterText: { fontSize: 11, color: COLORS.gray, fontWeight: '600' },
  activeFilterText: { color: COLORS.white },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.white, fontWeight: 'bold', marginTop: 12 },
  card: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.white, marginBottom: 4 },
  sub: { fontSize: 12, color: COLORS.gray },
  statusPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statCell: { width: '50%', marginBottom: 10 },
  statCellLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 2 },
  statCellValue: { fontSize: 14, color: COLORS.white, fontWeight: '700' },
  killRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  killText: { fontSize: 12, color: '#FBBF24', fontWeight: '600' },
  note: { fontSize: 12, color: COLORS.gray, marginBottom: 8 },
  payLine: { fontSize: 12, color: COLORS.white, marginBottom: 12 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
  },
  viewBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.white },
  modalSub: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  slotCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
  },
  slotHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.white },
  teamName: { fontSize: 13, color: COLORS.accent, marginTop: 4, marginBottom: 6 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    marginTop: 8,
    gap: 8,
  },
  playerName: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },
  playerMeta: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  payBadge: { fontSize: 11, fontWeight: 'bold' },
  availableHint: { fontSize: 12, color: COLORS.gray, marginTop: 6 },
});
