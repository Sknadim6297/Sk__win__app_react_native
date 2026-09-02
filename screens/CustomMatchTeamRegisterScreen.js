import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService, tournamentManagementService, walletService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import { isCustomMatch, getMatchStructure } from '../utils/tournamentHelpers';
import { fetchWalletForEntry, startTournamentZapUpiPayment } from '../utils/walletFlow';
import { isPaymentEnabled } from '../utils/paymentConfig';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { CoinValue } from '../components/contest/ContestShared';

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
function buildAutoTeamName(players, { usesTeamSides, side, slot }) {
  const captain = String(players?.[0]?.name || '').trim() || 'Player';
  const tag = usesTeamSides ? `Team ${side || 'A'}` : `Slot ${slot || 1}`;
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
  const [balance, setBalance] = useState(0);
  const [step, setStep] = useState('confirm');
  const [editingIndex, setEditingIndex] = useState(0);
  const [draftName, setDraftName] = useState('');
  const [draftUID, setDraftUID] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const autoJoinRef = useRef(false);

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });
  const { showInsufficientBalance, InsufficientBalanceDialog } = useInsufficientBalance(navigation);

  const playersPerTeam = useMemo(() => {
    return Math.max(1, Number(getMatchStructure(tournament || {}).playersPerTeam) || 1);
  }, [tournament]);

  const entryCharge = useMemo(() => {
    const fromRoute = route.params?.entryCharge;
    const structure = getMatchStructure(tournament || {});
    const fee =
      Number(
        tournament?.entryFeePerPlayer ??
          tournament?.feePerPlayer ??
          fromRoute?.feePerPlayer ??
          tournament?.entryFee
      ) || 0;
    const charged = Math.max(
      1,
      Number(fromRoute?.playersCharged) ||
        Number(tournament?.playersCharged) ||
        structure.playersPerTeam ||
        1
    );
    // Always align charge count with Player Format when backend total missing
    const ppt = structure.playersPerTeam || charged;
    const expectedTotal = fee * ppt;
    const backendTotal = Number(
      tournament?.totalAmount ?? fromRoute?.totalAmount ?? tournament?.entryCharge?.totalAmount
    );
    const total =
      Number.isFinite(backendTotal) && backendTotal === expectedTotal
        ? backendTotal
        : expectedTotal;
    return {
      feePerPlayer: fee,
      playersCharged: ppt,
      totalAmount: total,
      matchTypeName: tournament?.matchTypeName || tournament?.matchType,
    };
  }, [tournament, route.params?.entryCharge]);

  const loadTournament = useCallback(async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [data, wData] = await Promise.all([
        tournamentService.getDetails(tournamentId),
        walletService.getBalance().catch(() => null),
      ]);
      setTournament(data);
      setBalance(wData?.balance ?? 0);
      const count = Math.max(1, Number(getMatchStructure(data).playersPerTeam) || 1);
      setPlayers(Array.from({ length: count }, () => emptyPlayer()));
    } catch (e) {
      showToast(e.message || 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  const { refreshControl } = usePullToRefresh(loadTournament);

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
    const structure = getMatchStructure(tournament || {});
    const usesTeamSides = Boolean(structure.usesTeamSides);
    const autoName = buildAutoTeamName(roster, {
      usesTeamSides,
      side,
      slot,
    });
    return {
      kind: 'team',
      teamName: String(override?.teamName || teamName || autoName).trim() || autoName,
      teamSide: usesTeamSides ? side : undefined,
      slotNumber: usesTeamSides ? undefined : slot,
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
      const structure = getMatchStructure(tournament || {});
      const usesTeamSides = Boolean(structure.usesTeamSides);
      startTournamentZapUpiPayment(navigation, {
        tournamentId,
        tournamentName: tournament?.name,
        amount: entryCharge.totalAmount,
        joinKind: 'team',
        teamName: join.teamName,
        teamSide: usesTeamSides ? join.teamSide : undefined,
        slotNumber: usesTeamSides ? undefined : join.slotNumber,
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
      const structure = getMatchStructure(tournament);
      await tournamentManagementService.registerTeam(tournamentId, {
        teamName: join.teamName,
        teamSide: structure.usesTeamSides ? join.teamSide : undefined,
        slotNumber: structure.usesTeamSides ? undefined : join.slotNumber,
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
    setStep('confirm');
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

  const openPlayerDetails = (index) => {
    const p = players[index] || emptyPlayer();
    setEditingIndex(index);
    setDraftName(p.name || '');
    setDraftUID(p.gamingUID || '');
    setStep('details');
  };

  const savePlayerDetails = () => {
    if (draftName.trim().length < 3) {
      showToast('Game Name must be at least 3 characters', 'warning');
      return;
    }
    if (draftUID.trim().length < 3) {
      showToast('Game UID must be at least 3 characters', 'warning');
      return;
    }
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === editingIndex ? { name: draftName.trim(), gamingUID: draftUID.trim() } : p
      )
    );
    setStep('confirm');
  };

  const handleJoinPress = async () => {
    if (user && isAdmin?.()) {
      showToast('Admins cannot register as participants');
      return;
    }
    if (!getMatchStructure(tournament).usesTeamRegistration) {
      showToast('This tournament does not use team registration');
      return;
    }
    const joinStructure = getMatchStructure(tournament);
    if (joinStructure.usesTeamSides && takenSides.has(teamSide)) {
      showToast(`Team ${teamSide} is already taken`);
      return;
    }

    for (let i = 0; i < players.length; i += 1) {
      if (!isPlayerComplete(players[i])) {
        openPlayerDetails(i);
        showToast(`Enter Game Name & UID for all ${playersPerTeam} players`, 'warning');
        return;
      }
    }

    const roster = players.map((p) => ({
      name: String(p.name || '').trim(),
      gamingUID: String(p.gamingUID || '').trim(),
    }));
    const autoName = buildAutoTeamName(roster, {
      usesTeamSides: joinStructure.usesTeamSides,
      side: teamSide,
      slot: teamSlot,
    });
    setTeamName(autoName);

    try {
      setSubmitting(true);
      await completeTeamJoin(
        buildPendingJoin({
          teamName: autoName,
          teamSide,
          slotNumber: teamSlot,
          players: roster,
        })
      );
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
  const structure = getMatchStructure(tournament);
  const showTeamSides = Boolean(structure.usesTeamSides);
  const allReady = players.length === playersPerTeam && players.every(isPlayerComplete);

  const BalanceBlock = () => (
    <View style={styles.balanceBlock}>
      <MaterialCommunityIcons name="wallet" size={52} color={PAGE.gold} />
      <View style={styles.balanceCopy}>
        <View style={styles.balanceLine}>
          <Text style={styles.balanceLabel}>YOUR CURRENT BALANCE : </Text>
          <CoinValue value={balance} size={16} color={PAGE.gold} />
        </View>
        <View style={styles.balanceLine}>
          <Text style={styles.balanceLabel}>ENTRY FEE / PLAYER : </Text>
          <CoinValue value={entryCharge.feePerPlayer} size={16} color={PAGE.gold} />
        </View>
        <View style={styles.balanceLine}>
          <Text style={styles.balanceLabel}>TOTAL PAYABLE AMOUNT : </Text>
          <CoinValue value={entryCharge.totalAmount} size={16} color={PAGE.gold} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader
        title="JOINING MATCH"
        onBack={() => {
          if (step === 'details') setStep('confirm');
          else navigation.goBack();
        }}
      />

      {step === 'confirm' && (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.confirmScroll}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            <BalanceBlock />

            {showTeamSides ? (
              <View style={styles.sidePickRow}>
                      {['A', 'B'].map((side) => {
                        const taken = takenSides.has(side);
                  const selected = teamSide === side;
                        return (
                          <TouchableOpacity
                            key={side}
                            disabled={taken}
                            style={[
                        styles.sidePickBtn,
                        selected && styles.sidePickBtnActive,
                        taken && styles.sidePickBtnTaken,
                      ]}
                      onPress={() => setTeamSide(side)}
                          >
                            <Text
                              style={[
                          styles.sidePickText,
                          selected && styles.sidePickTextActive,
                          taken && styles.sidePickTextTaken,
                        ]}
                      >
                        {taken ? `TEAM ${side} FULL` : `TEAM ${side}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                ) : null}

            <View style={styles.positionCard}>
              <Text style={styles.positionTitle}>SELECTED POSITION</Text>
              <View style={styles.posHeadRow}>
                <Text style={[styles.posColSlot, styles.posHead]}>SLOT</Text>
                <Text style={[styles.posColName, styles.posHead]}>GAME NAME</Text>
                <Text style={[styles.posColId, styles.posHead]}>GAME ID</Text>
              </View>
              {players.map((player, index) => {
                const complete = isPlayerComplete(player);
                return (
                  <TouchableOpacity
                    key={`p-${index}`}
                    style={styles.posDataRow}
                    activeOpacity={0.85}
                    onPress={() => openPlayerDetails(index)}
                  >
                    <Text style={styles.posColSlot}>
                      {showTeamSides ? `TEAM ${teamSide} P${index + 1}` : `P${index + 1}`}
                    </Text>
                    {complete ? (
                      <>
                        <Text style={styles.posColName} numberOfLines={1}>
                          {String(player.name).toUpperCase()}
                        </Text>
                        <Text style={styles.posColId} numberOfLines={1}>
                          {String(player.gamingUID).toUpperCase()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.posColName}>
                          <View style={styles.addInfoBtn}>
                            <Text style={styles.addInfoText}>ADD INFO</Text>
                          </View>
                        </View>
                        <Text style={[styles.posColId, styles.posEmpty]}>—</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.note}>
              NOTE – PLEASE ENTER GAME NAME & UID FOR ALL {playersPerTeam}{' '}
              {playersPerTeam === 1 ? 'PLAYER' : 'PLAYERS'}
                </Text>
          </ScrollView>

          <View style={[styles.pairFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.pairBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={
                allReady
                  ? handleJoinPress
                  : () => {
                      const missing = players.findIndex((p) => !isPlayerComplete(p));
                      openPlayerDetails(missing >= 0 ? missing : 0);
                    }
              }
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.pairBtnText}>JOIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'details' && (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.confirmScroll}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            <BalanceBlock />
            <View style={styles.detailsCard}>
                    <View style={styles.detailsHead}>
                      <Text style={styles.detailsHeadText}>
                  PLAYER {editingIndex + 1}
                  {editingIndex === 0 ? ' (CAPTAIN)' : ''} · GAME DETAILS
                      </Text>
                    </View>
              <View style={styles.detailsBody}>
                <Text style={styles.fieldLabel}>GAME NAME</Text>
                      <TextInput
                        style={styles.underlineInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter game name"
                        placeholderTextColor={PAGE.muted}
                        autoCapitalize="none"
                      />
                <Text style={styles.fieldLabel}>GAME UID</Text>
                      <TextInput
                        style={styles.underlineInput}
                  value={draftUID}
                  onChangeText={setDraftUID}
                  placeholder="Enter game UID"
                        placeholderTextColor={PAGE.muted}
                        autoCapitalize="none"
                      />
                <Text style={styles.helper}>
                  MAKE SURE YOU ENTERED CORRECT GAME NAME & GAME UID
                </Text>
                <View style={styles.pairInline}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('confirm')}>
                    <Text style={styles.pairBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={savePlayerDetails}>
                    <Text style={styles.pairBtnText}>SAVE</Text>
                  </TouchableOpacity>
                    </View>
                  </View>
            </View>
          </ScrollView>
          </View>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  confirmScroll: { padding: 16, paddingBottom: 24 },
  balanceBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  balanceCopy: { flex: 1, gap: 4 },
  balanceLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  balanceLabel: { color: PAGE.muted, fontFamily: FONTS.bold, fontSize: 12 },
  sidePickRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sidePickBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PAGE.border,
    backgroundColor: PAGE.card,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sidePickBtnActive: { borderColor: PAGE.cyan, backgroundColor: 'rgba(79,209,197,0.14)' },
  sidePickBtnTaken: { opacity: 0.45 },
  sidePickText: { color: PAGE.muted, fontFamily: FONTS.bold, fontSize: 13 },
  sidePickTextActive: { color: PAGE.cyan },
  sidePickTextTaken: { color: PAGE.muted },
  positionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  positionTitle: {
    color: '#2563EB',
    fontFamily: FONTS.bold,
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  posHeadRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 4,
  },
  posDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  posColSlot: { flex: 1.1, color: '#111827', fontFamily: FONTS.bold, fontSize: 11 },
  posColName: { flex: 1.2, color: '#111827', fontFamily: FONTS.bold, fontSize: 11 },
  posColId: { flex: 1, color: '#111827', fontFamily: FONTS.bold, fontSize: 11 },
  posEmpty: { color: '#9CA3AF' },
  posHead: { color: '#6B7280', fontSize: 10 },
  addInfoBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addInfoText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 11 },
  note: {
    color: PAGE.muted,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  pairFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PAGE.border,
  },
  pairInline: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: PAGE.cyan,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pairBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 14 },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailsHead: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  detailsHeadText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13 },
  detailsBody: { padding: 14 },
  fieldLabel: {
    color: '#6B7280',
    fontFamily: FONTS.bold,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    color: '#111827',
    fontFamily: FONTS.bold,
    fontSize: 15,
    paddingVertical: 8,
  },
  helper: { color: '#6B7280', fontSize: 11, marginTop: 12, lineHeight: 16 },
});
