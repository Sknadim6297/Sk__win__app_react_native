import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import AppIcon from '../components/ui/AppIcon';
import BrandBell from '../components/ui/BrandBell';
import { notificationService } from '../services/api';
import { LIST_PERF } from '../utils/listPerf';
import { handleNotificationNavigation } from '../utils/navigationRef';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'results', label: 'Results' },
  { id: 'announcements', label: 'News' },
];

const formatTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${hours}:${mins} ${ampm}`;
};

const typeIcon = (type) => {
  switch (type) {
    case 'tournament':
    case 'tournament_reminder':
      return 'trophy';
    case 'tournament_update':
      return 'gamepad-variant';
    case 'wallet':
      return 'wallet';
    case 'result':
      return 'trophy';
    case 'announcement':
    case 'system':
      return 'bullhorn';
    default:
      return 'bell';
  }
};

const typeLabel = (type) => {
  if (type === 'wallet') return 'WALLET';
  if (type === 'result') return 'RESULT';
  if (type === 'announcement' || type === 'system') return 'NEWS';
  if (type === 'tournament_reminder') return 'REMINDER';
  return 'TOURNAMENT';
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (activeFilter = filter, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await notificationService.getAll(activeFilter);
      setNotifications(response.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(filter);
    }, [filter, loadNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(filter, true);
    setRefreshing(false);
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      await loadNotifications(filter, true);
    } catch {
      // ignore
    }
  };

  const onPressNotification = async (item) => {
    try {
      if (!item.isRead) {
        await notificationService.markRead(item._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
      }
    } catch {
      // ignore
    }

    handleNotificationNavigation({
      ...(item.data || {}),
      type: item.type,
      tournamentId: item.tournamentId || item.data?.tournamentId,
      screen: item.data?.screen || item.deepLink,
      deepLink: item.deepLink,
    });
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      activeOpacity={0.85}
      onPress={() => onPressNotification(item)}
    >
      <View style={[styles.iconCircle, !item.isRead && styles.iconCircleUnread]}>
        <AppIcon name={typeIcon(item.type)} size={22} light />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={3}>
          {item.message}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{typeLabel(item.type)}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.trailing}>
        {!item.isRead ? (
          <View style={styles.unreadDot} />
        ) : (
          <AppIcon name="chevron-right" size={18} light color={PAGE.mutedDim} />
        )}
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <View style={styles.filterWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        bounces={false}
      >
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(item.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={pageStyles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={markAllRead} hitSlop={10} activeOpacity={0.75}>
            <Text style={styles.markAll}>Read all</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.body}>
          {listHeader}
          <View style={pageStyles.centered}>
            <ActivityIndicator size="large" color={PAGE.accent} />
          </View>
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => String(item._id)}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
          }
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <BrandBell size={48} />
              <Text style={pageStyles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  markAll: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: PAGE.cyan,
  },
  body: {
    flex: 1,
  },
  filterWrap: {
    paddingTop: 4,
    paddingBottom: 12,
    marginBottom: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: PAGE.card,
    borderWidth: 1,
    borderColor: PAGE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(91, 57, 168, 0.45)',
    borderColor: 'rgba(123, 97, 255, 0.65)',
  },
  chipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: PAGE.muted,
    lineHeight: 18,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PAGE.cardAlt,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  cardUnread: {
    borderColor: PAGE.borderAccent,
    backgroundColor: 'rgba(91, 57, 168, 0.18)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(91, 57, 168, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  iconCircleUnread: {
    backgroundColor: 'rgba(123, 97, 255, 0.55)',
  },
  cardBody: { flex: 1, marginRight: 8, minWidth: 0 },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
    marginBottom: 4,
    lineHeight: 20,
  },
  message: {
    ...TEXT.caption,
    color: PAGE.muted,
    marginBottom: 8,
    lineHeight: 18,
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
  trailing: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PAGE.accent,
  },
});
