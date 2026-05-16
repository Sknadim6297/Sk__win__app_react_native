import React, { useEffect, useState } from 'react';
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
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPO } from '../../styles/theme';
import { announcementService } from '../../services/api';
import Toast from '../../components/Toast';

const emptyForm = {
  title: '',
  category: 'ANNOUNCEMENT',
  description: '',
  externalLink: '',
  isActive: true,
  sortOrder: '0',
};

export default function AnnouncementManagement({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const loadItems = async () => {
    try {
      const data = await announcementService.getAdminList();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Title is required');
      return;
    }
    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || 'ANNOUNCEMENT',
      description: form.description.trim(),
      externalLink: form.externalLink.trim(),
      isActive: form.isActive,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };
    try {
      if (editingId) {
        await announcementService.update(editingId, payload);
        showToast('Update saved', 'success');
      } else {
        await announcementService.create(payload);
        showToast('Announcement added', 'success');
      }
      resetForm();
      await loadItems();
    } catch (e) {
      showToast(e.message || 'Save failed');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category || 'ANNOUNCEMENT',
      description: item.description || '',
      externalLink: item.externalLink || '',
      isActive: item.isActive !== false,
      sortOrder: String(item.sortOrder ?? 0),
    });
  };

  const handleDelete = (item) => {
    Alert.alert('Delete', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await announcementService.delete(item.id);
            if (editingId === item.id) resetForm();
            showToast('Deleted', 'success');
            await loadItems();
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
        <Text style={styles.headerTitle}>Important Updates</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>{editingId ? 'Edit update' : 'Add update'}</Text>
          <Text style={styles.hint}>
            If external link is set, tapping opens the browser. Otherwise users see the description.
          </Text>

          <Text style={styles.label}>Title (emojis OK)</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            placeholder="🏆 Tournaments Are Back! 🎮"
            placeholderTextColor={COLORS.grayDim}
          />

          <Text style={styles.label}>Category label</Text>
          <TextInput
            style={styles.input}
            value={form.category}
            onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
            placeholder="ANNOUNCEMENT"
            placeholderTextColor={COLORS.grayDim}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Description (in-app detail)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            placeholder="Full message for users..."
            placeholderTextColor={COLORS.grayDim}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>External link (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.externalLink}
            onChangeText={(v) => setForm((p) => ({ ...p, externalLink: v }))}
            placeholder="https://..."
            placeholderTextColor={COLORS.grayDim}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Sort order</Text>
          <TextInput
            style={styles.input}
            value={form.sortOrder}
            onChangeText={(v) => setForm((p) => ({ ...p, sortOrder: v }))}
            keyboardType="numeric"
            placeholderTextColor={COLORS.grayDim}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Active</Text>
            <Switch value={form.isActive} onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
          </View>

          <View style={styles.btnRow}>
            {editingId ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingId ? 'Save changes' : 'Add update'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Published ({items.length})</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <MaterialCommunityIcons name="bullhorn" size={20} color="#38BDF8" />
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.itemMeta}>
                {item.category} · {item.isActive ? 'Active' : 'Hidden'}
                {item.externalLink ? ' · Has link' : ''}
              </Text>
              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { color: COLORS.white, fontSize: 16, fontFamily: TYPO.fontBold },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontFamily: TYPO.fontSemiBold, marginBottom: 8 },
  hint: { color: COLORS.gray, fontSize: 12, lineHeight: 18, marginBottom: 12, fontFamily: TYPO.fontRegular },
  label: { color: COLORS.gray, fontSize: 12, marginBottom: 6, marginTop: 8, fontFamily: TYPO.fontMedium },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    fontFamily: TYPO.fontRegular,
  },
  textArea: { minHeight: 100 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontFamily: TYPO.fontSemiBold },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  cancelText: { color: COLORS.gray, fontFamily: TYPO.fontMedium },
  itemCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, color: COLORS.white, fontFamily: TYPO.fontSemiBold, fontSize: 14 },
  itemMeta: { color: COLORS.gray, fontSize: 12, marginTop: 6, fontFamily: TYPO.fontRegular },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  editBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { color: COLORS.white, fontSize: 12, fontFamily: TYPO.fontSemiBold },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
