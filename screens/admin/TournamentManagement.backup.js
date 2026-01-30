import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Alert,
  Picker,
} from 'react-native';
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
    if (!form.name || !form.game || !form.gameMode || !form.startDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const tournamentData = {
        ...form,
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
      return;
    }

    if (form.showRoomCredentials && (!form.roomId || !form.roomPassword)) {
      showToast('Room ID and password are required to show credentials', 'error');
      return;
    }

    try {
      await tournamentService.createTournament({
        name: form.name,
        description: form.description,
        entryFee: parseInt(form.entryFee) || 0,
        prizePool: parseInt(form.prizePool) || 0,
        maxPlayers: parseInt(form.maxPlayers) || 100,
        gameType: form.gameType,
        minimumKYC: form.minimumKYC,
        minimumBalance: parseInt(form.minimumBalance) || 0,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        roomId: form.roomId || '',
        roomPassword: form.roomPassword || '',
        showRoomCredentials: !!form.showRoomCredentials,
      });

      showToast('Tournament created successfully!', 'success');
      resetForm();
      setShowCreateModal(false);
      await fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to create tournament', 'error');
    }
  };

  const handleUpdateStatus = async (tournamentId, newStatus) => {
    try {
      await tournamentService.updateStatus(tournamentId, newStatus);
      showToast('Tournament status updated', 'success');
      await fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error');
    }
  };

  const handleDeleteTournament = async (tournamentId) => {
    try {
      await tournamentService.deleteTournament(tournamentId);
      showToast('Tournament deleted', 'success');
      await fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to delete tournament', 'error');
    }
  };

  const openRoomModal = (tournament) => {
    setSelectedTournament(tournament);
    setRoomForm({
      roomId: tournament.roomId || '',
      roomPassword: tournament.roomPassword || '',
      showRoomCredentials: !!tournament.showRoomCredentials,
    });
    setShowRoomModal(true);
  };

  const handleSaveRoomDetails = async () => {
    if (!selectedTournament) return;

    if (roomForm.showRoomCredentials && (!roomForm.roomId || !roomForm.roomPassword)) {
      showToast('Room ID and password are required to show credentials', 'error');
      return;
    }

    try {
      await tournamentService.setRoomDetails(
        selectedTournament._id,
        roomForm.roomId,
        roomForm.roomPassword,
        roomForm.showRoomCredentials
      );
      showToast('Room details updated', 'success');
      setShowRoomModal(false);
      await fetchTournaments();
    } catch (error) {
      showToast(error.message || 'Failed to update room details', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      entryFee: '',
      prizePool: '',
      maxPlayers: '',
      gameType: 'Battle Royale',
      minimumKYC: false,
      minimumBalance: '',
      startDate: '',
      endDate: '',
      roomId: '',
      roomPassword: '',
      showRoomCredentials: false,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return CalendarDaysIcon;
      case 'live':
        return SignalIcon;
      case 'completed':
        return CheckCircleIcon;
      case 'cancelled':
        return XCircleIcon;
      default:
        return CalendarDaysIcon;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming':
        return CalendarDaysIcon;
      case 'live':
        return SignalIcon;
      case 'completed':
        return CheckCircleIcon;
      case 'cancelled':
        return XCircleIcon;
      default:
        return CalendarDaysIcon;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeftIcon size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOURNAMENTS</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <PlusCircleIcon size={28} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statMini, { backgroundColor: `${COLORS.primary}20` }]}>
          <Text style={styles.statMiniValue}>{tournaments.length}</Text>
          <Text style={styles.statMiniLabel}>Total</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: `${COLORS.success}20` }]}>
          <Text style={styles.statMiniValue}>{tournaments.filter(t => t.status === 'live').length}</Text>
          <Text style={styles.statMiniLabel}>Live</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: `${COLORS.accent}20` }]}>
          <Text style={styles.statMiniValue}>{tournaments.filter(t => t.status === 'upcoming').length}</Text>
          <Text style={styles.statMiniLabel}>Upcoming</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {tournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <TrophyIcon size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No tournaments created yet</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <PlusCircleIcon size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Create Tournament</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tournaments.map((tournament) => (
            <View key={tournament._id} style={styles.tournamentCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.statusIcon,
                      { backgroundColor: `${getStatusColor(tournament.status)}30` },
                    ]}
                  >
                    {(() => {
                      const StatusIcon = getStatusIcon(tournament.status);
                      return <StatusIcon size={20} color={getStatusColor(tournament.status)} />;
                    })()}
                  </View>
                  <View style={styles.cardTitle}>
                    <Text style={styles.tournamentName}>{tournament.name}</Text>
                    <Text style={styles.gameType}>{tournament.gameType}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(tournament.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{tournament.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Card Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <CurrencyDollarIcon size={18} color={COLORS.accent} />
                  <Text style={styles.detailLabel}>Entry: ₹{tournament.entryFee}</Text>
                </View>
                <View style={styles.detailItem}>
                  <TrophyIcon size={18} color={COLORS.accent} />
                  <Text style={styles.detailLabel}>Prize: ₹{tournament.prizePool}</Text>
                </View>
                <View style={styles.detailItem}>
                  <UserGroupIcon size={18} color={COLORS.accent} />
                  <Text style={styles.detailLabel}>
                    {(tournament.participantCount ?? tournament.registeredPlayers?.length ?? 0)}/{tournament.maxPlayers}
                  </Text>
                </View>
              </View>

              {/* Dates */}
              <View style={styles.datesContainer}>
                <View style={styles.dateItem}>
                  <CalendarIcon size={16} color={COLORS.gray} />
                  <Text style={styles.dateText}>
                    Start: {new Date(tournament.startDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <CalendarIcon size={16} color={COLORS.gray} />
                  <Text style={styles.dateText}>
                    End: {new Date(tournament.endDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.roomRow}>
                <View style={styles.roomStatus}>
                  {tournament.showRoomCredentials ? (
                    <EyeIcon size={16} color={COLORS.success} />
                  ) : (
                    <EyeSlashIcon size={16} color={COLORS.gray} />
                  )}

                  <Text style={styles.roomStatusText}>
                    {tournament.showRoomCredentials ? 'Room Visible' : 'Room Hidden'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.roomButton}
                  onPress={() => openRoomModal(tournament)}
                >
                  <Cog6ToothIcon size={14} color={COLORS.white} />
                  <Text style={styles.roomButtonText}>Room Settings</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {tournament.status === 'upcoming' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                    onPress={() => handleUpdateStatus(tournament._id, 'live')}
                  >
                    <PlayIcon size={16} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Start Live</Text>
                  </TouchableOpacity>
                )}

                {tournament.status === 'live' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                    onPress={() => handleUpdateStatus(tournament._id, 'completed')}
                  >
                    <CheckIcon size={16} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Complete</Text>
                  </TouchableOpacity>
                )}

                {(tournament.status === 'upcoming' || tournament.status === 'live') && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                    onPress={() => handleUpdateStatus(tournament._id, 'cancelled')}
                  >
                    <XMarkIcon size={16} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.darkGray }]}
                  onPress={() => handleDeleteTournament(tournament._id)}
                >
                  <TrashIcon size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <XMarkIcon size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>CREATE TOURNAMENT</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Tournament Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tournament Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Elite Squad Battle"
                placeholderTextColor={COLORS.gray}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Tournament description"
                placeholderTextColor={COLORS.gray}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
              />
            </View>

            {/* Game Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Game Type</Text>
              <View style={styles.gameTypeButtons}>
                {['Battle Royale', 'Clash Squad', 'TDM'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.gameTypeBtn,
                      form.gameType === type && styles.gameTypeBtnActive,
                    ]}
                    onPress={() => setForm({ ...form, gameType: type })}
                  >
                    <Text
                      style={[
                        styles.gameTypeText,
                        form.gameType === type && styles.gameTypeTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Entry Fee & Prize Pool */}
            <View style={styles.twoColumnGroup}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Entry Fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray}
                  value={form.entryFee}
                  onChangeText={(text) => setForm({ ...form, entryFee: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Prize Pool (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray}
                  value={form.prizePool}
                  onChangeText={(text) => setForm({ ...form, prizePool: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Max Players */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Max Players</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor={COLORS.gray}
                value={form.maxPlayers}
                onChangeText={(text) => setForm({ ...form, maxPlayers: text })}
                keyboardType="numeric"
              />
            </View>

            {/* Minimum Balance */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Balance (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.gray}
                value={form.minimumBalance}
                onChangeText={(text) => setForm({ ...form, minimumBalance: text })}
                keyboardType="numeric"
              />
            </View>

            {/* KYC Required */}
            <View style={styles.switchGroup}>
              <Text style={styles.label}>KYC Required</Text>
              <Switch
                value={form.minimumKYC}
                onValueChange={(value) => setForm({ ...form, minimumKYC: value })}
                trackColor={{ false: COLORS.darkGray, true: COLORS.primary }}
                thumbColor={form.minimumKYC ? COLORS.accent : COLORS.gray}
              />
            </View>

            {/* Dates */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date & Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={COLORS.gray}
                value={form.startDate}
                onChangeText={(text) => setForm({ ...form, startDate: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>End Date & Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={COLORS.gray}
                value={form.endDate}
                onChangeText={(text) => setForm({ ...form, endDate: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor={COLORS.gray}
                value={form.roomId}
                onChangeText={(text) => setForm({ ...form, roomId: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor={COLORS.gray}
                value={form.roomPassword}
                onChangeText={(text) => setForm({ ...form, roomPassword: text })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Show Room Credentials</Text>
              <Switch
                value={form.showRoomCredentials}
                onValueChange={(value) => setForm({ ...form, showRoomCredentials: value })}
                trackColor={{ false: COLORS.darkGray, true: COLORS.primary }}
                thumbColor={form.showRoomCredentials ? COLORS.accent : COLORS.gray}
              />
            </View>

            {/* Create Button */}
            <TouchableOpacity style={styles.createModalBtn} onPress={handleCreateTournament}>
              <PlusCircleIcon size={24} color={COLORS.white} />
              <Text style={styles.createModalBtnText}>Create Tournament</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showRoomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRoomModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRoomModal(false)}>
              <XMarkIcon size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ROOM SETTINGS</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Room ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Room ID"
                placeholderTextColor={COLORS.gray}
                value={roomForm.roomId}
                onChangeText={(text) => setRoomForm({ ...roomForm, roomId: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Room Password"
                placeholderTextColor={COLORS.gray}
                value={roomForm.roomPassword}
                onChangeText={(text) => setRoomForm({ ...roomForm, roomPassword: text })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Show Room Credentials</Text>
              <Switch
                value={roomForm.showRoomCredentials}
                onValueChange={(value) => setRoomForm({ ...roomForm, showRoomCredentials: value })}
                trackColor={{ false: COLORS.darkGray, true: COLORS.primary }}
                thumbColor={roomForm.showRoomCredentials ? COLORS.accent : COLORS.gray}
              />
            </View>

            <TouchableOpacity style={styles.createModalBtn} onPress={handleSaveRoomDetails}>
              <Cog6ToothIcon size={20} color={COLORS.white} />
              <Text style={styles.createModalBtnText}>Save Room Settings</Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    backgroundColor: COLORS.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}40`,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  statMini: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statMiniValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statMiniLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  gameType: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  datesContainer: {
    marginBottom: 10,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkGray,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  roomStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomStatusText: {
    color: COLORS.gray,
    fontSize: 11,
  },
  roomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  roomButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}40`,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  twoColumnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  gameTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  gameTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    alignItems: 'center',
  },
  gameTypeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
  },
  gameTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  gameTypeTextActive: {
    color: COLORS.white,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    marginBottom: 16,
  },
  createModalBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  createModalBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default TournamentManagement;
