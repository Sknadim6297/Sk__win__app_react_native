import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { tournamentService } from '../../services/api';

const Toast = ({ message, type, onDismiss }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  const bgColor = type === 'success' ? COLORS.success : type === 'error' ? COLORS.error : COLORS.warning;

  return (
    <View style={[styles.toast, { backgroundColor: bgColor }]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};

const TournamentWinners = ({ navigation }) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const [winners, setWinners] = useState({
    first: null,
    second: null,
    third: null,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentWinnerPosition, setCurrentWinnerPosition] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getAllTournaments();
      // Filter only completed tournaments
      const completed = data.filter(t => t.status === 'completed');
      setTournaments(completed);
    } catch (error) {
      showToast('Failed to fetch tournaments', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  };

  const selectTournament = async (tournament) => {
    try {
      setSelectedTournament(tournament);
      // Get participants
      const details = await tournamentService.getDetails(tournament._id);
      setParticipants(details.participants);
      
      // Get existing results if any
      try {
        const results = await tournamentService.getResults(tournament._id);
        if (results.length > 0) {
          const w = {
            first: results.find(r => r.rank === 1),
            second: results.find(r => r.rank === 2),
            third: results.find(r => r.rank === 3),
          };
          setWinners(w);
        }
      } catch (e) {
        // No results yet
        setWinners({ first: null, second: null, third: null });
      }
    } catch (error) {
      showToast('Failed to load participants', 'error');
      console.error('Error:', error);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
  };

  const openWinnerSelector = (position) => {
    setCurrentWinnerPosition(position);
    setSearchQuery('');
    setShowWinnerModal(true);
  };

  const selectWinner = (participant) => {
    const winnerData = {
      userId: participant.userId._id,
      username: participant.userId.username,
      name: participant.userId.username,
    };

    setWinners(prev => ({
      ...prev,
      [currentWinnerPosition]: winnerData,
    }));

    setShowWinnerModal(false);
  };

  const submitWinners = async () => {
    if (!winners.first || !winners.second || !winners.third) {
      showToast('All three winners must be selected', 'error');
      return;
    }

    try {
      setLoading(true);
      await tournamentService.selectWinners(
        selectedTournament._id,
        winners.first.userId,
        winners.second.userId,
        winners.third.userId
      );
      showToast('Winners selected successfully', 'success');
      setShowWinnerModal(false);
    } catch (error) {
      showToast(error.message || 'Failed to select winners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const distributePrizes = async () => {
    Alert.alert(
      'Distribute Prizes?',
      `Are you sure you want to distribute prizes to the winners? This will credit the prize amount to their wallets.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await tournamentService.distributePrizes(selectedTournament._id);
              showToast('Prizes distributed successfully!', 'success');
              setSelectedTournament(null);
              setWinners({ first: null, second: null, third: null });
              await fetchTournaments();
            } catch (error) {
              showToast(error.message || 'Failed to distribute prizes', 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredParticipants = participants.filter(p =>
    p.userId.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && tournaments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedTournament) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Winners</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          style={styles.scrollView}
        >
          {tournaments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.disabled} />
              <Text style={styles.emptyText}>No completed tournaments</Text>
              <Text style={styles.emptySubtext}>Tournaments must be marked as completed first</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {tournaments.map((tournament) => (
                <TouchableOpacity
                  key={tournament._id}
                  style={styles.tournamentCard}
                  onPress={() => selectTournament(tournament)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      <MaterialCommunityIcons name="trophy" size={24} color={COLORS.primary} />
                      <Text style={styles.tournamentName}>{tournament.name}</Text>
                    </View>
                    <Text style={styles.participantCount}>{tournament.participantCount} players</Text>
                  </View>
                  <Text style={styles.cardSubtext}>
                    Prize Pool: ${tournament.prizePool}
                  </Text>
                  <View style={styles.prizeBreakdown}>
                    <View style={styles.prizeRow}>
                      <MaterialCommunityIcons name="medal" size={16} style={[styles.prizeIcon, styles.prizeIconFirst]} />
                      <Text style={styles.prizeText}>${tournament.prizes?.first}</Text>
                    </View>
                    <View style={styles.prizeRow}>
                      <MaterialCommunityIcons name="medal" size={16} style={[styles.prizeIcon, styles.prizeIconSecond]} />
                      <Text style={styles.prizeText}>${tournament.prizes?.second}</Text>
                    </View>
                    <View style={styles.prizeRow}>
                      <MaterialCommunityIcons name="medal" size={16} style={[styles.prizeIcon, styles.prizeIconThird]} />
                      <Text style={styles.prizeText}>${tournament.prizes?.third}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast({ message: '', type: '' })}
        />
      </SafeAreaView>
    );
  }

  // Winner Selection View
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedTournament(null)}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedTournament.name}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Prize Pool Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prize Pool:</Text>
              <Text style={styles.infoValue}>${selectedTournament.prizePool}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Participants:</Text>
              <Text style={styles.infoValue}>{selectedTournament.participantCount}</Text>
            </View>
          </View>

          {/* Winner Selection Cards */}
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="trophy-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Select Winners</Text>
          </View>

          {/* 1st Place */}
          <TouchableOpacity
            style={[styles.winnerCard, styles.winnerCardFirst]}
            onPress={() => openWinnerSelector('first')}
          >
            <View style={styles.winnerHeader}>
              <View style={styles.winnerBadgeRow}>
                <MaterialCommunityIcons name="medal" size={16} style={[styles.winnerBadgeIcon, styles.prizeIconFirst]} />
                <Text style={styles.winnerBadge}>1st Place</Text>
              </View>
              <Text style={styles.prizeAmount}>${selectedTournament.prizes?.first}</Text>
            </View>
            {winners.first ? (
              <View style={styles.selectedWinner}>
                <Ionicons name="person-circle" size={40} color={COLORS.primary} />
                <View>
                  <Text style={styles.winnerName}>{winners.first.username}</Text>
                  <Text style={styles.selectedText}>Selected ✓</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.selectText}>Tap to select winner</Text>
            )}
          </TouchableOpacity>

          {/* 2nd Place */}
          <TouchableOpacity
            style={[styles.winnerCard, styles.winnerCardSecond]}
            onPress={() => openWinnerSelector('second')}
          >
            <View style={styles.winnerHeader}>
              <View style={styles.winnerBadgeRow}>
                <MaterialCommunityIcons name="medal" size={16} style={[styles.winnerBadgeIcon, styles.prizeIconSecond]} />
                <Text style={styles.winnerBadge}>2nd Place</Text>
              </View>
              <Text style={styles.prizeAmount}>${selectedTournament.prizes?.second}</Text>
            </View>
            {winners.second ? (
              <View style={styles.selectedWinner}>
                <Ionicons name="person-circle" size={40} color={COLORS.primary} />
                <View>
                  <Text style={styles.winnerName}>{winners.second.username}</Text>
                  <Text style={styles.selectedText}>Selected ✓</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.selectText}>Tap to select winner</Text>
            )}
          </TouchableOpacity>

          {/* 3rd Place */}
          <TouchableOpacity
            style={[styles.winnerCard, styles.winnerCardThird]}
            onPress={() => openWinnerSelector('third')}
          >
            <View style={styles.winnerHeader}>
              <View style={styles.winnerBadgeRow}>
                <MaterialCommunityIcons name="medal" size={16} style={[styles.winnerBadgeIcon, styles.prizeIconThird]} />
                <Text style={styles.winnerBadge}>3rd Place</Text>
              </View>
              <Text style={styles.prizeAmount}>${selectedTournament.prizes?.third}</Text>
            </View>
            {winners.third ? (
              <View style={styles.selectedWinner}>
                <Ionicons name="person-circle" size={40} color={COLORS.primary} />
                <View>
                  <Text style={styles.winnerName}>{winners.third.username}</Text>
                  <Text style={styles.selectedText}>Selected ✓</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.selectText}>Tap to select winner</Text>
            )}
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={submitWinners}
              disabled={!winners.first || !winners.second || !winners.third || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Confirm Winners</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.distributeButton]}
              onPress={distributePrizes}
              disabled={!winners.first || !winners.second || !winners.third}
            >
              <Ionicons name="wallet" size={20} color="#fff" />
              <Text style={styles.distributeButtonText}>Distribute Prizes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Winner Selector Modal */}
      <Modal visible={showWinnerModal} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWinnerModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select {currentWinnerPosition === 'first' ? '1st' : currentWinnerPosition === 'second' ? '2nd' : '3rd'} Place</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.disabled} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search player..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.disabled}
            />
          </View>

          <FlatList
            data={filteredParticipants}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.participantItem}
                onPress={() => selectWinner(item)}
              >
                <Ionicons name="person-circle" size={40} color={COLORS.primary} />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{item.userId.username}</Text>
                  <Text style={styles.participantEmail}>{item.userId.email}</Text>
                </View>
                {(winners.first?.userId === item.userId._id ||
                  winners.second?.userId === item.userId._id ||
                  winners.third?.userId === item.userId._id) && (
                  <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.participantList}
          />
        </SafeAreaView>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ message: '', type: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  tournamentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  participantCount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  cardSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  prizeBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 8,
    paddingVertical: 8,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prizeIcon: {
    color: COLORS.primary,
  },
  prizeIconFirst: {
    color: '#FFD700',
  },
  prizeIconSecond: {
    color: '#C0C0C0',
  },
  prizeIconThird: {
    color: '#CD7F32',
  },
  prizeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  winnerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  winnerCardFirst: {
    borderLeftColor: '#FFD700',
  },
  winnerCardSecond: {
    borderLeftColor: '#C0C0C0',
  },
  winnerCardThird: {
    borderLeftColor: '#CD7F32',
  },
  winnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  winnerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  winnerBadgeIcon: {
    color: COLORS.primary,
  },
  winnerBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  prizeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectedWinner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 10,
  },
  selectedText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 10,
  },
  selectText: {
    fontSize: 14,
    color: COLORS.disabled,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: COLORS.success,
  },
  distributeButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  distributeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  participantList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  participantEmail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    zIndex: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});

export default TournamentWinners;
