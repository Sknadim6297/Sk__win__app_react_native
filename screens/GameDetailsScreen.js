import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { tournamentService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const CYAN = '#00E5FF';
const ORANGE = '#FF8A00';
const DEFAULT_BANNER = require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

const STATUS_TABS = [
  { id: 'ongoing', label: 'ONGOING' },
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'results', label: 'RESULTS' },
];

const parseRules = (rules) => {
  if (!rules) return [];
  if (Array.isArray(rules)) {
    return rules.flatMap((r) => String(r).split('\n')).map((r) => r.trim()).filter(Boolean);
  }
  return String(rules).split('\n').map((r) => r.trim()).filter(Boolean);
};

const formatModeLabel = (mode) => {
  const m = (mode || 'solo').toLowerCase();
  return m.charAt(0).toUpperCase() + m.slice(1);
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

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

function TournamentCard({ item, gameModeImage, onJoin }) {
  const current = item.participantCount ?? item.currentParticipants ?? 0;
  const max = item.maxParticipants || 48;
  const progress = max > 0 ? Math.min(current / max, 1) : 0;
  const modeLabel = formatModeLabel(item.mode);
  const mapLabel = (item.map || 'Bermuda').toUpperCase();
  const rules = parseRules(item.rules);
  const description = (item.description || '').trim();
  const matchNo = getMatchNumber(item);
  const displayTitle = `${item.name || 'Tournament'} | Match #${matchNo}`;

  const bannerUri = item.bannerImage
    ? resolveMediaUrl(item.bannerImage)
    : item.gameMode?.image
      ? resolveMediaUrl(item.gameMode.image)
      : gameModeImage;
  const bannerSource = bannerUri ? { uri: bannerUri } : DEFAULT_BANNER;
  const bannerTitle =
    item.bannerTitle?.trim() ||
    `${modeLabel.toUpperCase()} FULL MAP TOURNAMENT`;
  const avatarUri =
    item.gameMode?.image && typeof item.gameMode.image === 'string'
      ? resolveMediaUrl(item.gameMode.image)
      : gameModeImage;

  return (
    <View style={styles.card}>
      <ImageBackground source={bannerSource} style={styles.cardBanner} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
        <View style={styles.bannerTopBadges}>
          <View style={styles.bannerPill}>
            <AppIcon name="star" size={14} color="#FBBF24" />
            <Text style={styles.bannerPillText}>{modeLabel}</Text>
          </View>
          <View style={[styles.bannerPill, styles.mapPill]}>
            <AppIcon name="location" size={14} accent="A855F7" />
            <Text style={styles.bannerPillText}>{mapLabel}</Text>
          </View>
        </View>
        <Text style={styles.bannerTitle}>{bannerTitle}</Text>
      </ImageBackground>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <View style={styles.badgeRow}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{modeLabel}</Text>
            </View>
            <View style={styles.mapBadge}>
              <Text style={styles.mapBadgeText}>{mapLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.titleContent}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <AppIcon name="gamepad-variant" size={22} accent="00E5FF" />
            </View>
          )}
          <Text style={styles.tournamentTitle} numberOfLines={4}>
            {displayTitle}
          </Text>
        </View>

        {description ? (
          <Text style={styles.descriptionText} numberOfLines={4}>
            {description}
          </Text>
        ) : null}

        {(rules.length > 0 || description) && (
          <View style={styles.rulesBox}>
            <View style={styles.rulesHeader}>
              <Text style={styles.rulesHeaderText}>READ RULES BEFORE JOINING</Text>
            </View>
            <View style={styles.rulesBody}>
              {rules.length > 0 ? (
                rules.map((rule, idx) => (
                  <View key={`${idx}-${rule.slice(0, 12)}`} style={styles.ruleRow}>
                    <AppIcon name="check-circle" size={12} color="#4ADE80" />
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.ruleText}>{description}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statValue} numberOfLines={2}>
              {formatDate(item.startDate)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>PRIZE POOL</Text>
            <CoinAmount value={item.prizePool ?? 0} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>PER KILL</Text>
            <CoinAmount value={item.perKill ?? 0} />
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.progressBlock}>
            <Text style={styles.slotsText}>
              {current}/{max}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <TouchableOpacity style={styles.joinBtn} activeOpacity={0.9} onPress={() => onJoin(item)}>
            <CoinAmount value={item.entryFee ?? 0} color="#050510" size={16} />
            <Text style={styles.joinText}>JOIN</Text>
            <AppIcon name="chevron-right" size={18} color="#050510" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function GameDetailsScreen({ navigation, route }) {
  const gameMode = route?.params?.gameMode;
  const modeId = gameMode?.id || gameMode?._id;
  const headerTitle = (gameMode?.name || 'FULL MAP').toUpperCase();
  const gameModeImage =
    gameMode?.image?.uri ||
    (typeof gameMode?.image === 'string' ? resolveMediaUrl(gameMode.image) : null);

  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getList().catch(() => []);
      let filtered = Array.isArray(data) ? data : [];

      if (modeId) {
        filtered = filtered.filter(
          (t) =>
            String(t.gameMode?._id || t.gameMode) === String(modeId)
        );
      } else if (gameMode?.name) {
        filtered = filtered.filter((t) => t.gameMode?.name === gameMode.name);
      }

      if (selectedTab === 'upcoming') {
        filtered = filtered.filter(
          (t) => t.status === 'incoming' || t.status === 'upcoming'
        );
      } else if (selectedTab === 'ongoing') {
        filtered = filtered.filter(
          (t) => t.status === 'ongoing' || t.status === 'live' || t.status === 'locked'
        );
      } else if (selectedTab === 'results') {
        filtered = filtered.filter((t) => t.status === 'completed');
      }

      setTournaments(filtered);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [modeId, gameMode?.name, selectedTab]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleJoin = (item) => {
    navigation.navigate('TournamentDetails', { tournamentId: item._id || item.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AppIcon name="arrow-back" size={24} light />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
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
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <AppIcon name="trophy-outline" size={48} muted />
              <Text style={styles.emptyTitle}>No tournaments here</Text>
              <Text style={styles.emptySub}>Check other tabs or come back later</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TournamentCard item={item} gameModeImage={gameModeImage} onJoin={handleJoin} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
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
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.grayDim,
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: COLORS.white,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '12%',
    right: '12%',
    height: 3,
    borderRadius: 2,
    backgroundColor: CYAN,
  },
  listContent: {
    padding: 12,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#121A21',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardBanner: {
    height: 148,
    padding: 10,
    justifyContent: 'space-between',
  },
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
  mapPill: {
    backgroundColor: 'rgba(88, 50, 140, 0.85)',
  },
  bannerPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.white,
  },
  descriptionText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 17,
    marginTop: -4,
  },
  rulesBox: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 2,
  },
  rulesHeader: {
    backgroundColor: '#DC2626',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  rulesHeaderText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  rulesBody: {
    backgroundColor: '#0d1118',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  ruleText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: '#E2E8F0',
    lineHeight: 12,
  },
  cardBody: {
    padding: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: CYAN,
  },
  mapBadge: {
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: ORANGE,
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
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
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: ORANGE,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  statValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.white,
    textAlign: 'center',
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinValue: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBlock: {
    flex: 1,
  },
  slotsText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
    marginBottom: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: CYAN,
    borderRadius: 4,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CYAN,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 118,
    justifyContent: 'center',
  },
  joinText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#050510',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  emptyTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    marginTop: 14,
  },
  emptySub: {
    ...TEXT.body,
    color: COLORS.gray,
    marginTop: 6,
    textAlign: 'center',
  },
});
