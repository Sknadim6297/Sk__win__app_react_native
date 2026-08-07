import React, { useCallback, useEffect, useState } from 'react';
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
import { COLORS } from '../../styles/theme';
import { mapService } from '../../services/api';
import Toast from '../../components/Toast';

export default function MapManagement({ navigation }) {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const loadMaps = useCallback(async () => {
    try {
      const data = await mapService.getAll();
      setMaps(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load maps');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Map name is required');
      return;
    }
    try {
      if (editingId) {
        await mapService.update(editingId, { name: trimmed });
        showToast('Map updated', 'success');
      } else {
        await mapService.create({ name: trimmed, active: true });
        showToast('Map created', 'success');
      }
      resetForm();
      await loadMaps();
    } catch (e) {
      showToast(e.message || 'Failed to save map');
    }
  };

  const handleEdit = (map) => {
    setEditingId(map._id);
    setName(map.name);
  };

  const handleToggleActive = async (map) => {
    try {
      await mapService.update(map._id, { active: !map.active });
      await loadMaps();
    } catch (e) {
      showToast(e.message || 'Failed to update map');
    }
  };

  const handleDelete = (map) => {
    Alert.alert('Delete Map', `Delete "${map.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mapService.remove(map._id);
            showToast('Map deleted', 'success');
            if (editingId === map._id) resetForm();
            await loadMaps();
          } catch (e) {
            showToast(e.message || 'Failed to delete map');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Map Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMaps();
            }}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>{editingId ? 'Edit Map' : 'Add Map'}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bermuda"
            placeholderTextColor={COLORS.gray}
          />
          <View style={styles.formActions}>
            {editingId ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>{editingId ? 'Update' : 'Add Map'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Maps ({maps.length})</Text>
        {maps.map((map) => (
          <View key={map._id} style={styles.mapRow}>
            <View style={styles.mapInfo}>
              <MaterialCommunityIcons name="map" size={22} color={COLORS.accent} />
              <View>
                <Text style={styles.mapName}>{map.name}</Text>
                <Text style={styles.mapMeta}>{map.active ? 'Active' : 'Hidden'}</Text>
              </View>
            </View>
            <View style={styles.mapActions}>
              <Switch
                value={!!map.active}
                onValueChange={() => handleToggleActive(map)}
                trackColor={{ false: COLORS.gray, true: COLORS.accent }}
              />
              <TouchableOpacity onPress={() => handleEdit(map)} style={styles.iconBtn}>
                <Ionicons name="pencil" size={18} color={COLORS.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(map)} style={styles.iconBtn}>
                <Ionicons name="trash" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 16 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  label: { color: COLORS.white, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.white,
    marginBottom: 12,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: { color: '#050510', fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  secondaryBtnText: { color: COLORS.white },
  sectionTitle: { color: COLORS.gray, marginBottom: 10, fontWeight: '600' },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  mapInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mapName: { color: COLORS.white, fontWeight: '700' },
  mapMeta: { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  mapActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 6 },
});
