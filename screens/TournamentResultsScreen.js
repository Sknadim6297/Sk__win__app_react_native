import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS } from '../styles/theme';
import { tournamentService } from '../services/api';

const CYAN = '#00E5FF';
const GOLD = '#FBBF24';
const SILVER = '#C0C0C0';
const BRONZE = '#CD7F32';

const MEDAL = { 1: GOLD, 2: SILVER, 3: BRONZE };

export default function TournamentResultsScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await tournamentService.getResults(tournamentId);
      setData(res);
    } catch (e) {
      setError(e.message || 'Results not available');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
        <Text style={styles.loadingText}>Loading leaderboard…</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.errorText}>{error || 'No results'}</Text>
      </SafeAreaView>
    );
  }

  const { winner, leaderboard = [], isBattleRoyale, tournament } = data;
  const top3 = leaderboard.filter((e) => e.rank >= 1 && e.rank <= 3);
  const rest = leaderboard.filter((e) => !e.rank || e.rank > 3);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <AppIcon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tournament?.name || 'Results'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {winner && (
          <LinearGradient colors={['#2a2208', '#121A28']} style={styles.winnerCard}>
            <View style={styles.winnerBadges}>
              <Text style={styles.winnerBadge}>Winner</Text>
              <Text style={styles.placeBadge}>1st Place</Text>
            </View>
            <Text style={styles.winnerName}>{winner.gamingID || winner.username || 'Champion'}</Text>
            <Text style={styles.winnerMeta}>UID: {winner.gamingUID || '—'}</Text>
            {isBattleRoyale && (
              <Text style={styles.winnerMeta}>Kills: {winner.kills ?? 0}</Text>
            )}
            <Text style={styles.winnerReward}>₹{winner.totalReward ?? 0}</Text>
          </LinearGradient>
        )}

        {top3.length > 0 && (
          <View style={styles.top3Row}>
            {top3.map((player) => (
              <View
                key={player.userId}
                style={[
                  styles.podiumCard,
                  player.rank === 1 && styles.podiumFirst,
                  { borderColor: MEDAL[player.rank] || CYAN },
                ]}
              >
                <Text style={[styles.podiumRank, { color: MEDAL[player.rank] }]}>#{player.rank}</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {player.gamingID || player.username}
                </Text>
                <Text style={styles.podiumReward}>₹{player.totalReward}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {leaderboard.map((player, idx) => (
          <View key={`${player.userId}-${idx}`} style={styles.row}>
            <View style={[styles.rankBadge, player.isWinner && styles.rankBadgeWinner]}>
              <Text style={styles.rankText}>{player.rank || '—'}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{player.gamingID || player.username}</Text>
              <Text style={styles.rowSub}>UID: {player.gamingUID || '—'}</Text>
              {isBattleRoyale && (
                <Text style={styles.rowSub}>Kills: {player.kills ?? 0}</Text>
              )}
            </View>
            <View style={styles.rowRight}>
              {player.isWinner ? (
                <Text style={styles.statusWin}>Winner</Text>
              ) : (
                <Text style={styles.statusLose}>Lose</Text>
              )}
              <Text style={styles.rowReward}>₹{player.totalReward ?? 0}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 17, color: COLORS.white },
  scroll: { padding: 16, paddingBottom: 32 },
  loadingText: { color: COLORS.gray, textAlign: 'center', marginTop: 12 },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  backBtn: { padding: 16 },
  winnerCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  winnerBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  winnerBadge: {
    backgroundColor: GOLD,
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#050510',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  placeBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  winnerName: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  winnerMeta: { color: COLORS.gray, marginTop: 4, fontSize: 13 },
  winnerReward: { color: CYAN, fontFamily: FONTS.bold, fontSize: 24, marginTop: 12 },
  top3Row: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  podiumCard: {
    flex: 1,
    backgroundColor: '#121A21',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  podiumFirst: { transform: [{ scale: 1.03 }] },
  podiumRank: { fontFamily: FONTS.bold, fontSize: 18 },
  podiumName: { color: COLORS.white, fontSize: 12, marginTop: 6 },
  podiumReward: { color: CYAN, fontFamily: FONTS.bold, marginTop: 6, fontSize: 13 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.white, marginBottom: 12, fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A21',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e2633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeWinner: { backgroundColor: 'rgba(251,191,36,0.2)' },
  rankText: { fontFamily: FONTS.bold, color: COLORS.white },
  rowBody: { flex: 1 },
  rowName: { color: COLORS.white, fontFamily: FONTS.bold },
  rowSub: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  statusWin: { color: GOLD, fontFamily: FONTS.bold, fontSize: 11 },
  statusLose: { color: COLORS.gray, fontSize: 11 },
  rowReward: { color: CYAN, fontFamily: FONTS.bold, marginTop: 4 },
});
