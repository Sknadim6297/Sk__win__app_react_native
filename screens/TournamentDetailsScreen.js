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
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { tournamentService, walletService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import {
  parseRules,
  getPaymentSplit,
  formatScheduleLine,
  formatModeLabel,
  isBattleRoyaleMatch,
  getJoinBlockReason,
  getDisplayStatus,
  formatCountdown,
} from '../utils/tournamentHelpers';

const CYAN = '#00E5FF';
const { width: SCREEN_W } = Dimensions.get('window');

const TABS = ['RULES', 'PLAYERS', 'PRIZE POOL'];

function CoinValue({ value, size = 18 }) {
  return (
    <View style={styles.coinRow}>
      <AppIcon name="coins" size={size} color="#FBBF24" />
      <Text style={styles.coinText}>{value ?? 0}</Text>
    </View>
  );
}

export default function TournamentDetailsScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const { user, isAdmin } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState('RULES');
  const [joining, setJoining] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const loadDetails = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      if (!tournamentId) {
        setError('Tournament ID not provided');
        return;
      }
      const data = await tournamentService.getDetails(tournamentId);
      setTournament(data);
      setHasJoined(!!data.userJoined);
    } catch (e) {
      if (!silent) setError(e.message || 'Failed to load tournament details');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
      const poll = setInterval(() => {
        loadDetails(true);
      }, 15000);
      return () => clearInterval(poll);
    }, [loadDetails])
  );

  useEffect(() => {
    if (!tournament?.startDate) return undefined;
    const tick = () => setCountdown(formatCountdown(tournament.startDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tournament?.startDate, tournament?.status]);

  const joinBlockReason = tournament ? getJoinBlockReason(tournament) : null;
  const canJoinMatch = !hasJoined && !joinBlockReason && tournament?.canJoin !== false;

  const handleJoinNow = async () => {
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
    if (joinBlockReason) {
      showToast(joinBlockReason, 'warning');
      return;
    }

    try {
      setJoining(true);
      const w = await walletService.getBalance();
      const balance = w?.balance ?? 0;
      const bonusBalance = w?.bonusBalance ?? 0;
      const { realRequired } = getPaymentSplit(tournament.entryFee, bonusBalance);

      if (balance < realRequired) {
        navigation.navigate('TournamentEntry', { tournamentId });
      } else {
        navigation.navigate('TournamentSlotBooking', { tournamentId });
      }
    } catch (e) {
      showToast(e.message || 'Could not verify wallet', 'error');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (error || !tournament) {
    return (
      <SafeAreaView style={styles.container}>
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
  const overlayRules = rules.slice(0, 6);
  
  const isBattleRoyale = isBattleRoyaleMatch(tournament);
  const myGaming = tournament.myGamingDetails;
  const displayGamingUID = myGaming?.gamingUID;
  
  const maxP = tournament.maxParticipants || tournament.slots?.length || 48;
  const joined = tournament.participantCount || 0;
  const spotsLeft = Math.max(maxP - joined, 0);
  const fillPct = maxP > 0 ? Math.min((joined / maxP) * 100, 100) : 0;

  const displayTitle =
    tournament.bannerTitle ||
    `${(tournament.map || 'FULL MAP').toUpperCase()} | ${formatModeLabel(tournament.mode).toUpperCase()}`;

  const totalPrize =
    Number(tournament.prizePool) ||
    (Number(tournament.prizes?.first || 0) +
      Number(tournament.prizes?.second || 0) +
      Number(tournament.prizes?.third || 0));

  const renderTabContent = () => {
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
      return (
        <View style={styles.prizeBlock}>
          <View style={[styles.prizeRow, styles.prizeTotal]}>
            <Text style={styles.prizeLabelBold}>Prize Pool</Text>
            <CoinValue value={totalPrize} size={20} />
          </View>
          {isBattleRoyale && Number(tournament.perKill) > 0 && (
            <View style={styles.prizeRow}>
              <Text style={styles.prizeLabel}>Per Kill</Text>
              <CoinValue value={tournament.perKill} />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.rulesCard}>
        <View style={styles.rulesHeader}>
          <Text style={styles.rulesHeaderText}>Rules and Policies</Text>
        </View>
        <View style={styles.rulesBody}>
          <Text style={styles.rulesIntro}>INSTRUCTIONS BEFORE JOINING :</Text>
          {rules.length === 0 ? (
            <Text style={styles.ruleLine}>Follow fair play. No hacks or teaming.</Text>
          ) : (
            rules.map((rule, idx) => (
              <Text key={idx} style={styles.ruleLine}>
                {idx + 1}. {rule}
              </Text>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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
            style={[styles.backFab, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
          >
            <AppIcon name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {hasJoined && displayGamingUID && (
            <View style={styles.gamingUIDBox}>
              <Text style={styles.gamingUIDLabel}>GAMING UID</Text>
              <Text style={styles.gamingUIDValue}>{displayGamingUID}</Text>
            </View>
          )}

          <View style={styles.heroTitleBlock}>
            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusPill, styles[`status_${tournament.status}`] || styles.status_incoming]}>
                <Text style={styles.statusPillText}>{getDisplayStatus(tournament.status)}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{displayTitle}</Text>
            <Text style={styles.heroDate}>{formatScheduleLine(tournament.startDate)}</Text>
            {(tournament.status === 'incoming' || tournament.status === 'locked' || tournament.status === 'upcoming') && (
              <View style={styles.countdownBox}>
                <Text style={styles.countdownLabel}>Starts in</Text>
                <Text style={styles.countdownValue}>{countdown}</Text>
              </View>
            )}
          </View>
        </View>

        {joinBlockReason && !hasJoined && (
          <View style={styles.blockBanner}>
            <AppIcon name="alert-circle" size={18} color="#FBBF24" />
            <Text style={styles.blockBannerText}>{joinBlockReason}</Text>
          </View>
        )}

        {(tournament.resultsPublished || tournament.status === 'result_published') && (
          <TouchableOpacity
            style={styles.resultsCta}
            onPress={() => navigation.navigate('TournamentResults', { tournamentId })}
          >
            <AppIcon name="trophy" size={20} color={CYAN} />
            <Text style={styles.resultsCtaText}>View Final Leaderboard</Text>
            <AppIcon name="chevron-right" size={20} color={CYAN} />
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          {(() => {
            const statsToShow = isBattleRoyale
              ? [
                  { label: 'PRIZE POOL', value: totalPrize },
                  { label: 'PER KILL', value: tournament.perKill || 0 },
                ]
              : [
                  { label: 'PRIZE POOL', value: totalPrize },
                ];
            return statsToShow.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statLabel}>{item.label}</Text>
                {typeof item.value === 'number' ? (
                  <CoinValue value={item.value} />
                ) : (
                  <Text style={styles.coinText}>{item.value}</Text>
                )}
              </View>
            ));
          })()}
        </View>

        <View style={styles.joinStatusBlock}>
          <View style={styles.joinStatusRow}>
            <Text style={styles.joinStatusLabel}>Joining status</Text>
            <Text style={styles.spotsLeft}>{spotsLeft} spots left</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fillPct}%` }]} />
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
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

        {hasJoined && tournament.roomCredentialsVisible && tournament.roomId && (
          <View style={styles.roomBox}>
            <Text style={styles.roomTitle}>Room credentials</Text>
            <Text style={styles.roomLine} selectable>
              ID: {tournament.roomId}
            </Text>
            {tournament.roomPassword ? (
              <Text style={styles.roomLine} selectable>
                Password: {tournament.roomPassword}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.entriesBtn} onPress={() => setActiveTab('PLAYERS')}>
          <Text style={styles.entriesBtnText}>ENTRIES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.joinBtn, (!canJoinMatch || joining) && styles.joinBtnDisabled]}
          onPress={handleJoinNow}
          disabled={!canJoinMatch || joining}
        >
          <CoinValue value={tournament.entryFee || 0} size={16} />
          <View style={styles.joinDivider} />
          <Text style={styles.joinBtnText}>
            {hasJoined ? 'JOINED' : joinBlockReason ? 'CLOSED' : 'JOIN NOW'}
          </Text>
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
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
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamingUIDBox: {
    position: 'absolute',
    top: 52,
    right: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  gamingUIDLabel: {
    color: CYAN,
    fontSize: 9,
    fontFamily: FONTS.bold,
    marginBottom: 4,
    textAlign: 'center',
  },
  gamingUIDValue: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
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
  statusBadgeRow: { marginBottom: 8 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,229,255,0.15)',
  },
  statusPillText: { fontFamily: FONTS.bold, fontSize: 11, color: CYAN },
  status_ongoing: { backgroundColor: 'rgba(239,68,68,0.2)' },
  status_completed: { backgroundColor: 'rgba(148,163,184,0.2)' },
  status_result_published: { backgroundColor: 'rgba(251,191,36,0.2)' },
  countdownBox: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  countdownLabel: { color: COLORS.gray, fontSize: 11 },
  countdownValue: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16, marginTop: 2 },
  blockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  blockBannerText: { flex: 1, color: '#FCA5A5', fontSize: 13 },
  resultsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.35)',
  },
  resultsCtaText: { color: CYAN, fontFamily: FONTS.bold, flex: 1 },
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
  rulesIntro: { fontFamily: FONTS.bold, color: '#111', marginBottom: 10, fontSize: 13 },
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
