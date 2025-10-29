import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

const TournamentHistory = ({ navigation }) => {
  const [filter, setFilter] = useState('all'); // all, completed, ongoing, upcoming

  const [tournaments] = useState([
    {
      id: 1,
      name: 'Free Fire Squad Battle',
      status: 'completed',
      date: '2024-10-25',
      participants: 48,
      prizePool: '₹10,000',
      winner: 'ProGamer123',
      entryFee: '₹100',
    },
    {
      id: 2,
      name: 'Championship Series #5',
      status: 'ongoing',
      date: '2024-10-29',
      participants: 64,
      prizePool: '₹25,000',
      winner: null,
      entryFee: '₹200',
    },
    {
      id: 3,
      name: 'Duo Masters Tournament',
      status: 'upcoming',
      date: '2024-11-02',
      participants: 0,
      maxParticipants: 32,
      prizePool: '₹15,000',
      winner: null,
      entryFee: '₹150',
    },
    {
      id: 4,
      name: 'Solo Victory Royale',
      status: 'completed',
      date: '2024-10-20',
      participants: 100,
      prizePool: '₹50,000',
      winner: 'SniperKing',
      entryFee: '₹250',
    },
    {
      id: 5,
      name: 'Weekly Squad Challenge',
      status: 'completed',
      date: '2024-10-15',
      participants: 40,
      prizePool: '₹8,000',
      winner: 'FireMaster99',
      entryFee: '₹80',
    },
  ]);

  const getFilteredTournaments = () => {
    if (filter === 'all') return tournaments;
    return tournaments.filter(t => t.status === filter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.gray;
      case 'ongoing': return COLORS.success;
      case 'upcoming': return COLORS.primary;
      default: return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'ongoing': return 'radio-button-on';
      case 'upcoming': return 'time';
      default: return 'ellipse';
    }
  };

  const handleViewDetails = (tournament) => {
    Alert.alert(
      tournament.name,
      `Status: ${tournament.status}\nDate: ${tournament.date}\nParticipants: ${tournament.participants}\nPrize Pool: ${tournament.prizePool}${tournament.winner ? `\nWinner: ${tournament.winner}` : ''}`,
      [{ text: 'Close' }]
    );
  };

  const handleDeleteTournament = (tournament) => {
    Alert.alert(
      'Delete Tournament',
      `Are you sure you want to delete "${tournament.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Deleted', 'Tournament has been deleted') },
      ]
    );
  };

  const filteredTournaments = getFilteredTournaments();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOURNAMENT HISTORY</Text>
        <TouchableOpacity onPress={() => Alert.alert('Export', 'Export data feature')}>
          <Ionicons name="download" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            ALL ({tournaments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.activeFilter]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
            COMPLETED
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'ongoing' && styles.activeFilter]}
          onPress={() => setFilter('ongoing')}
        >
          <Text style={[styles.filterText, filter === 'ongoing' && styles.activeFilterText]}>
            LIVE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.activeFilter]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.activeFilterText]}>
            UPCOMING
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredTournaments.map((tournament) => (
          <View key={tournament.id} style={styles.tournamentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.tournamentIcon}>
                <MaterialCommunityIcons name="trophy-award" size={28} color={COLORS.accent} />
              </View>
              <View style={styles.tournamentInfo}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                <View style={styles.statusContainer}>
                  <Ionicons 
                    name={getStatusIcon(tournament.status)} 
                    size={14} 
                    color={getStatusColor(tournament.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(tournament.status) }]}>
                    {tournament.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar" size={16} color={COLORS.accent} />
                <Text style={styles.detailText}>{tournament.date}</Text>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="people" size={16} color={COLORS.accent} />
                <Text style={styles.detailText}>
                  {tournament.participants} {tournament.maxParticipants && `/ ${tournament.maxParticipants}`}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <FontAwesome5 name="trophy" size={14} color={COLORS.accent} />
                <Text style={styles.detailText}>{tournament.prizePool}</Text>
              </View>

              <View style={styles.detailItem}>
                <FontAwesome5 name="ticket-alt" size={14} color={COLORS.accent} />
                <Text style={styles.detailText}>{tournament.entryFee}</Text>
              </View>
            </View>

            {tournament.winner && (
              <View style={styles.winnerContainer}>
                <MaterialCommunityIcons name="crown" size={18} color="#FFD700" />
                <Text style={styles.winnerText}>Winner: {tournament.winner}</Text>
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => handleViewDetails(tournament)}
              >
                <Ionicons name="eye" size={18} color={COLORS.white} />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteTournament(tournament)}
              >
                <Ionicons name="trash" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredTournaments.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy-broken" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No tournaments found</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    backgroundColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  activeFilterText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tournamentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 8,
  },
  winnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  winnerText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 15,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 15,
  },
});

export default TournamentHistory;
