import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../styles/theme';

const LeaderboardScreen = ({ navigation }) => {
  const [leaderboardData, setLeaderboardData] = useState([
    { id: 1, rank: 1, name: 'Champion Player', points: 9500, wins: 45, trend: 'up' },
    { id: 2, rank: 2, name: 'Elite Gamer', points: 8900, wins: 42, trend: 'up' },
    { id: 3, rank: 3, name: 'Pro Master', points: 8500, wins: 40, trend: 'down' },
    { id: 4, rank: 4, name: 'Gaming Legend', points: 8100, wins: 38, trend: 'up' },
    { id: 5, rank: 5, name: 'Victory Seeker', points: 7800, wins: 35, trend: 'stable' },
    { id: 6, rank: 6, name: 'Skill Warrior', points: 7400, wins: 32, trend: 'up' },
    { id: 7, rank: 7, name: 'Tournament Star', points: 7000, wins: 30, trend: 'down' },
    { id: 8, rank: 8, name: 'Rising Star', points: 6600, wins: 28, trend: 'up' },
  ]);

  const [walletBalance, setWalletBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Load leaderboard
    }, [])
  );

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'minus';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#FF6B6B';
      default:
        return COLORS.gray;
    }
  };

  const renderLeaderboardItem = ({ item }) => (
    <View style={styles.leaderboardCard}>
      <View style={styles.rankBadge}>
        <Text style={[styles.rankText, item.rank <= 3 && styles.topRank]}>
          #{item.rank}
        </Text>
        {item.rank <= 3 && (
          <MaterialCommunityIcons 
            name={item.rank === 1 ? 'crown' : 'medal'} 
            size={14} 
            color={item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32'}
            style={styles.medalIcon}
          />
        )}
      </View>

      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.name}</Text>
        <View style={styles.playerStats}>
          <Text style={styles.statText}>{item.wins} Wins</Text>
          <Text style={styles.statDot}>•</Text>
          <Text style={styles.statText}>{item.points} Points</Text>
        </View>
      </View>

      <View style={[styles.trendBadge, { borderColor: getTrendColor(item.trend) }]}>
        <MaterialCommunityIcons name={getTrendIcon(item.trend)} size={16} color={getTrendColor(item.trend)} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      {/* Header with Wallet Balance */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>Global Rankings</Text>
        </View>
        <TouchableOpacity style={styles.walletBadge} onPress={() => navigation.navigate('MyWallet')}>
          <MaterialCommunityIcons name="wallet" size={18} color={COLORS.white} />
          <Text style={styles.walletText}>₹{walletBalance}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>All Time</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>This Month</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>This Week</Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboardData}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 3,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  walletText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.darkGray,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  rankBadge: {
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  topRank: {
    color: COLORS.accent,
    fontSize: 18,
  },
  medalIcon: {
    marginTop: 2,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statDot: {
    color: COLORS.gray,
    marginHorizontal: 6,
  },
  trendBadge: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
});

export default LeaderboardScreen;
