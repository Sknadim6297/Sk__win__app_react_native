import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import { COLORS } from '../../styles/theme';
import { dailyAutoMatchService, gameService, mapService } from '../../services/api';
import { toPlayerMatchLabel } from '../../utils/tournamentHelpers';
import { sortBySortOrder } from '../../utils/sortBySortOrder';
import Toast from '../../components/Toast';

const ORANGE = COLORS.primary;
const CARD = '#12182B';
const BG = '#0B0E1B';

const EMPTY_FORM = {
  name: '',
  game: '',
  gameMode: '',
  category: 'battle_royale',
  mode: 'solo',
  map: 'Bermuda',
  startTime: '10:00',
  entryFee: '20',
  prizePool: '500',
  perKill: '0',
  description: '',
  rulesText: '',
  roomId: '',
  roomPassword: '',
  showRoomCredentials: false,
  isActive: true,
  publishOnGenerate: true,
};

export default function DailyAutoMatchManagement({ navigation }) {
  const [items, setItems] = useState([]);
  const [games, setGames] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [maps, setMaps] = useState([{ label: 'Bermuda', value: 'Bermuda' }]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

  const load = useCallback(async () => {
    try {
      const [list, gameList, mapList] = await Promise.all([
        dailyAutoMatchService.list(),
        gameService.getAllGames().catch(() => []),
        mapService.getAll().catch(() => []),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setGames(Array.isArray(gameList) ? gameList : []);
      const mapped = (Array.isArray(mapList) ? mapList : [])
        .map((m) => ({ label: m.name, value: m.name }))
        .filter((m) => m.value);
      if (mapped.length) setMaps(mapped);
    } catch (e) {
      showToast(e.message || 'Failed to load Daily Auto Matches', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.game) {
      setGameModes([]);
      return undefined;
    }
    let cancelled = false;
    gameService.getGameModes(form.game).then((modes) => {
      if (!cancelled) setGameModes(sortBySortOrder(Array.isArray(modes) ? modes : []));
    }).catch(() => {
      if (!cancelled) setGameModes([]);
    });
    return () => { cancelled = true; };
  }, [form.game]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      game: games[0]?._id || '',
      map: maps[0]?.value || 'Bermuda',
    });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      game: item.game?._id || item.game || '',
      gameMode: item.gameMode?._id || item.gameMode || '',
      category: item.category === 'custom_match' ? 'custom' : item.category || 'battle_royale',
      mode: item.mode || 'solo',
      map: item.map || 'Bermuda',
      startTime: (item.startTime || '10:00').slice(0, 5),
      entryFee: String(item.entryFee ?? 0),
      prizePool: String(item.prizePool ?? 0),
      perKill: String(item.perKill ?? 0),
      description: item.description || '',
      rulesText: Array.isArray(item.rules) ? item.rules.join('\n') : '',
      roomId: item.roomId || '',
      roomPassword: item.roomPassword || '',
      showRoomCredentials: Boolean(item.showRoomCredentials),
      isActive: item.isActive !== false,
      publishOnGenerate: item.publishOnGenerate !== false,
    });
    setShowForm(true);
  };

  const payload = () => ({
    name: form.name.trim(),
    game: form.game,
    gameMode: form.gameMode,
    category: form.category,
    mode: form.mode,
    map: form.map,
    startTime: form.startTime,
    entryFee: Number(form.entryFee) || 0,
    prizePool: Number(form.prizePool) || 0,
    perKill: form.category === 'custom' ? 0 : Number(form.perKill) || 0,
    description: form.description,
    rules: form.rulesText,
    roomId: form.roomId,
    roomPassword: form.roomPassword,
    showRoomCredentials: form.showRoomCredentials,
    isActive: form.isActive,
    publishOnGenerate: form.publishOnGenerate,
    repeat: 'daily',
  });

  const save = async () => {
    if (!form.name.trim() || !form.game || !form.gameMode || !form.startTime) {
      showToast('Name, game, mode and start time are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await dailyAutoMatchService.update(editingId, payload());
        showToast('Master updated. Existing generated tournaments were not changed.');
      } else {
        await dailyAutoMatchService.create(payload());
        showToast('Daily Auto Match created');
      }
      setShowForm(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (label, fn) => {
    try {
      const result = await fn();
      if (result?.message) showToast(result.message);
      await load();
      return result;
    } catch (e) {
      Alert.alert(label, e.message || 'Action failed');
      return null;
    }
  };

  const pickerStyle = {
    inputIOS: styles.pickerInput,
    inputAndroid: styles.pickerInput,
    inputWeb: styles.pickerInput,
    placeholder: { color: '#9AA4B8' },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Auto Matches</Text>
        <TouchableOpacity onPress={openCreate} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ORANGE} />
          }
          contentContainerStyle={styles.list}
        >
          <Text style={styles.hint}>
            Master templates. The server creates a real tournament every day at 12:05 AM IST. Editing a generated match does not change the master.
          </Text>
          {items.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.id}>{item.displayId}</Text>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.game?.name || 'Game'} · {(item.category === 'custom' || item.category === 'custom_match') ? 'Clash Squad' : 'Battle Royale'} · {(item.mode || 'solo').toUpperCase()} · {item.startTimeLabel || item.startTime}
                  </Text>
                </View>
                <View style={[styles.statusPill, item.isActive ? styles.activePill : styles.inactivePill]}>
                  <Text style={styles.statusText}>{item.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Entry ₹{item.entryFee ?? 0}/player · Prize ₹{item.prizePool ?? 0}</Text>
              <Text style={styles.meta}>Next: {item.nextMatchLabel || 'Paused'}</Text>
              <View style={styles.actions}>
                <ActionBtn label="Edit" onPress={() => openEdit(item)} />
                <ActionBtn
                  label="Generate today"
                  primary
                  onPress={() => runAction('Generate', () => dailyAutoMatchService.generateToday(item._id))}
                />
                <ActionBtn
                  label="Generated"
                  onPress={async () => {
                    try {
                      setGenerated(await dailyAutoMatchService.getGenerated(item._id));
                    } catch (e) {
                      Alert.alert('Generated', e.message);
                    }
                  }}
                />
                <ActionBtn
                  label={item.isActive ? 'Deactivate' : 'Activate'}
                  onPress={() =>
                    runAction(
                      item.isActive ? 'Deactivate' : 'Activate',
                      () => (item.isActive ? dailyAutoMatchService.deactivate(item._id) : dailyAutoMatchService.activate(item._id))
                    )
                  }
                />
                <ActionBtn
                  label="Duplicate"
                  onPress={() => runAction('Duplicate', () => dailyAutoMatchService.duplicate(item._id))}
                />
                <ActionBtn
                  label="Delete"
                  danger
                  onPress={() =>
                    Alert.alert(
                      'Remove Daily Auto Match',
                      'Existing generated tournaments will stay in All Tournaments.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => runAction('Delete', () => dailyAutoMatchService.remove(item._id)),
                        },
                      ]
                    )
                  }
                />
              </View>
            </View>
          ))}
          {!items.length && <Text style={styles.empty}>No Daily Auto Matches yet. Tap + to create one.</Text>}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editingId ? 'Edit master' : 'Create Daily Auto Match'}</Text>
            <View style={styles.headerBtn} />
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            <Label>Tournament name</Label>
            <TextInput style={styles.input} value={form.name} onChangeText={(name) => setForm((p) => ({ ...p, name }))} placeholder="Daily Solo" placeholderTextColor="#6B7280" />
            <Label>Game</Label>
            <RNPickerSelect
              value={form.game}
              onValueChange={(game) => setForm((p) => ({ ...p, game, gameMode: '' }))}
              items={games.map((g) => ({ label: g.name, value: g._id }))}
              style={pickerStyle}
              placeholder={{ label: 'Select game', value: '' }}
            />
            <Label>Game mode</Label>
            <RNPickerSelect
              value={form.gameMode}
              onValueChange={(gameMode) => setForm((p) => ({ ...p, gameMode }))}
              items={gameModes.map((m) => ({ label: toPlayerMatchLabel(m.name), value: m._id }))}
              style={pickerStyle}
              placeholder={{ label: 'Select mode', value: '' }}
            />
            <Label>Match type</Label>
            <RNPickerSelect
              value={form.category}
              onValueChange={(category) => setForm((p) => ({ ...p, category }))}
              items={[
                { label: 'Battle Royale', value: 'battle_royale' },
                { label: 'Clash Squad', value: 'custom' },
              ]}
              style={pickerStyle}
            />
            <Label>Mode</Label>
            <RNPickerSelect
              value={form.mode}
              onValueChange={(mode) => setForm((p) => ({ ...p, mode }))}
              items={
                form.category === 'custom'
                  ? [
                      { label: '1v1', value: 'solo' },
                      { label: '2v2', value: 'duo' },
                      { label: '4v4', value: 'squad' },
                    ]
                  : [
                      { label: 'Solo', value: 'solo' },
                      { label: 'Duo', value: 'duo' },
                      { label: 'Squad', value: 'squad' },
                    ]
              }
              style={pickerStyle}
            />
            <Label>Map</Label>
            <RNPickerSelect
              value={form.map}
              onValueChange={(map) => setForm((p) => ({ ...p, map }))}
              items={maps}
              style={pickerStyle}
            />
            <Label>Daily start time (HH:mm, IST)</Label>
            <TextInput
              style={styles.input}
              value={form.startTime}
              onChangeText={(startTime) => setForm((p) => ({ ...p, startTime }))}
              placeholder="10:00"
              placeholderTextColor="#6B7280"
            />
            <Label>Entry fee per player (₹)</Label>
            <TextInput style={styles.input} keyboardType="numeric" value={form.entryFee} onChangeText={(entryFee) => setForm((p) => ({ ...p, entryFee }))} />
            <Label>Prize pool</Label>
            <TextInput style={styles.input} keyboardType="numeric" value={form.prizePool} onChangeText={(prizePool) => setForm((p) => ({ ...p, prizePool }))} />
            {form.category !== 'custom' ? (
              <>
                <Label>Per-kill reward</Label>
                <TextInput style={styles.input} keyboardType="numeric" value={form.perKill} onChangeText={(perKill) => setForm((p) => ({ ...p, perKill }))} />
              </>
            ) : null}
            <Label>Room ID</Label>
            <TextInput style={styles.input} value={form.roomId} onChangeText={(roomId) => setForm((p) => ({ ...p, roomId }))} />
            <Label>Room password</Label>
            <TextInput style={styles.input} value={form.roomPassword} onChangeText={(roomPassword) => setForm((p) => ({ ...p, roomPassword }))} />
            <Label>Rules (one per line)</Label>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              multiline
              value={form.rulesText}
              onChangeText={(rulesText) => setForm((p) => ({ ...p, rulesText }))}
            />
            <RowSwitch label="Active — generate every day" value={form.isActive} onValueChange={(isActive) => setForm((p) => ({ ...p, isActive }))} />
            <RowSwitch label="Publish generated matches as Upcoming" value={form.publishOnGenerate} onValueChange={(publishOnGenerate) => setForm((p) => ({ ...p, publishOnGenerate }))} />
            <RowSwitch label="Show room credentials" value={form.showRoomCredentials} onValueChange={(showRoomCredentials) => setForm((p) => ({ ...p, showRoomCredentials }))} />
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingId ? 'Save master' : 'Create Daily Auto Match'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!generated} animationType="slide" onRequestClose={() => setGenerated(null)}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setGenerated(null)} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Generated tournaments</Text>
            <View style={styles.headerBtn} />
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            <Text style={styles.hint}>{generated?.autoMatch?.name} · {generated?.autoMatch?.displayId}</Text>
            {(generated?.tournaments || []).map((row) => (
              <TouchableOpacity
                key={row._id}
                style={styles.card}
                onPress={() => {
                  setGenerated(null);
                  navigation.navigate('TournamentManagement', { editId: row._id });
                }}
              >
                <Text style={styles.name}>{row.generatedDateLabel || row.generatedDate}</Text>
                <Text style={styles.meta}>{row.name} · ₹{row.entryFee} · {String(row.status || '').toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            {!(generated?.tournaments || []).length && <Text style={styles.empty}>No generated tournaments yet.</Text>}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((t) => ({ ...t, visible: false }))} />
    </SafeAreaView>
  );
}

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function RowSwitch({ label, value, onValueChange }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: ORANGE }} />
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  list: { padding: 16, paddingBottom: 40 },
  hint: { color: '#9AA4B8', fontSize: 13, marginBottom: 14, lineHeight: 18 },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  id: { color: ORANGE, fontSize: 12, fontWeight: '800' },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
  meta: { color: '#9AA4B8', fontSize: 12, marginTop: 4 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activePill: { backgroundColor: 'rgba(34,197,94,0.2)' },
  inactivePill: { backgroundColor: 'rgba(148,163,184,0.2)' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
  },
  actionPrimary: { backgroundColor: ORANGE, borderColor: ORANGE },
  actionDanger: { borderColor: '#EF4444' },
  actionLabel: { color: ORANGE, fontSize: 12, fontWeight: '700' },
  actionLabelLight: { color: '#fff' },
  empty: { color: '#9AA4B8', textAlign: 'center', marginTop: 24 },
  form: { padding: 16, paddingBottom: 40 },
  label: { color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerInput: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  switchLabel: { color: '#fff', flex: 1, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    marginTop: 24,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800' },
});
