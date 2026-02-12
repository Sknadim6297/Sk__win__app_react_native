import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { tournamentService } from '../../services/api';

const TABS = [
  { key: 'rank', label: 'Rank' },
  { key: 'kills', label: 'Kills' },
  { key: 'earnings', label: 'Earnings' },
];

const TournamentLeaderboard = ({ navigation }) => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('rank');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getAllTournaments();
      setTournaments(data || []);
      if (data?.length) {
        setSelectedTournament(data[0]);
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTournament?._id) {
      fetchResults(selectedTournament._id);
    }
  }, [selectedTournament]);

  const fetchResults = async (tournamentId) => {
    try {
      setLoading(true);
      const data = await tournamentService.getResults(tournamentId);
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load results:', error.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournaments();
    if (selectedTournament?._id) {
      await fetchResults(selectedTournament._id);
    }
    setRefreshing(false);
  };

  const sortedResults = useMemo(() => {
    const list = [...results];
    if (activeTab === 'kills') {
      return list.sort((a, b) => (b.kills || 0) - (a.kills || 0));
    }
    if (activeTab === 'earnings') {
      return list.sort((a, b) => (b.totalReward || b.prizeAmount || 0) - (a.totalReward || a.prizeAmount || 0));
    }
    return list.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  }, [results, activeTab]);

  const getDisplayName = (result) => {
    const user = result.userId;
    return user?.username || user?.email || 'Player';
  };

  if (loading && tournaments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournament Leaderboard</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Tournament</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tournamentList}>
            {tournaments.map((tournament) => (
              <TouchableOpacity
                key={tournament._id}
                style={[
                  styles.tournamentChip,
                  selectedTournament?._id === tournament._id && styles.tournamentChipSelected,
                ]}
                onPress={() => setSelectedTournament(tournament)}
              >
                <Text
                  style={[
                    styles.tournamentChipText,
                    selectedTournament?._id === tournament._id && styles.tournamentChipTextSelected,
                  ]}
                >
                  {tournament.name}
                </Text>
                <Text style={styles.tournamentChipSubtext}>
                  {new Date(tournament.startDate).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <View style={styles.tabsRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Loading results...</Text>
            </View>
          ) : sortedResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>No results yet</Text>
              <Text style={styles.emptySubtext}>Submit results to generate leaderboards</Text>
            </View>
          ) : (
            sortedResults.map((result, index) => (
              <View key={result._id} style={styles.resultCard}>
                <View style={styles.resultLeft}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.playerName}>{getDisplayName(result)}</Text>
                    <Text style={styles.playerMeta}>Rank: {result.rank || '-'}</Text>
                  </View>
                </View>
                <View style={styles.resultRight}>
                  <Text style={styles.resultValue}>Kills: {result.kills || 0}</Text>
                  <Text style={styles.resultValue}>Total: ₹{result.totalReward || result.prizeAmount || 0}</Text>
                </View>
              </View>
            ))
          )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginRight: 32,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  tournamentList: {
    flexDirection: 'row',
  },
  tournamentChip: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  tournamentChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tournamentChipText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  tournamentChipTextSelected: {
    color: COLORS.white,
  },
  tournamentChipSubtext: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  resultCard: {
    marginTop: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  playerName: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  playerMeta: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 2,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultValue: {
    color: COLORS.white,
    fontSize: 11,
    marginBottom: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default TournamentLeaderboard;
