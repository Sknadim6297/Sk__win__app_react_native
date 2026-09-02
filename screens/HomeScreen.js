import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { getLayoutWidth } from '../utils/layout';
import AppIcon from '../components/ui/AppIcon';
import AppHeader from '../components/navigation/AppHeader';
import GameModePoster from '../components/home/GameModePoster';
import { BRAND } from '../constants/branding';
import { SUPPORT_LINKS } from '../constants/supportContacts';
import {
  gameService,
  configService,
  sliderService,
} from '../services/api';
import HomeImageSlider from '../components/home/HomeImageSlider';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { sortBySortOrder } from '../utils/sortBySortOrder';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;
/** Two-column grid — wide, low-height landscape banners */
const MODE_CARD_WIDTH = (getLayoutWidth() - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
const MODE_CARD_HEIGHT = Math.round(MODE_CARD_WIDTH * 0.58);

export default function HomeScreen({ navigation }) {
  const [esportsModes, setEsportsModes] = useState([]);
  const [esportsGameId, setEsportsGameId] = useState(null);
  const [latestNews, setLatestNews] = useState({ text: '🏆 Tournaments Are Back! 🎮', isActive: true });
  const [supportLinks, setSupportLinks] = useState({});
  const [homeSliders, setHomeSliders] = useState([]);
  const [slidersLoading, setSlidersLoading] = useState(true);

  const loadHomeData = useCallback(async ({ silent } = {}) => {
    try {
      if (!silent) setSlidersLoading(true);
      const [gamesData, homeConfig, slidersData] = await Promise.all([
        gameService.getGamesList().catch(() => []),
        configService.getHome().catch(() => ({})),
        sliderService.getActive().catch(() => []),
      ]);
      const sliderList = Array.isArray(slidersData) ? slidersData : [];
      setHomeSliders(sliderList);
      setSlidersLoading(false);
      if (__DEV__) {
        console.log('[Home] sliders loaded:', sliderList.length, sliderList[0]?.image?.slice?.(0, 60));
      }
      const games = Array.isArray(gamesData) ? gamesData : [];
      const freeFire =
        games.find((g) => /free\s*fire/i.test(String(g.name || ''))) || games[0] || null;
      setEsportsGameId(freeFire?._id || null);
      if (freeFire?._id) {
        const modesData = await gameService.getGameModes(freeFire._id).catch(() => []);
        const modes = sortBySortOrder(Array.isArray(modesData) ? modesData : []).map((mode, index) => {
          const sortOrder = Number(mode.sortOrder);
          return {
            id: mode._id || mode.id || String(index),
            name: (mode.name || 'GAME MODE').toUpperCase(),
            tournamentCount: mode.tournamentCount ?? mode.liveCount ?? mode.activeTournaments ?? 0,
            image: mode.image ? { uri: resolveMediaUrl(mode.image) } : null,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
          };
        });
        setEsportsModes(modes);
      } else {
        setEsportsModes([]);
      }
      if (homeConfig.latestNews) {
        const tickerText =
          homeConfig.latestAnnouncementTitle?.trim() ||
          homeConfig.latestNews.text;
        setLatestNews({
          ...homeConfig.latestNews,
          text: tickerText || homeConfig.latestNews.text,
        });
      }
      setSupportLinks(homeConfig.supportLinks || {});
    } catch (e) {
      console.error('Home load error:', e);
      setSlidersLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const { refreshControl } = usePullToRefresh(loadHomeData);

  const openMode = (mode) => {
    if (!mode?.id || !esportsGameId) return;
    navigation.navigate('GameDetails', {
      gameMode: { ...mode, _id: mode.id },
      gameId: esportsGameId,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${BRAND.fullName} — compete in Free Fire tournaments and win real prizes!`,
        title: BRAND.name,
      });
    } catch (e) {
      /* dismissed */
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1224" />
      <View style={styles.glowPurple} pointerEvents="none" />
      <View style={styles.glowOrange} pointerEvents="none" />
      <AppHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.scroll}
        refreshControl={refreshControl}
      >

        {latestNews?.isActive !== false && (
          <TouchableOpacity
            style={styles.newsBar}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ImportantUpdates')}
          >
            <View style={styles.newsTag}>
              <Text style={styles.newsTagText}>LATEST</Text>
            </View>
            <Text style={styles.newsText} numberOfLines={1}>
              {latestNews.text || '🏆 Tournaments Are Back! 🎮'}
            </Text>
            <AppIcon name="chevron-right" size="sm" color="#38BDF8" />
          </TouchableOpacity>
        )}

        <HomeImageSlider sliders={homeSliders} loading={slidersLoading} />

        {/* My Contests — directly after banner */}
        <View style={styles.contestsSectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.contestsTitle}>My Contests</Text>
            <View style={styles.verifiedBadge}>
              <AppIcon name="check-decagram" size={16} accent="38BDF8" />
            </View>
          </View>
          <Text style={styles.contestsSub}>Your Tournaments Journey</Text>
        </View>

        <View style={styles.contestsRow}>
          {[
            { key: 'upcoming', label: 'Upcoming', icon: 'clock-outline' },
            { key: 'live', label: 'Ongoing', icon: 'broadcast' },
            { key: 'completed', label: 'Completed', icon: 'check-circle-outline' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.contestCard}
              onPress={() => navigation.navigate('MyContests', { initialTab: item.key })}
              activeOpacity={0.85}
            >
              <View style={styles.contestIconWrap}>
                <AppIcon name={item.icon} size={44} accent="00F2FF" />
              </View>
              <Text style={styles.contestLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Esports Games — all active games */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.contestsTitle}>Esports Games</Text>
          </View>
        </View>

        {esportsModes.length > 0 ? (
          <View style={styles.gamesRow}>
            {esportsModes.map((mode) => (
              <GameModePoster
                key={mode.id}
                item={mode}
                width={MODE_CARD_WIDTH}
                height={MODE_CARD_HEIGHT}
                onPress={() => openMode(mode)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyGames}>No Free Fire modes available yet.</Text>
        )}

        {/* Share + WhatsApp + social */}
        <View style={styles.bottomActionsBlock}>
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.9} style={styles.shareBtnOuter}>
              <LinearGradient
                colors={['#9B6DFF', '#5B4FCF']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shareBtn}
              >
                <AppIcon name="share-variant" size={26} light />
                <Text style={styles.shareBtnText}>Share</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const url = supportLinks.whatsapp || SUPPORT_LINKS.whatsapp;
                Linking.openURL(url.startsWith('http') ? url : `https://wa.me/${url}`).catch(() => {});
              }}
              activeOpacity={0.9}
              style={styles.whatsappBtnOuter}
            >
              <LinearGradient
                colors={['#3DDC84', '#1A9B5C']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.whatsappBtn}
              >
                <AppIcon name="whatsapp" size={26} light />
                <Text style={styles.whatsappBtnText} numberOfLines={1}>
                  Join on Whatsapp
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.socialRow}>
            {[
              { name: 'instagram', action: 'instagram' },
              { name: 'telegram', action: 'telegram' },
              { name: 'whatsapp', action: 'whatsapp' },
            ].map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={styles.socialCircle}
                activeOpacity={0.85}
                onPress={() => {
                  if (icon.action === 'whatsapp') {
                    const url = supportLinks.whatsapp || SUPPORT_LINKS.whatsapp;
                    Linking.openURL(url.startsWith('http') ? url : `https://wa.me/${url}`).catch(() => {});
                  } else if (icon.action === 'telegram') {
                    const url = supportLinks.telegram || SUPPORT_LINKS.telegram;
                    Linking.openURL(url.startsWith('http') ? url : `https://t.me/${url}`).catch(() => {});
                  } else if (icon.action === 'instagram') {
                    const url = supportLinks.instagram || SUPPORT_LINKS.instagram;
                    Linking.openURL(url.startsWith('http') ? url : `https://instagram.com/${url}`).catch(() => {});
                  }
                }}
              >
                <AppIcon name={icon.name} size={56} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  glowPurple: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
  },
  glowOrange: {
    position: 'absolute',
    top: 200,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  newsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121B33',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  newsTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newsTagText: {
    ...TEXT.overline,
    fontSize: 11,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  newsText: {
    flex: 1,
    ...TEXT.bodyMedium,
    color: COLORS.white,
  },
  sectionHead: {
    marginBottom: 12,
  },
  contestsSectionHead: {
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  contestsTitle: {
    fontSize: 21,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#8A96A3',
    marginTop: 6,
  },
  contestsSub: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#8A96A3',
    marginTop: 5,
    letterSpacing: 0.1,
  },
  gamesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 26,
    justifyContent: 'space-between',
  },
  emptyGames: {
    ...TEXT.body,
    color: COLORS.gray,
    marginBottom: 26,
  },
  contestsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  contestCard: {
    flex: 1,
    minHeight: 128,
    backgroundColor: '#121A21',
    borderRadius: 16,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contestIconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  contestLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bottomActionsBlock: {
    marginTop: 4,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    alignItems: 'stretch',
  },
  shareBtnOuter: {
    flex: 0.88,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 56,
  },
  shareBtnText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  whatsappBtnOuter: {
    flex: 1.12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 56,
  },
  whatsappBtnText: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 4,
  },
  socialCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
