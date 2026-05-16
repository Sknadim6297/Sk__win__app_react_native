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
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TEXT, TYPO } from '../../styles/theme';
import { sliderService, uploadImageFile } from '../../services/api';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import Toast from '../../components/Toast';

export default function SliderManagement({ navigation }) {
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const [form, setForm] = useState({
    image: '',
    link: '',
    active: true,
    sortOrder: '0',
  });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const loadSliders = async () => {
    try {
      const data = await sliderService.getAdminList();
      setSliders(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load sliders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSliders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSliders();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Gallery permission required');
        return;
      }
      const mediaTypes = ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions?.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        ...(mediaTypes ? { mediaTypes } : {}),
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const upload = await uploadImageFile(result.assets[0].uri);
      setForm((p) => ({ ...p, image: upload.url || upload.path }));
      showToast('Banner image uploaded', 'success');
    } catch (e) {
      showToast(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.image) {
      showToast('Upload a banner image first');
      return;
    }
    try {
      await sliderService.create({
        image: form.image,
        link: form.link.trim(),
        active: form.active,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      });
      setForm({ image: '', link: '', active: true, sortOrder: '0' });
      showToast('Banner added', 'success');
      await loadSliders();
    } catch (e) {
      showToast(e.message || 'Failed to save');
    }
  };

  const toggleActive = async (item) => {
    try {
      await sliderService.update(item._id, { active: !item.active });
      await loadSliders();
    } catch (e) {
      showToast(e.message || 'Update failed');
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete banner?', 'This will remove it from the home screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await sliderService.delete(item._id);
            showToast('Deleted', 'success');
            await loadSliders();
          } catch (e) {
            showToast(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Banners</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.sectionTitle}>Add banner</Text>
        <Text style={styles.hint}>
          Image only on home — auto slides. Tap opens redirect link.
        </Text>

        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
          {form.image ? (
            <Image source={{ uri: resolveMediaUrl(form.image) }} style={styles.preview} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <MaterialCommunityIcons name="image-plus" size={36} color={COLORS.gray} />
              <Text style={styles.uploadText}>Upload banner image</Text>
            </View>
          )}
        </TouchableOpacity>
        {uploading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 8 }} />}

        <Text style={styles.fieldLabel}>Redirect link (required for tap)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://youtube.com/... or https://wa.me/..."
          placeholderTextColor={COLORS.grayDim}
          value={form.link}
          onChangeText={(v) => setForm((p) => ({ ...p, link: v }))}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.fieldLabel}>Sort order (0 = first)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={COLORS.grayDim}
          value={form.sortOrder}
          onChangeText={(v) => setForm((p) => ({ ...p, sortOrder: v }))}
          keyboardType="numeric"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Show on home</Text>
          <Switch value={form.active} onValueChange={(v) => setForm((p) => ({ ...p, active: v }))} />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <MaterialCommunityIcons name="plus" size={22} color={COLORS.white} />
          <Text style={styles.addBtnText}>Add Banner</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Active banners</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : sliders.length === 0 ? (
          <Text style={styles.empty}>No banners yet</Text>
        ) : (
          sliders.map((item) => (
            <View key={item._id} style={styles.card}>
              <Image
                source={{ uri: resolveMediaUrl(item.image) }}
                style={styles.cardBanner}
                resizeMode="cover"
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardLink} numberOfLines={2}>
                  {item.link || 'No link — tap disabled'}
                </Text>
                <Text style={styles.cardMeta}>Order: {item.sortOrder ?? 0}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => toggleActive(item)}>
                    <Text style={styles.toggleText}>{item.active ? 'On home' : 'Hidden'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <MaterialCommunityIcons name="delete" size={22} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: { ...TEXT.h3, color: COLORS.white },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { ...TEXT.h3, color: COLORS.white, marginBottom: 6 },
  hint: { ...TEXT.caption, color: COLORS.gray, marginBottom: 14 },
  fieldLabel: { ...TEXT.labelSm, color: COLORS.gray, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 10,
    padding: 14,
    ...TYPO.body,
    color: COLORS.white,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  uploadBox: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceDark,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  preview: { width: '100%', height: '100%' },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadText: { ...TEXT.label, color: COLORS.gray },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  label: { ...TEXT.label, color: COLORS.white },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: { ...TYPO.button, color: COLORS.white },
  empty: { ...TEXT.body, color: COLORS.gray, textAlign: 'center', marginTop: 16 },
  card: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardBanner: { width: '100%', height: 120 },
  cardBody: { padding: 12 },
  cardLink: { ...TEXT.bodyMedium, color: COLORS.white },
  cardMeta: { ...TEXT.caption, color: COLORS.gray, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  toggleText: { ...TEXT.labelSm, color: '#4ADE80' },
});
