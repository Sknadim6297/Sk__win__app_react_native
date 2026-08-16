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
import ScreenHeader from '../components/navigation/ScreenHeader';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService, tournamentManagementService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import { getTeamSize, isCustomMatch, isTeamEntryMode } from '../utils/tournamentHelpers';
import { fetchWalletForEntry } from '../utils/walletFlow';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';
import { isPaymentEnabled } from '../utils/paymentConfig';

const emptyPlayer = () => ({ name: '', gamingUID: '' });

export default function CustomMatchTeamRegisterScreen({ navigation, route }) {
  const { tournamentId, walletRecharged, payWithCashfree } = route.params || {};
  const { user, isAdmin } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamSide, setTeamSide] = useState('A');
  const [players, setPlayers] = useState([emptyPlayer()]);
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
        setPlayers(Array.from({ length: count }, () => emptyPlayer()));
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

  const updatePlayer = (index, field, value) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
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

    for (let i = 0; i < players.length; i += 1) {
      const name = String(players[i].name || '').trim();
      const uid = String(players[i].gamingUID || '').trim();
      if (name.length < 3) {
        showToast(`Player ${i + 1}: enter Game ID (min 3 characters)`, 'warning');
        return;
      }
      if (uid.length < 3) {
        showToast(`Player ${i + 1}: enter Game UID (min 3 characters)`, 'warning');
        return;
      }
    }

    try {
      setSubmitting(true);

      const roster = players.map((p) => ({
        name: p.name.trim(),
        gamingUID: p.gamingUID.trim(),
      }));

      // Cashfree Sandbox Pay & Join for team entry
      if (isPaymentEnabled() || payWithCashfree) {
        navigation.navigate('TournamentPayJoin', {
          tournamentId,
          tournamentName: tournament?.name,
          amount: tournament?.entryFee,
          joinKind: 'team',
          teamName: teamName.trim(),
          teamSide,
          players: roster,
          skipForm: true,
        });
        return;
      }

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
        players: roster,
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
        <ActivityIndicator size="large" color={PAGE.cyan} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const isCustom = isCustomMatch(tournament);
  const showSidePicker = isCustom;

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="Joining Match" onBack={() => navigation.goBack()} />
      <View style={styles.selectBanner}>
        <Text style={styles.selectBannerText}>Select Match Position</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.matchName}>{tournament?.name}</Text>
        <Text style={styles.meta}>
          {isCustom ? 'Custom Match' : 'Battle Royale'} · {(tournament?.mode || 'solo').toUpperCase()} ·{' '}
          {playersPerTeam} player{playersPerTeam > 1 ? 's' : ''}/team
          {isCustom ? ' · Max 2 teams' : ''}
          {'\n'}Entry fee ₹{tournament?.entryFee || 0} — paid once by team captain
        </Text>

        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Mandatory Game ID & UID</Text>
          <Text style={styles.warnText}>
            Enter correct Free Fire Game ID and UID for every player. Wrong name or UID can get the
            player removed from the match by the organizer.
          </Text>
        </View>

        <Text style={styles.label}>Team Name *</Text>
        <TextInput
          style={styles.input}
          value={teamName}
          onChangeText={setTeamName}
          placeholder="Enter team name"
          placeholderTextColor={PAGE.muted}
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
          Team Players * ({playersPerTeam}/{playersPerTeam}) — Game ID + UID required
        </Text>
        {players.map((player, index) => (
          <View key={`player-${index}`} style={styles.playerCard}>
            <View style={styles.detailsHead}>
              <Text style={styles.detailsHeadText}>
                Player {index + 1}
                {index === 0 ? ' (Captain)' : ''}
              </Text>
            </View>
            <View style={styles.playerBody}>
              <Text style={styles.fieldLabel}>inGameName</Text>
              <TextInput
                style={styles.underlineInput}
                value={player.name}
                onChangeText={(text) => updatePlayer(index, 'name', text)}
                placeholder="Game ID (in-game name)"
                placeholderTextColor={PAGE.muted}
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>inGameId</Text>
              <TextInput
                style={styles.underlineInput}
                value={player.gamingUID}
                onChangeText={(text) => updatePlayer(index, 'gamingUID', text)}
                placeholder="Game UID"
                placeholderTextColor={PAGE.muted}
                autoCapitalize="none"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>Join Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  selectBanner: {
    backgroundColor: PAGE.cyan,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectBannerText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  content: { padding: 16, paddingBottom: 40 },
  matchName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18, marginBottom: 6 },
  meta: { color: PAGE.muted, marginBottom: 16, fontSize: 13, lineHeight: 20 },
  warnBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  warnTitle: { color: PAGE.gold, fontFamily: FONTS.bold, fontSize: 13, marginBottom: 6 },
  warnText: { color: PAGE.muted, fontSize: 12, lineHeight: 18 },
  label: { color: COLORS.white, marginBottom: 8, fontFamily: FONTS.bold },
  input: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PAGE.border,
    color: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    fontFamily: FONTS.bold,
  },
  playerCard: {
    backgroundColor: PAGE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  detailsHead: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  detailsHeadText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  playerBody: { padding: 12 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, marginTop: 6 },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.35)',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 15,
    paddingVertical: 8,
    marginBottom: 8,
  },
  sideRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  sideBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PAGE.border,
    backgroundColor: PAGE.cardAlt,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sideBtnActive: { borderColor: PAGE.cyan, backgroundColor: 'rgba(79,209,197,0.12)' },
  sideBtnTaken: { opacity: 0.4 },
  sideBtnText: { color: PAGE.muted, fontFamily: FONTS.bold },
  sideBtnTextActive: { color: PAGE.cyan },
  sideBtnTextTaken: { color: PAGE.muted },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: PAGE.border,
    backgroundColor: PAGE.bg,
  },
  submitBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
});
