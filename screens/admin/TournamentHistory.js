import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { tournamentService } from '../../services/api';
import Toast from '../../components/Toast';

const TournamentHistory = ({ navigation }) => {
  const [filter, setFilter] = useState('all'); // all, completed, ongoing, incoming
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    fetchTournamentHistory();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const fetchTournamentHistory = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournamentHistory();
      setTournaments(data);
    } catch (error) {
      console.error('Error fetching tournament history:', error);
      showToast(error.message || 'Failed to fetch tournament history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournamentHistory();
    setRefreshing(false);
  };

  const fetchParticipants = async (tournamentId) => {
    try {
      setLoadingParticipants(true);
      const data = await tournamentService.getTournamentParticipants(tournamentId);
      setParticipants(data.participants);
      setSelectedTournament(data.tournament);
    } catch (error) {
      console.error('Error fetching participants:', error);
      showToast(error.message || 'Failed to fetch participants', 'error');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleViewParticipants = async (tournament) => {
    setShowParticipantsModal(true);
    await fetchParticipants(tournament._id);
  };

  const getFilteredTournaments = () => {
    if (filter === 'all') return tournaments;
    if (filter === 'incoming') {
      return tournaments.filter(t => t.status === 'incoming' || t.status === 'upcoming');
    }
    if (filter === 'ongoing') {
      return tournaments.filter(t => t.status === 'ongoing' || t.status === 'live');
    }
    return tournaments.filter(t => t.status === filter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.gray;
      case 'ongoing': return '#FF3B30';
      case 'live': return '#FF3B30';
      case 'incoming': return '#FF9500';
      case 'upcoming': return '#FF9500';
      case 'cancelled': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'ongoing': return 'radio-button-on';
      case 'live': return 'radio-button-on';
      case 'incoming': return 'time';
      case 'upcoming': return 'time';
      case 'cancelled': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredTournaments = getFilteredTournaments();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TOURNAMENT HISTORY</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOURNAMENT HISTORY</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tournaments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tournaments.filter(t => t.status === 'ongoing' || t.status === 'live').length}
          </Text>
          <Text style={styles.statLabel}>Ongoing</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tournaments.filter(t => t.status === 'incoming' || t.status === 'upcoming').length}
          </Text>
          <Text style={styles.statLabel}>Incoming</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tournaments.filter(t => t.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
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
            ONGOING
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'incoming' && styles.activeFilter]}
          onPress={() => setFilter('incoming')}
        >
          <Text style={[styles.filterText, filter === 'incoming' && styles.activeFilterText]}>
            INCOMING
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.accent}
          />
        }
      >
        {filteredTournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No tournaments found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'Create your first tournament to get started' 
                : `No ${filter} tournaments`}
            </Text>
          </View>
        ) : (
          filteredTournaments.map((tournament) => (
            <View key={tournament._id} style={styles.tournamentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.tournamentIcon}>
                  <MaterialCommunityIcons name="trophy-award" size={28} color={COLORS.accent} />
                </View>
                <View style={styles.tournamentInfo}>
                  <Text style={styles.tournamentName}>{tournament.name}</Text>
                  <Text style={styles.tournamentGame}>
                    {tournament.game?.name} - {tournament.gameMode?.name}
                  </Text>
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
                  <Text style={styles.detailText}>{formatDate(tournament.startDate)}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="people" size={16} color={COLORS.accent} />
                  <Text style={styles.detailText}>
                    {tournament.totalJoined || 0} / {tournament.maxParticipants}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
                  <Text style={styles.detailText}>₹{tournament.prizePool}</Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="ticket" size={16} color={COLORS.accent} />
                  <Text style={styles.detailText}>₹{tournament.entryFee}</Text>
                </View>
              </View>

              {tournament.prizes && (
                <View style={styles.prizesRow}>
                  <View style={styles.prizeBadge}>
                    <Text style={styles.prizeRank}>🥇</Text>
                    <Text style={styles.prizeValue}>₹{tournament.prizes.first || 0}</Text>
                  </View>
                  <View style={styles.prizeBadge}>
                    <Text style={styles.prizeRank}>🥈</Text>
                    <Text style={styles.prizeValue}>₹{tournament.prizes.second || 0}</Text>
                  </View>
                  <View style={styles.prizeBadge}>
                    <Text style={styles.prizeRank}>🥉</Text>
                    <Text style={styles.prizeValue}>₹{tournament.prizes.third || 0}</Text>
                  </View>
                </View>
              )}

              {/* Room Credentials */}
              {tournament.roomId && (
                <View style={styles.roomCredentials}>
                  <MaterialCommunityIcons name="key" size={16} color={COLORS.accent} />
                  <Text style={styles.roomText}>
                    Room ID: {tournament.roomId} | Pass: {tournament.roomPassword || 'Not set'}
                  </Text>
                  <View style={[
                    styles.credentialsBadge,
                    { backgroundColor: tournament.showRoomCredentials ? '#34C759' : COLORS.gray }
                  ]}>
                    <Text style={styles.credentialsBadgeText}>
                      {tournament.showRoomCredentials ? 'Visible' : 'Hidden'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => handleViewParticipants(tournament)}
                >
                  <Ionicons name="people" size={18} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>
                    View Players ({tournament.totalJoined || 0})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Participants Modal */}
      <Modal
        visible={showParticipantsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTournament?.name || 'Tournament'} - Players
              </Text>
              <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {loadingParticipants ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : (
              <FlatList
                data={participants}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={({ item, index }) => (
                  <View style={styles.participantItem}>
                    <View style={styles.participantRank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{item.username}</Text>
                      <Text style={styles.participantEmail}>{item.email}</Text>
                      <Text style={styles.participantMeta}>
                        Slot: {item.slotNumber ? `#${item.slotNumber}` : '-'} | Gaming ID: {item.gamingUsername || '-'}
                      </Text>
                      <Text style={styles.joinedDate}>
                        Joined: {formatDateTime(item.joinedAt)}
                      </Text>
                    </View>
                    <View style={[
                      styles.participantStatus,
                      { backgroundColor: item.status === 'winner' ? '#FFD700' : COLORS.accent }
                    ]}>
                      <Text style={styles.participantStatusText}>
                        {item.status === 'winner' ? '👑' : '✓'}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No participants yet</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: COLORS.accent,
  },
  filterText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeFilterText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tournamentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
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
    marginBottom: 4,
  },
  tournamentGame: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
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
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.white,
    marginLeft: 6,
  },
  prizesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginTop: 10,
  },
  prizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.darkGray,
  },
  prizeRank: {
    fontSize: 12,
  },
  prizeValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  roomCredentials: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  roomText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 8,
    flex: 1,
  },
  credentialsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  credentialsBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: COLORS.accent,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  participantRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
  participantMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
  joinedDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  participantStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantStatusText: {
    fontSize: 14,
    color: COLORS.white,
  },
});

export default TournamentHistory;
