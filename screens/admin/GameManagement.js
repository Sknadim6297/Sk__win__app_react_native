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
  TextInput,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { gameService } from '../../services/api';
import { COLORS } from '../../styles/theme';

const GameManagement = ({ navigation }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [gameModes, setGameModes] = useState([]);
  const [selectedGameForModes, setSelectedGameForModes] = useState(null);
  const [showModesModal, setShowModesModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    rating: '4.5',
    players: '0',
    description: '',
    isPopular: false,
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadingMode, setUploadingMode] = useState(false);
  
  const [modeFormData, setModeFormData] = useState({
    name: '',
    description: '',
    image: '',
  });
  
  const [editingGameId, setEditingGameId] = useState(null);
  const [editingModeId, setEditingModeId] = useState(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await gameService.getAllGames();
      setGames(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching games:', error);
      Alert.alert('Error', 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const fetchGameModes = async (gameId) => {
    try {
      const data = await gameService.getGameModes(gameId);
      setGameModes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching game modes:', error);
      Alert.alert('Error', 'Failed to load game modes');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGames();
    setRefreshing(false);
  };

  const handleAddGame = async () => {
    if (!formData.name.trim() || !formData.image.trim()) {
      Alert.alert('Error', 'Game name and image URL are required');
      return;
    }

    try {
      const gameData = {
        name: formData.name,
        image: formData.image,
        rating: parseFloat(formData.rating) || 4.5,
        players: formData.players,
        description: formData.description,
        isPopular: formData.isPopular,
      };

      if (isEditing && editingGameId) {
        await gameService.updateGame(editingGameId, gameData);
        Alert.alert('Success', 'Game updated successfully');
      } else {
        await gameService.createGame(gameData);
        Alert.alert('Success', 'Game created successfully');
      }

      resetForm();
      await fetchGames();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving game:', error);
      Alert.alert('Error', error.message || 'Failed to save game');
    }
  };

  const handleAddGameMode = async () => {
    if (!modeFormData.name.trim()) {
      Alert.alert('Error', 'Mode name is required');
      return;
    }

    try {
      const modeData = {
        gameId: selectedGameForModes._id,
        name: modeFormData.name,
        description: modeFormData.description,
        image: modeFormData.image,
      };

      if (editingModeId) {
        await gameService.updateGameMode(editingModeId, modeData);
        Alert.alert('Success', 'Game mode updated successfully');
      } else {
        await gameService.createGameMode(modeData);
        Alert.alert('Success', 'Game mode created successfully');
      }

      resetModeForm();
      await fetchGameModes(selectedGameForModes._id);
    } catch (error) {
      console.error('Error saving game mode:', error);
      Alert.alert('Error', error.message || 'Failed to save game mode');
    }
  };

  const handleDeleteGame = async (gameId) => {
    Alert.alert(
      'Delete Game',
      'Are you sure you want to delete this game?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await gameService.deleteGame(gameId);
              Alert.alert('Success', 'Game deleted successfully');
              await fetchGames();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete game');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteMode = async (modeId) => {
    Alert.alert(
      'Delete Mode',
      'Are you sure you want to delete this game mode?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await gameService.deleteGameMode(modeId);
              Alert.alert('Success', 'Game mode deleted successfully');
              await fetchGameModes(selectedGameForModes._id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete game mode');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditGame = (game) => {
    setIsEditing(true);
    setEditingGameId(game._id);
    setFormData({
      name: game.name,
      image: game.image,
      rating: game.rating.toString(),
      players: game.players,
      description: game.description || '',
      isPopular: game.isPopular || false,
    });
    setShowModal(true);
  };

  const handleEditMode = (mode) => {
    setEditingModeId(mode._id);
    setModeFormData({
      name: mode.name || '',
      description: mode.description || '',
      image: mode.image || '',
    });
  };

  const handleViewModes = (game) => {
    setSelectedGameForModes(game);
    fetchGameModes(game._id);
    resetModeForm();
    setShowModesModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      image: '',
      rating: '4.5',
      players: '0',
      description: '',
      isPopular: false,
    });
    setIsEditing(false);
    setEditingGameId(null);
  };

  const resetModeForm = () => {
    setModeFormData({
      name: '',
      description: '',
      image: '',
    });
    setEditingModeId(null);
  };

  const pickGameImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          const uploadResult = await gameService.uploadImage(result.assets[0].uri);
          setFormData({ ...formData, image: uploadResult.url });
          Alert.alert('Success', 'Game image uploaded successfully');
        } catch (error) {
          Alert.alert('Upload Failed', error.message);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      setUploading(false);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickModeImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingMode(true);
        try {
          const uploadResult = await gameService.uploadImage(result.assets[0].uri);
          setModeFormData({ ...modeFormData, image: uploadResult.url });
          Alert.alert('Success', 'Mode image uploaded successfully');
        } catch (error) {
          Alert.alert('Upload Failed', error.message);
        } finally {
          setUploadingMode(false);
        }
      }
    } catch (error) {
      setUploadingMode(false);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading Games...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage Games</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Add Game</Text>
            </TouchableOpacity>
          </View>

          {games.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="gamepad-variant" size={48} color={COLORS.gray} />
              <Text style={styles.emptyText}>No games yet</Text>
              <Text style={styles.emptySubtext}>Add a game to get started</Text>
            </View>
          ) : (
            games.map((game) => (
              <View key={game._id} style={styles.gameCard}>
                <View style={styles.gameCardContent}>
                  <View style={styles.gameIcon}>
                    {game.image ? (
                      <Image 
                        source={{ uri: game.image }} 
                        style={styles.gameImage}
                        defaultSource={require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg')}
                      />
                    ) : (
                      <Image 
                        source={require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg')} 
                        style={styles.gameImage}
                      />
                    )}
                  </View>
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <View style={styles.gameStats}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.gameStat}>{game.rating}</Text>
                      <Text style={styles.gameStat}>•</Text>
                      <Text style={styles.gameStat}>{game.players}</Text>
                    </View>
                    {game.isPopular && (
                      <View style={styles.popularBadge}>
                        <MaterialCommunityIcons name="fire" size={12} color={COLORS.error} />
                        <Text style={styles.popularText}>Popular</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.gameActions}>
                  <TouchableOpacity 
                    style={styles.modeButton}
                    onPress={() => handleViewModes(game)}
                  >
                    <Text style={styles.modeButtonText}>Modes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditGame(game)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteGame(game._id)}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Game Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Game' : 'Add New Game'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Game Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter game name"
                placeholderTextColor={COLORS.gray}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Game Image *</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={pickGameImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color={COLORS.white} />
                    <Text style={styles.imagePickerText}>
                      {formData.image ? 'Change Image' : 'Pick Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {formData.image && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: formData.image }} style={styles.previewImage} />
                </View>
              )}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Rating</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4.5"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="decimal-pad"
                  value={formData.rating}
                  onChangeText={(text) => setFormData({ ...formData, rating: text })}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>Players</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2.5M"
                  placeholderTextColor={COLORS.gray}
                  value={formData.players}
                  onChangeText={(text) => setFormData({ ...formData, players: text })}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Game description"
                placeholderTextColor={COLORS.gray}
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />
            </View>

            <TouchableOpacity 
              style={styles.popularToggle}
              onPress={() => setFormData({ ...formData, isPopular: !formData.isPopular })}
            >
              <View style={[styles.checkbox, formData.isPopular && styles.checkboxActive]}>
                {formData.isPopular && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <Text style={styles.toggleLabel}>Mark as Popular</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddGame}
            >
              <Text style={styles.submitButtonText}>{isEditing ? 'Update Game' : 'Create Game'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Game Modes Modal */}
      <Modal visible={showModesModal} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModesModal(false)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedGameForModes?.name} - Modes</Text>
            <TouchableOpacity 
              onPress={() => {
                resetModeForm();
              }}
            >
              <Ionicons name="add" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mode Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mode name"
                placeholderTextColor={COLORS.gray}
                value={modeFormData.name}
                onChangeText={(text) => setModeFormData({ ...modeFormData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                placeholder="Mode description"
                placeholderTextColor={COLORS.gray}
                multiline
                value={modeFormData.description}
                onChangeText={(text) => setModeFormData({ ...modeFormData, description: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mode Image</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={pickModeImage}
                disabled={uploadingMode}
              >
                {uploadingMode ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color={COLORS.white} />
                    <Text style={styles.imagePickerText}>
                      {modeFormData.image ? 'Change Image' : 'Pick Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {modeFormData.image && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: modeFormData.image }} style={styles.previewImage} />
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddGameMode}
            >
              <Text style={styles.submitButtonText}>
                {editingModeId ? 'Update Mode' : 'Add Mode'}
              </Text>
            </TouchableOpacity>

            {gameModes.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="puzzle" size={48} color={COLORS.gray} />
                <Text style={styles.emptyText}>No game modes</Text>
                <Text style={styles.emptySubtext}>Add a game mode to get started</Text>
              </View>
            ) : (
              gameModes.map((mode) => (
                <View key={mode._id} style={styles.modeCard}>
                  <View style={styles.modeContent}>
                    {mode.image && (
                      <Image source={{ uri: mode.image }} style={styles.modeImage} />
                    )}
                    <View style={styles.modeInfo}>
                      <Text style={styles.modeName}>{mode.name}</Text>
                      {mode.description && (
                        <Text style={styles.modeDescription}>{mode.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.modeActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditMode(mode)}
                    >
                      <Ionicons name="pencil" size={16} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMode(mode._id)}
                    >
                      <Ionicons name="trash" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  gameCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: `${COLORS.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  gameImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  gameStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gameStat: {
    fontSize: 12,
    color: COLORS.gray,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  popularText: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '600',
  },
  gameActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    backgroundColor: `${COLORS.accent}20`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 12,
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
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
  },
  popularToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  toggleLabel: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePickerButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  imagePickerText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  modeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: `${COLORS.accent}20`,
  },
  modeInfo: {
    flex: 1,
  },
  modeCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  modeDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  modeActions: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default GameManagement;
