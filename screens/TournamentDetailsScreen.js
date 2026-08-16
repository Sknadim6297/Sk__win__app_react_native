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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/ui/AppIcon';
import BrandCoin from '../components/ui/BrandCoin';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { tournamentService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import {
  parseRules,
  formatScheduleLine,
  formatModeLabel,
  isCustomMatch,
  isTeamEntryMode,
  getTeamSize,
  resolveDisplayPrizePool,
  resolvePrizePlaces,
} from '../utils/tournamentHelpers';
import { fetchWalletForEntry } from '../utils/walletFlow';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';
import { isPaymentEnabled } from '../utils/paymentConfig';

const CYAN = '#00E5FF';
const { width: SCREEN_W } = Dimensions.get('window');

const BR_TABS = ['RULES', 'PLAYERS', 'PRIZE POOL'];
const CUSTOM_TABS = ['RULES', 'TEAMS', 'PRIZE POOL'];

function CoinValue({ value, size = 18 }) {
  return (
    <View style={styles.coinRow}>
      <BrandCoin size={size} />
      <Text style={styles.coinText}>{value ?? 0}</Text>
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
  const [activeTab, setActiveTab] = useState('RULES');
  const [joining, setJoining] = useState(false);
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
      const isTeamFlow =
        isCustomMatch(tournament) ||
        eligibility?.isCustomMatch ||
        eligibility?.usesTeamRegistration ||
        isTeamEntryMode(tournament.mode);

      // Cashfree Sandbox Pay & Join (when payment gateway enabled)
      if (isPaymentEnabled() && !isTeamFlow) {
        if (!eligibility?.canJoin && eligibility?.code !== 'INSUFFICIENT_BALANCE') {
          const isInsufficient =
            eligibility?.code === 'INSUFFICIENT_BALANCE' ||
            /insufficient|balance/i.test(String(eligibility?.reason || ''));
          if (!isInsufficient) {
            showToast(eligibility?.reason || 'This tournament is not open for joining', 'warning');
            return;
          }
        }
        navigation.navigate('TournamentPayJoin', {
          tournamentId,
          tournamentName: tournament?.name,
          amount: tournament?.entryFee,
          joinKind: 'solo',
        });
        return;
      }

      if (isPaymentEnabled() && isTeamFlow) {
        navigation.navigate('CustomMatchTeamRegister', { tournamentId, payWithCashfree: true });
        return;
      }

      const isInsufficient =
        eligibility?.code === 'INSUFFICIENT_BALANCE' ||
        /insufficient|balance/i.test(String(eligibility?.reason || ''));

      if (!eligibility?.canJoin) {
        if (isInsufficient) {
          showInsufficientBalance({
            tournamentId,
            returnScreen: isTeamFlow ? 'CustomMatchTeamRegister' : 'TournamentSlotBooking',
            forTeam: isTeamFlow,
            requiredAmount: eligibility?.realMoneyRequired ?? tournament.entryFee,
            currentBalance: eligibility?.balance,
          });
          return;
        }
        showToast(eligibility?.reason || 'This tournament is not open for joining', 'warning');
        return;
      }

      if (isTeamFlow) {
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
        navigation.navigate('CustomMatchTeamRegister', { tournamentId });
        return;
      }

      const walletCheck = await fetchWalletForEntry(tournament.entryFee);
      if (!walletCheck.sufficient) {
        showInsufficientBalance({
          tournamentId,
          returnScreen: 'TournamentSlotBooking',
          forTeam: false,
          requiredAmount: walletCheck.realRequired,
          currentBalance: walletCheck.balance,
        });
        return;
      }

      navigation.navigate('TournamentSlotBooking', { tournamentId });
    } catch (e) {
      const msg = e.message || 'Could not verify wallet';
      if (/insufficient|balance/i.test(msg)) {
        const isTeamFlow =
          isCustomMatch(tournament) || isTeamEntryMode(tournament?.mode);
        showInsufficientBalance({
          tournamentId,
          returnScreen: isTeamFlow ? 'CustomMatchTeamRegister' : 'TournamentSlotBooking',
          forTeam: isTeamFlow,
          requiredAmount: tournament?.entryFee,
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (error || !tournament) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backFab} onPress={() => navigation.goBack()}>
          <AppIcon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.errorText}>{error || 'Tournament not found'}</Text>
      </SafeAreaView>
    );
  }

  const bannerUri =
    (tournament.bannerImage && resolveMediaUrl(tournament.bannerImage)) ||
    (tournament.gameMode?.image && resolveMediaUrl(tournament.gameMode.image)) ||
    (tournament.game?.image && resolveMediaUrl(tournament.game.image)) ||
    null;

  const rules = parseRules(tournament.rules);
  const custom = isCustomMatch(tournament);
  const teamEntry = custom || isTeamEntryMode(tournament.mode);
  const tabs = teamEntry && custom ? CUSTOM_TABS : teamEntry ? ['RULES', 'TEAMS', 'PRIZE POOL'] : BR_TABS;
  const maxP = teamEntry
    ? tournament.maxTeams ||
      (custom
        ? 2
        : Math.floor((tournament.maxParticipants || 50) / getTeamSize(tournament.mode)))
    : tournament.maxParticipants || tournament.slots?.length || 48;
  const joined = tournament.participantCount || 0;
  const spotsLeft = Math.max(maxP - joined, 0);
  const fillPct = maxP > 0 ? Math.min((joined / maxP) * 100, 100) : 0;

  const displayTitle =
    tournament.bannerTitle ||
    `FF ${(tournament.map || 'FULL MAP').toUpperCase()} | ${formatModeLabel(tournament.mode).toUpperCase()}`;

  const totalPrize = resolveDisplayPrizePool(tournament);

  const lifecycleStatus = tournament.lifecycleStatus || tournament.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const canViewResults = lifecycleStatus === 'completed' || lifecycleStatus === 'result_published';
  const resultsPublished = Boolean(tournament.resultsPublished) || lifecycleStatus === 'result_published';
  const joinDisabled = canViewResults
    ? false
    : hasJoined || joining || !isJoinOpen;
  const statusButtonLabelMap = {
    ongoing: 'LIVE',
    live: 'LIVE',
    completed: resultsPublished ? 'VIEW RESULT' : 'RESULT PENDING',
    result_published: 'VIEW RESULT',
    cancelled: 'CANCELLED',
    draft: 'DRAFT',
    locked: 'LOCKED',
  };
  const joinButtonLabel = canViewResults
    ? statusButtonLabelMap[lifecycleStatus] || (resultsPublished ? 'VIEW RESULT' : 'RESULT PENDING')
    : hasJoined
      ? 'JOINED'
      : isJoinOpen
        ? isPaymentEnabled()
          ? custom || isTeamEntryMode(tournament.mode)
            ? 'PAY & REGISTER TEAM'
            : 'PAY & JOIN'
          : custom
            ? 'REGISTER TEAM'
            : isTeamEntryMode(tournament.mode)
              ? 'REGISTER TEAM'
              : 'JOIN NOW'
        : statusButtonLabelMap[lifecycleStatus] ||
          String(lifecycleStatus || 'UNAVAILABLE').toUpperCase();

  const renderTabContent = () => {
    if (activeTab === 'TEAMS') {
      const teams = tournament.teams || [];
      if (!teams.length) {
        return <Text style={styles.emptyTab}>No teams registered yet.</Text>;
      }
      return teams.map((team) => (
        <View key={team._id || team.side} style={styles.teamCard}>
          <Text style={styles.teamTitle}>
            Team {team.side || '?'} · {team.name}
          </Text>
          {(team.players || []).map((p, i) => (
            <Text key={`${team._id}-${i}`} style={styles.teamPlayer}>
              {`${i + 1}. ${p.name || p}`}
            </Text>
          ))}
        </View>
      ));
    }
    if (activeTab === 'PLAYERS') {
      const list = tournament.participants || [];
      if (!list.length) {
        return <Text style={styles.emptyTab}>No players joined yet.</Text>;
      }
      return list.map((p, i) => (
        <View key={`${p.slotNumber}-${i}`} style={styles.playerRow}>
          <Text style={styles.playerSlot}>#{p.slotNumber || i + 1}</Text>
          <Text style={styles.playerName}>{p.gamingUsername || p.username || 'Player'}</Text>
        </View>
      ));
    }
    if (activeTab === 'PRIZE POOL') {
      const places = resolvePrizePlaces(tournament);
      const pool = places.pool;
      const entry = Number(tournament.entryFee) || 0;
      const hasPerKill = !custom && Number(tournament.perKill) > 0;

      if (custom) {
        const winnerPrize = places.winnerPrize || places.first || pool;
        return (
          <View style={styles.prizeBlock}>
            <View style={styles.prizeDetailsBox}>
              <Text style={styles.prizeDetailsTitle}>Prize Distribution</Text>
              <Text style={styles.prizeDetailsLine}>
                Entry Fee: ₹{entry.toLocaleString('en-IN')} (per team)
              </Text>
              <Text style={styles.prizeDetailsLine}>
                Winner Prize: ₹{Number(winnerPrize).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.prizeDetailsLine}>Loser: ₹0</Text>
            </View>
          </View>
        );
      }

      const { first: firstPlace, second: secondPlace, third: thirdPlace } = places;
      return (
        <View style={styles.prizeBlock}>
          <View style={styles.prizeDetailsBox}>
            <Text style={styles.prizeDetailsTitle}>Prize Pool Details</Text>
            <Text style={styles.prizeDetailsLine}>Total Prize Pool: ₹{pool.toLocaleString('en-IN')}</Text>
            <Text style={styles.prizeDetailsLine}>
              Entry Fee: ₹{entry.toLocaleString('en-IN')} {teamEntry ? '(per team)' : '(per player)'}
            </Text>
            {firstPlace > 0 ? (
              <Text style={styles.prizeDetailsLine}>
                {hasPerKill
                  ? `1st Place: ₹${firstPlace.toLocaleString('en-IN')} + Kill Points`
                  : `Winner (1st): ₹${firstPlace.toLocaleString('en-IN')}`}
              </Text>
            ) : null}
            {secondPlace > 0 ? (
              <Text style={styles.prizeDetailsLine}>2nd Place: ₹{secondPlace.toLocaleString('en-IN')}</Text>
            ) : null}
            {thirdPlace > 0 ? (
              <Text style={styles.prizeDetailsLine}>3rd Place: ₹{thirdPlace.toLocaleString('en-IN')}</Text>
            ) : null}
            {hasPerKill ? (
              <Text style={styles.prizeDetailsLine}>
                Per Kill: ₹{Number(tournament.perKill).toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.rulesCard}>
        <View style={styles.rulesHeader}>
          <Text style={styles.rulesHeaderText}>Rules and Policies</Text>
        </View>
        <View style={styles.rulesBody}>
          {rules.length === 0 ? (
            <Text style={styles.ruleLine}>Follow fair play. No hacks or teaming.</Text>
          ) : (
            rules.map((rule, idx) => (
              <Text key={idx} style={styles.ruleLine}>
                {`${idx + 1}. ${rule}`}
              </Text>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} translucent={false} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <View style={styles.heroWrap}>
          {bannerUri ? (
            <ImageBackground source={{ uri: bannerUri }} style={styles.heroImage} resizeMode="cover">
              <View style={styles.heroOverlay} />
            </ImageBackground>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]} />
          )}

          <TouchableOpacity
            style={styles.backFab}
            onPress={() => navigation.goBack()}
          >
            <AppIcon name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroTitle}>{displayTitle}</Text>
            <Text style={styles.heroDate}>{formatScheduleLine(tournament.startDate)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'TOTAL PRIZE', value: totalPrize },
            ...(Number(tournament.perKill) > 0 ? [{ label: 'PER KILL', value: tournament.perKill }] : []),
            { label: 'ENTRY FEE', value: tournament.entryFee || 0 },
          ].map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <CoinValue value={item.value} />
            </View>
          ))}
        </View>

        <View style={styles.joinStatusBlock}>
          <View style={styles.joinStatusRow}>
            <Text style={styles.joinStatusLabel}>Joining status</Text>
            <Text style={styles.spotsLeft}>
              {teamEntry
                ? `${spotsLeft} team${spotsLeft === 1 ? '' : 's'} left`
                : `${spotsLeft} spots left`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fillPct}%` }]} />
          </View>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>{renderTabContent()}</View>

        {hasJoined && tournament.roomCredentialsVisible && (tournament.roomId || tournament.roomPassword) ? (
          <View style={styles.roomBox}>
            <Text style={styles.roomTitle}>Room credentials</Text>
            {tournament.roomId ? (
              <Text style={styles.roomLine} selectable>
                ID: {tournament.roomId}
              </Text>
            ) : null}
            {tournament.roomPassword ? (
              <Text style={styles.roomLine} selectable>
                Password: {tournament.roomPassword}
              </Text>
            ) : null}
          </View>
        ) : null}

        {hasJoined && !tournament.roomCredentialsVisible ? (
          <View style={styles.roomWaitBox}>
            <Text style={styles.roomWaitText}>
              {tournament.roomCredentialsMessage ||
                'Please wait. Room details will be available 2 minutes before the match starts.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.entriesBtn}
          onPress={() => setActiveTab(teamEntry ? 'TEAMS' : 'PLAYERS')}
        >
          <Text style={styles.entriesBtnText}>ENTRIES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.joinBtn, joinDisabled && styles.joinBtnDisabled]}
          onPress={handleJoinNow}
          disabled={joinDisabled}
        >
          {!canViewResults ? (
            <>
              <CoinValue value={tournament.entryFee || 0} size={16} />
              <View style={styles.joinDivider} />
            </>
          ) : null}
          <Text style={styles.joinBtnText}>{joinButtonLabel}</Text>
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  heroWrap: { height: 280, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: SCREEN_W },
  heroPlaceholder: { backgroundColor: '#121A21' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,16,0.55)' },
  backFab: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesOverlay: {
    position: 'absolute',
    top: 52,
    right: 10,
    width: SCREEN_W * 0.42,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  rulesOverlayTitle: {
    color: '#EF4444',
    fontSize: 9,
    fontFamily: FONTS.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  overlayRuleRow: { flexDirection: 'row', gap: 4, marginBottom: 3, alignItems: 'flex-start' },
  overlayRuleText: { flex: 1, color: COLORS.white, fontSize: 8, lineHeight: 11 },
  heroTitleBlock: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroDate: { marginTop: 6, color: CYAN, fontFamily: FONTS.bold, fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginTop: -20,
    zIndex: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E2126',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: { fontSize: 10, color: COLORS.gray, marginBottom: 6, letterSpacing: 0.3 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinText: { fontFamily: FONTS.bold, color: COLORS.white, fontSize: 16 },
  joinStatusBlock: { paddingHorizontal: 16, marginTop: 18 },
  joinStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  joinStatusLabel: { color: COLORS.gray, fontSize: 13 },
  spotsLeft: { color: COLORS.white, fontSize: 13 },
  progressTrack: {
    height: 8,
    backgroundColor: '#0d1520',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: CYAN, borderRadius: 4 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 20,
    backgroundColor: '#121A21',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  tabItemActive: { backgroundColor: CYAN },
  tabText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gray, letterSpacing: 0.3 },
  tabTextActive: { color: '#050510' },
  tabContent: { paddingHorizontal: 12, marginTop: 14, minHeight: 200 },
  rulesCard: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  rulesHeader: { backgroundColor: '#1a2744', padding: 14 },
  rulesHeaderText: { ...TEXT.h3, color: COLORS.white },
  rulesBody: {
    backgroundColor: '#E8EEF5',
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1a2744',
  },
  ruleLine: { color: '#333', fontSize: 13, lineHeight: 22, marginBottom: 6 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  playerSlot: { color: CYAN, fontFamily: FONTS.bold, width: 40 },
  playerName: { color: COLORS.white, flex: 1 },
  emptyTab: { color: COLORS.gray, textAlign: 'center', marginTop: 24 },
  prizeBlock: { gap: 12 },
  prizeDetailsBox: {
    backgroundColor: '#121A21',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    minHeight: 96,
  },
  prizeDetailsTitle: {
    color: COLORS.white,
    fontSize: 13,
    marginBottom: 14,
  },
  prizeDetailsLine: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 22,
  },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#121A21',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  prizeTotal: { borderColor: 'rgba(0,229,255,0.35)' },
  prizeLabel: { color: COLORS.gray, fontSize: 14 },
  prizeLabelBold: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 15 },
  roomBox: {
    margin: 16,
    padding: 14,
    backgroundColor: '#121A21',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
  },
  roomTitle: { color: CYAN, fontFamily: FONTS.bold, marginBottom: 8 },
  roomLine: { color: COLORS.white, fontSize: 14, marginBottom: 4 },
  roomWaitBox: {
    margin: 16,
    padding: 14,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  roomWaitText: { color: '#FBBF24', fontSize: 13, lineHeight: 19 },
  teamCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  teamTitle: { color: CYAN, fontFamily: FONTS.bold, marginBottom: 8 },
  teamPlayer: { color: COLORS.white, marginBottom: 4, fontSize: 13 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    backgroundColor: '#0a0e18',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  entriesBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#1E2126',
    borderRadius: 8,
    justifyContent: 'center',
  },
  entriesBtnText: { color: COLORS.gray, fontFamily: FONTS.bold, fontSize: 12 },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CYAN,
    borderRadius: 8,
    paddingVertical: 14,
    gap: 10,
  },
  joinBtnDisabled: { opacity: 0.55 },
  joinDivider: { width: 1, height: 22, backgroundColor: 'rgba(5,5,16,0.25)' },
  joinBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#050510', letterSpacing: 0.5 },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: 100 },
});
