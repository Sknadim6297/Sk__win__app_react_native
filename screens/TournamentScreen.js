import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

const TournamentScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('upcoming');

  // Mock tournament data
  const tournaments = {
    ongoing: [
      {
        id: 1,
        title: 'Free Fire Champions League',
        entryFee: 50,
        prizePool: 2000,
        startTime: 'Live Now',
        participants: 89,
        maxParticipants: 100,
        status: 'ongoing',
        type: 'Battle Royale',
      },
      {
        id: 2,
        title: 'Clash Squad Pro Tournament',
        entryFee: 25,
        prizePool: 800,
        startTime: 'Started 30 min ago',
        participants: 64,
        maxParticipants: 64,
        status: 'ongoing',
        type: 'Clash Squad',
      }
    ],
    upcoming: [
      {
        id: 3,
        title: 'Elite Battle Royale',
        entryFee: 100,
        prizePool: 5000,
        startTime: '2 hours',
        participants: 45,
        maxParticipants: 100,
        status: 'upcoming',
        type: 'Battle Royale',
      },
      {
        id: 4,
        title: 'Sunday Special Tournament',
        entryFee: 30,
        prizePool: 1200,
        startTime: '6 hours',
        participants: 23,
        maxParticipants: 80,
        status: 'upcoming',
        type: 'Battle Royale',
      },
      {
        id: 5,
        title: 'Quick Clash Tournament',
        entryFee: 15,
        prizePool: 500,
        startTime: '1 day',
        participants: 12,
        maxParticipants: 50,
        status: 'upcoming',
        type: 'Clash Squad',
      }
    ],
    completed: [
      {
        id: 6,
        title: 'Weekend Warriors Championship',
        entryFee: 75,
        prizePool: 3000,
        startTime: 'Completed',
        participants: 100,
        maxParticipants: 100,
        status: 'completed',
        type: 'Battle Royale',
        winner: 'ProGamer_99',
      },
      {
        id: 7,
        title: 'Speed Run Challenge',
        entryFee: 20,
        prizePool: 600,
        startTime: 'Completed',
        participants: 50,
        maxParticipants: 50,
        status: 'completed',
        type: 'Clash Squad',
        winner: 'FastFingers',
      }
    ]
  };

  const handleJoinTournament = (tournament) => {
    if (tournament.status === 'ongoing') {
      Alert.alert('Tournament In Progress', 'This tournament is already in progress and cannot be joined.');
      return;
    }
    if (tournament.status === 'completed') {
      Alert.alert('Tournament Completed', 'This tournament has already ended.');
      return;
    }
    
    Alert.alert(
      'Join Tournament',
      `Join "${tournament.title}" for ₹${tournament.entryFee}?\n\nPrize Pool: ₹${tournament.prizePool}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join Now', 
          onPress: () => {
            Alert.alert('Success!', 'You have successfully joined the tournament!');
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ongoing': return COLORS.success;
      case 'upcoming': return COLORS.accent;
      case 'completed': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ongoing': return 'play-circle';
      case 'upcoming': return 'clock';
      case 'completed': return 'checkmark-circle';
      default: return 'clock';
    }
  };

  const TournamentCard = ({ tournament }) => (
    <View style={styles.tournamentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.titleSection}>
          <Text style={styles.tournamentTitle}>{tournament.title}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{tournament.type}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
          <Ionicons name={getStatusIcon(tournament.status)} size={12} color={COLORS.white} />
          <Text style={styles.statusText}>{tournament.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={COLORS.accent} />
            <Text style={styles.infoLabel}>Entry Fee</Text>
            <Text style={styles.infoValue}>₹{tournament.entryFee}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="trophy" size={18} color={COLORS.accent} />
            <Text style={styles.infoLabel}>Prize Pool</Text>
            <Text style={styles.infoValue}>₹{tournament.prizePool}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={18} color={COLORS.accent} />
            <Text style={styles.infoLabel}>Start Time</Text>
            <Text style={styles.infoValue}>{tournament.startTime}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={18} color={COLORS.accent} />
            <Text style={styles.infoLabel}>Players</Text>
            <Text style={styles.infoValue}>{tournament.participants}/{tournament.maxParticipants}</Text>
          </View>
        </View>

        {tournament.winner && (
          <View style={styles.winnerSection}>
            <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
            <Text style={styles.winnerText}>Winner: {tournament.winner}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.joinButton,
          tournament.status === 'completed' && styles.disabledButton,
          tournament.status === 'ongoing' && styles.ongoingButton
        ]}
        onPress={() => handleJoinTournament(tournament)}
        disabled={tournament.status === 'completed'}
      >
        <Text style={[
          styles.joinButtonText,
          tournament.status === 'completed' && styles.disabledButtonText
        ]}>
          {tournament.status === 'ongoing' ? 'In Progress' :
           tournament.status === 'completed' ? 'Completed' : 'Join Now'}
        </Text>
        {tournament.status === 'upcoming' && (
          <Ionicons name="arrow-forward" size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Tournaments</Text>
        <Text style={styles.headerSubtitle}>Join and compete for amazing prizes</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['upcoming', 'ongoing', 'completed'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tournament List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tournaments[selectedTab].map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  tournamentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 6,
  },
  typeTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 4,
  },
  cardContent: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  winnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkGray,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  winnerText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 6,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ongoingButton: {
    backgroundColor: COLORS.success,
  },
  disabledButton: {
    backgroundColor: COLORS.darkGray,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  disabledButtonText: {
    color: COLORS.gray,
  },
});

export default TournamentScreen;