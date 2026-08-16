import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import AppHeader from '../components/navigation/AppHeader';
import DefaultAvatar from '../components/ui/DefaultAvatar';
import BrandCoin from '../components/ui/BrandCoin';
import { AuthContext } from '../context/AuthContext';
import { userService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { LIST_PERF } from '../utils/listPerf';

const PERIODS = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' },
];

const PODIUM_COLORS = {
  1: '#FBBF24',
  2: '#C0C8D4',
  3: '#CD7F32',
};

function formatPoints(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

export default function LeaderboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [period, setPeriod] = useState('all');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (nextPeriod, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await userService.getLeaderboard(nextPeriod);
      setPlayers(Array.isArray(data?.players) ? data.players : []);
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(period);
    }, [load, period])
  );

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  const myId = user?.id || user?._id;
  const me = players.find((p) => String(p.id) === String(myId));
  const podiumPlayers =
    top3.length === 1
      ? [top3[0]]
      : top3.length === 2
        ? [top3[1], top3[0]]
        : [top3[1], top3[0], top3[2]].filter(Boolean);

  const renderRow = ({ item }) => {
    const isMe = String(item.id) === String(myId);
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <Text style={[styles.rank, item.rank <= 3 && { color: PODIUM_COLORS[item.rank] }]}>
          {item.rank}
        </Text>
        <DefaultAvatar uri={resolveMediaUrl(item.photo)} size={40} />
        <View style={styles.rowCopy}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
            {isMe ? '  · You' : ''}
          </Text>
          <Text style={styles.meta}>
            {item.wins} wins · {item.matches} matches
          </Text>
        </View>
        <View style={styles.pointsWrap}>
          <BrandCoin size={16} />
          <Text style={styles.points}>{formatPoints(item.points)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={pageStyles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <AppHeader navigation={navigation} />

      <View style={styles.tabs}>
        {PERIODS.map((tab) => {
          const active = period === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setPeriod(tab.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator color={PAGE.cyan} />
          <Text style={pageStyles.loadingText}>Loading ranks…</Text>
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={rest}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(period, true);
              }}
              tintColor={PAGE.cyan}
            />
          }
          ListHeaderComponent={
            players.length ? (
              <View>
                <Text style={styles.pageTitle}>Leaderboard</Text>
                <View style={[styles.podium, top3.length === 1 && styles.podiumSingle]}>
                  {podiumPlayers.map((player) => {
                    const first = player.rank === 1;
                    return (
                      <View
                        key={player.id}
                        style={[
                          styles.podiumCard,
                          first && styles.podiumFirst,
                          top3.length === 1 && styles.podiumOnly,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={player.rank === 1 ? 'crown' : 'medal'}
                          size={first ? 22 : 18}
                          color={PODIUM_COLORS[player.rank]}
                        />
                        <DefaultAvatar
                          uri={resolveMediaUrl(player.photo)}
                          size={first ? 64 : 52}
                          style={{
                            borderWidth: 2,
                            borderColor: PODIUM_COLORS[player.rank],
                            marginVertical: 8,
                          }}
                        />
                        <Text style={styles.podiumName} numberOfLines={1}>
                          {player.name}
                        </Text>
                        <Text style={styles.podiumPts}>{formatPoints(player.points)}</Text>
                        <Text style={styles.podiumWins}>{player.wins} wins</Text>
                      </View>
                    );
                  })}
                </View>
                {rest.length > 0 ? <Text style={styles.listLabel}>Ranks 4+</Text> : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading && players.length === 0 ? (
              <View style={pageStyles.emptyWrap}>
                <MaterialCommunityIcons name="trophy-outline" size={48} color={PAGE.muted} />
                <Text style={pageStyles.emptyTitle}>No ranks yet</Text>
                <Text style={pageStyles.emptyText}>
                  Play tournaments to appear on the leaderboard for this period.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            me ? (
              <View style={styles.meBar}>
                <Text style={styles.meLabel}>Your rank</Text>
                <View style={styles.meRow}>
                  <Text style={styles.meRank}>#{me.rank}</Text>
                  <Text style={styles.meName} numberOfLines={1}>
                    {me.name}
                  </Text>
                  <Text style={styles.mePts}>{formatPoints(me.points)} pts</Text>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: PAGE.cardAlt,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: PAGE.purple,
  },
  tabText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.muted,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    marginTop: 10,
    marginBottom: 4,
  },
  listLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: PAGE.muted,
    marginBottom: 10,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 18,
  },
  podiumSingle: {
    justifyContent: 'center',
  },
  podiumOnly: {
    flex: 0,
    width: 160,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: PAGE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PAGE.border,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  podiumFirst: {
    borderColor: 'rgba(251, 191, 36, 0.45)',
    paddingVertical: 16,
    marginBottom: 8,
  },
  podiumName: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
    textAlign: 'center',
  },
  podiumPts: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: PAGE.gold,
    marginTop: 4,
  },
  podiumWins: {
    ...TEXT.caption,
    color: PAGE.muted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PAGE.cardAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowMe: {
    borderColor: PAGE.borderAccent,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
  },
  rank: {
    width: 28,
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PAGE.muted,
    textAlign: 'center',
  },
  rowCopy: { flex: 1 },
  name: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  meta: { ...TEXT.caption, color: PAGE.muted, marginTop: 2 },
  pointsWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  points: { fontFamily: FONTS.bold, fontSize: 13, color: PAGE.gold },
  meBar: {
    marginTop: 10,
    backgroundColor: PAGE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    padding: 14,
  },
  meLabel: { ...TEXT.overline, color: PAGE.cyan, marginBottom: 8 },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meRank: { fontFamily: FONTS.bold, fontSize: 18, color: PAGE.gold },
  meName: { flex: 1, fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  mePts: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
});
