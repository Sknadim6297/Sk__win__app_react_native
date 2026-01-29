import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';
import { tournamentService, userService, walletService } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tournamentStats, setTournamentStats] = useState({ joined: 0, won: 0 });
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Landing');
  };

  const announcements = [];
  const featuredMatches = [];

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
      
      const [balanceData, profileData, tournamentData] = await Promise.all([
        walletService.getBalance(),
        userService.getProfile(),
        tournamentService.getList(),
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
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SKWinLogo size={80} />
          <View>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.usernameText}>
              {user?.username ? `@${user.username}` : '@Player'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="wallet" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>₹{walletBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="trophy-variant" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{tournamentStats.won}</Text>
            <Text style={styles.statLabel}>Tournaments Won</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="target" size={24} color={COLORS.error} />
            <Text style={styles.statValue}>{tournamentStats.joined}</Text>
            <Text style={styles.statLabel}>Tournaments Joined</Text>
          </View>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📢 Announcements</Text>
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

        {/* Featured Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Featured Matches</Text>
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

        {/* Upcoming Tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Upcoming Tournaments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tournaments')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingTournaments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming tournaments</Text>
            </View>
          ) : (
            upcomingTournaments.map((tournament) => (
              <TouchableOpacity 
                key={tournament._id} 
                style={styles.tournamentCard}
                onPress={() => navigation.navigate('Tournaments')}
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
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Tournaments')}
            >
              <MaterialCommunityIcons name="tournament" size={24} color={COLORS.accent} />
              <Text style={styles.actionText}>Join Tournament</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Wallet')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={COLORS.success} />
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('History')}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
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