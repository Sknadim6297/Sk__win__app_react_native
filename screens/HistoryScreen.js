import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';

const HistoryScreen = ({ navigation }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock match history data
  const matchHistory = [
    {
      id: 1,
      tournamentName: 'Elite Battle Royale',
      gameMode: 'Battle Royale',
      date: '2025-10-29',
      time: '14:30',
      rank: 1,
      totalPlayers: 100,
      killCount: 12,
      prize: 500,
      status: 'won',
      duration: '25:30',
    },
    {
      id: 2,
      tournamentName: 'Free Fire Champions League',
      gameMode: 'Battle Royale',
      date: '2025-10-28',
      time: '16:15',
      rank: 15,
      totalPlayers: 100,
      killCount: 8,
      prize: 0,
      status: 'lost',
      duration: '18:45',
    },
    {
      id: 3,
      tournamentName: 'Quick Clash Tournament',
      gameMode: 'Clash Squad',
      date: '2025-10-26',
      time: '20:00',
      rank: 3,
      totalPlayers: 50,
      killCount: 15,
      prize: 150,
      status: 'won',
      duration: '12:20',
    },
    {
      id: 4,
      tournamentName: 'Sunday Special Tournament',
      gameMode: 'Battle Royale',
      date: '2025-10-25',
      time: '19:30',
      rank: 7,
      totalPlayers: 80,
      killCount: 6,
      prize: 50,
      status: 'won',
      duration: '22:10',
    },
    {
      id: 5,
      tournamentName: 'Speed Run Challenge',
      gameMode: 'Clash Squad',
      date: '2025-10-24',
      time: '21:45',
      rank: 25,
      totalPlayers: 50,
      killCount: 4,
      prize: 0,
      status: 'lost',
      duration: '8:30',
    },
    {
      id: 6,
      tournamentName: 'Weekend Warriors Championship',
      gameMode: 'Battle Royale',
      date: '2025-10-22',
      time: '15:00',
      rank: 12,
      totalPlayers: 100,
      killCount: 9,
      prize: 0,
      status: 'lost',
      duration: '19:15',
    },
  ];

  const filteredMatches = matchHistory.filter(match => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'won') return match.status === 'won';
    if (selectedFilter === 'lost') return match.status === 'lost';
    return true;
  });

  const getRankColor = (rank, totalPlayers) => {
    const percentage = (rank / totalPlayers) * 100;
    if (percentage <= 10) return '#FFD700'; // Gold
    if (percentage <= 25) return '#C0C0C0'; // Silver
    if (percentage <= 50) return '#CD7F32'; // Bronze
    return COLORS.gray;
  };

  const getRankIcon = (rank, totalPlayers) => {
    const percentage = (rank / totalPlayers) * 100;
    if (percentage <= 10) return 'trophy';
    if (percentage <= 25) return 'medal';
    if (percentage <= 50) return 'ribbon';
    return 'chevron-down';
  };

  const getStatusColor = (status) => {
    return status === 'won' ? COLORS.success : COLORS.error;
  };

  const MatchCard = ({ match }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.tournamentInfo}>
          <Text style={styles.tournamentName}>{match.tournamentName}</Text>
          <View style={styles.gameModeTag}>
            <Text style={styles.gameModeText}>{match.gameMode}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
          <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.matchStats}>
        <View style={styles.rankSection}>
          <MaterialCommunityIcons 
            name={getRankIcon(match.rank, match.totalPlayers)} 
            size={32} 
            color={getRankColor(match.rank, match.totalPlayers)} 
          />
          <View style={styles.rankInfo}>
            <Text style={[styles.rankText, { color: getRankColor(match.rank, match.totalPlayers) }]}>
              #{match.rank}
            </Text>
            <Text style={styles.totalPlayersText}>of {match.totalPlayers}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="target" size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>{match.killCount}</Text>
            <Text style={styles.statLabel}>Kills</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time" size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>{match.duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={COLORS.accent} />
            <Text style={[styles.statValue, { color: match.prize > 0 ? COLORS.success : COLORS.gray }]}>
              ₹{match.prize}
            </Text>
            <Text style={styles.statLabel}>Prize</Text>
          </View>
        </View>
      </View>

      <View style={styles.matchFooter}>
        <View style={styles.dateTimeInfo}>
          <Ionicons name="calendar" size={14} color={COLORS.gray} />
          <Text style={styles.dateText}>{match.date}</Text>
          <Ionicons name="time" size={14} color={COLORS.gray} style={{ marginLeft: 12 }} />
          <Text style={styles.timeText}>{match.time}</Text>
        </View>
      </View>
    </View>
  );

  const getFilteredStats = () => {
    const wonMatches = matchHistory.filter(m => m.status === 'won').length;
    const totalMatches = matchHistory.length;
    const totalKills = matchHistory.reduce((sum, match) => sum + match.killCount, 0);
    const totalPrize = matchHistory.reduce((sum, match) => sum + match.prize, 0);
    
    return { wonMatches, totalMatches, totalKills, totalPrize };
  };

  const stats = getFilteredStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SKWinLogo size={70} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Match History</Text>
            <Text style={styles.headerSubtitle}>Your performance</Text>
          </View>
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <MaterialCommunityIcons name="trophy-variant" size={24} color="#FFD700" />
          <Text style={styles.overviewValue}>{stats.wonMatches}</Text>
          <Text style={styles.overviewLabel}>Wins</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <MaterialCommunityIcons name="controller-classic" size={24} color={COLORS.accent} />
          <Text style={styles.overviewValue}>{stats.totalMatches}</Text>
          <Text style={styles.overviewLabel}>Total Matches</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <MaterialCommunityIcons name="target" size={24} color={COLORS.error} />
          <Text style={styles.overviewValue}>{stats.totalKills}</Text>
          <Text style={styles.overviewLabel}>Total Kills</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <MaterialCommunityIcons name="currency-inr" size={24} color={COLORS.success} />
          <Text style={styles.overviewValue}>₹{stats.totalPrize}</Text>
          <Text style={styles.overviewLabel}>Total Prize</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'won', 'lost'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, selectedFilter === filter && styles.activeFilterTab]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter !== 'all' && (
                <Text style={styles.filterCount}>
                  {' '}({matchHistory.filter(m => m.status === filter).length})
                </Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Match History List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy-broken" size={64} color={COLORS.gray} />
            <Text style={styles.emptyStateText}>No matches found</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedFilter === 'won' 
                ? "You haven't won any tournaments yet"
                : selectedFilter === 'lost'
                ? "You haven't lost any tournaments"
                : "Start playing tournaments to see your match history"
              }
            </Text>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statsOverview: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeFilterText: {
    color: COLORS.white,
  },
  filterCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  matchCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 6,
  },
  gameModeTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gameModeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  matchStats: {
    marginBottom: 16,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
  },
  rankInfo: {
    marginLeft: 12,
  },
  rankText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  totalPlayersText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  matchFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    paddingTop: 12,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 6,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default HistoryScreen;