import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { tournamentService, gameService } from '../../services/api';
import Toast from '../../components/Toast';

const TournamentManagement = ({ navigation }) => {
  const [games, setGames] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  // Form states
  const [form, setForm] = useState({
    name: '',
    description: '',
    game: '',
    gameMode: '',
    mode: 'solo',
    map: 'Bermuda',
    version: 'TPP',
    rules: [''],
    entryFee: '',
    prizePool: '',
    perKill: '',
    maxParticipants: '',
    startDate: '',
    endDate: '',
    minimumKYC: false,
    minimumBalance: '',
    roomId: '',
    roomPassword: '',
    showRoomCredentials: false,
  });

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchGameModes(selectedGame);
    }
  }, [selectedGame]);

  useEffect(() => {
    if (selectedGameMode) {
      fetchTournaments();
    }
  }, [selectedGameMode]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await gameService.getAllGames();
      setGames(data);
    } catch (error) {
      showToast(error.message || 'Failed to fetch games', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGameModes = async (gameId) => {
    try {
      const data = await gameService.getGameModes(gameId);
      setGameModes(data);
    } catch (error) {
      showToast(error.message || 'Failed to fetch game modes', 'error');
    }
  };

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournamentsByGameMode(selectedGameMode);
      setTournaments(data);
    } catch (error) {
      showToast(error.message || 'Failed to fetch tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGames();
    if (selectedGameMode) {
      await fetchTournaments();
    }
    setRefreshing(false);
  };

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const handleCreateTournament = async () => {
    // Check if game and game mode are selected first
    if (!selectedGame) {
      showToast('Please select a game first', 'error');
      return;
    }
    
    if (!selectedGameMode) {
      showToast('Please select a game mode first', 'error');
      return;
    }

    // Validate required form fields
    const missingFields = [];
    if (!form.name.trim()) missingFields.push('Tournament Name');
    if (!form.startDate.trim()) missingFields.push('Start Date');
    if (!form.maxParticipants.trim()) missingFields.push('Max Players');
    
    if (missingFields.length > 0) {
      showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    try {
      const tournamentData = {
        ...form,
        game: selectedGame,
        gameMode: selectedGameMode,
        entryFee: parseFloat(form.entryFee) || 0,
        prizePool: parseFloat(form.prizePool) || 0,
        perKill: parseFloat(form.perKill) || 0,
        maxParticipants: parseInt(form.maxParticipants) || 20,
        minimumBalance: parseFloat(form.minimumBalance) || 0,
        rules: form.rules.filter(rule => rule.trim() !== ''),
      };

      await tournamentService.createTournament(tournamentData);
      showToast('Tournament created successfully!', 'success');
      setShowCreateModal(false);
      resetForm();
      fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to create tournament', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      game: '',
      gameMode: '',
      mode: 'solo',
      map: 'Bermuda',
      version: 'TPP',
      rules: [''],
      entryFee: '',
      prizePool: '',
      perKill: '',
      maxParticipants: '',
      startDate: '',
      endDate: '',
      minimumKYC: false,
      minimumBalance: '',
      roomId: '',
      roomPassword: '',
      showRoomCredentials: false,
    });
  };

  const handleDeleteTournament = (tournament) => {
    Alert.alert(
      'Delete Tournament',
      `Are you sure you want to delete "${tournament.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteTournament(tournament._id) 
        },
      ]
    );
  };

  const deleteTournament = async (tournamentId) => {
    try {
      await tournamentService.deleteTournament(tournamentId);
      showToast('Tournament deleted successfully!', 'success');
      fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to delete tournament', 'error');
    }
  };

  const addRule = () => {
    setForm(prev => ({
      ...prev,
      rules: [...prev.rules, '']
    }));
  };

  const removeRule = (index) => {
    setForm(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const updateRule = (index, value) => {
    setForm(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) => i === index ? value : rule)
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournament Management</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)}
          style={styles.addButton}
          disabled={!selectedGameMode}
        >
          <MaterialCommunityIcons name="plus" size={24} color={selectedGameMode ? COLORS.white : COLORS.gray} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Game Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Game</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameList}>
            {games.map(game => (
              <TouchableOpacity
                key={game._id}
                style={[
                  styles.gameCard,
                  selectedGame === game._id && styles.gameCardSelected
                ]}
                onPress={() => {
                  setSelectedGame(game._id);
                  setSelectedGameMode(null);
                  setTournaments([]);
                }}
              >
                <MaterialCommunityIcons 
                  name="gamepad-variant" 
                  size={24} 
                  color={selectedGame === game._id ? COLORS.white : COLORS.accent} 
                />
                <Text style={[
                  styles.gameCardText,
                  selectedGame === game._id && styles.gameCardTextSelected
                ]}>
                  {game.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Game Mode Selection */}
        {selectedGame && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Game Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameModeList}>
              {gameModes.map(mode => (
                <TouchableOpacity
                  key={mode._id}
                  style={[
                    styles.gameModeCard,
                    selectedGameMode === mode._id && styles.gameModeCardSelected
                  ]}
                  onPress={() => setSelectedGameMode(mode._id)}
                >
                  <MaterialCommunityIcons 
                    name="play-circle-outline" 
                    size={20} 
                    color={selectedGameMode === mode._id ? COLORS.white : COLORS.accent} 
                  />
                  <Text style={[
                    styles.gameModeCardText,
                    selectedGameMode === mode._id && styles.gameModeCardTextSelected
                  ]}>
                    {mode.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tournaments */}
        {selectedGameMode && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tournaments</Text>
              <Text style={styles.tournamentCount}>{tournaments.length} tournaments</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Loading tournaments...</Text>
              </View>
            ) : tournaments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>No tournaments yet</Text>
                <Text style={styles.emptySubtext}>Create your first tournament for this game mode</Text>
              </View>
            ) : (
              tournaments.map(tournament => (
                <View key={tournament._id} style={styles.tournamentCard}>
                  <View style={styles.tournamentHeader}>
                    <View style={styles.tournamentInfo}>
                      <Text style={styles.tournamentName}>{tournament.name}</Text>
                      <Text style={styles.tournamentGame}>
                        {tournament.game?.name} - {tournament.gameMode?.name}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, styles[`status${tournament.status}`]]}>
                      <Text style={styles.statusText}>{tournament.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.tournamentDetails}>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="currency-usd" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>Entry: ₹{tournament.entryFee}</Text>
                      <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>Prize: ₹{tournament.prizePool}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="account-group" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>
                        {tournament.currentParticipants || 0}/{tournament.maxParticipants} Players
                      </Text>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tournamentActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('TournamentDetails', { tournamentId: tournament._id })}
                    >
                      <MaterialCommunityIcons name="eye" size={16} color={COLORS.accent} />
                      <Text style={styles.actionText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteTournament(tournament)}
                    >
                      <MaterialCommunityIcons name="delete" size={16} color="#FF6B6B" />
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Tournament</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Show selected game and mode */}
              {selectedGame && selectedGameMode && (
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionTitle}>Creating tournament for:</Text>
                  <View style={styles.selectionDetails}>
                    <Text style={styles.selectionText}>
                      Game: {games.find(g => g._id === selectedGame)?.name}
                    </Text>
                    <Text style={styles.selectionText}>
                      Mode: {gameModes.find(m => m._id === selectedGameMode)?.name}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tournament Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter tournament name"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                  placeholder="Enter tournament description"
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Entry Fee (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.entryFee}
                    onChangeText={(text) => setForm(prev => ({ ...prev, entryFee: text }))}
                    placeholder="0"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Prize Pool (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.prizePool}
                    onChangeText={(text) => setForm(prev => ({ ...prev, prizePool: text }))}
                    placeholder="0"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Per Kill (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.perKill}
                    onChangeText={(text) => setForm(prev => ({ ...prev, perKill: text }))}
                    placeholder="0"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Max Players *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.maxParticipants}
                    onChangeText={(text) => setForm(prev => ({ ...prev, maxParticipants: text }))}
                    placeholder="20"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  value={form.startDate}
                  onChangeText={(text) => setForm(prev => ({ ...prev, startDate: text }))}
                  placeholder="YYYY-MM-DD HH:MM"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rules</Text>
                {form.rules.map((rule, index) => (
                  <View key={index} style={styles.ruleRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={rule}
                      onChangeText={(text) => updateRule(index, text)}
                      placeholder={`Rule ${index + 1}`}
                      placeholderTextColor={COLORS.gray}
                    />
                    {form.rules.length > 1 && (
                      <TouchableOpacity onPress={() => removeRule(index)} style={styles.removeRuleButton}>
                        <MaterialCommunityIcons name="minus-circle" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={addRule} style={styles.addRuleButton}>
                  <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.addRuleText}>Add Rule</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleCreateTournament}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    padding: 8,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  tournamentCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  gameList: {
    paddingVertical: 8,
  },
  gameCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  gameCardSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  gameCardText: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
    textAlign: 'center',
  },
  gameCardTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  gameModeList: {
    paddingVertical: 8,
  },
  gameModeCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  gameModeCardSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  gameModeCardText: {
    fontSize: 11,
    color: COLORS.white,
    marginTop: 4,
    textAlign: 'center',
  },
  gameModeCardTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
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
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tournamentInfo: {
    flex: 1,
    marginRight: 12,
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
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusupcoming: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statuslive: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
  },
  statuscompleted: {
    backgroundColor: 'rgba(108, 117, 125, 0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  tournamentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 6,
    marginRight: 16,
  },
  tournamentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.darkGray,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  actionText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 4,
  },
  deleteText: {
    color: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeRuleButton: {
    marginLeft: 8,
    padding: 4,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addRuleText: {
    fontSize: 14,
    color: COLORS.accent,
    marginLeft: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: COLORS.darkGray,
  },
  createButton: {
    backgroundColor: COLORS.accent,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  selectionInfo: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  selectionDetails: {
    gap: 4,
  },
  selectionText: {
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default TournamentManagement;