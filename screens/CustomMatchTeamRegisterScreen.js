import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS } from '../styles/theme';
import { tournamentService, tournamentManagementService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import { getTeamSize, isCustomMatch, isTeamEntryMode } from '../utils/tournamentHelpers';
import { fetchWalletForEntry } from '../utils/walletFlow';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';

const CYAN = '#00E5FF';

export default function CustomMatchTeamRegisterScreen({ navigation, route }) {
  const { tournamentId, walletRecharged } = route.params || {};
  const { user, isAdmin } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamSide, setTeamSide] = useState('A');
  const [playerNames, setPlayerNames] = useState(['']);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });
  const { showInsufficientBalance, InsufficientBalanceDialog } = useInsufficientBalance(navigation);

  const playersPerTeam = useMemo(
    () => getTeamSize(tournament?.mode || 'solo'),
    [tournament?.mode]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await tournamentService.getDetails(tournamentId);
        setTournament(data);
        const count = getTeamSize(data.mode);
        setPlayerNames(Array.from({ length: count }, () => ''));
      } catch (e) {
        showToast(e.message || 'Failed to load match');
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId]);

  useEffect(() => {
    if (walletRecharged) {
      showToast('Coins added successfully! You can register your team now.', 'success');
      navigation.setParams({ walletRecharged: undefined });
    }
  }, [walletRecharged, navigation]);

  const takenSides = useMemo(() => {
    const sides = new Set();
    (tournament?.teams || []).forEach((t) => {
      if (t.side) sides.add(String(t.side).toUpperCase());
    });
    return sides;
  }, [tournament?.teams]);

  const updatePlayerName = (index, value) => {
    setPlayerNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const handleRegister = async () => {
    if (!user) {
      showToast('Please login to register');
      return;
    }
    if (isAdmin?.()) {
      showToast('Admins cannot register as participants');
      return;
    }
    if (!isCustomMatch(tournament) && !isTeamEntryMode(tournament?.mode)) {
      showToast('This tournament does not use team registration');
      return;
    }
    if (!teamName.trim()) {
      showToast('Enter team name');
      return;
    }
    if (takenSides.has(teamSide)) {
      showToast(`Team ${teamSide} is already taken`);
      return;
    }
    if (playerNames.some((n) => !n.trim())) {
      showToast(`Enter all ${playersPerTeam} player name(s)`);
      return;
    }

    try {
      setSubmitting(true);
      const walletCheck = await fetchWalletForEntry(tournament.entryFee);
      if (!walletCheck.sufficient) {
        showInsufficientBalance({
          tournamentId,
          returnScreen: 'CustomMatchTeamRegister',
          forTeam: true,
          requiredAmount: walletCheck.realRequired,
          currentBalance: walletCheck.balance,
        });
        return;
      }

      await tournamentManagementService.registerTeam(tournamentId, {
        teamName: teamName.trim(),
        teamSide,
        players: playerNames.map((name) => ({ name: name.trim() })),
      });

      showToast('Team registered successfully!', 'success');
      setTimeout(() => navigation.replace('TournamentDetails', { tournamentId }), 700);
    } catch (e) {
      showToast(e.message || 'Failed to register team');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const isCustom = isCustomMatch(tournament);
  const showSidePicker = isCustom;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AppIcon name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Team</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.matchName}>{tournament?.name}</Text>
        <Text style={styles.meta}>
          {isCustom ? 'Custom Match' : 'Battle Royale'} · {(tournament?.mode || 'solo').toUpperCase()} ·{' '}
          {playersPerTeam} player{playersPerTeam > 1 ? 's' : ''}/team
          {isCustom ? ' · Max 2 teams' : ''}
          {'\n'}Entry fee ₹{tournament?.entryFee || 0} — paid once by team captain
        </Text>

        <Text style={styles.label}>Team Name *</Text>
        <TextInput
          style={styles.input}
          value={teamName}
          onChangeText={setTeamName}
          placeholder="Enter team name"
          placeholderTextColor={COLORS.gray}
        />

        {showSidePicker ? (
          <>
            <Text style={styles.label}>Team Side *</Text>
            <View style={styles.sideRow}>
              {['A', 'B'].map((side) => {
                const taken = takenSides.has(side);
                const selected = teamSide === side;
                return (
                  <TouchableOpacity
                    key={side}
                    disabled={taken}
                    style={[
                      styles.sideBtn,
                      selected && styles.sideBtnActive,
                      taken && styles.sideBtnTaken,
                    ]}
                    onPress={() => setTeamSide(side)}
                  >
                    <Text
                      style={[
                        styles.sideBtnText,
                        selected && styles.sideBtnTextActive,
                        taken && styles.sideBtnTextTaken,
                      ]}
                    >
                      Team {side}
                      {taken ? ' (Taken)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>
          Player Names * ({playersPerTeam}/{playersPerTeam})
        </Text>
        {playerNames.map((name, index) => (
          <TextInput
            key={`player-${index}`}
            style={styles.input}
            value={name}
            onChangeText={(text) => updatePlayerName(index, text)}
            placeholder={index === 0 ? 'Player 1 (Captain / You)' : `Player ${index + 1}`}
            placeholderTextColor={COLORS.gray}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#050510" />
          ) : (
            <Text style={styles.submitText}>
              PAY TEAM ENTRY · ₹{tournament?.entryFee || 0}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark || COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 17 },
  content: { padding: 16, paddingBottom: 40 },
  matchName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 20, marginBottom: 6 },
  meta: { color: COLORS.gray, marginBottom: 20, fontSize: 13 },
  label: { color: COLORS.white, marginBottom: 8, fontFamily: FONTS.bold },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  sideRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  sideBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  sideBtnActive: { borderColor: CYAN, backgroundColor: 'rgba(0,229,255,0.12)' },
  sideBtnTaken: { opacity: 0.4 },
  sideBtnText: { color: COLORS.gray, fontFamily: FONTS.bold },
  sideBtnTextActive: { color: CYAN },
  sideBtnTextTaken: { color: COLORS.gray },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  submitBtn: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#050510', fontFamily: FONTS.bold, fontSize: 15 },
});
