import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/theme';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Landing');
  };

  // Mock data for upcoming tournaments
  const upcomingTournaments = [
    {
      id: 1,
      title: 'Elite Battle Royale',
      startTime: '2 hours',
      entryFee: 100,
      prizePool: 5000,
      participants: 45,
      maxParticipants: 100,
    },
    {
      id: 2,
      title: 'Sunday Special',
      startTime: '6 hours',
      entryFee: 30,
      prizePool: 1200,
      participants: 23,
      maxParticipants: 80,
    },
  ];

  // Mock data for featured matches
  const featuredMatches = [
    {
      id: 1,
      title: 'Pro Players Championship',
      status: 'Live',
      viewers: 2500,
      prize: '₹25,000',
    },
    {
      id: 2,
      title: 'Rising Stars Tournament',
      status: 'Starting Soon',
      viewers: 850,
      prize: '₹8,000',
    },
  ];

  // Mock announcements
  const announcements = [
    {
      id: 1,
      title: '🎉 New Tournament Format Available!',
      message: 'Try our new Clash Squad tournaments with faster gameplay and bigger rewards.',
      time: '2 hours ago',
      type: 'update',
    },
    {
      id: 2,
      title: '💰 Bonus Weekend Event',
      message: 'Double prize pools for all tournaments this weekend. Don\'t miss out!',
      time: '1 day ago',
      type: 'event',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoSmall}>
            <MaterialCommunityIcons name="trophy" size={28} color={COLORS.white} />
          </View>
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
            <Text style={styles.statValue}>₹1,250</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="trophy-variant" size={24} color="#FFD700" />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Tournaments Won</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="target" size={24} color={COLORS.error} />
            <Text style={styles.statValue}>127</Text>
            <Text style={styles.statLabel}>Total Kills</Text>
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
          
          {announcements.map((announcement) => (
            <View key={announcement.id} style={styles.announcementCard}>
              <View style={styles.announcementHeader}>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementTime}>{announcement.time}</Text>
              </View>
              <Text style={styles.announcementMessage}>{announcement.message}</Text>
            </View>
          ))}
        </View>

        {/* Featured Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Featured Matches</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Watch All</Text>
            </TouchableOpacity>
          </View>
          
          {featuredMatches.map((match) => (
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
          ))}
        </View>

        {/* Upcoming Tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Upcoming Tournaments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tournaments')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingTournaments.map((tournament) => (
            <TouchableOpacity 
              key={tournament.id} 
              style={styles.tournamentCard}
              onPress={() => navigation.navigate('Tournaments')}
            >
              <View style={styles.tournamentHeader}>
                <Text style={styles.tournamentTitle}>{tournament.title}</Text>
                <View style={styles.timeTag}>
                  <Ionicons name="time" size={12} color={COLORS.white} />
                  <Text style={styles.timeText}>{tournament.startTime}</Text>
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
                  <Text style={styles.detailText}>{tournament.participants}/{tournament.maxParticipants}</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join Now</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
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