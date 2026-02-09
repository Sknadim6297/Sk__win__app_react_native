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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { COLORS } from '../../styles/theme';
import { tournamentService, gameService } from '../../services/api';
import Toast from '../../components/Toast';

const AVAILABLE_MAPS = [
  { label: 'Bermuda', value: 'Bermuda' },
];

const GAME_MODES = [
  { label: 'Solo', value: 'solo' },
  { label: 'Duo', value: 'duo' },
  { label: 'Squad', value: 'squad' },
];

const MODE_MAX_PLAYERS = {
  solo: 50,
  duo: 50,
  squad: 50,
};

const TOURNAMENT_TYPES = [
  { label: 'Battle Royale (Full Map)', value: 'battle_royale', description: 'Complete map survival tournament' },
  { label: 'Clash Squad (Quick Match)', value: 'clash_squad', description: 'Fast-paced team combat' },
  { label: 'Training Ground', value: 'training', description: 'Practice and skill development' },
];

const REWARD_TYPES = [
  { label: 'Per Kill Reward', value: 'per_kill', description: 'Earn money for each kill' },
  { label: 'Survival / Booyah Prize Pool', value: 'survival', description: 'Win based on placement' },
  { label: 'Survival + Per Kill', value: 'hybrid', description: 'Placement + kill rewards' },
];

const MATCH_STATUSES = [
  { label: 'Incoming', value: 'incoming' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Completed', value: 'completed' },
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
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
    tournamentType: 'battle_royale',
    rewardType: 'per_kill',
    status: 'incoming',
    statusOverride: false,
    mode: 'solo',
    map: 'Bermuda',
    rulesText: '',
    entryFee: '',
    prizePool: '',
    perKill: '',
    maxParticipants: '50',
    maxTeams: '',
    startDate: new Date(),
    endDate: null,
    minimumBalance: '',
    roomId: '',
    roomPassword: '',
    showRoomCredentials: false,
    killRewardEnabled: true,
    teamSize: 1,
  });

  // Update team size based on mode
  useEffect(() => {
    const suggestedMaxPlayers = MODE_MAX_PLAYERS[form.mode];
    if (suggestedMaxPlayers) {
      const teamSize = form.mode === 'solo' ? 1 : form.mode === 'duo' ? 2 : 4;
      setForm(prev => ({
        ...prev,
        teamSize,
        maxParticipants: isEditMode ? prev.maxParticipants : suggestedMaxPlayers.toString(),
      }));
    }
  }, [form.mode, isEditMode]);

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

  const handleInputChange = (field, value) => {
    setForm(prev => ({ 
      ...prev, 
      [field]: value,
      // Update teamSize when mode changes
      ...(field === 'mode' && { teamSize: GAME_MODES.find(m => m.value === value)?.teamSize || 1 })
    }));
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

  const calculateTotalPrizePool = () => {
    if (form.rewardType === 'per_kill') {
      return 0; // No prize pool for per-kill only tournaments
    }
    if (form.rewardType === 'survival' && form.prizePool) {
      return parseFloat(form.prizePool) || 0;
    }
    if (form.rewardType === 'hybrid') {
      const entryFee = parseFloat(form.entryFee) || 0;
      const maxParticipants = parseInt(form.maxParticipants) || 50;
      const totalCollection = entryFee * maxParticipants;
      const platformFee = totalCollection * 0.1; // 10% platform fee
      const calculatedPool = totalCollection - platformFee;
      return form.prizePool ? parseFloat(form.prizePool) : calculatedPool;
    }
    return 0;
  };

  const calculateRecommendedRewards = () => {
    const totalPrize = calculateTotalPrizePool();
    if (form.rewardType === 'per_kill') {
      return { first: 0, second: 0, third: 0 }; // No placement rewards for per-kill
    }
    return {
      first: Math.floor(totalPrize * 0.5), // 50% for 1st
      second: Math.floor(totalPrize * 0.3), // 30% for 2nd
      third: Math.floor(totalPrize * 0.2), // 20% for 3rd
    };
  };

  const getGameImage = (game) => {
    if (game?.image) {
      return { uri: game.image };
    }
    // Default Free Fire image
    return require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');
  };

  const getModeImage = (mode) => {
    if (mode?.image) {
      return { uri: mode.image };
    }
    // Default mode icon
    return null;
  };

  const normalizeStatus = (status) => {
    if (status === 'upcoming') return 'incoming';
    if (status === 'live') return 'ongoing';
    return status || 'incoming';
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingTournament(null);
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (tournament) => {
    setIsEditMode(true);
    setEditingTournament(tournament);
    setSelectedGame(tournament.game?._id || tournament.game);
    setSelectedGameMode(tournament.gameMode?._id || tournament.gameMode);
    setForm({
      name: tournament.name || '',
      description: tournament.description || '',
      game: tournament.game?._id || tournament.game || '',
      gameMode: tournament.gameMode?._id || tournament.gameMode || '',
      tournamentType: tournament.tournamentType || 'battle_royale',
      rewardType: tournament.rewardType || 'per_kill',
      status: normalizeStatus(tournament.status),
      statusOverride: Boolean(tournament.statusOverride),
      mode: tournament.mode || 'solo',
      map: tournament.map || 'Bermuda',
      rulesText: Array.isArray(tournament.rules) ? tournament.rules.join('\n') : (tournament.rules || ''),
      entryFee: tournament.entryFee?.toString() || '',
      prizePool: tournament.prizePool?.toString() || '',
      perKill: tournament.perKill?.toString() || '',
      maxParticipants: tournament.maxParticipants?.toString() || '50',
      maxTeams: tournament.maxTeams?.toString() || '',
      startDate: tournament.startDate ? new Date(tournament.startDate) : new Date(),
      endDate: tournament.endDate ? new Date(tournament.endDate) : null,
      minimumBalance: tournament.minimumBalance?.toString() || '',
      roomId: tournament.roomId || '',
      roomPassword: tournament.roomPassword || '',
      showRoomCredentials: Boolean(tournament.showRoomCredentials),
      killRewardEnabled: tournament.rewardType !== 'survival',
      teamSize: tournament.teamSize || (tournament.mode === 'duo' ? 2 : tournament.mode === 'squad' ? 4 : 1),
    });
    setShowCreateModal(true);
  };

  const closeFormModal = () => {
    setShowCreateModal(false);
    setIsEditMode(false);
    setEditingTournament(null);
    resetForm();
  };

  const handleSaveTournament = async () => {
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
      const isStatusChanged = isEditMode
        ? normalizeStatus(editingTournament?.status) !== form.status
        : false;
      const statusOverride = isEditMode
        ? Boolean(form.statusOverride || isStatusChanged)
        : false;

      const tournamentData = {
        name: form.name,
        description: form.description,
        game: selectedGame,
        gameMode: selectedGameMode,
        tournamentType: form.tournamentType,
        rewardType: form.rewardType,
        status: isEditMode ? form.status : 'incoming',
        statusOverride,
        mode: form.mode,
        map: form.map,
        rules: form.rulesText.trim() ? [form.rulesText.trim()] : [],
        entryFee: parseFloat(form.entryFee) || 0,
        prizePool: form.rewardType === 'per_kill' ? 0 : calculateTotalPrizePool(),
        perKill: form.rewardType === 'survival' ? 0 : (parseFloat(form.perKill) || 0),
        maxParticipants: parseInt(form.maxParticipants) || 50,
        maxTeams: form.mode === 'solo' ? parseInt(form.maxParticipants) : Math.floor(parseInt(form.maxParticipants) / form.teamSize),
        minimumBalance: parseFloat(form.minimumBalance) || parseFloat(form.entryFee) || 0,
        startDate: form.startDate.toISOString(),
        endDate: form.endDate ? form.endDate.toISOString() : null,
        roomId: form.roomId,
        roomPassword: form.roomPassword,
        showRoomCredentials: form.showRoomCredentials,
        killRewardEnabled: form.rewardType !== 'survival',
        prizes: calculateRecommendedRewards(),
        teamSize: form.teamSize,
      };

      if (isEditMode && editingTournament?._id) {
        await tournamentService.updateTournament(editingTournament._id, tournamentData);
        showToast('Tournament updated successfully!', 'success');
      } else {
        await tournamentService.createTournament(tournamentData);
        showToast('Tournament created successfully!', 'success');
      }
      closeFormModal();
      fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to save tournament', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      game: '',
      gameMode: '',
      tournamentType: 'battle_royale',
      rewardType: 'per_kill',
      status: 'incoming',
      statusOverride: false,
      mode: 'solo',
      map: 'Bermuda',
      rulesText: '',
      entryFee: '',
      prizePool: '',
      perKill: '',
      maxParticipants: '50',
      maxTeams: '',
      startDate: new Date(),
      endDate: null,
      minimumBalance: '',
      roomId: '',
      roomPassword: '',
      showRoomCredentials: false,
      killRewardEnabled: true,
      teamSize: 1,
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

  

  const handleManageRoom = (tournament) => {
    setSelectedTournamentForRoom(tournament);
    setRoomForm({
      roomId: tournament.roomId || '',
      roomPassword: tournament.roomPassword || '',
      showRoomCredentials: tournament.showRoomCredentials || false,
    });
    setShowRoomModal(true);
  };

  const handleLockToggle = async (tournament) => {
    try {
      const newLockedState = !tournament.locked;
      const action = newLockedState ? 'lock' : 'unlock';
      
      Alert.alert(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Tournament`,
        `Are you sure you want to ${action} "${tournament.name}"? ${newLockedState ? 'Users will not be able to join.' : 'Users will be able to join again.'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action.toUpperCase(),
            onPress: async () => {
              try {
                await tournamentService.lockTournament(tournament._id, newLockedState);
                showToast(`Tournament ${action}ed successfully!`, 'success');
                fetchTournaments();
              } catch (error) {
                showToast(error.message || `Failed to ${action} tournament`, 'error');
              }
            },
          },
        ]
      );
    } catch (error) {
      showToast(error.message || 'Failed to toggle lock', 'error');
    }
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
          onPress={openCreateModal}
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
                <View style={styles.gameImageContainer}>
                  <Image 
                    source={getGameImage(game)}
                    style={styles.gameImage}
                    defaultSource={require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg')}
                  />
                </View>
                <Text style={[
                  styles.gameCardText,
                  selectedGame === game._id && styles.gameCardTextSelected
                ]}>
                  {game.name}
                </Text>
                {game.isPopular && (
                  <View style={styles.popularBadge}>
                    <MaterialCommunityIcons name="fire" size={8} color={COLORS.error} />
                    <Text style={styles.popularText}>HOT</Text>
                  </View>
                )}
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
                  <View style={styles.modeImageContainer}>
                    {getModeImage(mode) ? (
                      <Image 
                        source={getModeImage(mode)}
                        style={styles.modeImage}
                      />
                    ) : (
                      <MaterialCommunityIcons 
                        name="play-circle-outline" 
                        size={20} 
                        color={selectedGameMode === mode._id ? COLORS.white : COLORS.accent} 
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.gameModeCardText,
                    selectedGameMode === mode._id && styles.gameModeCardTextSelected
                  ]}>
                    {mode.name}
                  </Text>
                  {mode.description && (
                    <Text style={styles.modeDescription}>
                      {mode.description}
                    </Text>
                  )}
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
                      <View style={styles.tournamentTitleRow}>
                        <Text style={styles.tournamentName}>{tournament.name}</Text>
                        {tournament.locked && (
                          <MaterialCommunityIcons name="lock" size={16} color="#FF8500" style={styles.lockIcon} />
                        )}
                      </View>
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
                      {tournament.rewardType !== 'per_kill' && tournament.prizePool > 0 && (
                        <>
                          <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
                          <Text style={styles.detailText}>Prize: ₹{tournament.prizePool}</Text>
                        </>
                      )}
                    </View>
                    <View style={styles.detailRow}>
                      {tournament.rewardType !== 'survival' && (
                        <>
                          <MaterialCommunityIcons name="target" size={16} color={COLORS.accent} />
                          <Text style={styles.detailText}>Per Kill: ₹{tournament.perKill}</Text>
                        </>
                      )}
                      <MaterialCommunityIcons name="star" size={16} color={COLORS.accent} />
                      <Text style={styles.detailText}>
                        {tournament.rewardType === 'per_kill' ? 'Kill Rewards' : 
                         tournament.rewardType === 'survival' ? 'Placement Rewards' : 'Hybrid Rewards'}
                      </Text>
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
                    {tournament.mode !== 'solo' && (
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account-multiple" size={16} color={COLORS.accent} />
                        <Text style={styles.detailText}>
                          {tournament.mode === 'duo' ? '2' : '4'} players per team
                        </Text>
                        <MaterialCommunityIcons name="flag" size={16} color={COLORS.accent} />
                        <Text style={styles.detailText}>
                          Max {tournament.maxTeams || Math.floor(tournament.maxParticipants / (tournament.mode === 'duo' ? 2 : 4))} teams
                        </Text>
                      </View>
                    )}
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
                      onPress={() => openEditModal(tournament)}
                    >
                      <MaterialCommunityIcons name="pencil" size={16} color={COLORS.accent} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, tournament.locked && styles.lockedButton]}
                      onPress={() => handleLockToggle(tournament)}
                    >
                      <MaterialCommunityIcons 
                        name={tournament.locked ? "lock" : "lock-open"} 
                        size={16} 
                        color={tournament.locked ? "#FF8500" : COLORS.accent} 
                      />
                      <Text style={[styles.actionText, tournament.locked && styles.lockedText]}>
                        {tournament.locked ? "Locked" : "Lock"}
                      </Text>
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
                <Text style={styles.modalTitle}>{isEditMode ? 'Edit Tournament' : 'Create Tournament'}</Text>
                <TouchableOpacity onPress={closeFormModal}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Show selected game and mode */}
              {selectedGame && selectedGameMode && (
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionTitle}>
                    {isEditMode ? 'Editing tournament for:' : 'Creating tournament for:'}
                  </Text>
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

              {/* Tournament Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tournament Type</Text>
                <View style={styles.segmentedControl}>
                  {TOURNAMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.segmentButton,
                        form.tournamentType === type.value && styles.segmentButtonActive
                      ]}
                      onPress={() => handleInputChange('tournamentType', type.value)}
                    >
                      <Text style={[
                        styles.segmentButtonText,
                        form.tournamentType === type.value && styles.segmentButtonTextActive
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reward Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Reward Type</Text>
                <View style={styles.segmentedControl}>
                  {REWARD_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.segmentButton,
                        form.rewardType === type.value && styles.segmentButtonActive
                      ]}
                      onPress={() => handleInputChange('rewardType', type.value)}
                    >
                      <Text style={[
                        styles.segmentButtonText,
                        form.rewardType === type.value && styles.segmentButtonTextActive
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helperText}>{REWARD_TYPES.find(t => t.value === form.rewardType)?.description}</Text>
              </View>

              {/* Match Status (Edit only) */}
              {isEditMode && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Match Status</Text>
                  <View style={styles.segmentedControl}>
                    {MATCH_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.segmentButton,
                          form.status === status.value && styles.segmentButtonActive
                        ]}
                        onPress={() => handleInputChange('status', status.value)}
                      >
                        <Text style={[
                          styles.segmentButtonText,
                          form.status === status.value && styles.segmentButtonTextActive
                        ]}>{status.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.switchRow}>
                    <MaterialCommunityIcons name="timer" size={20} color={COLORS.accent} />
                    <Text style={styles.switchLabel}>Override automatic status</Text>
                    <Switch
                      value={form.statusOverride}
                      onValueChange={(value) => setForm(prev => ({ ...prev, statusOverride: value }))}
                      trackColor={{ false: COLORS.darkGray, true: COLORS.accent }}
                      thumbColor={form.statusOverride ? COLORS.white : COLORS.gray}
                    />
                  </View>
                  <Text style={styles.switchDescription}>
                    When disabled, status will update automatically based on start/end time
                  </Text>
                </View>
              )}

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Entry Fee (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.entryFee}
                    onChangeText={(text) => setForm(prev => ({ ...prev, entryFee: text }))}
                    placeholder="20"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
                {/* Show Per Kill Reward for per_kill and hybrid modes */}
                {(form.rewardType === 'per_kill' || form.rewardType === 'hybrid') && (
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Per Kill Reward (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.perKill}
                      onChangeText={(text) => setForm(prev => ({ ...prev, perKill: text }))}
                      placeholder="2"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="numeric"
                    />
                  </View>
                )}
                {/* Show Prize Pool for survival and hybrid modes */}
                {(form.rewardType === 'survival' || form.rewardType === 'hybrid') && (
                  <View style={[styles.formGroup, { flex: 1, marginLeft: form.rewardType === 'hybrid' ? 0 : 8 }]}>
                    <Text style={styles.label}>
                      {form.rewardType === 'hybrid' ? 'Additional Prize Pool (₹)' : 'Prize Pool (₹)'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={form.prizePool}
                      onChangeText={(text) => setForm(prev => ({ ...prev, prizePool: text }))}
                      placeholder={form.rewardType === 'hybrid' ? 'Optional' : 'Auto-calculated'}
                      placeholderTextColor={COLORS.gray}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>

              {/* Prize Pool Calculation - Only for survival and hybrid modes */}
              {(form.rewardType === 'survival' || form.rewardType === 'hybrid') && form.entryFee && form.maxParticipants && (
                <View style={styles.prizePoolSection}>
                  <View style={styles.prizePoolHeader}>
                    <MaterialCommunityIcons name="trophy" size={20} color={COLORS.accent} />
                    <Text style={styles.prizePoolTitle}>
                      {form.rewardType === 'survival' ? 'Prize Pool Calculation' : 'Placement Prize Pool'}
                    </Text>
                  </View>
                  <View style={styles.prizePoolDetails}>
                    <View style={styles.prizePoolItem}>
                      <Text style={styles.prizePoolLabel}>Total Collection:</Text>
                      <Text style={styles.prizePoolValue}>
                        ₹{(parseFloat(form.entryFee) * parseInt(form.maxParticipants) || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.prizePoolItem}>
                      <Text style={styles.prizePoolLabel}>Platform Fee (10%):</Text>
                      <Text style={styles.prizePoolValue}>
                        -₹{Math.floor((parseFloat(form.entryFee) * parseInt(form.maxParticipants) || 0) * 0.1).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.prizePoolItem, styles.prizePoolTotal]}>
                      <Text style={styles.prizePoolTotalLabel}>
                        {form.rewardType === 'survival' ? 'Total Prize Pool:' : 'Placement Prize Pool:'}
                      </Text>
                      <Text style={styles.prizePoolTotalValue}>
                        ₹{calculateTotalPrizePool().toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Per Kill Rewards Info - Only for per_kill mode */}
              {form.rewardType === 'per_kill' && form.entryFee && form.perKill && (
                <View style={styles.prizePoolSection}>
                  <View style={styles.prizePoolHeader}>
                    <MaterialCommunityIcons name="target" size={20} color={COLORS.accent} />
                    <Text style={styles.prizePoolTitle}>Kill Reward System</Text>
                  </View>
                  <View style={styles.prizePoolDetails}>
                    <View style={styles.prizePoolItem}>
                      <Text style={styles.prizePoolLabel}>Per Kill Reward:</Text>
                      <Text style={styles.prizePoolValue}>₹{form.perKill}</Text>
                    </View>
                    <View style={styles.prizePoolItem}>
                      <Text style={styles.prizePoolLabel}>Max Potential (20 kills):</Text>
                      <Text style={styles.prizePoolValue}>
                        ₹{(parseFloat(form.perKill) * 20 || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.prizePoolItem, styles.prizePoolTotal]}>
                      <Text style={styles.prizePoolTotalLabel}>Entry Fee:</Text>
                      <Text style={styles.prizePoolTotalValue}>₹{form.entryFee}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Hybrid Mode Info */}
              {form.rewardType === 'hybrid' && form.entryFee && (
                <View style={styles.prizePoolSection}>
                  <View style={styles.prizePoolHeader}>
                    <MaterialCommunityIcons name="star-circle" size={20} color={COLORS.accent} />
                    <Text style={styles.prizePoolTitle}>Hybrid Reward System</Text>
                  </View>
                  <View style={styles.prizePoolDetails}>
                    <View style={styles.prizePoolItem}>
                      <Text style={styles.prizePoolLabel}>Placement Pool:</Text>
                      <Text style={styles.prizePoolValue}>₹{calculateTotalPrizePool().toLocaleString()}</Text>
                    </View>
                    {form.perKill && (
                      <View style={styles.prizePoolItem}>
                        <Text style={styles.prizePoolLabel}>Per Kill Reward:</Text>
                        <Text style={styles.prizePoolValue}>₹{form.perKill} each</Text>
                      </View>
                    )}
                    <View style={[styles.prizePoolItem, styles.prizePoolTotal]}>
                      <Text style={styles.prizePoolTotalLabel}>Total Possible Earnings:</Text>
                      <Text style={styles.prizePoolTotalValue}>
                        Placement + Kill rewards
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Game Mode</Text>
                  <View style={styles.modeToggleRow}>
                    {GAME_MODES.map((modeOption) => (
                      <TouchableOpacity
                        key={modeOption.value}
                        style={[
                          styles.modeToggleButton,
                          form.mode === modeOption.value && styles.modeToggleActive,
                        ]}
                        onPress={() => setForm(prev => ({ ...prev, mode: modeOption.value }))}
                      >
                        <Text
                          style={[
                            styles.modeToggleText,
                            form.mode === modeOption.value && styles.modeToggleTextActive,
                          ]}
                        >
                          {modeOption.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Battle Map</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value="Bermuda"
                    editable={false}
                  />
                </View>
              </View>

              {/* Team Configuration Display */}
              <View style={styles.teamConfigSection}>
                <View style={styles.teamConfigHeader}>
                  <MaterialCommunityIcons name="account-group" size={20} color={COLORS.accent} />
                  <Text style={styles.teamConfigTitle}>Team Configuration</Text>
                </View>
                <View style={styles.teamConfigDetails}>
                  <View style={styles.teamConfigItem}>
                    <Text style={styles.teamConfigLabel}>Players per team:</Text>
                    <Text style={styles.teamConfigValue}>{form.teamSize}</Text>
                  </View>
                  <View style={styles.teamConfigItem}>
                    <Text style={styles.teamConfigLabel}>Max teams:</Text>
                    <Text style={styles.teamConfigValue}>
                      {form.maxParticipants ? Math.floor(parseInt(form.maxParticipants) / form.teamSize) : 0}
                    </Text>
                  </View>
                  <View style={styles.teamConfigItem}>
                    <Text style={styles.teamConfigLabel}>Total slots:</Text>
                    <Text style={styles.teamConfigValue}>{form.maxParticipants || 0}</Text>
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
                {showStartDatePicker && (
                  <DateTimePicker
                    value={form.startDate || new Date()}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setForm(prev => ({ ...prev, startDate: selectedDate }));
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tournament Rules / Info</Text>
                <TextInput
                  style={[styles.input, styles.rulesTextArea]}
                  value={form.rulesText}
                  onChangeText={(text) => setForm(prev => ({ ...prev, rulesText: text }))}
                  placeholder="Write full tournament rules and info here..."
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
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
                  onPress={closeFormModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleSaveTournament}
                >
                  <Text style={styles.createButtonText}>{isEditMode ? 'Update' : 'Create'}</Text>
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
                  <RNPickerSelect
                    onValueChange={(itemValue) => setWinnersForm(prev => ({ ...prev, firstPlace: itemValue }))}
                    items={[
                      ...(Array.isArray(tournamentParticipants) && tournamentParticipants.length > 0
                        ? tournamentParticipants.map((participant) => ({
                            label: participant.user?.username || participant.user?.email || participant.playerName || 'Player',
                            value: participant._id,
                          }))
                        : []
                      ),
                    ]}
                    value={winnersForm.firstPlace}
                    placeholder={{ label: 'Select 1st Place Winner', value: null }}
                    style={{
                      inputIOS: styles.picker,
                      inputAndroid: styles.picker,
                      placeholder: { color: COLORS.gray },
                    }}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </View>

              {/* 2nd Place */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🥈 2nd Place (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={(itemValue) => setWinnersForm(prev => ({ ...prev, secondPlace: itemValue }))}
                    items={[
                      ...(Array.isArray(tournamentParticipants) && tournamentParticipants.length > 0
                        ? tournamentParticipants.map((participant) => ({
                            label: participant.user?.username || participant.user?.email || participant.playerName || 'Player',
                            value: participant._id,
                          }))
                        : []
                      ),
                    ]}
                    value={winnersForm.secondPlace}
                    placeholder={{ label: 'Select 2nd Place Winner', value: null }}
                    style={{
                      inputIOS: styles.picker,
                      inputAndroid: styles.picker,
                      placeholder: { color: COLORS.gray },
                    }}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </View>

              {/* 3rd Place */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🥉 3rd Place (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={(itemValue) => setWinnersForm(prev => ({ ...prev, thirdPlace: itemValue }))}
                    items={[
                      ...(Array.isArray(tournamentParticipants) && tournamentParticipants.length > 0
                        ? tournamentParticipants.map((participant) => ({
                            label: participant.user?.username || participant.user?.email || participant.playerName || 'Player',
                            value: participant._id,
                          }))
                        : []
                      ),
                    ]}
                    value={winnersForm.thirdPlace}
                    placeholder={{ label: 'Select 3rd Place Winner', value: null }}
                    style={{
                      inputIOS: styles.picker,
                      inputAndroid: styles.picker,
                      placeholder: { color: COLORS.gray },
                    }}
                    useNativeAndroidPickerStyle={false}
                  />
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
  tournamentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  lockIcon: {
    marginLeft: 6,
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
  statusincoming: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statusupcoming: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statuslocked: {
    backgroundColor: 'rgba(255, 133, 0, 0.2)',
  },
  statusongoing: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
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
  lockedButton: {
    backgroundColor: 'rgba(255, 133, 0, 0.2)',
  },
  actionText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 4,
  },
  deleteText: {
    color: '#FF6B6B',
  },
  lockedText: {
    color: '#FF8500',
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
  disabledInput: {
    opacity: 0.7,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rulesTextArea: {
    minHeight: 120,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeToggleActive: {
    backgroundColor: COLORS.accent,
  },
  modeToggleText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: COLORS.white,
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
  gameImageContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}20`,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 2,
  },
  popularText: {
    fontSize: 8,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  modeImageContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  modeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modeDescription: {
    fontSize: 9,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  teamConfigSection: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  teamConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamConfigTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
  teamConfigDetails: {
    gap: 6,
  },
  teamConfigItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamConfigLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  teamConfigValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  prizePoolSection: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  prizePoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  prizePoolTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
  prizePoolDetails: {
    gap: 6,
  },
  prizePoolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prizePoolLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  prizePoolValue: {
    fontSize: 12,
    color: COLORS.white,
  },
  prizePoolTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginTop: 8,
  },
  prizePoolTotalLabel: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  prizePoolTotalValue: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  placementRewardsSection: {
    marginBottom: 16,
  },
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  autoFillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  rulesPresetSection: {
    marginBottom: 12,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkGray,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  presetButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}15`,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.accent,
    fontStyle: 'italic',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 4,
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.accent,
  },
  segmentButtonText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  segmentButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default TournamentManagement;