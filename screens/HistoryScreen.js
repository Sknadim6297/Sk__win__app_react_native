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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { tournamentService } from '../services/api';
import { toPlayerMatchLabel } from '../utils/tournamentHelpers';

const formatAmount = (v) => Math.round(Number(v) || 0).toLocaleString('en-IN');

const HistoryScreen = ({ navigation }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [matchHistory, setMatchHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const history = await tournamentService.getHistory();
      const normalized = Array.isArray(history)
        ? history.map((item) => {
            const tournament = item.tournament || item.tournamentId || {};
            const status =
              item.status === 'winner' ? 'won' : item.status === 'disqualified' ? 'lost' : 'joined';

            return {
              id: item._id,
              tournamentId: tournament._id,
              tournamentName: tournament.name || 'Tournament',
              gameMode: toPlayerMatchLabel(tournament.gameMode?.name || tournament.game?.name || 'Tournament'),
              joinedAt: item.joinedAt || item.createdAt,
              status,
              tournamentStatus: tournament.status,
              rank: item.rank,
              prize: item.prizeAmount || 0,
              entryFee: tournament.entryFee || 0,
              totalPlayers: tournament.maxParticipants || 0,
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

  const filteredMatches = matchHistory.filter((match) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'won') return match.status === 'won';
    if (selectedFilter === 'lost') return match.status === 'lost';
    return true;
  });

  const statusColor = (status) => {
    if (status === 'won') return PAGE.green;
    if (status === 'lost') return '#EF4444';
    return PAGE.purple;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '-', time: '-' };
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return { date: '-', time: '-' };
    return {
      date: date.toLocaleDateString('en-IN'),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const goToTournament = (tournamentId) => {
    if (!tournamentId) return;
    navigation.navigate('TournamentDetails', { tournamentId });
  };

  const wonMatches = matchHistory.filter((m) => m.status === 'won').length;
  const totalSpent = matchHistory.reduce((sum, m) => sum + (m.entryFee || 0), 0);
  const totalPrize = matchHistory.reduce((sum, m) => sum + (m.prize || 0), 0);

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="My Matches" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={pageStyles.scroll} showsVerticalScrollIndicator={false}>
        <View style={pageStyles.card}>
          <View style={pageStyles.row}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="trophy" size={22} color={PAGE.gold} />
              <Text style={pageStyles.label}>Wins</Text>
            </View>
            <Text style={pageStyles.value}>{wonMatches}</Text>
          </View>
          <View style={pageStyles.row}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="gamepad-variant" size={22} color="#60A5FA" />
              <Text style={pageStyles.label}>Total Matches</Text>
            </View>
            <Text style={pageStyles.value}>{matchHistory.length}</Text>
          </View>
          <View style={pageStyles.row}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="cash-minus" size={22} color="#F87171" />
              <Text style={pageStyles.label}>Total Spent</Text>
            </View>
            <Text style={pageStyles.value}>₹{formatAmount(totalSpent)}</Text>
          </View>
          <View style={[pageStyles.row, pageStyles.rowLast]}>
            <View style={styles.statLeft}>
              <MaterialCommunityIcons name="cash-plus" size={22} color={PAGE.green} />
              <Text style={pageStyles.label}>Total Prize</Text>
            </View>
            <Text style={pageStyles.value}>₹{formatAmount(totalPrize)}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {['all', 'won', 'lost'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, selectedFilter === filter && styles.filterTabActive]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                {filter !== 'all'
                  ? ` (${matchHistory.filter((m) => m.status === filter).length})`
                  : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredMatches.length === 0 ? (
          <View style={pageStyles.emptyWrap}>
            <MaterialCommunityIcons name="trophy-outline" size={48} color={PAGE.mutedDim} />
            <Text style={pageStyles.emptyTitle}>No matches found</Text>
            <Text style={pageStyles.emptyText}>
              {matchHistory.length === 0
                ? 'Join a tournament to start building your match history.'
                : 'Try another filter.'}
            </Text>
          </View>
        ) : (
          filteredMatches.map((match) => {
            const dt = formatDateTime(match.joinedAt);
            return (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                activeOpacity={0.88}
                onPress={() => goToTournament(match.tournamentId)}
              >
                <View style={styles.matchTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.matchName} numberOfLines={1}>
                      {match.tournamentName}
                    </Text>
                    <Text style={styles.matchMode}>{match.gameMode}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(match.status) }]}>
                    <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.matchMeta}>
                  <Text style={styles.metaItem}>Rank #{match.rank || '—'}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaItem}>Entry ₹{formatAmount(match.entryFee)}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={[styles.metaItem, match.prize > 0 && { color: PAGE.green }]}>
                    Prize ₹{formatAmount(match.prize)}
                  </Text>
                </View>

                <Text style={styles.matchDate}>
                  {dt.date} · {dt.time}
                  {match.slotNumber ? ` · Slot #${match.slotNumber}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: PAGE.cardAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: { backgroundColor: PAGE.purple },
  filterText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PAGE.muted },
  filterTextActive: { color: COLORS.white },
  matchCard: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  matchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  matchName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  matchMode: { ...TEXT.caption, color: PAGE.muted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.white },
  matchMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 },
  metaItem: { fontFamily: FONTS.medium, fontSize: 13, color: PAGE.muted },
  metaDot: { marginHorizontal: 6, color: PAGE.mutedDim },
  matchDate: { ...TEXT.caption, color: PAGE.mutedDim },
});
