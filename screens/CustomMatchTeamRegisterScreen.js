import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../components/navigation/ScreenHeader';
import CenterDialog from '../components/CenterDialog';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService, tournamentManagementService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import { getTeamSize, isCustomMatch, getMatchStructure, resolveEntryCharge } from '../utils/tournamentHelpers';
import { fetchWalletForEntry, startTournamentZapUpiPayment } from '../utils/walletFlow';
import { isPaymentEnabled } from '../utils/paymentConfig';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';

const emptyPlayer = () => ({ name: '', gamingUID: '' });

function clonePlayers(list) {
  return (list || []).map((p) => ({
    name: String(p?.name || ''),
    gamingUID: String(p?.gamingUID || ''),
  }));
}

function isPlayerComplete(player) {
  return String(player?.name || '').trim().length >= 3 && String(player?.gamingUID || '').trim().length >= 3;
}

/** Backend still needs a team name — auto from captain Game Name + side/slot (not shown in UI). */
function buildAutoTeamName(players, { isCustom, side, slot }) {
  const captain = String(players?.[0]?.name || '').trim() || 'Player';
  const tag = isCustom ? `Team ${side || 'A'}` : `Slot ${slot || 1}`;
  return `${captain} · ${tag}`.slice(0, 60);
}

function isAlreadyJoinedError(err) {
  return /already joined|already registered in this tournament/i.test(String(err?.message || err || ''));
}

export default function CustomMatchTeamRegisterScreen({ navigation, route }) {
  const { tournamentId, walletRecharged, pendingJoin } = route.params || {};
  const { user, isAdmin } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamSide, setTeamSide] = useState('A');
  const [teamSlot, setTeamSlot] = useState(1);
  const [players, setPlayers] = useState([emptyPlayer()]);
  const [teamSubmitted, setTeamSubmitted] = useState(false);
  const [entryVisible, setEntryVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [draftTeamName, setDraftTeamName] = useState('');
  const [draftTeamSide, setDraftTeamSide] = useState('A');
  const [draftTeamSlot, setDraftTeamSlot] = useState(1);
  const [draftPlayers, setDraftPlayers] = useState([emptyPlayer()]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const autoJoinRef = useRef(false);

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });
  const { showInsufficientBalance, InsufficientBalanceDialog } = useInsufficientBalance(navigation);

  const playersPerTeam = useMemo(() => {
    const fromApi = Number(tournament?.playersPerTeam || tournament?.playersCharged);
    if (fromApi > 0) return fromApi;
    return getTeamSize(tournament?.mode || 'solo');
  }, [tournament?.playersPerTeam, tournament?.playersCharged, tournament?.mode]);

  const entryCharge = useMemo(() => {
    const fromRoute = route.params?.entryCharge;
    const fee =
      Number(
        tournament?.entryFeePerPlayer ??
          tournament?.feePerPlayer ??
          fromRoute?.feePerPlayer ??
          tournament?.entryFee
      ) || 0;
    const players =
      Number(
        tournament?.playersCharged ??
          fromRoute?.playersCharged ??
          tournament?.playersPerTeam ??
          playersPerTeam
      ) || 1;
    const total =
      Number(tournament?.totalAmount ?? fromRoute?.totalAmount ?? tournament?.entryCharge?.totalAmount);
    if (Number.isFinite(total) && total >= 0) {
      return {
        feePerPlayer: fee,
        playersCharged: players,
        totalAmount: total,
        matchTypeName: tournament?.matchTypeName || tournament?.matchType,
      };
    }
    return resolveEntryCharge(tournament || {});
  }, [tournament, playersPerTeam, route.params?.entryCharge]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await tournamentService.getDetails(tournamentId);
        setTournament(data);
        const count = getTeamSize(data.mode);
        const blank = Array.from({ length: count }, () => emptyPlayer());
        setPlayers(blank);
        setDraftPlayers(clonePlayers(blank));
      } catch (e) {
        showToast(e.message || 'Failed to load match');
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId]);

  useEffect(() => {
    if (!walletRecharged) return;
    showToast('Coins added successfully!', 'success');
    if (!pendingJoin) {
      navigation.setParams({ walletRecharged: undefined });
    }
  }, [walletRecharged, pendingJoin, navigation]);

  const buildPendingJoin = (override) => {
    const roster = (override?.players || players).map((p) => ({
      name: String(p.name || '').trim(),
      gamingUID: String(p.gamingUID || '').trim(),
    }));
    const side = override?.teamSide || teamSide;
    const slot = override?.slotNumber || teamSlot;
    const autoName = buildAutoTeamName(roster, {
      isCustom: isCustomMatch(tournament),
      side,
      slot,
    });
    return {
      kind: 'team',
      teamName: String(override?.teamName || teamName || autoName).trim() || autoName,
      teamSide: side,
      slotNumber: slot,
      players: roster,
    };
  };

  const completeTeamJoin = async (payload) => {
    const join = payload || buildPendingJoin();
    if (!join.teamName) {
      showToast('Enter team name');
      return;
    }

    if (isPaymentEnabled() && Number(entryCharge.totalAmount) > 0) {
      startTournamentZapUpiPayment(navigation, {
        tournamentId,
        tournamentName: tournament?.name,
        amount: entryCharge.totalAmount,
        joinKind: 'team',
        teamName: join.teamName,
        teamSide: join.teamSide,
        slotNumber: join.slotNumber,
        players: join.players,
      });
      return;
    }

    const walletCheck = await fetchWalletForEntry(entryCharge.totalAmount);
    if (!walletCheck.sufficient) {
      showInsufficientBalance({
        tournamentId,
        returnScreen: 'CustomMatchTeamRegister',
        forTeam: true,
        requiredAmount: entryCharge.totalAmount,
        currentBalance: walletCheck.balance,
        remainingAmount: walletCheck.remaining,
        qrAmount: walletCheck.qrAmount,
        pendingJoin: join,
      });
      return;
    }

    try {
      await tournamentManagementService.registerTeam(tournamentId, {
        teamName: join.teamName,
        teamSide: isCustomMatch(tournament) ? join.teamSide : undefined,
        slotNumber: isCustomMatch(tournament) ? undefined : join.slotNumber,
        players: join.players,
      });
    } catch (e) {
      if (isAlreadyJoinedError(e)) {
        navigation.replace('TournamentDetails', { tournamentId, joinedSuccess: true });
        return;
      }
      throw e;
    }

    navigation.replace('TournamentDetails', { tournamentId, joinedSuccess: true });
  };

  useEffect(() => {
    if (!walletRecharged || !tournament || !pendingJoin || autoJoinRef.current) return;
    autoJoinRef.current = true;
    setTeamName(pendingJoin.teamName || '');
    setTeamSide(pendingJoin.teamSide || 'A');
    setTeamSlot(pendingJoin.slotNumber || 1);
    setPlayers(clonePlayers(pendingJoin.players || []));
    setTeamSubmitted(true);
    navigation.setParams({ walletRecharged: undefined, pendingJoin: undefined });
    (async () => {
      try {
        setSubmitting(true);
        await completeTeamJoin(pendingJoin);
      } catch (e) {
        autoJoinRef.current = false;
        showToast(e.message || 'Failed to register team');
      } finally {
        setSubmitting(false);
      }
    })();
  }, [walletRecharged, tournament, pendingJoin, navigation]);

  const takenSides = useMemo(() => {
    const sides = new Set();
    (tournament?.teams || []).forEach((t) => {
      if (t.side) sides.add(String(t.side).toUpperCase());
    });
    return sides;
  }, [tournament?.teams]);

  const takenSlots = useMemo(() => {
    const slots = new Set();
    (tournament?.teams || []).forEach((t) => {
      if (t.slotNumber) slots.add(Number(t.slotNumber));
    });
    return slots;
  }, [tournament?.teams]);

  const matchStructure = useMemo(() => getMatchStructure(tournament || {}), [tournament]);

  const openEntryModal = () => {
    const nextSide = takenSides.has(teamSide)
      ? ['A', 'B'].find((side) => !takenSides.has(side)) || teamSide
      : teamSide;
    let nextSlot = teamSlot;
    if (takenSlots.has(nextSlot)) {
      for (let i = 1; i <= matchStructure.totalSlots; i += 1) {
        if (!takenSlots.has(i)) {
          nextSlot = i;
          break;
        }
      }
    }
    setDraftTeamName('');
    setDraftTeamSide(nextSide);
    setDraftTeamSlot(nextSlot);
    setDraftPlayers(clonePlayers(players));
    setEntryVisible(true);
  };

  const updateDraftPlayer = (index, field, value) => {
    setDraftPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleModalSubmit = () => {
    if (isCustomMatch(tournament) && takenSides.has(draftTeamSide)) {
      showToast(`Team ${draftTeamSide} is already taken`);
      return;
    }
    if (!isCustomMatch(tournament) && takenSlots.has(draftTeamSlot)) {
      showToast(`Slot ${draftTeamSlot} is already booked`);
      return;
    }

    for (let i = 0; i < draftPlayers.length; i += 1) {
      const name = String(draftPlayers[i].name || '').trim();
      const uid = String(draftPlayers[i].gamingUID || '').trim();
      if (name.length < 3) {
        showToast(`Player ${i + 1}: enter Game Name (min 3 characters)`, 'warning');
        return;
      }
      if (uid.length < 3) {
        showToast(`Player ${i + 1}: enter Game UID (min 3 characters)`, 'warning');
        return;
      }
    }

    const roster = clonePlayers(draftPlayers).map((p) => ({
      name: p.name.trim(),
      gamingUID: p.gamingUID.trim(),
    }));
    const autoName = buildAutoTeamName(roster, {
      isCustom: isCustomMatch(tournament),
      side: draftTeamSide,
      slot: draftTeamSlot,
    });

    setTeamName(autoName);
    setTeamSide(draftTeamSide);
    setTeamSlot(draftTeamSlot);
    setPlayers(roster);
    setTeamSubmitted(true);
    setEntryVisible(false);
  };

  const handleJoinPress = () => {
    if (!teamSubmitted || !players.every(isPlayerComplete)) {
      openEntryModal();
      return;
    }
    setConfirmVisible(true);
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
    if (!getMatchStructure(tournament).usesTeamRegistration) {
      showToast('This tournament does not use team registration');
      return;
    }
    if (isCustomMatch(tournament) && takenSides.has(teamSide)) {
      showToast(`Team ${teamSide} is already taken`);
      return;
    }
    if (!isCustomMatch(tournament) && takenSlots.has(teamSlot)) {
      showToast(`Slot ${teamSlot} is already booked`);
      return;
    }

    for (let i = 0; i < players.length; i += 1) {
      const name = String(players[i].name || '').trim();
      const uid = String(players[i].gamingUID || '').trim();
      if (name.length < 3) {
        showToast(`Player ${i + 1}: enter Game Name (min 3 characters)`, 'warning');
        return;
      }
      if (uid.length < 3) {
        showToast(`Player ${i + 1}: enter Game UID (min 3 characters)`, 'warning');
        return;
      }
    }

    try {
      setSubmitting(true);
      setConfirmVisible(false);
      const join = buildPendingJoin();
      setTeamName(join.teamName);
      await completeTeamJoin(join);
    } catch (e) {
      showToast(e.message || 'Failed to register team');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ActivityIndicator size="large" color={PAGE.cyan} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const isCustom = isCustomMatch(tournament);
  const showSidePicker = isCustom;
  const filledCount = players.filter(isPlayerComplete).length;

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="Joining Match" onBack={() => navigation.goBack()} />
      <View style={styles.selectBanner}>
        <Text style={styles.selectBannerText}>
          {teamSubmitted ? 'Confirm Team' : 'Select Match Position'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.matchName}>{tournament?.name}</Text>
        <Text style={styles.meta}>
          {matchStructure.matchType} · {matchStructure.playerFormatLabel || matchStructure.modeLabel}
          {matchStructure.kind === 'battle_royale' ? '' : ` · ${matchStructure.formatLabel}`}
          {' · '}
          {playersPerTeam} player{playersPerTeam > 1 ? 's' : ''} per team
          {isCustom ? ' · Max 2 teams' : ` · ${matchStructure.totalSlots} slots`}
          {'\n'}₹{entryCharge.feePerPlayer}/player
          {entryCharge.playersCharged > 1
            ? ` × ${entryCharge.playersCharged} = ₹${entryCharge.totalAmount} total (captain pays)`
            : ' — captain pays'}
        </Text>

        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Mandatory Game Name & Game UID</Text>
          <Text style={styles.warnText}>
            Enter correct Free Fire Game Name and Game UID for every player. Wrong details can get the
            player removed from the match by the organizer.
          </Text>
        </View>

        {teamSubmitted ? (
          <>
            <View style={styles.teamSummary}>
              <View style={styles.teamSummaryTop}>
                <View style={styles.flex}>
                  <Text style={styles.summaryLabel}>Position</Text>
                  <Text style={styles.summaryValue}>
                    {showSidePicker ? `Team ${teamSide}` : `Slot ${teamSlot}`}
                  </Text>
                </View>
                {showSidePicker ? (
                  <View style={styles.sideBadge}>
                    <Text style={styles.sideBadgeText}>Team {teamSide}</Text>
                  </View>
                ) : (
                  <View style={styles.sideBadge}>
                    <Text style={styles.sideBadgeText}>Slot {teamSlot}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.rosterCount}>
                Players ({filledCount}/{playersPerTeam})
              </Text>
            </View>

            {players.map((player, index) => (
              <View key={`member-${index}`} style={styles.memberCard}>
                <View style={styles.memberHead}>
                  <Text style={styles.memberHeadText}>
                    Player {index + 1}
                    {index === 0 ? ' (Captain)' : ''}
                  </Text>
                </View>
                <View style={styles.memberBody}>
                  <View style={styles.memberRow}>
                    <Text style={styles.memberKey}>Game Name</Text>
                    <Text style={styles.memberVal} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </View>
                  <View style={styles.memberRow}>
                    <Text style={styles.memberKey}>Game UID</Text>
                    <Text style={styles.memberVal} numberOfLines={1}>
                      {player.gamingUID}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.editLink} onPress={openEntryModal}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={PAGE.cyan} />
              <Text style={styles.editLinkText}>Edit player details</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Player details required</Text>
            <Text style={styles.emptyText}>
              Add {isCustom ? 'team side' : 'slot'} and Game Name + Game UID for all {playersPerTeam}{' '}
              players before joining.
            </Text>
            <TouchableOpacity style={styles.enterBtn} onPress={openEntryModal}>
              <Text style={styles.enterBtnText}>Enter Player Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleJoinPress}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>{teamSubmitted ? 'Join Now' : 'Enter Details & Join'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={entryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEntryVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Player Entry</Text>
                <TouchableOpacity onPress={() => setEntryVisible(false)} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={22} color={PAGE.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {showSidePicker ? (
                  <>
                    <Text style={styles.label}>Team Side *</Text>
                    <View style={styles.sideRow}>
                      {['A', 'B'].map((side) => {
                        const taken = takenSides.has(side);
                        const selected = draftTeamSide === side;
                        return (
                          <TouchableOpacity
                            key={side}
                            disabled={taken}
                            style={[
                              styles.sideBtn,
                              selected && styles.sideBtnActive,
                              taken && styles.sideBtnTaken,
                            ]}
                            onPress={() => setDraftTeamSide(side)}
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

                {!isCustom ? (
                  <>
                    <Text style={styles.label}>Slot *</Text>
                    <View style={styles.slotWrap}>
                      {Array.from({ length: matchStructure.totalSlots }, (_, i) => i + 1).map((num) => {
                        const taken = takenSlots.has(num);
                        const selected = draftTeamSlot === num;
                        return (
                          <TouchableOpacity
                            key={num}
                            disabled={taken}
                            style={[
                              styles.slotChip,
                              selected && styles.sideBtnActive,
                              taken && styles.sideBtnTaken,
                            ]}
                            onPress={() => setDraftTeamSlot(num)}
                          >
                            <Text
                              style={[
                                styles.sideBtnText,
                                selected && styles.sideBtnTextActive,
                                taken && styles.sideBtnTextTaken,
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={styles.label}>
                  Players * ({playersPerTeam}/{playersPerTeam}) — Game Name + Game UID
                </Text>
                {draftPlayers.map((player, index) => (
                  <View key={`draft-player-${index}`} style={styles.playerCard}>
                    <View style={styles.detailsHead}>
                      <Text style={styles.detailsHeadText}>
                        Player {index + 1}
                        {index === 0 ? ' (Captain)' : ''}
                      </Text>
                    </View>
                    <View style={styles.playerBody}>
                      <Text style={styles.fieldLabel}>Game Name</Text>
                      <TextInput
                        style={styles.underlineInput}
                        value={player.name}
                        onChangeText={(text) => updateDraftPlayer(index, 'name', text)}
                        placeholder="Enter game name"
                        placeholderTextColor={PAGE.muted}
                        autoCapitalize="none"
                      />
                      <Text style={styles.fieldLabel}>Game UID</Text>
                      <TextInput
                        style={styles.underlineInput}
                        value={player.gamingUID}
                        onChangeText={(text) => updateDraftPlayer(index, 'gamingUID', text)}
                        placeholder="Enter game UID"
                        placeholderTextColor={PAGE.muted}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleModalSubmit}>
                <Text style={styles.modalSaveText}>Save Players</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CenterDialog
        visible={confirmVisible}
        onClose={submitting ? undefined : () => setConfirmVisible(false)}
        dismissOnOverlay={!submitting}
      >
        <Text style={styles.confirmTitle}>Are you sure?</Text>
        <Text style={styles.confirmText}>
          Confirm join
          {showSidePicker ? ` (Team ${teamSide})` : ` (Slot ${teamSlot})`}. Total entry ₹
          {entryCharge.totalAmount}
          {entryCharge.playersCharged > 1
            ? ` (₹${entryCharge.feePerPlayer} × ${entryCharge.playersCharged} players)`
            : ''}{' '}
          will be paid by the captain.
        </Text>
        {players.slice(0, 4).map((player, index) => (
          <View key={`confirm-${index}`} style={styles.confirmRow}>
            <Text style={styles.confirmPlayer}>P{index + 1}</Text>
            <Text style={styles.confirmName} numberOfLines={1}>
              {player.name}
            </Text>
            <Text style={styles.confirmUid} numberOfLines={1}>
              {player.gamingUID}
            </Text>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.confirmJoinBtn, submitting && styles.submitDisabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>Yes, Join</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmCancelBtn}
          onPress={() => setConfirmVisible(false)}
          disabled={submitting}
        >
          <Text style={styles.confirmCancelText}>Cancel</Text>
        </TouchableOpacity>
      </CenterDialog>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  emptyCard: {
    backgroundColor: PAGE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16, marginBottom: 8 },
  emptyText: {
    color: PAGE.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  enterBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  enterBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 14 },
  teamSummary: {
    backgroundColor: PAGE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
    padding: 14,
    marginBottom: 12,
  },
  teamSummaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  summaryLabel: { color: PAGE.muted, fontSize: 12, marginBottom: 4 },
  summaryValue: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  sideBadge: {
    backgroundColor: 'rgba(79,209,197,0.14)',
    borderWidth: 1,
    borderColor: PAGE.cyan,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sideBadgeText: { color: PAGE.cyan, fontFamily: FONTS.bold, fontSize: 12 },
  rosterCount: { color: PAGE.muted, fontSize: 12, fontFamily: FONTS.bold },
  memberCard: {
    backgroundColor: PAGE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  memberHead: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  memberHeadText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  memberBody: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  memberKey: { color: PAGE.muted, fontSize: 12, fontFamily: FONTS.bold },
  memberVal: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13, flex: 1, textAlign: 'right' },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  editLinkText: { color: PAGE.cyan, fontFamily: FONTS.bold, fontSize: 13 },
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
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  slotChip: {
    width: 44,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PAGE.border,
    backgroundColor: PAGE.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  modalRoot: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 16, 0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: PAGE.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    maxHeight: '92%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  modalScroll: { paddingBottom: 16 },
  modalSaveBtn: {
    backgroundColor: '#2DD4BF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 15 },
  confirmTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmText: {
    color: PAGE.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: PAGE.border,
  },
  confirmPlayer: { color: PAGE.cyan, fontFamily: FONTS.bold, width: 24, fontSize: 12 },
  confirmName: { flex: 1, color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13 },
  confirmUid: { color: PAGE.muted, fontSize: 12, maxWidth: 110, textAlign: 'right' },
  confirmJoinBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmCancelBtn: { alignItems: 'center', paddingVertical: 12 },
  confirmCancelText: { color: PAGE.muted, fontFamily: FONTS.bold, fontSize: 14 },
});
