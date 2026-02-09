import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../styles/theme';
import { tutorialService, uploadImageFile } from '../../services/api';
import Toast from '../../components/Toast';

const TutorialManagement = ({ navigation }) => {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const [form, setForm] = useState({
    title: '',
    description: '',
    videoLink: '',
    thumbnail: '',
    order: '0',
    isActive: true,
  });

  useEffect(() => {
    fetchTutorials();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const data = await tutorialService.getAdminList().catch(() => []);
      setTutorials(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error.message || 'Failed to load tutorials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTutorials();
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      videoLink: '',
      thumbnail: '',
      order: '0',
      isActive: true,
    });
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingTutorial(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (tutorial) => {
    setIsEditMode(true);
    setEditingTutorial(tutorial);
    setForm({
      title: tutorial.title || '',
      description: tutorial.description || '',
      videoLink: tutorial.videoLink || '',
      thumbnail: tutorial.thumbnail || '',
      order: tutorial.order?.toString() || '0',
      isActive: tutorial.isActive !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setEditingTutorial(null);
    resetForm();
  };

  const pickThumbnail = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access gallery is required', 'error');
        return;
      }

      const mediaTypes = ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions?.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        ...(mediaTypes ? { mediaTypes } : {}),
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const uploadResult = await uploadImageFile(result.assets[0].uri);
      setForm(prev => ({ ...prev, thumbnail: uploadResult.url }));
      showToast('Thumbnail uploaded', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload thumbnail', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.videoLink.trim() || !form.thumbnail) {
      showToast('Title, video link, and thumbnail are required', 'error');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      videoLink: form.videoLink.trim(),
      thumbnail: form.thumbnail,
      order: parseInt(form.order, 10) || 0,
      isActive: form.isActive,
    };

    try {
      if (isEditMode && editingTutorial?._id) {
        await tutorialService.update(editingTutorial._id, payload);
        showToast('Tutorial updated', 'success');
      } else {
        await tutorialService.create(payload);
        showToast('Tutorial created', 'success');
      }
      closeModal();
      fetchTutorials();
    } catch (error) {
      showToast(error.message || 'Failed to save tutorial', 'error');
    }
  };

  const handleDelete = (tutorial) => {
    Alert.alert(
      'Delete Tutorial',
      `Delete "${tutorial.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tutorialService.remove(tutorial._id);
              showToast('Tutorial deleted', 'success');
              fetchTutorials();
            } catch (error) {
              showToast(error.message || 'Failed to delete tutorial', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How To Play</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading tutorials...</Text>
          </View>
        ) : tutorials.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="play-circle-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No tutorials yet</Text>
            <Text style={styles.emptySubtext}>Add your first tutorial video</Text>
          </View>
        ) : (
          tutorials.map((tutorial) => (
            <View key={tutorial._id} style={styles.card}>
              <Image
                source={{ uri: tutorial.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{tutorial.title}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {tutorial.description || 'No description'}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta}>Order: {tutorial.order ?? 0}</Text>
                  <Text style={styles.cardMeta}>{tutorial.isActive ? 'Active' : 'Hidden'}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(tutorial)}>
                    <MaterialCommunityIcons name="pencil" size={16} color={COLORS.accent} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(tutorial)}>
                    <MaterialCommunityIcons name="delete" size={16} color="#FF6B6B" />
                    <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? 'Edit Tutorial' : 'Add Tutorial'}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
                  placeholder="Video title"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                  placeholder="Short description"
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Video Link *</Text>
                <TextInput
                  style={styles.input}
                  value={form.videoLink}
                  onChangeText={(text) => setForm(prev => ({ ...prev, videoLink: text }))}
                  placeholder="https://youtu.be/..."
                  placeholderTextColor={COLORS.gray}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Thumbnail *</Text>
                <TouchableOpacity style={styles.thumbnailPicker} onPress={pickThumbnail}>
                  {form.thumbnail ? (
                    <Image source={{ uri: form.thumbnail }} style={styles.thumbnailPreview} />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <MaterialCommunityIcons name="image-plus" size={28} color={COLORS.gray} />
                      <Text style={styles.thumbnailPlaceholderText}>Upload thumbnail</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {uploading && (
                  <View style={styles.uploadRow}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text style={styles.uploadText}>Uploading...</Text>
                  </View>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Order</Text>
                  <TextInput
                    style={styles.input}
                    value={form.order}
                    onChangeText={(text) => setForm(prev => ({ ...prev, order: text }))}
                    placeholder="0"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Active</Text>
                  <View style={styles.switchRow}>
                    <Switch
                      value={form.isActive}
                      onValueChange={(value) => setForm(prev => ({ ...prev, isActive: value }))}
                      trackColor={{ false: COLORS.darkGray, true: COLORS.accent }}
                      thumbColor={form.isActive ? COLORS.white : COLORS.gray}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.createButton]} onPress={handleSave}>
                  <Text style={styles.createButtonText}>{isEditMode ? 'Update' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    color: COLORS.gray,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtext: {
    color: COLORS.gray,
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  thumbnail: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardMeta: {
    fontSize: 11,
    color: COLORS.gray,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  deleteText: {
    color: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    padding: 16,
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 10,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  thumbnailPicker: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  thumbnailPreview: {
    width: '100%',
    height: 160,
  },
  thumbnailPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbnailPlaceholderText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  uploadText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchRow: {
    alignItems: 'flex-start',
    paddingTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.darkGray,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: COLORS.accent,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default TutorialManagement;
