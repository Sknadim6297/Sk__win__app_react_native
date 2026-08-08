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
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{typeLabel(item.type)}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
      {!item.isRead ? <View style={styles.unreadDot} /> : <AppIcon name="chevron-right" size={18} light />}
    </TouchableOpacity>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
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

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
          }
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <AppIcon name="bell" size={48} light />
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
    fontSize: 12,
    color: PAGE.cyan,
  },
  filterScroll: {
    flexGrow: 0,
    maxHeight: 52,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: PAGE.card,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  chipActive: {
    backgroundColor: 'rgba(91, 57, 168, 0.35)',
    borderColor: PAGE.borderAccent,
  },
  chipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: PAGE.muted,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
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
  },
  message: {
    ...TEXT.caption,
    color: PAGE.muted,
    marginBottom: 6,
    lineHeight: 17,
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PAGE.accent,
  },
});
