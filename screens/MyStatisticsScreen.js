import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../styles/theme';

const MyStatisticsScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalTournaments: 24,
    tournamentsWon: 8,
    winRate: 33.3,
    totalPrizeWon: 5000,
    longestStreak: 4,
    totalMatches: 120,
    matchesWon: 65,
  });

  useFocusEffect(
    useCallback(() => {
      // Load statistics
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Statistics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="trophy" size={32} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.tournamentsWon}</Text>
            <Text style={styles.statLabel}>Tournaments Won</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="percent" size={32} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="gamepad-variant" size={32} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.totalTournaments}</Text>
            <Text style={styles.statLabel}>Tournaments Joined</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="cash" size={32} color={COLORS.accent} />
            <Text style={styles.statValue}>₹{stats.totalPrizeWon}</Text>
            <Text style={styles.statLabel}>Total Prize</Text>
          </View>
        </View>

        {/* Detailed Stats */}
        <View style={styles.detailedStats}>
          <Text style={styles.sectionTitle}>Detailed Statistics</Text>

          <View style={styles.statRow}>
            <View style={styles.statRowContent}>
              <Text style={styles.statRowLabel}>Total Matches</Text>
              <Text style={styles.statRowValue}>{stats.totalMatches}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progress, { width: '100%' }]} />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statRowContent}>
              <Text style={styles.statRowLabel}>Matches Won</Text>
              <Text style={styles.statRowValue}>{stats.matchesWon}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progress, { width: `${(stats.matchesWon / stats.totalMatches) * 100}%` }]} />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statRowContent}>
              <Text style={styles.statRowLabel}>Longest Streak</Text>
              <Text style={styles.statRowValue}>{stats.longestStreak}</Text>
            </View>
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={18} color="#FF6B6B" />
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    marginBottom: 15,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
  detailedStats: {
    backgroundColor: COLORS.darkGray,
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statRowContent: {
    width: '35%',
  },
  statRowLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 3,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginLeft: 10,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  streakBadge: {
    alignItems: 'center',
  },
});

export default MyStatisticsScreen;
