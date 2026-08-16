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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import ScreenHeader from '../components/navigation/ScreenHeader';
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
import { CoinValue, TimeLeftBar, InfoCell } from '../components/contest/ContestShared';

const DEFAULT_BANNER = require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

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
        const isTeamFlow = isCustomMatch(tournament) || isTeamEntryMode(tournament?.mode);
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

  const rules = parseRules(tournament.rules);
  const custom = isCustomMatch(tournament);
  const teamEntry = custom || isTeamEntryMode(tournament.mode);
  const maxP = teamEntry
    ? tournament.maxTeams ||
      (custom ? 2 : Math.floor((tournament.maxParticipants || 50) / getTeamSize(tournament.mode)))
    : tournament.maxParticipants || tournament.slots?.length || 48;
  const joined = tournament.participantCount || 0;
  const matchNo = tournament.matchNumber || 10000;
  const modeName = (tournament.gameMode?.name || formatModeLabel(tournament.mode) || 'MATCH').toUpperCase();
  const totalPrize = resolveDisplayPrizePool(tournament);
  const places = resolvePrizePlaces(tournament);
  const lifecycleStatus = tournament.lifecycleStatus || tournament.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const canViewResults = lifecycleStatus === 'completed' || lifecycleStatus === 'result_published';
  const resultsPublished = Boolean(tournament.resultsPublished) || lifecycleStatus === 'result_published';
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
          ? 'Live'
          : String(lifecycleStatus || 'Closed');

  const teams = tournament.teams || [];
  const players = tournament.participants || [];

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title={`Contest Details #${matchNo}`} onBack={() => navigation.goBack()} />

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
            colors={['rgba(11,14,30,0.05)', 'rgba(11,14,30,0.55)']}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <TimeLeftBar startDate={tournament.startDate} />

        <Text style={styles.matchTitle}>
          {tournament.name || 'Tournament'} — ID#{matchNo}
        </Text>

        <View style={styles.grid3}>
          <InfoCell label="Team" value={formatModeLabel(tournament.mode)} flex={1} />
          <InfoCell label="Mode" value={modeName} flex={1} />
          <InfoCell label="Map" value={(tournament.map || 'BERMUDA').toUpperCase()} flex={1} />
        </View>
        <View style={styles.grid2}>
          <InfoCell label="Match Type" value={Number(tournament.entryFee) > 0 ? 'Paid' : 'Free'} flex={1} />
          <InfoCell label="Entry Fee" value={tournament.entryFee || 0} coin flex={1} />
        </View>
        <InfoCell label="Match Schedule" value={formatScheduleLine(tournament.startDate)} />

        <Text style={styles.sectionHead}>Prize Details</Text>
        <View style={styles.prizeCard}>
          <View style={styles.prizeLine}>
            <Text style={styles.prizeLabel}>Prize Pool</Text>
            <CoinValue value={totalPrize} color={PAGE.gold} />
          </View>
          {!custom && Number(tournament.perKill) > 0 ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>Per Kill</Text>
              <CoinValue value={tournament.perKill} color={PAGE.gold} />
            </View>
          ) : null}
          {places.first > 0 ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>{custom ? 'Winner' : '1st Place'}</Text>
              <CoinValue value={places.first} color={PAGE.gold} />
            </View>
          ) : null}
          {places.second > 0 ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>2nd Place</Text>
              <CoinValue value={places.second} color={PAGE.gold} />
            </View>
          ) : null}
          {places.third > 0 ? (
            <View style={styles.prizeLine}>
              <Text style={styles.prizeLabel}>3rd Place</Text>
              <CoinValue value={places.third} color={PAGE.gold} />
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionHead}>About this Match</Text>
        <View style={styles.aboutCard}>
          {rules.length === 0 ? (
            <Text style={styles.ruleLine}>• Follow fair play. No hacks or teaming.</Text>
          ) : (
            rules.map((rule, idx) => (
              <Text key={idx} style={styles.ruleLine}>
                • {rule}
              </Text>
            ))
          )}
        </View>

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

        {showJoinings ? (
          <View style={styles.joiningsBox}>
            <Text style={styles.sectionHead}>
              {teamEntry ? 'Teams' : 'Players'} ({teamEntry ? teams.length : players.length}/{maxP})
            </Text>
            {teamEntry ? (
              teams.length ? (
                teams.map((team) => (
                  <View key={team._id || team.side} style={styles.joiningRow}>
                    <Text style={styles.joiningName}>
                      Team {team.side || ''} · {team.name}
                    </Text>
                    <Text style={styles.joiningMeta}>{(team.players || []).length} players</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyJoinings}>No teams registered yet.</Text>
              )
            ) : players.length ? (
              players.map((p, i) => (
                <View key={`${p.slotNumber}-${i}`} style={styles.joiningRow}>
                  <Text style={styles.joiningSlot}>#{p.slotNumber || i + 1}</Text>
                  <Text style={styles.joiningName}>{p.gamingUsername || p.username || 'Player'}</Text>
                </View>
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
            {showJoinings ? 'HIDE JOININGS' : 'VIEW ALL JOININGS'}
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
            <Text style={styles.joinMatchText}>{joinButtonLabel}</Text>
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
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  bannerImg: { borderRadius: 16 },
  matchTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: PAGE.cyan,
    lineHeight: 22,
    marginBottom: 12,
  },
  grid3: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  grid2: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
    paddingVertical: 8,
  },
  prizeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PAGE.border,
  },
  prizeLabel: { ...TEXT.body, color: PAGE.muted },
  aboutCard: {
    backgroundColor: 'rgba(91, 57, 168, 0.18)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    padding: 14,
  },
  ruleLine: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    lineHeight: 22,
    marginBottom: 6,
  },
  roomBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: PAGE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
  },
  roomTitle: { color: PAGE.cyan, fontFamily: FONTS.bold, marginBottom: 8 },
  roomLine: { color: COLORS.white, fontSize: 14, marginBottom: 4 },
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
  joiningSlot: { color: PAGE.cyan, fontFamily: FONTS.bold, width: 36 },
  joiningName: { color: COLORS.white, fontFamily: FONTS.bold, flex: 1, fontSize: 13 },
  joiningMeta: { color: PAGE.muted, fontSize: 12 },
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
