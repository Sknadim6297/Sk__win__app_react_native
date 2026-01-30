import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';
import { tournamentService, userService, walletService, gameService } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tournamentStats, setTournamentStats] = useState({ joined: 0, won: 0 });
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [contestTab, setContestTab] = useState('upcoming'); // upcoming, ongoing, completed
  const [sliderIndex, setSliderIndex] = useState(0);

  // Slider data with tutorial videos
  const tutorials = [
    {
      id: 1,
      title: 'How to Join Tournament',
      description: 'Learn step by step how to join any tournament',
      icon: 'tournament',
      videoLink: 'https://youtu.be/tutorial-join-tournament',
      color: COLORS.accent,
      image: require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg'),
    },
    {
      id: 2,
      title: 'Wallet Guide',
      description: 'Add money and manage your wallet',
      icon: 'wallet-outline',
      videoLink: 'https://youtu.be/tutorial-wallet',
      color: '#4CAF50',
      image: require('../assets/images/87904deacf9b547a95f019e0a322152a.jpg'),
    },
    {
      id: 3,
      title: 'Winning Strategy',
      description: 'Tips to increase your winning chances',
      icon: 'trophy-outline',
      videoLink: 'https://youtu.be/tutorial-strategy',
      color: '#FFD700',
      image: require('../assets/images/87904deacf9b547a95f019e0a322152a77.jpg'),
    },
    {
      id: 4,
      title: 'Leaderboard',
      description: 'Check rankings and top players',
      icon: 'podium-gold',
      videoLink: 'https://youtu.be/tutorial-leaderboard',
      color: '#FF6B6B',
      image: require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg'),
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigation.replace('Landing');
  };

  const announcements = [];
  const featuredMatches = [];

  const getDefaultGames = () => [
    {
      _id: '1',
      name: 'Free Fire',
      image: require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg'),
      rating: 4.8,
      players: '2.5M Players',
    },
    {
      _id: '2',
      name: 'PUBG Mobile',
      image: require('../assets/images/87904deacf9b547a95f019e0a322152a.jpg'),
      rating: 4.7,
      players: '1.8M Players',
    },
    {
      _id: '3',
      name: 'Call of Duty',
      image: require('../assets/images/87904deacf9b547a95f019e0a322152a77.jpg'),
      rating: 4.6,
      players: '950K Players',
    },
  ];

  const getTimeRemaining = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start - now;

    if (diff <= 0) return 'Live';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const loadHomeData = useCallback(async () => {
    try {
      // Load games first (public endpoint, doesn't require auth)
      const gamesData = await gameService.getPopularGames().catch(() => []);
      const games = Array.isArray(gamesData) && gamesData.length > 0 
        ? gamesData 
        : getDefaultGames();
      setPopularGames(games);

      // Only load user-specific data if user is logged in
      if (user) {
        const [balanceData, profileData, tournamentData] = await Promise.all([
          walletService.getBalance().catch(() => ({ balance: 0 })),
          userService.getProfile().catch(() => ({ tournament: {} })),
          tournamentService.getList().catch(() => []),
        ]);

        setWalletBalance(balanceData?.balance ?? 0);

        const tournament = profileData?.tournament || {};
        setTournamentStats({
          joined: tournament.participatedCount ?? 0,
          won: tournament.wins ?? 0,
        });

        const upcoming = Array.isArray(tournamentData)
          ? tournamentData
              .filter((tournament) => tournament.status === 'upcoming')
              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
              .slice(0, 2)
          : [];

        setUpcomingTournaments(upcoming);
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
      // Fallback to default games if API fails
      setPopularGames(getDefaultGames());
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header with Wallet, Notifications, and Support Icons */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SKWinLogo size={50} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Player'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* Wallet Balance Icon */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('WalletTab')}
          >
            <View style={styles.walletBadge}>
              <MaterialCommunityIcons name="wallet" size={18} color={COLORS.white} />
              <Text style={styles.walletText}>₹{walletBalance.toFixed(0)}</Text>
            </View>
          </TouchableOpacity>

          {/* Notifications Icon */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.notificationBell}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.accent} />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>

          {/* Support/Help Icon */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('ContactUs')}
          >
            <MaterialCommunityIcons name="headset" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
        {/* Tutorial Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>How To Play</Text>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            style={styles.sliderContainer}
            onScroll={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffsetX / (300 + 12));
              setSliderIndex(index);
            }}
          >
            {tutorials.map((tutorial) => (
              <TouchableOpacity 
                key={tutorial.id} 
                style={styles.sliderCard}
              >
                <View 
                  style={[
                    styles.sliderCardHeader,
                    { backgroundColor: tutorial.color },
                  ]}
                >
                  <Image
                    source={tutorial.image}
                    style={styles.sliderCardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.sliderCardImageOverlay} />
                </View>
                <View style={styles.sliderCardContent}>
                  <Text style={styles.sliderTitle}>{tutorial.title}</Text>
                  <Text style={styles.sliderDescription}>{tutorial.description}</Text>
                  <TouchableOpacity 
                    style={styles.videoButton}
                    onPress={() => {
                      // Open video link
                      console.log('Playing video:', tutorial.videoLink);
                    }}
                  >
                    <MaterialCommunityIcons name="play" size={16} color={COLORS.white} />
                    <Text style={styles.videoButtonText}>Watch Video</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Slider Dots */}
          <View style={styles.dotsContainer}>
            {tutorials.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  sliderIndex === index && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Announcements */}
        {false && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="bullhorn-outline" size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Announcements</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {announcements.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No announcements yet</Text>
            </View>
          ) : (
            announcements.map((announcement) => (
              <View key={announcement.id} style={styles.announcementCard}>
                <View style={styles.announcementHeader}>
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementTime}>{announcement.time}</Text>
                </View>
                <Text style={styles.announcementMessage}>{announcement.message}</Text>
              </View>
            ))
          )}
        </View>
        )}

        {/* Featured Matches */}
        {false && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="fire" size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Featured Matches</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Watch All</Text>
            </TouchableOpacity>
          </View>
          
          {featuredMatches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No featured matches right now</Text>
            </View>
          ) : (
            featuredMatches.map((match) => (
              <TouchableOpacity key={match.id} style={styles.featuredMatchCard}>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTitle}>{match.title}</Text>
                  <View style={styles.matchDetails}>
                    <View style={styles.matchStatus}>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: match.status === 'Live' ? COLORS.error : COLORS.accent }
                      ]} />
                      <Text style={styles.statusText}>{match.status}</Text>
                    </View>
                    <View style={styles.viewerCount}>
                      <Ionicons name="eye" size={14} color={COLORS.gray} />
                      <Text style={styles.viewerText}>{match.viewers} watching</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.matchPrize}>
                  <Text style={styles.prizeText}>{match.prize}</Text>
                  <Ionicons name="play-circle" size={32} color={COLORS.accent} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        )}

        {/* My Contests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="trophy-outline" size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>My Contests</Text>
            </View>
          </View>

          {/* Contest Tabs */}
          <View style={styles.tabsContainer}>
            {['upcoming', 'ongoing', 'completed'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  contestTab === tab && styles.tabButtonActive,
                ]}
                onPress={() => setContestTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    contestTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contest Content */}
          {contestTab === 'upcoming' && (
            upcomingTournaments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No upcoming contests</Text>
              </View>
            ) : (
              upcomingTournaments.map((tournament) => (
                <TouchableOpacity 
                  key={tournament._id} 
                  style={styles.tournamentCard}
                  onPress={() => navigation.navigate('TournamentDetails', { tournamentId: tournament._id })}
                >
                  <View style={styles.tournamentHeader}>
                    <Text style={styles.tournamentTitle}>{tournament.name}</Text>
                    <View style={styles.timeTag}>
                      <Ionicons name="time" size={12} color={COLORS.white} />
                      <Text style={styles.timeText}>{getTimeRemaining(tournament.startDate)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.tournamentDetails}>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="currency-inr" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>₹{tournament.entryFee}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>₹{tournament.prizePool}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="people" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>
                        {(tournament.participantCount ?? tournament.registeredPlayers?.length ?? 0)}/{tournament.maxPlayers}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>Join Now</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )
          )}

          {contestTab === 'ongoing' && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No ongoing contests</Text>
            </View>
          )}

          {contestTab === 'completed' && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No completed contests</Text>
            </View>
          )}
        </View>

        {/* Games Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="gamepad-variant" size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Popular Games</Text>
            </View>
          </View>

          {popularGames.length > 0 ? (
            popularGames.map((game) => (
              <TouchableOpacity 
                key={game._id} 
                style={styles.gameCard}
                onPress={() => navigation.navigate('GameModes', { gameId: game._id })}
                activeOpacity={0.8}
              >
                {/* Game Image */}
                <View style={styles.gameImageContainer}>
                  {game.image ? (
                    <Image
                      source={typeof game.image === 'string' ? { uri: game.image } : game.image}
                      style={styles.gameImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.gameImage, { backgroundColor: COLORS.darkGray }]}>
                      <MaterialCommunityIcons name="gamepad-variant" size={40} color={COLORS.gray} />
                    </View>
                  )}
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <View style={styles.ratingContainer}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>{game.rating} • {game.players}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No games available</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Tournament')}
            >
              <MaterialCommunityIcons name="tournament" size={24} color={COLORS.accent} />
              <Text style={styles.actionText}>Join Tournament</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('WalletTab')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={COLORS.success} />
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MyWallet')}
            >
              <MaterialCommunityIcons name="history" size={24} color={COLORS.gray} />
              <Text style={styles.actionText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '400',
  },
  userName: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  walletText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  notificationBell: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSmall: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  announcementTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  announcementMessage: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  featuredMatchCard: {
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  matchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  matchPrize: {
    alignItems: 'center',
  },
  prizeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 4,
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 4,
  },
  tournamentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 4,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  gameCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  gameImageContainer: {
    backgroundColor: COLORS.darkGray,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  gameImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  gameButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  gameActionButton: {
    width: '48%',
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameActionText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  sliderSection: {
    marginVertical: 24,
  },
  sliderHeader: {
    marginBottom: 12,
  },
  sliderContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  sliderCard: {
    width: 300,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  sliderCardHeader: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  sliderCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  sliderCardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sliderCardContent: {
    padding: 14,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  sliderDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 10,
    lineHeight: 16,
  },
  videoButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  videoButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.darkGray,
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;