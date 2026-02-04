import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrophyIcon from 'react-native-heroicons/outline/TrophyIcon';
import StarIcon from 'react-native-heroicons/outline/StarIcon';
import CheckCircleIcon from 'react-native-heroicons/outline/CheckCircleIcon';
import ChevronDownIcon from 'react-native-heroicons/outline/ChevronDownIcon';
import CalendarIcon from 'react-native-heroicons/outline/CalendarIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import CurrencyDollarIcon from 'react-native-heroicons/outline/CurrencyDollarIcon';
import PuzzlePieceIcon from 'react-native-heroicons/outline/PuzzlePieceIcon';
import CreditCardIcon from 'react-native-heroicons/outline/CreditCardIcon';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';
import { tournamentService } from '../services/api';

const HistoryScreen = ({ navigation }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [matchHistory, setMatchHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const history = await tournamentService.getHistory();
      const normalized = Array.isArray(history)
        ? history.map((item) => {
            const tournament = item.tournament || item.tournamentId || {};
            const status = item.status === 'winner'
              ? 'won'
              : item.status === 'disqualified'
              ? 'lost'
              : 'joined';

            return {
              id: item._id,
              tournamentName: tournament.name || 'Tournament',
              gameMode: tournament.gameType || tournament.game || 'Tournament',
              joinedAt: item.joinedAt || item.createdAt,
              status,
              rank: item.rank,
              prize: item.prizeAmount || 0,
              entryFee: tournament.entryFee || 0,
              totalPlayers: tournament.maxPlayers || 0,
              slotNumber: item.slotNumber,
              gamingUsername: item.gamingUsername,
            };
          })
        : [];

      setMatchHistory(normalized);
    } catch (error) {
      console.error('Failed to load history:', error);
      setMatchHistory([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const filteredMatches = matchHistory.filter(match => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'won') return match.status === 'won';
    if (selectedFilter === 'lost') return match.status === 'lost';
    return true;
  });

  const getRankColor = (rank, totalPlayers) => {
    if (!rank || !totalPlayers) return COLORS.gray;
    const percentage = (rank / totalPlayers) * 100;
    if (percentage <= 10) return '#FFD700';
    if (percentage <= 25) return '#C0C0C0';
    if (percentage <= 50) return '#CD7F32';
    return COLORS.gray;
  };

  const getRankIcon = (rank, totalPlayers) => {
    if (!rank || !totalPlayers) return ChevronDownIcon;
    const percentage = (rank / totalPlayers) * 100;
    if (percentage <= 10) return TrophyIcon;
    if (percentage <= 25) return StarIcon;
    if (percentage <= 50) return CheckCircleIcon;
    return ChevronDownIcon;
  };

  const getStatusColor = (status) => {
    if (status === 'won') return COLORS.success;
    if (status === 'lost') return COLORS.error;
    return COLORS.accent;
  };

  const getStatusIcon = (status) => {
    if (status === 'won') return TrophyIcon;
    if (status === 'lost') return StarIcon;
    return CheckCircleIcon;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '-', time: '-' };
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return { date: '-', time: '-' };

    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
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
          {(() => {
            const StatusIcon = getStatusIcon(match.status);
            return <StatusIcon size={12} color={COLORS.white} />;
          })()}
          <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.matchStats}>
        <View style={styles.rankSection}>
          {(() => {
            const RankIcon = getRankIcon(match.rank, match.totalPlayers);
            return <RankIcon size={32} color={getRankColor(match.rank, match.totalPlayers)} />;
          })()}
          <View style={styles.rankInfo}>
            <Text style={[styles.rankText, { color: getRankColor(match.rank, match.totalPlayers) }]}>
              {match.rank ? `#${match.rank}` : '—'}
            </Text>
            <Text style={styles.totalPlayersText}>of {match.totalPlayers || '-'}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <CurrencyDollarIcon size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>₹{match.entryFee}</Text>
            <Text style={styles.statLabel}>Entry Fee</Text>
          </View>
          
          <View style={styles.statItem}>
            <TrophyIcon size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>#{match.rank || '-'}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
          
          <View style={styles.statItem}>
            <CurrencyDollarIcon size={18} color={COLORS.accent} />
            <Text style={[styles.statValue, { color: match.prize > 0 ? COLORS.success : COLORS.gray }]}>
              ₹{match.prize}
            </Text>
            <Text style={styles.statLabel}>Prize</Text>
          </View>
        </View>
      </View>

      <View style={styles.matchFooter}>
        <View style={styles.slotInfoRow}>
          <Text style={styles.slotInfoLabel}>Slot:</Text>
          <Text style={styles.slotInfoValue}>{match.slotNumber ? `#${match.slotNumber}` : '-'}</Text>
          <Text style={[styles.slotInfoLabel, { marginLeft: 12 }]}>Gaming ID:</Text>
          <Text style={styles.slotInfoValue}>{match.gamingUsername || '-'}</Text>
        </View>
        <View style={styles.dateTimeInfo}>
          <CalendarIcon size={14} color={COLORS.gray} />
          <Text style={styles.dateText}>{formatDateTime(match.joinedAt).date}</Text>
          <View style={{ marginLeft: 12 }}>
            <ClockIcon size={14} color={COLORS.gray} />
          </View>
          <Text style={styles.timeText}>{formatDateTime(match.joinedAt).time}</Text>
        </View>
      </View>
    </View>
  );

  const getFilteredStats = () => {
    const wonMatches = matchHistory.filter(m => m.status === 'won').length;
    const totalMatches = matchHistory.length;
    const totalSpent = matchHistory.reduce((sum, match) => sum + (match.entryFee || 0), 0);
    const totalPrize = matchHistory.reduce((sum, match) => sum + (match.prize || 0), 0);
    
    return { wonMatches, totalMatches, totalSpent, totalPrize };
  };

  const stats = getFilteredStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SKWinLogo size={110} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Match History</Text>
            <Text style={styles.headerSubtitle}>Your performance</Text>
          </View>
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <TrophyIcon size={24} color="#FFD700" />
          <Text style={styles.overviewValue}>{stats.wonMatches}</Text>
          <Text style={styles.overviewLabel}>Wins</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <PuzzlePieceIcon size={24} color={COLORS.accent} />
          <Text style={styles.overviewValue}>{stats.totalMatches}</Text>
          <Text style={styles.overviewLabel}>Total Matches</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <CreditCardIcon size={24} color={COLORS.error} />
          <Text style={styles.overviewValue}>₹{stats.totalSpent}</Text>
          <Text style={styles.overviewLabel}>Total Spent</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <CurrencyDollarIcon size={24} color={COLORS.success} />
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
            <TrophyIcon size={64} color={COLORS.gray} />
            <Text style={styles.emptyStateText}>
              {matchHistory.length === 0 
                ? "You have not participated in any contest yet."
                : selectedFilter === 'won' 
                ? "You haven't won any tournaments yet"
                : selectedFilter === 'lost'
                ? "You haven't lost any tournaments"
                : "No matches found"
              }
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {matchHistory.length === 0
                ? "Join a tournament to start building your match history!"
                : selectedFilter === 'won' 
                ? "Keep practicing to get your first win!"
                : selectedFilter === 'lost'
                ? "Great! You're doing well in tournaments"
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotInfoLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginRight: 4,
  },
  slotInfoValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
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