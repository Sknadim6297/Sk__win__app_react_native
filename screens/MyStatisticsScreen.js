import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { userService } from '../services/api';

const formatAmount = (value) => Math.round(Number(value) || 0).toLocaleString('en-IN');

const MyStatisticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    tournamentsWon: 0,
    winRate: 0,
    totalPrizeWon: 0,
    totalMatches: 0,
    matchesWon: 0,
    totalKills: 0,
  });

  const loadStats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const profile = await userService.getProfile().catch(() => ({}));
      const tournament = profile?.tournament || {};
      const gameStats = profile?.gameStats || {};
      const joined = tournament.participatedCount || 0;
      const won = tournament.wins || 0;
      const winRate = joined > 0 ? Math.round((won / joined) * 1000) / 10 : 0;

      setStats({
        totalTournaments: joined,
        tournamentsWon: won,
        winRate,
        totalPrizeWon: tournament.earnings || profile?.wallet?.totalWinnings || 0,
        totalMatches: joined,
        matchesWon: won,
        totalKills: gameStats.totalKills || 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const winPct = stats.totalMatches > 0 ? (stats.matchesWon / stats.totalMatches) * 100 : 0;

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="My Statistics" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={pageStyles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadStats(true);
              }}
              tintColor={COLORS.white}
            />
          }
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Win Rate</Text>
            <Text style={styles.heroValue}>{stats.winRate}%</Text>
            <Text style={styles.heroSub}>
              {stats.tournamentsWon} wins · {stats.totalTournaments} joined
            </Text>
          </View>

          <View style={pageStyles.card}>
            <View style={pageStyles.row}>
              <View style={styles.left}>
                <MaterialCommunityIcons name="trophy" size={22} color={PAGE.gold} />
                <Text style={pageStyles.label}>Tournaments Won</Text>
              </View>
              <Text style={pageStyles.value}>{stats.tournamentsWon}</Text>
            </View>
            <View style={pageStyles.row}>
              <View style={styles.left}>
                <MaterialCommunityIcons name="gamepad-variant" size={22} color="#60A5FA" />
                <Text style={pageStyles.label}>Tournaments Joined</Text>
              </View>
              <Text style={pageStyles.value}>{stats.totalTournaments}</Text>
            </View>
            <View style={pageStyles.row}>
              <View style={styles.left}>
                <MaterialCommunityIcons name="cash" size={22} color={PAGE.green} />
                <Text style={pageStyles.label}>Total Prize</Text>
              </View>
              <Text style={pageStyles.value}>₹{formatAmount(stats.totalPrizeWon)}</Text>
            </View>
            <View style={[pageStyles.row, pageStyles.rowLast]}>
              <View style={styles.left}>
                <MaterialCommunityIcons name="target" size={22} color="#F87171" />
                <Text style={pageStyles.label}>Total Kills</Text>
              </View>
              <Text style={pageStyles.value}>{stats.totalKills}</Text>
            </View>
          </View>

          <Text style={pageStyles.sectionTitle}>Match Breakdown</Text>
          <View style={pageStyles.card}>
            <View style={[pageStyles.row, pageStyles.rowLast, styles.breakdown]}>
              <View style={styles.breakdownTop}>
                <Text style={pageStyles.label}>Matches Won</Text>
                <Text style={pageStyles.value}>
                  {stats.matchesWon}/{stats.totalMatches || 0}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(winPct, 100)}%` }]} />
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default MyStatisticsScreen;

const styles = StyleSheet.create({
  heroCard: {
    ...pageStyles.heroCard,
    alignItems: 'center',
  },
  heroLabel: { ...TEXT.label, color: PAGE.muted, marginBottom: 8 },
  heroValue: {
    fontFamily: FONTS.bold,
    fontSize: 48,
    lineHeight: 56,
    color: COLORS.white,
  },
  heroSub: { ...TEXT.caption, color: PAGE.mutedDim, marginTop: 8 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdown: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  breakdownTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PAGE.bg,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PAGE.green,
    borderRadius: 4,
  },
});
