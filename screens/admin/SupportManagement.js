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
import { COLORS, TEXT, TYPO } from '../../styles/theme';
import { supportService } from '../../services/api';
import Toast from '../../components/Toast';

const STATUS_OPTIONS = ['open', 'in_progress', 'closed'];

export default function SupportManagement({ navigation }) {
  const [tab, setTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const [expandedId, setExpandedId] = useState(null);
  const [replyDraft, setReplyDraft] = useState({});

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const loadAll = async () => {
    try {
      const [ticketData, categoryData] = await Promise.all([
        supportService.getAdminTickets(),
        supportService.getAdminCategories(),
      ]);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (e) {
      showToast(e.message || 'Failed to load support data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const updateTicket = async (id, payload) => {
    try {
      await supportService.updateTicket(id, payload);
      showToast('Ticket updated', 'success');
      await loadAll();
    } catch (e) {
      showToast(e.message || 'Update failed');
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) {
      showToast('Enter category name');
      return;
    }
    try {
      await supportService.createCategory({ name: newCategory.trim() });
      setNewCategory('');
      showToast('Category added', 'success');
      await loadAll();
    } catch (e) {
      showToast(e.message || 'Failed to add category');
    }
  };

  const toggleCategory = async (cat) => {
    try {
      await supportService.updateCategory(cat._id, { isActive: !cat.isActive });
      await loadAll();
    } catch (e) {
      showToast(e.message || 'Failed to update category');
    }
  };

  const deleteCategory = (cat) => {
    Alert.alert('Delete category', `Remove "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supportService.deleteCategory(cat._id);
            showToast('Category deleted', 'success');
            await loadAll();
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
      <Toast {...toast} onHide={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'tickets' && styles.tabBtnActive]}
          onPress={() => setTab('tickets')}
        >
          <Text style={[styles.tabText, tab === 'tickets' && styles.tabTextActive]}>Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'categories' && styles.tabBtnActive]}
          onPress={() => setTab('categories')}
        >
          <Text style={[styles.tabText, tab === 'categories' && styles.tabTextActive]}>Categories</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {tab === 'categories' ? (
            <>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.input}
                  placeholder="New category (e.g. LONEWOLF)"
                  placeholderTextColor={COLORS.grayDim}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
                  <Ionicons name="add" size={22} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {categories.map((cat) => (
                <View key={cat._id} style={styles.catCard}>
                  <View style={styles.catLeft}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catMeta}>Order: {cat.sortOrder ?? 0}</Text>
                  </View>
                  <Switch value={cat.isActive !== false} onValueChange={() => toggleCategory(cat)} />
                  <TouchableOpacity onPress={() => deleteCategory(cat)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : tickets.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="ticket-outline" size={40} color={COLORS.grayDim} />
              <Text style={styles.emptyText}>No support tickets yet</Text>
            </View>
          ) : (
            tickets.map((t) => {
              const expanded = expandedId === t.id;
              return (
                <View key={t.id} style={styles.ticketCard}>
                  <TouchableOpacity onPress={() => setExpandedId(expanded ? null : t.id)}>
                    <View style={styles.ticketTop}>
                      <Text style={styles.ticketCode}>#{t.ticketCode}</Text>
                      <Text style={styles.ticketStatus}>{t.status}</Text>
                    </View>
                    <Text style={styles.ticketUser}>
                      {t.user?.username || 'User'} · {t.category}
                    </Text>
                    <Text style={styles.ticketMsg} numberOfLines={expanded ? undefined : 2}>
                      {t.message}
                    </Text>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={styles.expanded}>
                      <Text style={styles.replyLabel}>Admin note / reply</Text>
                      <TextInput
                        style={styles.replyInput}
                        multiline
                        placeholder="Reply to user..."
                        placeholderTextColor={COLORS.grayDim}
                        value={replyDraft[t.id] ?? t.adminNote ?? ''}
                        onChangeText={(v) => setReplyDraft((p) => ({ ...p, [t.id]: v }))}
                      />
                      <View style={styles.statusRow}>
                        {STATUS_OPTIONS.map((s) => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.statusChip, t.status === s && styles.statusChipActive]}
                            onPress={() => updateTicket(t.id, { status: s })}
                          >
                            <Text style={styles.statusChipText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={styles.saveReplyBtn}
                        onPress={() =>
                          updateTicket(t.id, {
                            adminNote: replyDraft[t.id] ?? t.adminNote ?? '',
                          })
                        }
                      >
                        <Text style={styles.saveReplyText}>Save reply</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
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
  tabs: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.gray, fontFamily: TYPO.fontMedium },
  tabTextActive: { color: COLORS.white, fontFamily: TYPO.fontSemiBold },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontFamily: TYPO.fontRegular,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  catLeft: { flex: 1 },
  catName: { color: COLORS.white, fontFamily: TYPO.fontSemiBold, fontSize: 15 },
  catMeta: { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  deleteBtn: { marginLeft: 10, padding: 4 },
  ticketCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketCode: { color: COLORS.white, fontFamily: TYPO.fontBold },
  ticketStatus: { color: COLORS.accent, fontFamily: TYPO.fontMedium, textTransform: 'capitalize' },
  ticketUser: { color: COLORS.gray, marginTop: 6, fontSize: 12 },
  ticketMsg: { color: COLORS.white, marginTop: 8, lineHeight: 20 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.darkGray, paddingTop: 12 },
  replyLabel: { color: COLORS.gray, fontSize: 12, marginBottom: 6 },
  replyInput: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    padding: 12,
    color: COLORS.white,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: TYPO.fontRegular,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.darkGray,
  },
  statusChipActive: { backgroundColor: COLORS.primary },
  statusChipText: { color: COLORS.white, fontSize: 12, fontFamily: TYPO.fontMedium },
  saveReplyBtn: {
    marginTop: 12,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveReplyText: { color: COLORS.white, fontFamily: TYPO.fontSemiBold },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: COLORS.gray, marginTop: 12, fontFamily: TYPO.fontRegular },
});
