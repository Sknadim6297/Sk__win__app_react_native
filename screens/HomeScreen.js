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
import SKWinLogo from '../components/SKWinLogo';
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
  { id: 'support', label: 'Support', icon: 'headset', route: 'SupportTickets' },
  { id: 'whatsapp', label: 'Whatsapp', icon: 'whatsapp', action: 'whatsapp' },
  { id: 'telegram', label: 'Telegram', icon: 'telegram', action: 'telegram' },
  { id: 'wallet', label: 'My Wallet', icon: 'wallet', route: 'WalletTab' },
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
              <SKWinLogo size={44} rounded />
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
              <AppIcon name="headset" size={26} light />
              {(openSupportTickets > 0 || unreadNotifications > 0) && (
                <View style={styles.badge99}>
                  <Text style={styles.badge99Text}>
                    {(openSupportTickets || unreadNotifications) > 99
                      ? '99'
                      : openSupportTickets || unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.coinPill}
              onPress={() => navigation.navigate('WalletTab')}
            >
              <AppIcon name="coins" size={24} />
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

        {/* Quick links — squircle tiles */}
        <View style={styles.quickRow}>
          {QUICK_LINKS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickTile}
              activeOpacity={0.85}
              onPress={() => handleQuickLink(item)}
            >
              <View style={styles.quickIconSquircle}>
                <AppIcon name={item.icon} size={36} light />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exclusive */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.contestsTitle}>Exclusive</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.contestsSub}>Big Winnings For ALL</Text>
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
            { key: 'upcoming', label: 'Upcoming', icon: 'clock-outline', count: upcomingCount },
            { key: 'ongoing', label: 'Ongoing', icon: 'broadcast', count: ongoingCount },
            { key: 'completed', label: 'Completed', icon: 'check-circle-outline', count: completedCount },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.contestCard}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.85}
            >
              <View style={styles.contestIconWrap}>
                <AppIcon name={item.icon} size={48} accent="00F2FF" />
              </View>
              <Text style={styles.contestLabel}>{item.label}</Text>
              {item.count > 0 ? (
                <View style={styles.contestCountBadge}>
                  <Text style={styles.contestCount}>{item.count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

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
                const url = supportLinks.whatsapp || 'https://wa.me/';
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
                <AppIcon name={icon.name} size={52} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SupportTickets')}
        activeOpacity={0.9}
      >
        <AppIcon name="headset" size={32} light />
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge99: {
    position: 'absolute',
    top: 0,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#050A12',
  },
  badge99Text: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.white,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1520',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 42,
  },
  coinText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.white,
    minWidth: 16,
    textAlign: 'center',
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
    marginBottom: 26,
    gap: 10,
  },
  quickTile: {
    flex: 1,
    alignItems: 'center',
    maxWidth: (width - 32 - 30) / 4,
  },
  quickIconSquircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#5E69C1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5E69C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  quickLabel: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
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
  contestCountBadge: {
    marginTop: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contestCount: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#00E5FF',
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
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 96,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});
