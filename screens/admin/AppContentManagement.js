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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, TYPO } from '../../styles/theme';
import { adminService } from '../../services/api';
import Toast from '../../components/Toast';

const AppContentManagement = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('home');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const [newsText, setNewsText] = useState('');
  const [newsActive, setNewsActive] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [instagram, setInstagram] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [securityNote, setSecurityNote] = useState('');
  const [packs, setPacks] = useState([]);
  const [packForm, setPackForm] = useState({
    label: '',
    coins: '',
    bonusCoins: '0',
    priceInr: '',
    isBest: false,
    sortOrder: '0',
  });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [config, coinPacks] = await Promise.all([
        adminService.getHomeConfig(),
        adminService.getCoinPacks(),
      ]);
      setNewsText(config.latestNews?.text || '');
      setNewsActive(config.latestNews?.isActive !== false);
      setWhatsapp(config.supportLinks?.whatsapp || '');
      setTelegram(config.supportLinks?.telegram || '');
      setInstagram(config.supportLinks?.instagram || '');
      setFooterNote(config.walletFooterNote || '');
      setSecurityNote(config.walletSecurityNote || '');
      setPacks(Array.isArray(coinPacks) ? coinPacks : []);
    } catch (e) {
      showToast(e.message || 'Failed to load');
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

  const saveHomeConfig = async () => {
    try {
      await adminService.updateHomeConfig({
        latestNews: { text: newsText.trim(), isActive: newsActive },
        supportLinks: { whatsapp, telegram, instagram },
        walletFooterNote: footerNote.trim(),
        walletSecurityNote: securityNote.trim(),
      });
      showToast('Home & wallet text saved', 'success');
    } catch (e) {
      showToast(e.message || 'Save failed');
    }
  };

  const savePack = async () => {
    if (!packForm.label.trim() || !packForm.coins || !packForm.priceInr) {
      showToast('Label, coins, and price are required');
      return;
    }
    try {
      await adminService.createCoinPack({
        label: packForm.label.trim(),
        coins: parseInt(packForm.coins, 10),
        bonusCoins: parseInt(packForm.bonusCoins || '0', 10),
        priceInr: parseInt(packForm.priceInr, 10),
        isBest: packForm.isBest,
        sortOrder: parseInt(packForm.sortOrder || '0', 10),
        isActive: true,
      });
      setPackForm({ label: '', coins: '', bonusCoins: '0', priceInr: '', isBest: false, sortOrder: '0' });
      showToast('Coin pack added', 'success');
      await loadAll();
    } catch (e) {
      showToast(e.message || 'Failed to add pack');
    }
  };

  const deletePack = (id) => {
    Alert.alert('Delete pack?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteCoinPack(id);
            showToast('Pack deleted', 'success');
            await loadAll();
          } catch (e) {
            showToast(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Content</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {['home', 'packs'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'home' ? 'Home & Wallet' : 'Coin Packs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {tab === 'home' ? (
          <>
            <Text style={styles.label}>Latest news ticker</Text>
            <TextInput style={styles.input} value={newsText} onChangeText={setNewsText} placeholderTextColor={COLORS.gray} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Show news bar</Text>
              <Switch value={newsActive} onValueChange={setNewsActive} />
            </View>

            <Text style={styles.hintBox}>
              The LATEST bar opens Important Updates. App UI icons use Icons8 Fluent Color
              (consistent across home, tabs, and profile). Home banners: Admin → Home Banners.
            </Text>

            <Text style={styles.label}>WhatsApp link / number</Text>
            <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholderTextColor={COLORS.gray} />
            <Text style={styles.label}>Telegram link</Text>
            <TextInput style={styles.input} value={telegram} onChangeText={setTelegram} placeholderTextColor={COLORS.gray} />
            <Text style={styles.label}>Instagram link</Text>
            <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholderTextColor={COLORS.gray} />

            <Text style={styles.label}>Wallet footer note</Text>
            <TextInput style={styles.input} value={footerNote} onChangeText={setFooterNote} placeholderTextColor={COLORS.gray} />
            <Text style={styles.label}>Wallet security note</Text>
            <TextInput style={styles.input} value={securityNote} onChangeText={setSecurityNote} placeholderTextColor={COLORS.gray} />

            <TouchableOpacity style={styles.saveBtn} onPress={saveHomeConfig}>
              <Text style={styles.saveBtnText}>Save Home & Wallet Text</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Add coin pack</Text>
            <TextInput style={styles.input} placeholder="Label e.g. 550 COINS" placeholderTextColor={COLORS.gray} value={packForm.label} onChangeText={(v) => setPackForm((p) => ({ ...p, label: v }))} />
            <TextInput style={styles.input} placeholder="Coins" keyboardType="numeric" placeholderTextColor={COLORS.gray} value={packForm.coins} onChangeText={(v) => setPackForm((p) => ({ ...p, coins: v }))} />
            <TextInput style={styles.input} placeholder="Bonus coins" keyboardType="numeric" placeholderTextColor={COLORS.gray} value={packForm.bonusCoins} onChangeText={(v) => setPackForm((p) => ({ ...p, bonusCoins: v }))} />
            <TextInput style={styles.input} placeholder="Price (₹)" keyboardType="numeric" placeholderTextColor={COLORS.gray} value={packForm.priceInr} onChangeText={(v) => setPackForm((p) => ({ ...p, priceInr: v }))} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Mark as BEST</Text>
              <Switch value={packForm.isBest} onValueChange={(v) => setPackForm((p) => ({ ...p, isBest: v }))} />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={savePack}>
              <Text style={styles.saveBtnText}>Add Pack</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Existing packs</Text>
            {packs.map((pack) => (
              <View key={pack._id} style={styles.packRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packName}>{pack.label}</Text>
                  <Text style={styles.packMeta}>
                    {pack.coins}+{pack.bonusCoins || 0} coins · ₹{pack.priceInr}
                    {pack.isBest ? ' · BEST' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deletePack(pack._id)}>
                  <MaterialCommunityIcons name="delete" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
};

export default AppContentManagement;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: { ...TEXT.h3, color: COLORS.white },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.gray, fontWeight: '600' },
  tabTextActive: { color: COLORS.white },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { ...TYPO.label, color: COLORS.gray, marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    ...TYPO.body,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { ...TYPO.button, color: COLORS.white },
  sectionTitle: { ...TEXT.h3, color: COLORS.white, marginBottom: 10 },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  packName: { ...TEXT.bodyMedium, color: COLORS.white },
  packMeta: { ...TEXT.caption, color: COLORS.gray, marginTop: 4 },
  hintBox: {
    backgroundColor: 'rgba(0, 179, 104, 0.12)',
    borderRadius: 10,
    padding: 14,
    color: '#4ADE80',
    ...TYPO.body,
    lineHeight: 22,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 179, 104, 0.3)',
  },
});
