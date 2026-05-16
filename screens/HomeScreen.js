import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Share,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import AppIcon from '../components/ui/AppIcon';
import DynamicAppIcon from '../components/ui/DynamicAppIcon';
import SKWinLogo from '../components/SKWinLogo';
import { EMPTY_APP_ICONS } from '../constants/appIconSlots';
import { BRAND } from '../constants/branding';
import {
  tournamentService,
  userService,
  walletService,
  gameService,
  notificationService,
  configService,
  sliderService,
  supportService,
} from '../services/api';
import HomeImageSlider from '../components/home/HomeImageSlider';

const { width } = Dimensions.get('window');
const FF_IMAGE = require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');
const BGMI_IMAGE = require('../assets/images/87904deacf9b547a95f019e0a322152a.jpg');

const QUICK_LINKS = [
  { id: 'support', label: 'Support', iconKey: 'support', fallback: 'headset', route: 'SupportTickets' },
  { id: 'whatsapp', label: 'Whatsapp', iconKey: 'whatsapp', fallback: 'whatsapp', action: 'whatsapp' },
  { id: 'telegram', label: 'Telegram', iconKey: 'telegram', fallback: 'telegram', action: 'telegram' },
  { id: 'wallet', label: 'My Wallet', iconKey: 'wallet', fallback: 'wallet', route: 'WalletTab' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [walletBalance, setWalletBalance] = useState(0);
  const [popularGames, setPopularGames] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [ongoingCount, setOngoingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [openSupportTickets, setOpenSupportTickets] = useState(0);
  const [latestNews, setLatestNews] = useState({ text: '🏆 Tournaments Are Back! 🎮', isActive: true });
  const [supportLinks, setSupportLinks] = useState({});
  const [homeSliders, setHomeSliders] = useState([]);
  const [slidersLoading, setSlidersLoading] = useState(true);
  const [appIcons, setAppIcons] = useState(EMPTY_APP_ICONS);

  const loadHomeData = useCallback(async () => {
    try {
      setSlidersLoading(true);
      const [gamesData, homeConfig, slidersData] = await Promise.all([
        gameService.getPopularGames().catch(() => []),
        configService.getHome().catch(() => ({})),
        sliderService.getActive().catch(() => []),
      ]);
      const sliderList = Array.isArray(slidersData) ? slidersData : [];
      setHomeSliders(sliderList);
      setSlidersLoading(false);
      if (__DEV__) {
        console.log('[Home] sliders loaded:', sliderList.length, sliderList[0]?.image?.slice?.(0, 60));
      }
      setPopularGames(Array.isArray(gamesData) && gamesData.length > 0 ? gamesData : []);
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
      setAppIcons({ ...EMPTY_APP_ICONS, ...(homeConfig.appIcons || {}) });

      if (!user) return;

      const [balanceData, myTournamentsData, notificationsResponse, myTickets] = await Promise.all([
        walletService.getBalance().catch(() => ({ balance: 0 })),
        tournamentService.getMyTournaments().catch(() => []),
        notificationService.getAll().catch(() => ({ notifications: [] })),
        supportService.getMyTickets().catch(() => []),
      ]);

      setWalletBalance(balanceData?.balance ?? 0);
      const tournamentList = Array.isArray(myTournamentsData) ? myTournamentsData : [];
      setUpcomingCount(tournamentList.filter((t) => t.status === 'incoming' || t.status === 'upcoming').length);
      setOngoingCount(tournamentList.filter((t) => t.status === 'ongoing' || t.status === 'live').length);
      setCompletedCount(tournamentList.filter((t) => t.status === 'completed').length);
      setUnreadNotifications(
        (notificationsResponse?.notifications || []).filter((n) => !n?.isRead).length
      );
      const tickets = Array.isArray(myTickets) ? myTickets : [];
      setOpenSupportTickets(
        tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length
      );
    } catch (e) {
      console.error('Home load error:', e);
      setSlidersLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const displayName = user?.username || user?.name || 'Player';
  const exclusiveGames = [
    {
      id: popularGames[0]?._id || 'ff',
      name: popularGames[0]?.name || 'Free Fire',
      image: popularGames[0]?.image
        ? typeof popularGames[0].image === 'string'
          ? { uri: popularGames[0].image }
          : popularGames[0].image
        : FF_IMAGE,
      gradient: ['#FF6B00', '#E55A00'],
    },
    {
      id: popularGames[1]?._id || 'bgmi',
      name: popularGames[1]?.name || 'BGMI',
      image: popularGames[1]?.image
        ? typeof popularGames[1].image === 'string'
          ? { uri: popularGames[1].image }
          : popularGames[1].image
        : BGMI_IMAGE,
      gradient: ['#22C55E', '#16A34A'],
    },
  ];

  const handleQuickLink = (item) => {
    if (item.route) {
      navigation.navigate(item.route);
      return;
    }
    if (item.action === 'whatsapp') {
      const url = supportLinks.whatsapp || 'https://wa.me/';
      Linking.openURL(url.startsWith('http') ? url : `https://wa.me/${url}`).catch(() => {});
      return;
    }
    if (item.action === 'telegram') {
      const url = supportLinks.telegram || 'https://t.me/';
      Linking.openURL(url.startsWith('http') ? url : `https://t.me/${url}`).catch(() => {});
    }
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

  const openGame = (gameId) => {
    if (gameId && gameId !== 'ff' && gameId !== 'bgmi') {
      navigation.navigate('GameModes', { gameId });
    } else {
      navigation.navigate('GameModes', { gameId: popularGames[0]?._id });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />
      <View style={styles.glowPurple} pointerEvents="none" />
      <View style={styles.glowOrange} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              {appIcons.appLogo ? (
                <SKWinLogo size={44} logoUrl={appIcons.appLogo} rounded />
              ) : (
                <SKWinLogo size={44} />
              )}
            </View>
            <View>
              <Text style={styles.username}>{displayName}</Text>
              <Text style={styles.brandTag}>{BRAND.name}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.supportIconBtn}
              onPress={() => navigation.navigate('SupportTickets')}
            >
              <AppIcon name="headset" size="md" color={COLORS.white} />
              {openSupportTickets > 0 && (
                <View style={styles.badge99}>
                  <Text style={styles.badge99Text}>
                    {openSupportTickets > 99 ? '99' : openSupportTickets}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.coinPill}
              onPress={() => navigation.navigate('WalletTab')}
            >
              <AppIcon name="circle-multiple" size="sm" color="#FBBF24" />
              <Text style={styles.coinText}>{walletBalance.toFixed(0)}</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Quick links */}
        <View style={styles.quickRow}>
          {QUICK_LINKS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickTile}
              activeOpacity={0.85}
              onPress={() => handleQuickLink(item)}
            >
              <DynamicAppIcon
                iconKey={item.iconKey}
                icons={appIcons}
                name={item.fallback}
                size="md"
                color={COLORS.white}
              />
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exclusive */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Exclusive</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>Big Winnings For ALL</Text>
        </View>

        <View style={styles.gamesRow}>
          {exclusiveGames.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              activeOpacity={0.9}
              onPress={() => openGame(game.id)}
            >
              <Image source={game.image} style={styles.gameCardImage} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.gameOverlay} />
              <View style={styles.fairPlayBadge}>
                <AppIcon name="shield-check" size="xs" color="#4ADE80" />
                <Text style={styles.fairPlayText}>FairPlay : ON</Text>
              </View>
              <Text style={styles.gameCardTitle}>{game.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Contests */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>My Contests</Text>
            <AppIcon name="check-decagram" size="sm" color="#38BDF8" />
          </View>
          <Text style={styles.sectionSub}>Your Tournaments Journey</Text>
        </View>

        <View style={styles.contestsRow}>
          {[
            { key: 'upcoming', label: 'Upcoming', iconKey: 'upcoming', fallback: 'clock-outline', count: upcomingCount },
            { key: 'ongoing', label: 'Ongoing', iconKey: 'ongoing', fallback: 'broadcast', count: ongoingCount },
            { key: 'completed', label: 'Completed', iconKey: 'completed', fallback: 'check-circle-outline', count: completedCount },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.contestCard}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.85}
            >
              <DynamicAppIcon
                iconKey={item.iconKey}
                icons={appIcons}
                name={item.fallback}
                size="lg"
                color="#22D3EE"
              />
              <Text style={styles.contestLabel}>{item.label}</Text>
              {item.count > 0 && <Text style={styles.contestCount}>{item.count}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Share + WhatsApp */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.9}>
            <DynamicAppIcon iconKey="share" icons={appIcons} name="share-variant" size="md" color={COLORS.white} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() => {
              const url = supportLinks.whatsapp || 'https://wa.me/';
              Linking.openURL(url.startsWith('http') ? url : `https://wa.me/${url}`).catch(() => {});
            }}
            activeOpacity={0.9}
          >
            <DynamicAppIcon iconKey="whatsapp" icons={appIcons} name="whatsapp" size="md" color={COLORS.white} />
            <Text style={styles.whatsappBtnText}>Join on Whatsapp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialRow}>
          {[
            { key: 'instagram', action: 'instagram', fallback: 'instagram' },
            { key: 'telegram', action: 'telegram', fallback: 'telegram' },
            { key: 'whatsapp', action: 'whatsapp', fallback: 'whatsapp' },
          ].map((icon) => (
            <TouchableOpacity
              key={icon.key}
              style={styles.socialCircle}
              onPress={() => {
                if (icon.action === 'whatsapp') {
                  const url = supportLinks.whatsapp || 'https://wa.me/';
                  Linking.openURL(url.startsWith('http') ? url : `https://wa.me/${url}`).catch(() => {});
                } else if (icon.action === 'telegram') {
                  const url = supportLinks.telegram || 'https://t.me/';
                  Linking.openURL(url.startsWith('http') ? url : `https://t.me/${url}`).catch(() => {});
                } else if (icon.action === 'instagram') {
                  const url = supportLinks.instagram || 'https://instagram.com/';
                  Linking.openURL(url.startsWith('http') ? url : `https://instagram.com/${url}`).catch(() => {});
                }
              }}
            >
              <DynamicAppIcon
                iconKey={icon.key}
                icons={appIcons}
                name={icon.fallback}
                size="md"
                color={COLORS.white}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SupportTickets')}
        activeOpacity={0.9}
      >
        <DynamicAppIcon iconKey="support" icons={appIcons} name="headset" size="lg" color={COLORS.white} />
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceDark,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    ...TEXT.h3,
    color: COLORS.white,
  },
  brandTag: {
    ...TEXT.label,
    color: '#FBBF24',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportIconBtn: {
    position: 'relative',
    padding: 4,
  },
  badge99: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 22,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badge99Text: {
    ...TEXT.overline,
    fontSize: 11,
    color: COLORS.white,
    letterSpacing: 0,
    textTransform: 'none',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  coinText: {
    ...TEXT.label,
    fontFamily: FONTS.bold,
    color: COLORS.white,
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
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  quickTile: {
    flex: 1,
    backgroundColor: 'rgba(88, 70, 140, 0.45)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickLabel: {
    ...TEXT.labelSm,
    color: COLORS.white,
    textAlign: 'center',
  },
  sectionHead: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...TEXT.h2,
    color: COLORS.white,
  },
  sectionSub: {
    ...TEXT.caption,
    color: COLORS.gray,
    marginTop: 6,
  },
  liveBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveText: {
    ...TEXT.overline,
    fontSize: 11,
    color: COLORS.white,
  },
  gamesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  gameCard: {
    flex: 1,
    height: width * 0.52,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceDark,
  },
  gameCardImage: {
    width: '100%',
    height: '100%',
  },
  gameOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  fairPlayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 50, 140, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  fairPlayText: {
    ...TEXT.labelSm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  gameCardTitle: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    ...TEXT.h3,
    color: COLORS.white,
  },
  contestsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  contestCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    gap: 8,
  },
  contestLabel: {
    ...TEXT.label,
    color: COLORS.gray,
  },
  contestCount: {
    ...TEXT.label,
    fontFamily: FONTS.bold,
    color: '#22D3EE',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  shareBtnText: {
    ...TEXT.buttonSm,
    color: COLORS.white,
  },
  whatsappBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  whatsappBtnText: {
    ...TEXT.buttonSm,
    color: COLORS.white,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
