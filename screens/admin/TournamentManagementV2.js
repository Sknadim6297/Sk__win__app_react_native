import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../styles/theme';
import { tournamentManagementService, tournamentService } from '../../services/api';

const STATUS_LABELS = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  incoming: 'Upcoming',
  ongoing: 'Ongoing',
  live: 'Ongoing',
  completed: 'Completed',
  result_published: 'Completed',
  cancelled: 'Cancelled',
};

const TYPE_LABELS = {
  battle_royale: 'Battle Royale',
  custom_match: 'Clash Squad',
  custom: 'Clash Squad',
};

const SECTION_ORDER = [
  { key: 'upcoming', title: 'Upcoming', statuses: ['upcoming', 'incoming'] },
  { key: 'ongoing', title: 'Ongoing', statuses: ['ongoing', 'live'] },
  { key: 'completed', title: 'Completed', statuses: ['completed', 'result_published'] },
  { key: 'draft', title: 'Draft', statuses: ['draft'] },
  { key: 'cancelled', title: 'Cancelled', statuses: ['cancelled'] },
];

function getJoinedLabel(item) {
  const format = item.formatLabel ? `${item.formatLabel} · ` : '';
  const unit = item.joinUnit || (item.tournamentType === 'custom_match' || item.category === 'custom' ? 'teams' : 'slots');
  return `${format}${item.joinedCount ?? 0}/${item.capacity ?? '—'} ${unit}`;
}

function groupBySection(items) {
  const buckets = SECTION_ORDER.map((s) => ({ ...s, items: [] }));
  const other = { key: 'other', title: 'Other', statuses: [], items: [] };

  for (const item of items) {
    const status = item.status || item.lifecycleStatus || 'draft';
    const section = buckets.find((s) => s.statuses.includes(status));
    if (section) section.items.push(item);
    else other.items.push(item);
  }

  return [...buckets.filter((s) => s.items.length > 0), ...(other.items.length ? [other] : [])];
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TournamentManagementV2({ navigation }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await tournamentManagementService.getAdminList();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const runAction = async (label, fn) => {
    try {
      const res = await fn();
      if (res?.redirectToResultEntry) {
        navigation.navigate('TournamentResultEntry', { tournamentId: res.tournament?._id || res.tournament?.id });
      }
      load();
    } catch (e) {
      Alert.alert(label, e.message || 'Action failed');
    }
  };

  const confirmDelete = (id, name) => {
    Alert.alert('Delete Tournament', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => runAction('Delete', () => tournamentService.deleteTournament(id)),
      },
    ]);
  };

  const renderActions = (item) => {
    const status = item.status || item.lifecycleStatus;
    const id = item._id;
    const commonDelete = (
      <ActionBtn
        label="Delete"
        danger
        onPress={() => confirmDelete(id, item.name || 'this tournament')}
      />
    );

    if (status === 'draft') {
      return (
        <>
          <ActionBtn label="Edit" onPress={() => navigation.navigate('TournamentManagement', { editId: id })} />
          {commonDelete}
          <ActionBtn label="Publish" primary onPress={() => runAction('Publish', () => tournamentManagementService.publish(id))} />
        </>
      );
    }
    if (status === 'upcoming' || status === 'incoming') {
      return (
        <>
          <ActionBtn label="Edit" onPress={() => navigation.navigate('TournamentManagement', { editId: id })} />
          <ActionBtn label="View slots" onPress={() => navigation.navigate('TournamentHistory')} />
          <ActionBtn label="Start" primary onPress={() => runAction('Start', () => tournamentManagementService.startMatch(id))} />
          <ActionBtn
            label="Cancel + Refund"
            danger
            onPress={() =>
              Alert.alert(
                'Cancel tournament',
                'This refunds all entry fees once (idempotent). Continue?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Cancel tournament',
                    style: 'destructive',
                    onPress: () =>
                      runAction('Cancel', () =>
                        tournamentManagementService.cancelTournament(id, 'Cancelled by admin')
                      ),
                  },
                ]
              )
            }
          />
          {commonDelete}
        </>
      );
    }
    if (status === 'ongoing') {
      return (
        <>
          <ActionBtn label="View slots" onPress={() => navigation.navigate('TournamentHistory')} />
          <ActionBtn
            label="Complete"
            primary
            onPress={() =>
              runAction('Complete', async () => {
                const res = await tournamentManagementService.completeMatch(id);
                navigation.navigate('TournamentResultEntry', { tournamentId: id });
                return res;
              })
            }
          />
          <ActionBtn
            label="Cancel + Refund"
            danger
            onPress={() =>
              Alert.alert(
                'Cancel tournament',
                'This refunds all entry fees once. Continue?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Cancel tournament',
                    style: 'destructive',
                    onPress: () =>
                      runAction('Cancel', () =>
                        tournamentManagementService.cancelTournament(id, 'Cancelled by admin')
                      ),
                  },
                ]
              )
            }
          />
          {commonDelete}
        </>
      );
    }
    if (status === 'completed' || status === 'result_published') {
      const published = item.resultsPublished || status === 'result_published';
      return (
        <>
          <ActionBtn
            label={published ? 'View / Edit Result' : 'Publish Result'}
            primary={!published}
            onPress={() => navigation.navigate('TournamentResultEntry', { tournamentId: id })}
          />
          {published ? (
            <ActionBtn
              label="View Results"
              onPress={() => navigation.navigate('TournamentResults', { tournamentId: id })}
            />
          ) : null}
          {published ? (
            <ActionBtn
              label="Export"
              onPress={async () => {
                try {
                  const data = await tournamentManagementService.exportResults(id);
                  Alert.alert('Export', JSON.stringify(data, null, 2).slice(0, 800));
                } catch (e) {
                  Alert.alert('Export', e.message);
                }
              }}
            />
          ) : null}
          {commonDelete}
        </>
      );
    }
    return null;
  };

  const filteredList = list.filter((item) => {
    if (categoryFilter === 'all') return true;
    const raw = item.tournamentType || item.category || 'battle_royale';
    const normalized = raw === 'custom' ? 'custom_match' : raw;
    return normalized === categoryFilter;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Tournaments</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TournamentManagement')}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
        >
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All' },
              { key: 'battle_royale', label: 'Battle Royale' },
              { key: 'custom_match', label: 'Clash Squad' },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setCategoryFilter(f.key)}
                style={[styles.filterBtn, categoryFilter === f.key && styles.filterBtnActive]}
              >
                <Text style={[styles.filterText, categoryFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {groupBySection(filteredList).map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.items.length}</Text>
              </View>
              {section.items.map((item) => {
                const status = item.status || 'draft';
                const type = TYPE_LABELS[item.tournamentType] || TYPE_LABELS[item.category] || '—';
                const joinedLabel = getJoinedLabel(item);
                const showFull = item.showFullBadge ?? (item.isFull && (status === 'upcoming' || status === 'incoming'));
                const fullText = item.fullLabel === 'Match Full' ? 'MATCH FULL' : 'FULL';

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('TournamentDetails', { tournamentId: item._id })}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.cardName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                      {item.isAutoGenerated ? (
                        <View style={styles.autoBadge}>
                          <Text style={styles.autoBadgeText}>DAILY AUTO</Text>
                        </View>
                      ) : null}
                      {showFull && (
                        <View style={styles.fullBadge}>
                          <Text style={styles.fullText}>{fullText}</Text>
                        </View>
                      )}
                      </View>
                    </View>
                    <Text style={styles.meta}>
                      {item.formatLabel ? `${item.formatLabel} · ` : ''}
                      {type} · ₹{item.entryFee ?? 0}/player
                    </Text>
                    {item.isAutoGenerated ? (
                      <Text style={styles.meta}>
                        AUTO: {item.autoMatchDisplayId || item.autoMatchName || 'Daily Auto Match'}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>{joinedLabel}</Text>
                    <View style={styles.row}>
                      <View style={[styles.statusPill, statusPillStyle(status)]}>
                        <Text style={styles.statusText}>{STATUS_LABELS[status] || status}</Text>
                      </View>
                      {item.resultsPublished || status === 'result_published' ? (
                        <View style={styles.resultReadyPill}>
                          <Text style={styles.resultReadyText}>Result Ready</Text>
                        </View>
                      ) : null}
                      <Text style={styles.date}>{formatDate(item.matchDate || item.startDate)}</Text>
                    </View>
                    <View style={styles.actions}>{renderActions(item)}</View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {!filteredList.length && <Text style={styles.empty}>No tournaments in this category.</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ActionBtn({ label, onPress, primary, danger }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, primary && styles.actionPrimary, danger && styles.actionDanger]}
      onPress={onPress}
    >
      <Text style={[styles.actionLabel, (primary || danger) && styles.actionLabelLight]}>{label}</Text>
    </TouchableOpacity>
  );
}

function statusPillStyle(status) {
  if (status === 'ongoing' || status === 'live') return { backgroundColor: '#1e3a5f' };
  if (status === 'completed' || status === 'result_published') return { backgroundColor: '#3d2e00' };
  if (status === 'upcoming' || status === 'incoming') return { backgroundColor: '#1a2e44' };
  return { backgroundColor: '#2a2a2a' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.35)',
    backgroundColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0f172a',
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,229,255,0.2)',
  },
  sectionTitle: { color: COLORS.primary, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  sectionCount: {
    color: COLORS.textSecondary || '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,229,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  card: {
    backgroundColor: COLORS.card || '#121A28',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.12)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { color: COLORS.white, fontSize: 16, fontWeight: '600', flex: 1 },
  fullBadge: { backgroundColor: '#7f1d1d', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  fullText: { color: '#fecaca', fontSize: 10, fontWeight: '700' },
  autoBadge: { backgroundColor: 'rgba(255,107,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  autoBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  meta: { color: COLORS.textSecondary || '#94a3b8', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  resultReadyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#0d3d2e',
  },
  resultReadyText: { color: '#4ADE80', fontSize: 11, fontWeight: '700' },
  date: { color: COLORS.textSecondary || '#94a3b8', fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.35)',
  },
  actionPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionDanger: { backgroundColor: '#7f1d1d', borderColor: '#7f1d1d' },
  actionLabel: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  actionLabelLight: { color: '#0f172a' },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
});
