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
import RNPickerSelect from 'react-native-picker-select';
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
    mvpUserId: '',
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

      const isBR = detail.tournament?.category === 'battle_royale';

      if (isBR) {
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
        setCustomForm({
          winnerTeamId: r?.winnerTeamId?._id || r?.winnerTeamId || '',
          runnerUpTeamId: r?.runnerUpTeamId?._id || r?.runnerUpTeamId || '',
          mvpUserId: r?.mvpUserId?._id || r?.mvpUserId || '',
          winnerPrize: String(r?.winnerPrize ?? pd?.winnerPrize ?? ''),
          runnerUpPrize: String(r?.runnerUpPrize ?? pd?.runnerUpPrize ?? ''),
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
        { text: 'Publish', onPress: publishResults },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCustom = async () => {
    setSaving(true);
    try {
      await tournamentManagementService.saveCustomMatchResults(tournamentId, {
        winnerTeamId: customForm.winnerTeamId,
        runnerUpTeamId: customForm.runnerUpTeamId,
        mvpUserId: customForm.mvpUserId,
        winnerPrize: Number(customForm.winnerPrize) || 0,
        runnerUpPrize: Number(customForm.runnerUpPrize) || 0,
      });
      Alert.alert('Saved', 'Custom match results saved', [
        { text: 'Publish', onPress: publishResults },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const publishResults = async () => {
    try {
      await tournamentManagementService.publishResults(tournamentId);
      Alert.alert('Published', 'Results are now visible to all users');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Publish', e.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const tournament = meta?.tournament;
  const isBR = tournament?.category === 'battle_royale';
  const teams = meta?.teams || [];

  const mvpOptions = teams.flatMap((t) =>
    (t.members || []).map((m) => ({
      label: `${t.name} — ${m.gamingUsername || m.userId?.username}`,
      value: m.userId?._id || m.userId,
    }))
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {tournament?.name || 'Results'}
        </Text>
        <TouchableOpacity onPress={publishResults}>
          <Text style={styles.publish}>Publish</Text>
        </TouchableOpacity>
      </View>

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
                />
                <Text style={[styles.player, { flex: 1.2 }]} numberOfLines={1}>
                  {row.gamingUsername}
                </Text>
                <TextInput
                  style={[styles.input, { flex: 0.6 }]}
                  keyboardType="number-pad"
                  value={row.kills}
                  onChangeText={(v) => updateEntry(i, 'kills', v)}
                />
                <TextInput
                  style={[styles.input, { flex: 0.7 }]}
                  keyboardType="number-pad"
                  value={row.prize}
                  onChangeText={(v) => updateEntry(i, 'prize', v)}
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={saveBattleRoyale}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Results'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Winner Team</Text>
            <RNPickerSelect
              value={customForm.winnerTeamId}
              onValueChange={(v) => setCustomForm((f) => ({ ...f, winnerTeamId: v }))}
              items={teams.map((t) => ({ label: t.name, value: t._id }))}
              placeholder={{ label: 'Select winner', value: '' }}
              style={pickerStyles}
            />
            <Text style={styles.label}>Runner-Up Team</Text>
            <RNPickerSelect
              value={customForm.runnerUpTeamId}
              onValueChange={(v) => setCustomForm((f) => ({ ...f, runnerUpTeamId: v }))}
              items={teams.map((t) => ({ label: t.name, value: t._id }))}
              placeholder={{ label: 'Select runner-up', value: '' }}
              style={pickerStyles}
            />
            <Text style={styles.label}>Player of the Match</Text>
            <RNPickerSelect
              value={customForm.mvpUserId}
              onValueChange={(v) => setCustomForm((f) => ({ ...f, mvpUserId: v }))}
              items={mvpOptions}
              placeholder={{ label: 'Select MVP', value: '' }}
              style={pickerStyles}
            />
            <Text style={styles.label}>Winner Prize (₹)</Text>
            <TextInput
              style={styles.fullInput}
              keyboardType="number-pad"
              value={customForm.winnerPrize}
              onChangeText={(v) => setCustomForm((f) => ({ ...f, winnerPrize: v }))}
            />
            <Text style={styles.label}>Runner-Up Prize (₹, optional)</Text>
            <TextInput
              style={styles.fullInput}
              keyboardType="number-pad"
              value={customForm.runnerUpPrize}
              onChangeText={(v) => setCustomForm((f) => ({ ...f, runnerUpPrize: v }))}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveCustom} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Results'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const pickerStyles = {
  inputIOS: {
    color: COLORS.white,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 12,
  },
  inputAndroid: {
    color: COLORS.white,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 12,
  },
};

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
  scroll: { padding: 16, paddingBottom: 40 },
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
    marginTop: 16,
  },
  saveText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
  label: { color: COLORS.textSecondary, marginBottom: 6, marginTop: 8 },
  fullInput: {
    backgroundColor: '#1e293b',
    color: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
});
