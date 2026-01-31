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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DatePicker from 'react-native-date-picker';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../../styles/theme';
import { tournamentService, gameService } from '../../services/api';
import Toast from '../../components/Toast';

const AVAILABLE_MAPS = [
  { label: 'Bermuda', value: 'Bermuda' },
  { label: 'Purgatory', value: 'Purgatory' },
  { label: 'Kalahari', value: 'Kalahari' },
  { label: 'Diner', value: 'Diner' },
  { label: 'Pipeline', value: 'Pipeline' },
];

const TournamentManagement = ({ navigation }) => {
  const [games, setGames] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [selectedTournamentForRoom, setSelectedTournamentForRoom] = useState(null);
  const [selectedTournamentForWinners, setSelectedTournamentForWinners] = useState(null);
  const [tournamentParticipants, setTournamentParticipants] = useState([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomId: '',
    roomPassword: '',
    showRoomCredentials: false,
  });
  const [winnersForm, setWinnersForm] = useState({
    firstPlace: null,
    secondPlace: null,
    thirdPlace: null,
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  // Form states
  const [form, setForm] = useState({
    name: '',
    description: '',
    game: '',
    gameMode: '',
    mode: 'solo',
    map: 'Bermuda',
    rules: [''],
    entryFee: '',
    prizePool: '',
    perKill: '',
    maxParticipants: '',
    startDate: new Date(),
    endDate: null,
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

  const formatDateForDisplay = (date) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTimeForDisplay = (date) => {
    if (!date) return 'Select Time';
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
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
    if (!form.startDate) missingFields.push('Start Date');
    if (!form.maxParticipants.trim()) missingFields.push('Max Players');
    
    if (missingFields.length > 0) {
      showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    try {
      const tournamentData = {
        name: form.name,
        description: form.description,
        game: selectedGame,
        gameMode: selectedGameMode,
        mode: form.mode,
        map: form.map,
        rules: form.rules.filter(rule => rule.trim() !== ''),
        entryFee: parseFloat(form.entryFee) || 0,
        prizePool: parseFloat(form.prizePool) || 0,
        perKill: parseFloat(form.perKill) || 0,
        maxParticipants: parseInt(form.maxParticipants) || 20,
        minimumKYC: form.minimumKYC,
        minimumBalance: parseFloat(form.minimumBalance) || 0,
        startDate: form.startDate.toISOString(),
        endDate: form.endDate ? form.endDate.toISOString() : null,
        roomId: form.roomId,
        roomPassword: form.roomPassword,
        showRoomCredentials: form.showRoomCredentials,
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
      rules: [''],
      entryFee: '',
      prizePool: '',
      perKill: '',
      maxParticipants: '',
      startDate: new Date(),
      endDate: null,
      minimumKYC: false,
      minimumBalance: '',
      roomId: '',
      roomPassword: '',
      showRoomCredentials: false,
    });
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
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

  const handleManageRoom = (tournament) => {
    setSelectedTournamentForRoom(tournament);
    setRoomForm({
      roomId: tournament.roomId || '',
      roomPassword: tournament.roomPassword || '',
      showRoomCredentials: tournament.showRoomCredentials || false,
    });
    setShowRoomModal(true);
  };

  const handleSaveRoomCredentials = async () => {
    if (!selectedTournamentForRoom) return;
    
    try {
      await tournamentService.setRoomDetails(
        selectedTournamentForRoom._id,
        roomForm.roomId,
        roomForm.roomPassword,
        roomForm.showRoomCredentials
      );
      showToast('Room credentials updated successfully!', 'success');
      setShowRoomModal(false);
      fetchTournaments(); // Refresh the list
    } catch (error) {
      showToast(error.message || 'Failed to update room credentials', 'error');
    }
  };

  const handleDeclarWinners = async (tournament) => {
    try {
      // Fetch tournament participants
      const participantsData = await tournamentService.getTournamentParticipants(tournament._id);
      // Ensure data is an array - handle if it's wrapped in an object
      const participants = Array.isArray(participantsData) ? participantsData : (participantsData?.data || participantsData?.participants || []);
      setTournamentParticipants(participants);
      setSelectedTournamentForWinners(tournament);
      setWinnersForm({ firstPlace: null, secondPlace: null, thirdPlace: null });
      setShowWinnersModal(true);
    } catch (error) {
      showToast(error.message || 'Failed to load participants', 'error');
    }
  };

  const handleSaveWinners = async () => {
    if (!selectedTournamentForWinners) return;

    if (!winnersForm.firstPlace) {
      showToast('Please select 1st place winner', 'error');
      return;
    }

    try {
      const winners = [];
      
      // Find participant objects from selectedParticipants
      const findParticipantById = (participantId) => {
        return tournamentParticipants.find(p => p._id === participantId);
      };

      if (winnersForm.firstPlace) {
        const participant = findParticipantById(winnersForm.firstPlace);
        if (participant) {
          winners.push({
            position: 1,
            userId: participant.user?._id || participant.userId,
            reward: selectedTournamentForWinners.prizes?.first || 0,
          });
        }
      }
      if (winnersForm.secondPlace) {
        const participant = findParticipantById(winnersForm.secondPlace);
        if (participant) {
          winners.push({
            position: 2,
            userId: participant.user?._id || participant.userId,
            reward: selectedTournamentForWinners.prizes?.second || 0,
          });
        }
      }
      if (winnersForm.thirdPlace) {
        const participant = findParticipantById(winnersForm.thirdPlace);
        if (participant) {
          winners.push({
            position: 3,
            userId: participant.user?._id || participant.userId,
            reward: selectedTournamentForWinners.prizes?.third || 0,
          });
        }
      }

      await tournamentService.setTournamentWinners(selectedTournamentForWinners._id, winners);
      
      // Auto complete tournament after setting winners
      await tournamentService.completeTournament(selectedTournamentForWinners._id);
      
      showToast('Winners declared and tournament completed!', 'success');
      setShowWinnersModal(false);
      fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to save winners', 'error');
    }
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
                      style={styles.actionButton}
                      onPress={() => handleManageRoom(tournament)}
                    >
                      <MaterialCommunityIcons name="key" size={16} color={COLORS.accent} />
                      <Text style={styles.actionText}>Room</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeclarWinners(tournament)}
                    >
                      <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
                      <Text style={styles.actionText}>Winners</Text>
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

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Mode</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.mode}
                      onValueChange={(itemValue) => setForm(prev => ({ ...prev, mode: itemValue }))}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      <Picker.Item label="Solo" value="solo" />
                      <Picker.Item label="Duo" value="duo" />
                      <Picker.Item label="Squad" value="squad" />
                    </Picker>
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Map</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.map}
                      onValueChange={(itemValue) => setForm(prev => ({ ...prev, map: itemValue }))}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {AVAILABLE_MAPS.map((map) => (
                        <Picker.Item key={map.value} label={map.label} value={map.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar" size={20} color={COLORS.accent} />
                    <Text style={styles.dateInputText}>{formatDateForDisplay(form.startDate)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.input, styles.timeInput]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.accent} />
                    <Text style={styles.dateInputText}>{formatTimeForDisplay(form.startDate)}</Text>
                  </TouchableOpacity>
                </View>
                <DatePicker
                  modal
                  open={showStartDatePicker}
                  date={form.startDate || new Date()}
                  onConfirm={(date) => {
                    setForm(prev => ({ ...prev, startDate: date }));
                    setShowStartDatePicker(false);
                  }}
                  onCancel={() => setShowStartDatePicker(false)}
                  title="Select Start Date & Time"
                  confirmText="Confirm"
                  cancelText="Cancel"
                  mode="datetime"
                  is24hourSource="locale"
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

              {/* Room Credentials Section */}
              <View style={styles.sectionDivider}>
                <MaterialCommunityIcons name="key" size={20} color={COLORS.accent} />
                <Text style={styles.sectionDividerText}>Room Credentials</Text>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Room ID</Text>
                  <TextInput
                    style={styles.input}
                    value={form.roomId}
                    onChangeText={(text) => setForm(prev => ({ ...prev, roomId: text }))}
                    placeholder="Enter room ID"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Room Password</Text>
                  <TextInput
                    style={styles.input}
                    value={form.roomPassword}
                    onChangeText={(text) => setForm(prev => ({ ...prev, roomPassword: text }))}
                    placeholder="Enter room password"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <MaterialCommunityIcons name="eye" size={20} color={COLORS.accent} />
                  <Text style={styles.switchLabel}>Show Room Credentials to Players</Text>
                  <Switch
                    value={form.showRoomCredentials}
                    onValueChange={(value) => setForm(prev => ({ ...prev, showRoomCredentials: value }))}
                    trackColor={{ false: COLORS.darkGray, true: COLORS.accent }}
                    thumbColor={form.showRoomCredentials ? COLORS.white : COLORS.gray}
                  />
                </View>
                <Text style={styles.switchDescription}>
                  When enabled, players who joined this tournament will be able to see room credentials
                </Text>
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

      {/* Room Management Modal */}
      <Modal visible={showRoomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Room Credentials - {selectedTournamentForRoom?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowRoomModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room ID</Text>
              <TextInput
                style={styles.input}
                value={roomForm.roomId}
                onChangeText={(text) => setRoomForm(prev => ({ ...prev, roomId: text }))}
                placeholder="Enter room ID"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room Password</Text>
              <TextInput
                style={styles.input}
                value={roomForm.roomPassword}
                onChangeText={(text) => setRoomForm(prev => ({ ...prev, roomPassword: text }))}
                placeholder="Enter room password"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <MaterialCommunityIcons 
                  name={roomForm.showRoomCredentials ? "eye" : "eye-off"} 
                  size={20} 
                  color={roomForm.showRoomCredentials ? COLORS.accent : COLORS.gray} 
                />
                <Text style={styles.switchLabel}>Show Room Credentials to Players</Text>
                <Switch
                  value={roomForm.showRoomCredentials}
                  onValueChange={(value) => setRoomForm(prev => ({ ...prev, showRoomCredentials: value }))}
                  trackColor={{ false: COLORS.darkGray, true: COLORS.accent }}
                  thumbColor={roomForm.showRoomCredentials ? COLORS.white : COLORS.gray}
                />
              </View>
              <Text style={styles.switchDescription}>
                When enabled, players who joined this tournament will be able to see room credentials
              </Text>
            </View>

            {/* Room Status Display */}
            <View style={styles.roomStatusSection}>
              <Text style={styles.roomStatusTitle}>Current Status:</Text>
              <View style={styles.roomStatusItem}>
                <Text style={styles.roomStatusLabel}>Room ID:</Text>
                <Text style={[styles.roomStatusValue, !roomForm.roomId && styles.roomStatusEmpty]}>
                  {roomForm.roomId || 'Not set'}
                </Text>
              </View>
              <View style={styles.roomStatusItem}>
                <Text style={styles.roomStatusLabel}>Room Password:</Text>
                <Text style={[styles.roomStatusValue, !roomForm.roomPassword && styles.roomStatusEmpty]}>
                  {roomForm.roomPassword || 'Not set'}
                </Text>
              </View>
              <View style={styles.roomStatusItem}>
                <Text style={styles.roomStatusLabel}>Visibility:</Text>
                <View style={[
                  styles.visibilityBadge,
                  { backgroundColor: roomForm.showRoomCredentials ? '#34C759' : COLORS.gray }
                ]}>
                  <MaterialCommunityIcons 
                    name={roomForm.showRoomCredentials ? "eye" : "eye-off"} 
                    size={12} 
                    color={COLORS.white} 
                  />
                  <Text style={styles.visibilityBadgeText}>
                    {roomForm.showRoomCredentials ? 'Visible' : 'Hidden'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRoomModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={handleSaveRoomCredentials}
              >
                <Text style={styles.createButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Winners Declaration Modal */}
      <Modal visible={showWinnersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Declare Winners</Text>
                <TouchableOpacity onPress={() => setShowWinnersModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {selectedTournamentForWinners && (
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionTitle}>Tournament: {selectedTournamentForWinners.name}</Text>
                </View>
              )}

              {/* 1st Place */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🥇 1st Place (Required) *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={winnersForm.firstPlace}
                    onValueChange={(itemValue) => setWinnersForm(prev => ({ ...prev, firstPlace: itemValue }))}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Select 1st Place Winner" value={null} />
                    {Array.isArray(tournamentParticipants) && tournamentParticipants.length > 0 ? (
                      tournamentParticipants.map((participant) => {
                        const userName = participant.user?.username || participant.user?.email || participant.playerName || 'Player';
                        return (
                          <Picker.Item 
                            key={participant._id}
                            label={userName} 
                            value={participant._id}
                          />
                        );
                      })
                    ) : (
                      <Picker.Item label="No participants found" value={null} />
                    )}
                  </Picker>
                </View>
              </View>

              {/* 2nd Place */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🥈 2nd Place (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={winnersForm.secondPlace}
                    onValueChange={(itemValue) => setWinnersForm(prev => ({ ...prev, secondPlace: itemValue }))}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Select 2nd Place Winner" value={null} />
                    {Array.isArray(tournamentParticipants) && tournamentParticipants.length > 0 ? (
                      tournamentParticipants.map((participant) => {
                        const userName = participant.user?.username || participant.user?.email || participant.playerName || 'Player';
                        return (
                          <Picker.Item 
                            key={participant._id}
                            label={userName} 
                            value={participant._id}
                          />
                        );
                      })
                    ) : (
                      <Picker.Item label="No participants found" value={null} />
                    )}
                  </Picker>
                </View>
              </View>

              {/* 3rd Place */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🥉 3rd Place (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={winnersForm.thirdPlace}
                    onValueChange={(itemValue) => setWinnersForm(prev => ({ ...prev, thirdPlace: itemValue }))}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Select 3rd Place Winner" value={null} />
                    {Array.isArray(tournamentParticipants) && tournamentParticipants.length > 0 ? (
                      tournamentParticipants.map((participant) => {
                        const userName = participant.user?.username || participant.user?.email || participant.playerName || 'Player';
                        return (
                          <Picker.Item 
                            key={participant._id}
                            label={userName} 
                            value={participant._id}
                          />
                        );
                      })
                    ) : (
                      <Picker.Item label="No participants found" value={null} />
                    )}
                  </Picker>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowWinnersModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleSaveWinners}
                >
                  <Text style={styles.createButtonText}>Declare Winners</Text>
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
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  sectionDividerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.white,
    marginLeft: 8,
    flex: 1,
  },
  switchDescription: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginLeft: 28,
  },
  roomStatusSection: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
  },
  roomStatusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  roomStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomStatusLabel: {
    fontSize: 12,
    color: COLORS.gray,
    width: 80,
  },
  roomStatusValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: 'bold',
    flex: 1,
  },
  roomStatusEmpty: {
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  visibilityBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    marginLeft: 4,
    fontWeight: 'bold',
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  timeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dateInputText: {
    color: COLORS.white,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  picker: {
    color: COLORS.white,
    backgroundColor: COLORS.darkGray,
  },
  pickerItem: {
    backgroundColor: COLORS.darkGray,
    color: COLORS.white,
  },
});

export default TournamentManagement;