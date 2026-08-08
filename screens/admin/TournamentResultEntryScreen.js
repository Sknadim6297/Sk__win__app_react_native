import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { tournamentManagementService } from '../../services/api';

export default function TournamentResultEntryScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState(null);
  const [entries, setEntries] = useState([]);
  const [customForm, setCustomForm] = useState({
    winnerTeamId: '',
    runnerUpTeamId: '',
    winnerPrize: '',
    runnerUpPrize: '',
  });
  const [prizeTiers, setPrizeTiers] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const detail = await tournamentManagementService.getAdminDetail(tournamentId);
      setMeta(detail);

      const prize = await tournamentManagementService.getPrizeDistribution(tournamentId);
      if (prize?.rankTiers) setPrizeTiers(prize.rankTiers);

      const category = detail.tournament?.category || detail.tournament?.tournamentType;
      const isCustom =
        category === 'custom' ||
        category === 'custom_match' ||
        detail.tournamentType === 'custom_match';

      if (!isCustom) {
        const br = await tournamentManagementService.getBattleRoyaleEntry(tournamentId);
        const participants = br.participants || [];
        const saved = br.results || [];
        const savedMap = new Map(saved.map((r) => [String(r.userId?._id || r.userId), r]));

        const rows = participants.map((p, idx) => {
          const uid = p.userId?._id || p.userId;
          const s = savedMap.get(String(uid));
          return {
            userId: uid,
            participantId: p._id,
            gamingUsername: p.gamingUsername || p.userId?.username || '',
            gamingUID: p.gamingUID || '',
            position: s ? String(s.position) : String(idx + 1),
            kills: s ? String(s.kills) : '0',
            prize: s ? String(s.prize) : '',
          };
        });
        setEntries(rows);
        if (prize?.rankTiers?.length && rows.some((r) => !r.prize)) {
          applyPrizeTiers(rows, prize.rankTiers);
        }
      } else {
        const cm = await tournamentManagementService.getCustomMatchEntry(tournamentId);
        const r = cm.result;
        const pd = cm.prizeDistribution;
        const teams = cm.teams || detail.teams || [];
        setMeta((prev) => ({ ...prev, teams }));
        setCustomForm({
          winnerTeamId: String(r?.winnerTeamId?._id || r?.winnerTeamId || ''),
          runnerUpTeamId: String(r?.runnerUpTeamId?._id || r?.runnerUpTeamId || ''),
          winnerPrize: String(
            r?.winnerPrize ??
              pd?.winnerPrize ??
              detail.tournament?.prizePool ??
              detail.tournament?.prizes?.first ??
              ''
          ),
          runnerUpPrize: '0',
        });
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [tournamentId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPrizeTiers = (rows, tiers) => {
    setEntries(
      rows.map((row) => {
        const pos = Number(row.position) || 0;
        const tier = tiers.find((t) => pos >= t.rankFrom && pos <= t.rankTo);
        return { ...row, prize: tier ? String(tier.prize) : row.prize || '0' };
      })
    );
  };

  const autofillPrizes = () => {
    if (!prizeTiers.length) {
      Alert.alert('Prizes', 'Set prize tiers in tournament settings first');
      return;
    }
    applyPrizeTiers(entries, prizeTiers);
  };

  const updateEntry = (index, field, value) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'position' && prizeTiers.length) {
        const pos = Number(value) || 0;
        const tier = prizeTiers.find((t) => pos >= t.rankFrom && pos <= t.rankTo);
        if (tier) next[index].prize = String(tier.prize);
      }
      return next;
    });
  };

  const publishResults = async () => {
    try {
      await tournamentManagementService.publishResults(tournamentId);
      Alert.alert('Published', 'Results are now visible to joined users');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Publish Result', e.message);
    }
  };

  const saveBattleRoyale = async () => {
    const payload = entries.map((e) => ({
      userId: e.userId,
      participantId: e.participantId,
      position: Number(e.position),
      kills: Number(e.kills) || 0,
      prize: Number(e.prize) || 0,
      gamingUsername: e.gamingUsername,
      gamingUID: e.gamingUID,
    }));
    setSaving(true);
    try {
      await tournamentManagementService.saveBattleRoyaleResults(tournamentId, payload);
      Alert.alert('Saved', 'Battle Royale results saved', [
        { text: 'Publish Result', onPress: publishResults },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAndPublishCustom = async (publish) => {
    if (!customForm.winnerTeamId) {
      Alert.alert('Required', 'Select the winning team');
      return;
    }
    setSaving(true);
    try {
      const teams = meta?.teams || [];
      const other = teams.find((t) => String(t._id) !== String(customForm.winnerTeamId));
      await tournamentManagementService.saveCustomMatchResults(tournamentId, {
        winnerTeamId: customForm.winnerTeamId,
        runnerUpTeamId: customForm.runnerUpTeamId || other?._id,
        winnerPrize: Number(customForm.winnerPrize) || 0,
        runnerUpPrize: 0,
        publish: !!publish,
      });
      if (publish) {
        Alert.alert('Published', 'Result published. Tournament status stays Completed.');
        navigation.goBack();
      } else {
        Alert.alert('Saved', 'Results saved. Tap Publish Result when ready.', [
          { text: 'Publish Result', onPress: () => saveAndPublishCustom(true) },
          { text: 'OK' },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const tournament = meta?.tournament;
  const status = meta?.status || tournament?.lifecycleStatus || tournament?.status;
  const resultsPublished = Boolean(
    meta?.resultsPublished || tournament?.resultsPublished || status === 'result_published'
  );
  const canPublish = status === 'completed' && !resultsPublished;
  const category = tournament?.category || tournament?.tournamentType || meta?.tournamentType;
  const isBR = category !== 'custom' && category !== 'custom_match';
  const teams = meta?.teams || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {tournament?.name || 'Publish Result'}
        </Text>
        {canPublish && isBR ? (
          <TouchableOpacity onPress={publishResults}>
            <Text style={styles.publish}>Publish</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {!canPublish ? (
        <View style={styles.blockedBox}>
          <Text style={styles.blockedTitle}>
            {resultsPublished ? 'Results already published' : 'Results locked'}
          </Text>
          <Text style={styles.blockedText}>
            {resultsPublished
              ? 'This tournament stays Completed. Results are visible to joined users.'
              : `Mark this tournament as Completed before entering or publishing results. Current status: ${String(status || 'unknown').toUpperCase()}`}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {isBR ? (
          <>
            <TouchableOpacity style={styles.autofillBtn} onPress={autofillPrizes}>
              <Text style={styles.autofillText}>Auto-fill prizes from tiers</Text>
            </TouchableOpacity>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Player</Text>
              <Text style={[styles.th, { flex: 0.6 }]}>Kills</Text>
              <Text style={[styles.th, { flex: 0.7 }]}>Prize</Text>
            </View>
            {entries.map((row, i) => (
              <View key={String(row.userId)} style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 0.5 }]}
                  keyboardType="number-pad"
                  value={row.position}
                  onChangeText={(v) => updateEntry(i, 'position', v)}
                  editable={canPublish}
                />
                <Text style={[styles.player, { flex: 1.2 }]} numberOfLines={1}>
                  {row.gamingUsername}
                </Text>
                <TextInput
                  style={[styles.input, { flex: 0.6 }]}
                  keyboardType="number-pad"
                  value={row.kills}
                  onChangeText={(v) => updateEntry(i, 'kills', v)}
                  editable={canPublish}
                />
                <TextInput
                  style={[styles.input, { flex: 0.7 }]}
                  keyboardType="number-pad"
                  value={row.prize}
                  onChangeText={(v) => updateEntry(i, 'prize', v)}
                  editable={canPublish}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.saveBtn, !canPublish && styles.disabledBtn]}
              onPress={saveBattleRoyale}
              disabled={saving || !canPublish}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Results'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Registered Teams</Text>
            {teams.length === 0 ? (
              <Text style={styles.helper}>No teams registered yet.</Text>
            ) : (
              teams.map((team) => (
                <View key={team._id} style={styles.teamCard}>
                  <Text style={styles.teamName}>
                    Team {team.side || '?'} · {team.name}
                  </Text>
                  {(team.players || []).map((p, i) => (
                    <Text key={`${team._id}-p-${i}`} style={styles.playerLine}>
                      {`${i + 1}. ${p.name || p}`}
                    </Text>
                  ))}
                  {(team.members || []).length > 0 && !(team.players || []).length
                    ? team.members.map((m, i) => (
                        <Text key={`${team._id}-m-${i}`} style={styles.playerLine}>
                          {`${i + 1}. ${m.gamingUsername || m.userId?.username || 'Player'}`}
                        </Text>
                      ))
                    : null}
                </View>
              ))
            )}

            <Text style={styles.label}>Select Winning Team *</Text>
            {teams.length === 0 ? (
              <Text style={styles.helper}>Register both teams before selecting a winner.</Text>
            ) : (
              <View style={styles.winnerPickerRow}>
                {teams.map((team) => {
                  const id = String(team._id);
                  const selected = String(customForm.winnerTeamId) === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.winnerOption,
                        selected && styles.winnerOptionSelected,
                        !canPublish && styles.winnerOptionDisabled,
                      ]}
                      disabled={!canPublish}
                      activeOpacity={0.85}
                      onPress={() => {
                        const other = teams.find((t) => String(t._id) !== id);
                        setCustomForm((f) => ({
                          ...f,
                          winnerTeamId: id,
                          runnerUpTeamId: other ? String(other._id) : '',
                        }));
                      }}
                    >
                      <View style={styles.winnerOptionTop}>
                        <Ionicons
                          name={selected ? 'trophy' : 'ellipse-outline'}
                          size={20}
                          color={selected ? '#FBBF24' : COLORS.gray}
                        />
                        <Text
                          style={[
                            styles.winnerOptionLabel,
                            selected && styles.winnerOptionLabelSelected,
                          ]}
                        >
                          {selected ? 'WINNER' : 'Tap to select'}
                        </Text>
                      </View>
                      <Text style={styles.winnerOptionName} numberOfLines={2}>
                        Team {team.side || '?'} — {team.name}
                      </Text>
                      {(team.players || []).length > 0 ? (
                        <Text style={styles.winnerOptionMeta} numberOfLines={1}>
                          {(team.players || []).map((p) => p.name || p).join(', ')}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {customForm.winnerTeamId ? (
              <Text style={styles.helper}>
                Winner:{' '}
                {teams.find((t) => String(t._id) === String(customForm.winnerTeamId))?.name || '—'}
                {'  ·  '}
                Loser:{' '}
                {teams.find((t) => String(t._id) === String(customForm.runnerUpTeamId))?.name || '—'}
              </Text>
            ) : (
              <Text style={styles.helper}>Tap a team card above to mark it as the winner.</Text>
            )}

            {!canPublish ? (
              <Text style={[styles.helper, { color: '#F59E0B' }]}>
                {resultsPublished
                  ? 'Results already published — winner cannot be changed.'
                  : 'Mark tournament as Completed to enable winner selection.'}
              </Text>
            ) : null}

            <Text style={styles.label}>Winner Prize (₹)</Text>
            <TextInput
              style={styles.fullInput}
              keyboardType="number-pad"
              value={customForm.winnerPrize}
              onChangeText={(v) => setCustomForm((f) => ({ ...f, winnerPrize: v }))}
              editable={canPublish}
            />
            <Text style={styles.helper}>
              Winning team receives 100% of this prize. Losing team receives ₹0.
            </Text>

            <TouchableOpacity
              style={[styles.saveBtn, styles.secondaryBtn, !canPublish && styles.disabledBtn]}
              onPress={() => saveAndPublishCustom(false)}
              disabled={saving || !canPublish}
            >
              <Text style={styles.secondaryText}>{saving ? 'Saving…' : 'Save Result'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canPublish && styles.disabledBtn]}
              onPress={() => saveAndPublishCustom(true)}
              disabled={saving || !canPublish}
            >
              <Text style={styles.saveText}>{saving ? 'Publishing…' : 'Publish Result'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  title: { flex: 1, color: COLORS.white, fontSize: 17, fontWeight: '700' },
  publish: { color: COLORS.primary, fontWeight: '700' },
  blockedBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  blockedTitle: { color: '#F59E0B', fontWeight: '700', marginBottom: 4 },
  blockedText: { color: COLORS.gray, fontSize: 13, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: COLORS.white, fontWeight: '700', fontSize: 16, marginBottom: 10 },
  teamCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  teamName: { color: COLORS.primary, fontWeight: '700', marginBottom: 6 },
  playerLine: { color: COLORS.white, fontSize: 13, marginBottom: 2 },
  helper: { color: COLORS.gray, marginBottom: 10, fontSize: 13 },
  autofillBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  autofillText: { color: COLORS.primary, fontSize: 13 },
  tableHead: { flexDirection: 'row', marginBottom: 8 },
  th: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    color: COLORS.white,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  player: { color: COLORS.white, fontSize: 13 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  disabledBtn: { opacity: 0.45 },
  saveText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
  label: { color: COLORS.textSecondary, marginBottom: 6, marginTop: 8 },
  winnerPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  winnerOption: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  winnerOptionSelected: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  winnerOptionDisabled: {
    opacity: 0.55,
  },
  winnerOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  winnerOptionLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  winnerOptionLabelSelected: {
    color: '#FBBF24',
  },
  winnerOptionName: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  winnerOptionMeta: {
    color: COLORS.gray,
    fontSize: 12,
  },
  fullInput: {
    backgroundColor: '#1e293b',
    color: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
});
