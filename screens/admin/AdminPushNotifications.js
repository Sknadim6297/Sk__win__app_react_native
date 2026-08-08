import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { notificationService } from '../../services/api';

const TARGETS = [
  { id: 'all', label: 'All users' },
  { id: 'users', label: 'Selected user IDs' },
  { id: 'tournament', label: 'Tournament participants' },
];

export default function AdminPushNotifications({ navigation }) {
  const [title, setTitle] = useState('Important Update 📢');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [userIdsText, setUserIdsText] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [screen, setScreen] = useState('ImportantUpdates');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Required', 'Title and message are required');
      return;
    }
    const payload = {
      title: title.trim(),
      message: message.trim(),
      target,
      screen: screen.trim() || 'ImportantUpdates',
    };
    if (target === 'users') {
      payload.userIds = userIdsText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!payload.userIds.length) {
        Alert.alert('Required', 'Enter at least one user ID');
        return;
      }
    }
    if (target === 'tournament') {
      if (!tournamentId.trim()) {
        Alert.alert('Required', 'Enter tournament ID');
        return;
      }
      payload.tournamentId = tournamentId.trim();
    }

    setSending(true);
    try {
      const res = await notificationService.adminSend(payload);
      Alert.alert(
        'Sent',
        `Delivered/queued: ${res.sent || 0} of ${res.total || 0}` +
          (res.duplicates ? ` (${res.duplicates} duplicates skipped)` : '')
      );
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Send Push Notification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="New tournaments are now available."
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Target</Text>
        <View style={styles.row}>
          {TARGETS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.chip, target === t.id && styles.chipActive]}
              onPress={() => setTarget(t.id)}
            >
              <Text style={[styles.chipText, target === t.id && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {target === 'users' ? (
          <>
            <Text style={styles.label}>User IDs (comma or space separated)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={userIdsText}
              onChangeText={setUserIdsText}
              placeholderTextColor="#64748b"
              multiline
            />
          </>
        ) : null}

        {target === 'tournament' ? (
          <>
            <Text style={styles.label}>Tournament ID</Text>
            <TextInput
              style={styles.input}
              value={tournamentId}
              onChangeText={setTournamentId}
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
          </>
        ) : null}

        <Text style={styles.label}>Open screen (optional)</Text>
        <TextInput
          style={styles.input}
          value={screen}
          onChangeText={setScreen}
          placeholder="ImportantUpdates | TournamentDetails | MyWallet"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.sendText}>Send Notification</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  title: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 40 },
  label: { color: COLORS.gray, marginBottom: 6, marginTop: 10, fontSize: 13 },
  input: {
    backgroundColor: '#1e293b',
    color: COLORS.white,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    marginBottom: 6,
  },
  chipActive: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: COLORS.primary, borderWidth: 1 },
  chipText: { color: COLORS.gray, fontSize: 13 },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  sendBtn: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  sendText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
