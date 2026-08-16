import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import {
  formatScheduleLine,
  formatModeLabel,
  isBattleRoyaleMatch,
} from '../utils/tournamentHelpers';
import { StatTriple } from '../components/contest/ContestShared';
import { LIST_PERF } from '../utils/listPerf';
import ScreenHeader from '../components/navigation/ScreenHeader';

const DEFAULT_BANNER = require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

const STATUS_TABS = [
  { id: 'ongoing', label: 'LIVE' },
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'completed', label: 'COMPLETED' },
];

function getMatchNumber(item) {
  if (item.matchNumber) return item.matchNumber;
  const id = String(item._id || item.id || '');
  return 10000 + (parseInt(id.slice(-6), 16) % 80000);
}

function TournamentCard({ item, gameMode, gameModeImage, onJoin }) {
  const isBattleRoyale = isBattleRoyaleMatch(gameMode || item.gameMode);
  const current = item.participantCount ?? item.currentParticipants ?? 0;
  const max = item.maxParticipants || 48;
  const spotsLeft = Math.max(max - current, 0);
  const progress = max > 0 ? Math.min(current / max, 1) : 0;
  const full = spotsLeft <= 0;
  const matchNo = getMatchNumber(item);
  const lifecycleStatus = item.lifecycleStatus || item.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const isJoined = Boolean(item.userJoined);
  const modeName = (item.gameMode?.name || gameMode?.name || formatModeLabel(item.mode) || 'MATCH').toUpperCase();
  const typeLabel = Number(item.entryFee) > 0 ? 'PAID' : 'FREE';

  const bannerUri = item.bannerImage
    ? resolveMediaUrl(item.bannerImage)
    : item.gameMode?.image
      ? resolveMediaUrl(item.gameMode.image)
      : gameModeImage;
  const bannerSource = bannerUri ? { uri: bannerUri } : DEFAULT_BANNER;

  const ctaLabel = isJoined
    ? 'JOINED'
    : !isJoinOpen
      ? lifecycleStatus === 'ongoing' || lifecycleStatus === 'live'
        ? 'LIVE'
        : lifecycleStatus === 'completed' || lifecycleStatus === 'result_published'
          ? 'COMPLETED'
          : String(lifecycleStatus || 'CLOSED').toUpperCase()
      : full
        ? 'Joining Full'
        : 'Join Match';

  const ctaDisabled = isJoined || !isJoinOpen || full;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => onJoin(item)}>
      <ImageBackground source={bannerSource} style={styles.banner} resizeMode="cover">
        <LinearGradient
          colors={['rgba(11,14,30,0.05)', 'rgba(11,14,30,0.72)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bannerRules}>
          <Text style={styles.rulesTag}>RULES :-</Text>
          <Text style={styles.rulesPreview} numberOfLines={3}>
            {(Array.isArray(item.rules) ? item.rules.join(' · ') : item.rules) ||
              'Follow fair play. Room ID before match.'}
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.name || 'Tournament'} #{matchNo}
        </Text>
        <Text style={styles.timeLine}>Time : {formatScheduleLine(item.startDate)}</Text>

        <StatTriple
          items={[
            { label: 'PRIZE POOL', value: item.prizePool ?? 0, coin: true },
            { label: 'PER KILL', value: isBattleRoyale ? item.perKill ?? 0 : 0, coin: true },
            { label: 'ENTRY FEE', value: item.entryFee ?? 0, coin: true },
          ]}
        />

        <StatTriple
          items={[
            { label: 'TYPE', value: modeName },
            { label: 'ENTRY PER PLAYER', value: item.entryFee ?? 0, coin: true },
            { label: 'MAP', value: (item.map || 'BERMUDA').toUpperCase() },
          ]}
        />

        <View style={styles.spotRow}>
          <View style={styles.spotBlock}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  full && styles.progressFull,
                  { width: `${Math.max(progress * 100, 4)}%` },
                ]}
              />
            </View>
            <View style={styles.spotMeta}>
              <Text style={[styles.spotsLeft, full && styles.spotsFull]}>
                {full ? 'Only 0 Spot Left' : `Only ${spotsLeft} Spot${spotsLeft === 1 ? '' : 's'} Left`}
              </Text>
              <Text style={styles.spotCount}>
                {current}/{max}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Text style={styles.matchType}>{typeLabel}</Text>
          <TouchableOpacity
            style={[
              styles.joinBtn,
              ctaDisabled && styles.joinBtnMuted,
              isJoined && styles.joinBtnJoined,
              full && isJoinOpen && styles.joinBtnFull,
            ]}
            activeOpacity={0.88}
            disabled={ctaDisabled && !isJoinOpen}
            onPress={() => onJoin(item)}
          >
            <Text style={styles.joinBtnText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
          (t) => String(t.gameMode?._id || t.gameMode) === String(modeId)
        );
      } else if (gameMode?.name) {
        filtered = filtered.filter((t) => t.gameMode?.name === gameMode.name);
      }

      if (selectedTab === 'upcoming') {
        filtered = filtered.filter((t) => {
          const s = t.lifecycleStatus || t.status;
          return s === 'incoming' || s === 'upcoming';
        });
      } else if (selectedTab === 'ongoing') {
        filtered = filtered.filter((t) => {
          const s = t.lifecycleStatus || t.status;
          return s === 'ongoing' || s === 'live';
        });
      } else if (selectedTab === 'completed') {
        filtered = filtered.filter((t) => {
          const s = t.lifecycleStatus || t.status;
          return s === 'completed' || s === 'result_published';
        });
      }

      filtered = filtered.filter((t) => {
        const s = t.lifecycleStatus || t.status;
        return s !== 'draft';
      });

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
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title={headerTitle} onBack={() => navigation.goBack()} />

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const active = selectedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setSelectedTab(tab.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.cyan} />
          <Text style={pageStyles.loadingText}>Loading matches...</Text>
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={tournaments}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <AppIcon name="trophy-outline" size={48} muted />
              <Text style={pageStyles.emptyTitle}>No matches here</Text>
              <Text style={pageStyles.emptyText}>Check other tabs or come back later</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TournamentCard
              item={item}
              gameMode={gameMode}
              gameModeImage={gameModeImage}
              onJoin={handleJoin}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: PAGE.cardAlt,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: PAGE.purple,
  },
  tabLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.muted,
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: PAGE.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PAGE.border,
    marginBottom: 14,
  },
  banner: {
    height: 168,
    justifyContent: 'flex-end',
  },
  bannerRules: {
    alignSelf: 'flex-end',
    margin: 10,
    maxWidth: '58%',
    backgroundColor: 'rgba(8,10,22,0.78)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
  },
  rulesTag: {
    backgroundColor: '#DC2626',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rulesPreview: {
    color: '#E2E8F0',
    fontFamily: FONTS.bold,
    fontSize: 9,
    lineHeight: 13,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
    lineHeight: 20,
  },
  timeLine: {
    marginTop: 4,
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.muted,
  },
  spotRow: { marginTop: 12 },
  spotBlock: { flex: 1 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PAGE.cyan,
    borderRadius: 3,
  },
  progressFull: {
    backgroundColor: '#EF4444',
  },
  spotMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  spotsLeft: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.cyan,
  },
  spotsFull: {
    color: '#F87171',
  },
  spotCount: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  matchType: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: PAGE.gold,
    letterSpacing: 0.4,
  },
  joinBtn: {
    backgroundColor: PAGE.green,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 128,
    alignItems: 'center',
  },
  joinBtnMuted: {
    backgroundColor: '#2B3348',
  },
  joinBtnJoined: {
    backgroundColor: PAGE.purple,
  },
  joinBtnFull: {
    backgroundColor: '#2563EB',
  },
  joinBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
});
