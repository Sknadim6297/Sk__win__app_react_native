import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { tournamentService } from '../services/api';

const GameDetailsScreen = ({ navigation, route }) => {
  const gameMode = route?.params?.gameMode;
  const [selectedTab, setSelectedTab] = useState('incoming'); // ongoing, incoming, results
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, solo, duo, squad
  const [selectedRewardFilter, setSelectedRewardFilter] = useState('all'); // all, survival, per_kill, hybrid
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const gameData = {
    name: gameMode?.name || 'FF SURVIVAL SERIES',
    description: gameMode?.description || 'SNIPER BAN & VEHICLES ON',
    map: 'Bermuda',
    type: 'Solo',
  };

  useEffect(() => {
    loadTournaments();
  }, [selectedTab, selectedFilter, selectedRewardFilter]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getList().catch(() => []);
      
      // Filter tournaments based on selected tab
      let filtered = Array.isArray(data) ? data : [];

      // Filter by game mode (from route) so only relevant tournaments show
      if (gameMode?._id) {
        filtered = filtered.filter(t =>
          t.gameMode?._id === gameMode._id || t.gameMode === gameMode._id
        );
      } else if (gameMode?.name) {
        filtered = filtered.filter(t => t.gameMode?.name === gameMode.name);
      }
      
      if (selectedTab === 'incoming') {
        filtered = filtered.filter(t => t.status === 'incoming' || t.status === 'upcoming');
      } else if (selectedTab === 'ongoing') {
        filtered = filtered.filter(t => t.status === 'ongoing' || t.status === 'live');
      } else if (selectedTab === 'results') {
        filtered = filtered.filter(t => t.status === 'completed');
      }

      // Filter by type if not 'all'
      if (selectedFilter !== 'all') {
        filtered = filtered.filter(t => 
          t.mode?.toLowerCase() === selectedFilter.toLowerCase()
        );
      }

      // Filter by reward type if not 'all'
      if (selectedRewardFilter !== 'all') {
        filtered = filtered.filter(t => t.rewardType === selectedRewardFilter);
      }

      setTournaments(filtered);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const typeTabsData = [
    { id: 'all', label: 'ALL' },
    { id: 'solo', label: 'SOLO' },
    { id: 'duo', label: 'DUO' },
    { id: 'squad', label: 'SQUAD' },
  ];

  const rewardTabsData = [
    { id: 'all', label: 'ALL' },
    { id: 'survival', label: 'SURVIVAL' },
    { id: 'per_kill', label: 'PER KILL' },
    { id: 'hybrid', label: 'HYBRID' },
  ];

  const statusTabsData = [
    { id: 'ongoing', label: 'ONGOING' },
    { id: 'incoming', label: 'INCOMING' },
    { id: 'results', label: 'RESULTS' },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleJoinTournament = (tournamentId) => {
    navigation.navigate('TournamentDetails', { tournamentId });
  };

  const renderTournamentCard = ({ item }) => {
    const spotsLeft = item.maxParticipants - (item.currentParticipants || 0);
    const displayTournament = {
      name: item.name || item.title || 'Tournament',
      map: item.map || 'Bermuda',
      type: item.mode || item.type || 'Solo',
      time: formatDate(item.startDate),
      prizePool: item.prizePool || 0,
      perKill: item.perKill || 0,
      entryFee: item.entryFee || 0,
      spotsLeft: spotsLeft > 0 ? spotsLeft : 0,
      totalSpots: item.maxParticipants || 20,
      rules: item.rules || ['Follow game rules', 'No cheating', 'Respect other players'],
    };

    return (
    <View style={styles.tournamentCard}>
      {/* Tournament Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.tournamentName}>{displayTournament.name}</Text>
        </View>
        <View style={styles.mapBadge}>
          <MaterialCommunityIcons name="map" size={14} color={COLORS.accent} />
          <Text style={styles.mapText}>{displayTournament.map}</Text>
        </View>
      </View>

      {/* Game Info Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>TYPE</Text>
          <Text style={styles.infoValue}>{displayTournament.type}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>MAP</Text>
          <Text style={styles.infoValue}>{displayTournament.map}</Text>
        </View>
      </View>

      {/* Rules Section */}
      <View style={styles.rulesSection}>
        <Text style={styles.rulesTitle}>Rules & Requirements</Text>
        <View style={styles.rulesList}>
          {displayTournament.rules.map((rule, index) => (
            <View key={index} style={styles.ruleItem}>
              <MaterialCommunityIcons name="circle-small" size={12} color={COLORS.accent} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tournament Details Grid */}
      <View style={styles.detailsGrid}>
        {Number(displayTournament.prizePool) > 0 && (
          <View style={styles.detailBox}>
            <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.detailLabel}>Prize Pool</Text>
            <Text style={styles.detailValue}>₹{displayTournament.prizePool}</Text>
          </View>
        )}
        <View style={styles.detailBox}>
          <MaterialCommunityIcons name="skull-crossbones" size={20} color="#FF6B6B" />
          <Text style={styles.detailLabel}>Per Kill</Text>
          <Text style={styles.detailValue}>₹{displayTournament.perKill}</Text>
        </View>
        <View style={styles.detailBox}>
          <MaterialCommunityIcons name="ticket-confirmation" size={20} color="#4CAF50" />
          <Text style={styles.detailLabel}>Entry Fee</Text>
          <Text style={styles.detailValue}>₹{displayTournament.entryFee}</Text>
        </View>
      </View>

      {/* Time and Spots */}
      <View style={styles.timeAndSpots}>
        <View style={styles.timeContainer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.accent} />
          <Text style={styles.timeText}>{displayTournament.time}</Text>
        </View>
        <View style={styles.spotsContainer}>
          <MaterialCommunityIcons name="account-multiple" size={16} color={COLORS.accent} />
          <Text style={styles.spotsText}>Only {displayTournament.spotsLeft} spots left</Text>
          <Text style={styles.spotsCount}>{displayTournament.totalSpots - displayTournament.spotsLeft}/{displayTournament.totalSpots}</Text>
        </View>
      </View>

      {/* Join Button */}
      <TouchableOpacity 
        style={styles.joinButtonLarge}
        onPress={() => handleJoinTournament(item._id || item.id)}
      >
        <Text style={styles.joinButtonText}>JOIN NOW</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
  };

  const displayTournaments = tournaments;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{gameData.name}</Text>
          <Text style={styles.headerSubtitle}>Tournaments & Contests</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Game Banner Section */}
        <View style={styles.bannerSection}>
          <View style={styles.gameBanner}>
            <Image
              source={
                gameMode?.image 
                  ? (typeof gameMode.image === 'string' ? { uri: gameMode.image } : gameMode.image)
                  : require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg')
              }
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay} />
          </View>
          <View style={styles.gameTitleSection}>
            <Text style={styles.gameName}>{gameData.name}</Text>
            <Text style={styles.gameDescription}>{gameData.description}</Text>
          </View>
        </View>

        {/* Status Tabs */}
        <View style={styles.tabsContainer}>
          {statusTabsData.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                selectedTab === tab.id && styles.tabButtonActive,
              ]}
              onPress={() => setSelectedTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  selectedTab === tab.id && styles.tabButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          {typeTabsData.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTabButton,
                selectedFilter === tab.id && styles.filterTabButtonActive,
              ]}
              onPress={() => setSelectedFilter(tab.id)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === tab.id && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reward Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          {rewardTabsData.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTabButton,
                selectedRewardFilter === tab.id && styles.filterTabButtonActive,
              ]}
              onPress={() => setSelectedRewardFilter(tab.id)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedRewardFilter === tab.id && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading or Tournament Cards */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading tournaments...</Text>
          </View>
        ) : displayTournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No tournaments available</Text>
            <Text style={styles.emptySubtext}>Check back later for new contests</Text>
          </View>
        ) : (
          <View style={styles.tournamentsContainer}>
            <FlatList
              data={displayTournaments}
              renderItem={renderTournamentCard}
              keyExtractor={(item) => (item._id || item.id).toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  bannerSection: {
    backgroundColor: COLORS.darkGray,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  gameBanner: {
    height: 180,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  gameTitleSection: {
    gap: 4,
  },
  gameName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  gameCode: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  gameDescription: {
    fontSize: 12,
    color: COLORS.gray,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabButtonText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  filterTabButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  filterTabButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterTabText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  tournamentsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    height: 12,
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
    gap: 10,
  },
  cardTitle: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.white,
    lineHeight: 16,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  mapText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 9,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  rulesSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  rulesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 8,
  },
  rulesList: {
    gap: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 10,
    color: COLORS.gray,
  },
  detailsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  detailBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 9,
    color: COLORS.gray,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  timeAndSpots: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  spotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotsText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },
  spotsCount: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  joinButtonLarge: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  joinButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 8,
  },
});

export default GameDetailsScreen;
