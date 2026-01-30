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

const TopPlayersScreen = ({ navigation }) => {
  const [topPlayers, setTopPlayers] = useState([
    { id: 1, rank: 1, name: 'Pro Player 1', wins: 45, rating: 2500 },
    { id: 2, rank: 2, name: 'Pro Player 2', wins: 42, rating: 2450 },
    { id: 3, rank: 3, name: 'Pro Player 3', wins: 40, rating: 2400 },
    { id: 4, rank: 4, name: 'Pro Player 4', wins: 38, rating: 2350 },
    { id: 5, rank: 5, name: 'Pro Player 5', wins: 35, rating: 2300 },
    { id: 6, rank: 6, name: 'Pro Player 6', wins: 32, rating: 2250 },
    { id: 7, rank: 7, name: 'Pro Player 7', wins: 30, rating: 2200 },
    { id: 8, rank: 8, name: 'Pro Player 8', wins: 28, rating: 2150 },
  ]);

  useFocusEffect(
    useCallback(() => {
      // Load top players
    }, [])
  );

  const renderPlayerItem = ({ item }) => (
    <View style={styles.playerCard}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, item.rank <= 3 && styles.topRank]}>
          {item.rank}
        </Text>
        {item.rank <= 3 && (
          <MaterialCommunityIcons 
            name={item.rank === 1 ? 'crown' : 'medal'} 
            size={18} 
            color={item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32'}
          />
        )}
      </View>
      
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerStat}>Rating: {item.rating}</Text>
      </View>

      <View style={styles.playerStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
          <Text style={styles.statValue}>{item.wins}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Players</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={topPlayers}
        renderItem={renderPlayerItem}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  rank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  topRank: {
    color: COLORS.accent,
    fontSize: 24,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  playerStat: {
    fontSize: 12,
    color: COLORS.gray,
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 15,
  },
  statValue: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 3,
  },
});

export default TopPlayersScreen;
