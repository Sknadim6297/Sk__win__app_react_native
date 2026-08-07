import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { tournamentService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import {
  formatModeLabel,
  isBattleRoyaleMatch,
  isCustomMatch,
} from '../utils/tournamentHelpers';
import Toast from '../components/Toast';

const CYAN = '#00E5FF';
const ORANGE = '#FF8A00';
const DEFAULT_BANNER = require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

const STATUS_TABS = [
  { id: 'upcoming', label: 'UPCOMING', match: ['upcoming', 'incoming'] },
  { id: 'live', label: 'LIVE', match: ['ongoing', 'live'] },
  { id: 'completed', label: 'COMPLETED', match: ['completed'] },
];

function formatDate(dateString) {
  if (!dateString) return 'TBA';
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function CoinAmount({ value, color = ORANGE, size = 18 }) {
  return (
    <View style={styles.coinRow}>
      <AppIcon name="coins" size={size} color="#FBBF24" />
      <Text style={[styles.coinValue, { color }]}>{value}</Text>
    </View>
  );
}

function getMatchNumber(item) {
  if (item.matchNumber) return item.matchNumber;
  const id = String(item._id || item.id || '');
  return 10000 + (parseInt(id.slice(-6), 16) % 80000);
}

function getEffective(t) {
  const s = t.lifecycleStatus || t.status || '';
  if (s === 'result_published') return 'completed';
  return s;
}

function statusLabel(s) {
  if (s === 'ongoing' || s === 'live') return 'LIVE';
  if (s === 'upcoming' || s === 'incoming') return 'UPCOMING';
  if (s === 'completed') return 'COMPLETED';
  return String(s || '').toUpperCase();
}

function ContestCard({ item, onPress }) {
  const custom = isCustomMatch(item);
  const isBattleRoyale = isBattleRoyaleMatch(item.gameMode || item);
  const status = getEffective(item);
  const result = item.resultSummary || {};
  const published = Boolean(item.resultsPublished || result.resultsPublished);
  const team = item.myTeam;
  const current = item.participantCount ?? item.currentParticipants ?? 0;
  const max = custom
    ? item.maxTeams || item.maxPlayers || 2
    : item.maxParticipants || item.maxPlayers || 48;
  const progress = max > 0 ? Math.min(current / max, 1) : 0;
  const modeLabel = formatModeLabel(item.mode);
  const mapLabel = (item.map || 'Bermuda').toUpperCase();
  const matchNo = getMatchNumber(item);
  const gameName = item.game?.name || item.gameMode?.name || 'Free Fire';
  const matchType = custom ? 'Custom Match' : item.gameMode?.name || 'Battle Royale';
  const displayTitle = `${item.name || 'Tournament'} | Match #${matchNo}`;

  const bannerUri = item.bannerImage
    ? resolveMediaUrl(item.bannerImage)
    : item.gameMode?.image
      ? resolveMediaUrl(item.gameMode.image)
      : item.game?.image
        ? resolveMediaUrl(item.game.image)
        : null;
  const bannerSource = bannerUri ? { uri: bannerUri } : DEFAULT_BANNER;
  const bannerTitle = item.bannerTitle?.trim() || item.name || 'Tournament';
  const avatarUri =
    (item.gameMode?.image && resolveMediaUrl(item.gameMode.image)) ||
    (item.game?.image && resolveMediaUrl(item.game.image)) ||
    null;

  let ctaLabel = 'VIEW MATCH';
  if (status === 'completed') {
    ctaLabel = published ? 'VIEW RESULT' : 'RESULT PENDING';
  } else if (status === 'ongoing' || status === 'live') {
    ctaLabel = 'LIVE MATCH';
  }

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => onPress(item)}>
      <ImageBackground source={bannerSource} style={styles.cardBanner} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
        <View style={styles.bannerTopBadges}>
          <View style={styles.bannerPill}>
            <AppIcon name="star" size={14} color="#FBBF24" />
            <Text style={styles.bannerPillText}>{modeLabel}</Text>
          </View>
          <View style={[styles.bannerPill, styles.mapPill]}>
            <AppIcon name="location" size={14} accent="A855F7" />
            <Text style={styles.bannerPillText}>{mapLabel}</Text>
          </View>
          <View style={[styles.bannerPill, styles.statusPill]}>
            <Text style={styles.bannerPillText}>{statusLabel(status)}</Text>
          </View>
        </View>
        <Text style={styles.bannerTitle}>{bannerTitle}</Text>
      </ImageBackground>

      <View style={styles.cardBody}>
        <View style={styles.titleContent}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <AppIcon name="gamepad-variant" size={22} accent="00E5FF" />
            </View>
          )}
          <View style={styles.titleMeta}>
            <Text style={styles.tournamentTitle} numberOfLines={3}>
              {displayTitle}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              {gameName} · {matchType}
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.joinedBadge}>
            <AppIcon name="check-circle" size={14} color="#34C759" />
            <Text style={styles.joinedBadgeText}>JOINED</Text>
          </View>
          {team?.name ? (
            <View style={styles.teamBadge}>
              <AppIcon name="users" size={14} color={CYAN} />
              <Text style={styles.teamBadgeText} numberOfLines={1}>
                {team.side ? `Team ${team.side} · ` : ''}
                {team.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>MATCH TIME</Text>
            <Text style={styles.statValue} numberOfLines={2}>
              {formatDate(item.startDate)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>ENTRY</Text>
            <CoinAmount value={item.entryFee ?? 0} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>PRIZE POOL</Text>
            <CoinAmount value={item.prizePool ?? 0} />
          </View>
          {isBattleRoyale && Number(item.perKill) > 0 ? (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>PER KILL</Text>
                <CoinAmount value={item.perKill ?? 0} />
              </View>
            </>
          ) : null}
        </View>

        {team?.players?.length ? (
          <View style={styles.teamDetails}>
            <Text style={styles.teamDetailsTitle}>Team details</Text>
            {team.players.slice(0, 4).map((p, i) => (
              <Text key={`${team._id}-${i}`} style={styles.teamPlayer}>
                {i + 1}. {p.name || p}
              </Text>
            ))}
          </View>
        ) : null}

        {status === 'completed' && !published ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>Result Not Published Yet</Text>
          </View>
        ) : null}

        {status === 'completed' && published ? (
          <View style={styles.resultBox}>
            {result.winnerTeamName ? (
              <Text style={styles.winnerLine}>Winning Team: {result.winnerTeamName}</Text>
            ) : null}
            {result.myTeamOutcome === 'winner' ? (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>🏆 Winner</Text>
              </View>
            ) : null}
            {result.myTeamOutcome === 'loser' ? (
              <View style={styles.lostBadge}>
                <Text style={styles.lostBadgeText}>Lost</Text>
              </View>
            ) : null}
            {result.resultsPublishedAt ? (
              <Text style={styles.publishedAt}>
                Published {formatDate(result.resultsPublishedAt)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.progressBlock}>
            <Text style={styles.slotsText}>
              {current}/{max} {custom ? 'teams' : 'players'}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.9} onPress={() => onPress(item)}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
            <AppIcon name="chevron-right" size={18} color="#050510" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyContestsScreen({ navigation, route }) {
  const initialTab = route?.params?.initialTab === 'result_published'
    ? 'completed'
    : route?.params?.initialTab || 'upcoming';
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const load = useCallback(async () => {
    try {
      const data = await tournamentService.getMyTournaments();
      setContests(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load contests');
      setContests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      const tab = route?.params?.initialTab;
      if (!tab) return;
      setSelectedTab(tab === 'result_published' ? 'completed' : tab);
    }, [route?.params?.initialTab])
  );

  const filtered = contests.filter((t) => {
    const tab = STATUS_TABS.find((x) => x.id === selectedTab);
    const s = getEffective(t);
    return tab ? tab.match.includes(s) : true;
  });

  const openContest = (tournament) => {
    const s = getEffective(tournament);
    if (s === 'completed') {
      navigation.navigate('TournamentResults', { tournamentId: tournament._id });
      return;
    }
    navigation.navigate('TournamentDetails', { tournamentId: tournament._id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AppIcon name="arrow-back" size={24} light />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY CONTESTS</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const active = selectedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setSelectedTab(tab.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active ? <View style={styles.tabUnderline} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>Loading your contests...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={CYAN}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <AppIcon name="trophy-outline" size={48} muted />
              <Text style={styles.emptyTitle}>No contests here</Text>
              <Text style={styles.emptySub}>Join a tournament to see it in My Contests</Text>
            </View>
          }
          renderItem={({ item }) => <ContestCard item={item} onPress={openContest} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#12162B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    ...TEXT.h3,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#12162B',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.grayDim,
    letterSpacing: 0.4,
  },
  tabLabelActive: { color: COLORS.white },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '12%',
    right: '12%',
    height: 3,
    borderRadius: 2,
    backgroundColor: CYAN,
  },
  listContent: { padding: 12, paddingBottom: 28, gap: 14 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10 },
  loadingText: { color: COLORS.gray, fontFamily: FONTS.medium, marginTop: 8 },
  emptyTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16, marginTop: 8 },
  emptySub: { color: COLORS.gray, fontFamily: FONTS.regular, fontSize: 13, textAlign: 'center' },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#121A21',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardBanner: { height: 190, padding: 10, justifyContent: 'space-between' },
  bannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  bannerTopBadges: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    gap: 6,
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapPill: { backgroundColor: 'rgba(88, 50, 140, 0.85)' },
  statusPill: { backgroundColor: 'rgba(0, 229, 255, 0.35)' },
  bannerPillText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.white },
  cardBody: { padding: 12, gap: 10 },
  titleContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleMeta: { flex: 1, gap: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.5)',
  },
  avatarPlaceholder: {
    backgroundColor: '#1a2238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tournamentTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    lineHeight: 18,
  },
  metaLine: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.gray },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  joinedBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: '#34C759' },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '70%',
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teamBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11, color: CYAN, flexShrink: 1 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' },
  statLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: ORANGE,
    letterSpacing: 0.4,
  },
  statValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.white,
    textAlign: 'center',
  },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinValue: { fontFamily: FONTS.bold, fontSize: 14 },
  teamDetails: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  teamDetailsTitle: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white, marginBottom: 4 },
  teamPlayer: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gray },
  pendingBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  pendingText: { fontFamily: FONTS.bold, fontSize: 13, color: '#F59E0B' },
  resultBox: {
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  winnerLine: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.white },
  winnerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderColor: '#FBBF24',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  winnerBadgeText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FBBF24' },
  lostBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.5)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lostBadgeText: { fontFamily: FONTS.bold, fontSize: 13, color: '#F87171' },
  publishedAt: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.gray },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBlock: { flex: 1, gap: 6 },
  slotsText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.white },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: CYAN, borderRadius: 3 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CYAN,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: { fontFamily: FONTS.bold, fontSize: 12, color: '#050510', letterSpacing: 0.3 },
});
