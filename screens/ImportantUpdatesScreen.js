import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import AppIcon from '../components/ui/AppIcon';
import { announcementService } from '../services/api';
import { LIST_PERF } from '../utils/listPerf';

const formatTimestamp = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function ImportantUpdatesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = async () => {
    try {
      const data = await announcementService.getActive();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handlePress = async (item) => {
    const link = item.externalLink?.trim();
    if (link) {
      try {
        const url = link.startsWith('http') ? link : `https://${link}`;
        await Linking.openURL(url);
      } catch {
        navigation.navigate('AnnouncementDetail', { id: item.id, item });
      }
      return;
    }
    navigation.navigate('AnnouncementDetail', { id: item.id, item });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => handlePress(item)}>
      <View style={styles.iconCircle}>
        <AppIcon name="bullhorn" size={22} light />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category || 'ANNOUNCEMENT'}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
        </View>
      </View>
      <AppIcon name="chevron-right" size={20} light />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={pageStyles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="Announcement" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
          }
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <AppIcon name="bullhorn-outline" size={48} light />
              <Text style={pageStyles.emptyText}>No updates yet. Check back soon.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAGE.cardAlt,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(91, 57, 168, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8, minWidth: 0 },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  category: {
    color: PAGE.cyan,
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.4,
  },
  dot: { color: PAGE.mutedDim, marginHorizontal: 6 },
  timestamp: { ...TEXT.caption, color: PAGE.mutedDim },
});
