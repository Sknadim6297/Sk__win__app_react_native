import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ImageBackground,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import {
  formatScheduleLine,
  isCustomMatch,
  getMatchStructure,
  resolveEntryCharge,
  resolveDisplayPrizePool,
  resolvePrizePlaces,
  resolveMatchRules,
  getPlayerFormatLabel,
} from '../utils/tournamentHelpers';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';
import { CoinValue, TimeLeftBar, InfoCell } from '../components/contest/ContestShared';

const DEFAULT_BANNER = require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

async function copyToClipboard(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

function CredentialRow({ label, value, onCopy }) {
  if (!value) return null;
  return (
    <View style={styles.credRow}>
      <View style={styles.credCopy}>
        <Text style={styles.credLabel}>{label}</Text>
        <Text style={styles.credValue} selectable>
          {value}
        </Text>
      </View>
      <TouchableOpacity style={styles.copyBtn} onPress={onCopy} activeOpacity={0.85}>
        <Ionicons name="copy-outline" size={16} color={COLORS.white} />
        <Text style={styles.copyBtnText}>Copy</Text>
      </TouchableOpacity>
    </View>
  );
}

function PlayerJoinRow({ gameName, gameId, slotLabel }) {
  return (
    <View style={styles.joiningRow}>
      {slotLabel ? <Text style={styles.joiningSlot}>{slotLabel}</Text> : null}
      <View style={styles.joiningInfo}>
        <Text style={styles.joiningName} numberOfLines={1}>
          {gameName || '—'}
        </Text>
        <Text style={styles.joiningMeta} numberOfLines={1}>
          Game UID: {gameId || '—'}
        </Text>
      </View>
    </View>
  );
}

export default function TournamentDetailsScreen({ navigation, route }) {
  const { tournamentId, walletRecharged, joinedSuccess } = route.params || {};
  const { user, isAdmin } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showJoinings, setShowJoinings] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });
  const { showInsufficientBalance, InsufficientBalanceDialog } = useInsufficientBalance(navigation);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!tournamentId) {
        setError('Tournament ID not provided');
        return;
      }
      const data = await tournamentService.getDetails(tournamentId);
      setTournament(data);
      setHasJoined(!!data.userJoined);
    } catch (e) {
      setError(e.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails])
  );

  useEffect(() => {
    if (walletRecharged) {
      showToast('Coins added successfully! You can join now.', 'success');
      navigation.setParams({ walletRecharged: undefined });
    }
  }, [walletRecharged, navigation]);

  useEffect(() => {
    if (joinedSuccess) {
      showToast('Joined Successfully ✅', 'success');
      navigation.setParams({ joinedSuccess: undefined });
      loadDetails();
    }
  }, [joinedSuccess, navigation, loadDetails]);

  const handleCopy = async (value, label) => {
    const ok = await copyToClipboard(value);
    showToast(ok ? `${label} copied` : `Could not copy ${label}`, ok ? 'success' : 'error');
  };

  const handleJoinNow = async () => {
    const status = tournament?.lifecycleStatus || tournament?.status;
    if (status === 'completed' || status === 'result_published') {
      navigation.navigate('TournamentResults', { tournamentId });
      return;
    }
    if (!user) {
      showToast('Please login to join', 'error');
      return;
    }
    if (isAdmin?.()) {
      showToast('Admins cannot join tournaments', 'error');
      return;
    }
    if (hasJoined) {
      showToast('You have already joined this tournament', 'info');
      return;
    }
    try {
      setJoining(true);
      const eligibility = await tournamentService.canJoin(tournamentId);
      const structure = getMatchStructure(tournament);
      const isTeamFlow = structure.usesTeamRegistration;

      if (!eligibility?.canJoin && eligibility?.code !== 'INSUFFICIENT_BALANCE') {
        const isInsufficient =
          eligibility?.code === 'INSUFFICIENT_BALANCE' ||
          /insufficient|balance/i.test(String(eligibility?.reason || ''));
        if (!isInsufficient) {
          showToast(eligibility?.reason || 'This tournament is not open for joining', 'warning');
          return;
        }
      }

      const isInsufficient =
        eligibility?.code === 'INSUFFICIENT_BALANCE' ||
        /insufficient|balance/i.test(String(eligibility?.reason || ''));

      if (!eligibility?.canJoin && isInsufficient) {
        showInsufficientBalance({
          tournamentId,
          returnScreen: isTeamFlow ? 'CustomMatchTeamRegister' : 'TournamentSlotBooking',
          forTeam: isTeamFlow,
          requiredAmount:
            eligibility?.totalAmount ??
            eligibility?.realMoneyRequired ??
            tournament?.totalAmount ??
            tournament?.entryCharge?.totalAmount ??
            resolveEntryCharge(tournament).totalAmount,
          currentBalance: eligibility?.balance,
        });
        return;
      }

      if (isTeamFlow) {
        navigation.navigate('CustomMatchTeamRegister', {
          tournamentId,
          tournament,
          entryCharge: {
            feePerPlayer: eligibility?.feePerPlayer ?? tournament?.feePerPlayer,
            playersCharged: eligibility?.playersCharged ?? tournament?.playersCharged,
            totalAmount: eligibility?.totalAmount ?? tournament?.totalAmount,
          },
        });
        return;
      }

      navigation.navigate('TournamentSlotBooking', {
        tournamentId,
        tournament,
        entryCharge: {
          feePerPlayer: eligibility?.feePerPlayer ?? tournament?.feePerPlayer,
          playersCharged: eligibility?.playersCharged ?? tournament?.playersCharged,
          totalAmount: eligibility?.totalAmount ?? tournament?.totalAmount,
        },
      });
    } catch (e) {
      const msg = e.message || 'Could not verify wallet';
      if (/insufficient|balance/i.test(msg)) {
        const isTeamFlow = getMatchStructure(tournament).usesTeamRegistration;
        showInsufficientBalance({
          tournamentId,
          returnScreen: isTeamFlow ? 'CustomMatchTeamRegister' : 'TournamentSlotBooking',
          forTeam: isTeamFlow,
          requiredAmount:
            tournament?.totalAmount ??
            tournament?.entryCharge?.totalAmount ??
            resolveEntryCharge(tournament).totalAmount,
        });
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ActivityIndicator size="large" color={PAGE.cyan} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (error || !tournament) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ScreenHeader title="Contest Details" onBack={() => navigation.goBack()} />
        <Text style={styles.errorText}>{error || 'Tournament not found'}</Text>
      </SafeAreaView>
    );
  }

  const bannerUri =
    (tournament.bannerImage && resolveMediaUrl(tournament.bannerImage)) ||
    (tournament.gameMode?.image && resolveMediaUrl(tournament.gameMode.image)) ||
    (tournament.game?.image && resolveMediaUrl(tournament.game.image)) ||
    null;

  const rules = resolveMatchRules(tournament);
  const custom = isCustomMatch(tournament);
  const structure = getMatchStructure(tournament);
  const teamEntry = structure.usesTeamRegistration;
  const maxP = tournament.totalSlots || structure.totalSlots;
  const joined = tournament.participantCount || 0;
  const matchNo = tournament.matchNumber || 10000;
  const totalPrize = resolveDisplayPrizePool(tournament);
  const places = resolvePrizePlaces(tournament);
  const lifecycleStatus = tournament.lifecycleStatus || tournament.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const canViewResults = lifecycleStatus === 'completed' || lifecycleStatus === 'result_published';
  const resultsPublished =
    Boolean(tournament.resultsPublished) || lifecycleStatus === 'result_published';
  const joinDisabled = canViewResults ? false : hasJoined || joining || !isJoinOpen;
  const joinButtonLabel = canViewResults
    ? resultsPublished
      ? 'View Result'
      : 'Result Pending'
    : hasJoined
      ? 'Joined'
      : isJoinOpen
        ? 'Join Match'
        : lifecycleStatus === 'ongoing' || lifecycleStatus === 'live'
          ? 'Ongoing'
          : String(lifecycleStatus || 'Closed');

  const teams = tournament.teams || [];
  const players = tournament.participants || [];
  const showRoom =
    Boolean(hasJoined) &&
    Boolean(tournament.roomCredentialsVisible) &&
    Boolean(String(tournament.roomId || '').trim() || String(tournament.roomPassword || '').trim());
  const matchTypeName = String(
    tournament.matchTypeName ||
      (tournament.matchType && typeof tournament.matchType === 'object' && tournament.matchType.name) ||
      (typeof tournament.matchType === 'string' && !/^[a-f0-9]{24}$/i.test(tournament.matchType)
        ? tournament.matchType
        : null) ||
      structure.matchTypeName ||
      structure.matchType ||
      '—'
  );
  const playerFormatLabel =
    tournament.playerFormatLabel ||
    structure.playerFormatLabel ||
    getPlayerFormatLabel(tournament);
  const gameNameRaw = tournament.gameName || tournament.game?.name || '';
  const gameName =
    gameNameRaw && String(gameNameRaw) !== 'undefined' ? String(gameNameRaw) : '';
  const mapName = String(tournament.mapName || tournament.map || '—');
  const entryFee = Number(
    tournament.entryFeePerPlayer ?? tournament.feePerPlayer ?? tournament.entryFee ?? 0
  );
  const backendTotal = Number(
    tournament.totalAmount ?? tournament.entryCharge?.totalAmount ?? NaN
  );
  const entryCharge = Number.isFinite(backendTotal)
    ? {
        feePerPlayer: entryFee,
        playersCharged: Number(tournament.playersCharged ?? tournament.entryCharge?.playersCharged) || 1,
        totalAmount: backendTotal,
      }
    : resolveEntryCharge(tournament);
  const showPrizePool =
    tournament.showPrizePool != null
      ? Boolean(tournament.showPrizePool)
      : Number(totalPrize) > 0;
  const showPerKill =
    tournament.showPrizePerKill != null
      ? Boolean(tournament.showPrizePerKill)
      : !custom && structure.hasKillRewards && Number(tournament.perKill || tournament.prizePerKill) > 0;
  const prizePerKill = Number(tournament.prizePerKill ?? tournament.perKill ?? 0);
  const scheduleLabel = formatScheduleLine(tournament.startDate);

  // Third cell on row 2: prefer Prize Per Kill, then Prize Pool, then Team Total
  const secondaryStat = showPerKill
    ? { label: 'Prize / kill', value: prizePerKill, coin: true }
    : showPrizePool
      ? { label: 'Prize pool', value: totalPrize, coin: true }
      : entryCharge.playersCharged > 1
        ? { label: 'Team total', value: entryCharge.totalAmount, coin: true }
        : null;

  const extraStats = [];
  if (showPerKill && showPrizePool) {
    extraStats.push({ label: 'Prize pool', value: totalPrize, coin: true });
  }
  if (entryCharge.playersCharged > 1 && (showPerKill || showPrizePool)) {
    extraStats.push({ label: 'Team total', value: entryCharge.totalAmount, coin: true });
  }

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title={`Contest #${matchNo}`} onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + insets.bottom }}
      >
        <ImageBackground
          source={bannerUri ? { uri: bannerUri } : DEFAULT_BANNER}
          style={styles.banner}
          imageStyle={styles.bannerImg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(11,14,30,0.05)', 'rgba(11,14,30,0.7)']}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <TimeLeftBar startDate={tournament.startDate} />
        <Text style={styles.scheduleUnderTimer}>
          Date & time: {String(formatScheduleLine(tournament.startDate) || '')}
        </Text>

        <Text style={styles.matchTitle}>
          {String(tournament.name || 'Tournament')} - ID#{matchNo}
        </Text>

        <View style={styles.metaBlock}>
          <View style={styles.grid3}>
            {gameName ? <InfoCell label="Game" value={gameName} flex={1} inline /> : null}
            <InfoCell label="Match type" value={matchTypeName} flex={1} inline />
            <InfoCell label="Map" value={mapName} flex={1} inline />
          </View>
          <View style={styles.grid3}>
            <InfoCell label="Player format" value={playerFormatLabel} flex={1} inline />
            <InfoCell label="Entry / player" value={entryFee} coin flex={1} inline />
            {secondaryStat ? (
              <InfoCell
                label={secondaryStat.label}
                value={secondaryStat.value}
                coin={Boolean(secondaryStat.coin)}
                flex={1}
                inline
              />
            ) : null}
          </View>
          {extraStats.length ? (
            <View style={styles.grid3}>
              {extraStats.map((stat) => (
                <InfoCell
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  coin={Boolean(stat.coin)}
                  flex={1}
                  inline
                />
              ))}
            </View>
          ) : null}
          <InfoCell label="Match schedule" value={scheduleLabel} inline />
        </View>

        <Text style={styles.sectionHead}>Prize details</Text>
        <View style={styles.prizeCard}>
          {showPrizePool ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>Prize pool</Text>
              <CoinValue value={totalPrize} color={PAGE.gold} />
            </View>
          ) : null}
          {showPerKill ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>Prize per kill</Text>
              <CoinValue value={prizePerKill} color={PAGE.gold} />
            </View>
          ) : null}
          {places.first > 0 ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>{custom ? 'Winner' : '1st place'}</Text>
              <CoinValue value={places.first} color={PAGE.gold} />
            </View>
          ) : null}
          {places.second > 0 ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>2nd place</Text>
              <CoinValue value={places.second} color={PAGE.gold} />
            </View>
          ) : null}
          {places.third > 0 ? (
            <View style={[styles.prizeLine, styles.prizeLineLast]}>
              <Text style={styles.prizeLabel}>3rd place</Text>
              <CoinValue value={places.third} color={PAGE.gold} />
            </View>
          ) : null}
          {!showPrizePool && !showPerKill && !places.first && !places.second && !places.third ? (
            <View style={[styles.prizeLine, styles.prizeLineLast]}>
              <Text style={styles.prizeLabel}>No prize details yet</Text>
            </View>
          ) : null}
        </View>

        {showRoom ? (
          <View style={styles.roomBox}>
            <Text style={styles.roomTitle}>Match ID & password</Text>
            <Text style={styles.roomHint}>
              Only visible because you joined this match. Copy into Free Fire before start.
            </Text>
            <CredentialRow
              label="Match ID"
              value={tournament.roomId}
              onCopy={() => handleCopy(tournament.roomId, 'Match ID')}
            />
            <CredentialRow
              label="Password"
              value={tournament.roomPassword}
              onCopy={() => handleCopy(tournament.roomPassword, 'Password')}
            />
          </View>
        ) : null}

        {hasJoined && !showRoom ? (
          <View style={styles.roomWaitBox}>
            <Text style={styles.roomWaitText}>
              {tournament.roomCredentialsMessage ||
                'Please wait. Match ID and password will be available 2 minutes before the match starts.'}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionHead}>About this match</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.rulesCardTitle}>Rules and regulations</Text>
          <View style={styles.rulesTitleRule} />
          {rules.map((rule, idx) => (
            <Text key={`rule-${idx}`} style={styles.ruleLine}>
              • {String(rule || '')}
            </Text>
          ))}
        </View>

        {showJoinings ? (
          <View style={styles.joiningsBox}>
            <Text style={styles.sectionHead}>
              Players ({joined}/{maxP})
            </Text>
            {teamEntry ? (
              teams.length ? (
                teams.flatMap((team) =>
                  (team.players || []).map((p, i) => (
                    <PlayerJoinRow
                      key={`${team._id || team.side || team.slotNumber}-${i}`}
                      slotLabel={
                        custom
                          ? `T${team.side || ''}`
                          : team.slotNumber
                            ? `S${team.slotNumber}`
                            : null
                      }
                      gameName={p.name || p.gamingUsername}
                      gameId={p.gamingUID || p.uid || p.gameUID}
                    />
                  ))
                )
              ) : (
                <Text style={styles.emptyJoinings}>No players joined yet.</Text>
              )
            ) : players.length ? (
              players.map((p, i) => (
                <PlayerJoinRow
                  key={`${p.slotNumber}-${i}`}
                  slotLabel={p.slotNumber ? `S${p.slotNumber}` : null}
                  gameName={p.gamingUsername || p.username}
                  gameId={p.gamingUID}
                />
              ))
            ) : (
              <Text style={styles.emptyJoinings}>No players joined yet.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.viewJoiningsBtn}
          onPress={() => setShowJoinings((v) => !v)}
          activeOpacity={0.88}
        >
          <Text style={styles.viewJoiningsText}>
            {showJoinings ? 'Hide players' : 'View players'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.joinMatchBtn, joinDisabled && styles.joinMatchDisabled]}
          onPress={handleJoinNow}
          disabled={joinDisabled}
          activeOpacity={0.88}
        >
          {joining ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.joinMatchText}>{String(joinButtonLabel || '')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  bannerImg: { borderRadius: 16 },
  matchTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: PAGE.cyan,
    lineHeight: 24,
    marginBottom: 12,
  },
  scheduleUnderTimer: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: PAGE.muted,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
  },
  metaBlock: {
    gap: 8,
  },
  grid3: { flexDirection: 'row', gap: 8 },
  grid2: { flexDirection: 'row', gap: 8 },
  sectionHead: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PAGE.cyan,
    marginTop: 18,
    marginBottom: 10,
  },
  prizeCard: {
    backgroundColor: PAGE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  prizeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PAGE.border,
  },
  prizeLineLast: { borderBottomWidth: 0 },
  prizeLabel: { ...TEXT.body, color: PAGE.muted },
  aboutCard: {
    backgroundColor: PAGE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    padding: 14,
  },
  rulesCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  rulesTitleRule: {
    height: 2,
    backgroundColor: PAGE.border,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 1,
  },
  ruleLine: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 22,
    marginBottom: 4,
  },
  roomBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: PAGE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    gap: 10,
  },
  roomTitle: { color: PAGE.cyan, fontFamily: FONTS.bold, fontSize: 15 },
  roomHint: { color: PAGE.muted, fontSize: 12, lineHeight: 17, marginTop: -4 },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PAGE.cardAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  credCopy: { flex: 1, minWidth: 0 },
  credLabel: { color: PAGE.muted, fontSize: 11, fontFamily: FONTS.bold, marginBottom: 2 },
  credValue: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.bold },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PAGE.purple,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 12 },
  roomWaitBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  roomWaitText: { color: PAGE.gold, fontSize: 13, lineHeight: 19 },
  joiningsBox: { marginTop: 4 },
  joiningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PAGE.cardAlt,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  joiningSlot: { color: PAGE.cyan, fontFamily: FONTS.bold, minWidth: 28 },
  joiningInfo: { flex: 1, minWidth: 0 },
  joiningName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 14 },
  joiningMeta: { color: PAGE.muted, fontSize: 12, marginTop: 2 },
  emptyJoinings: { color: PAGE.muted, textAlign: 'center', paddingVertical: 16 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: PAGE.bg,
    borderTopWidth: 1,
    borderTopColor: PAGE.border,
  },
  viewJoiningsBtn: {
    backgroundColor: PAGE.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewJoiningsText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#1A1203',
    letterSpacing: 0.4,
  },
  joinMatchBtn: {
    backgroundColor: PAGE.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  joinMatchDisabled: { opacity: 0.55 },
  joinMatchText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
});
