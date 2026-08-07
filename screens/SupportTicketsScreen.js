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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { supportService } from '../services/api';
import { LIST_PERF } from '../utils/listPerf';

const formatDate = (iso) => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${hours}:${mins} ${ampm}`;
};

const statusLabel = (status) => {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'closed') return 'Closed';
  return 'Open';
};

const statusColor = (status) => {
  if (status === 'closed') return '#EF4444';
  if (status === 'in_progress') return '#F59E0B';
  return PAGE.green;
};

export default function SupportTicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = async () => {
    try {
      const data = await supportService.getMyTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('SupportTicketDetail', { ticket: item })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.ticketId}>Ticket #{item.ticketCode}</Text>
        <Text style={styles.ticketDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={styles.categoryLine}>Category: {item.category}</Text>
      <View style={styles.badgeRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.badgeText}>{item.category}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.badgeText}>{statusLabel(item.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={pageStyles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="Customer Support" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={tickets}
          keyExtractor={(item) => item.id || item._id || String(item.ticketCode)}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
          }
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <MaterialCommunityIcons name="headset" size={48} color={PAGE.mutedDim} />
              <Text style={pageStyles.emptyTitle}>No tickets yet</Text>
              <Text style={pageStyles.emptyText}>
                Tap Create Ticket below to reach our support team.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={pageStyles.primaryBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('CreateSupportTicket')}
        >
          <Ionicons name="add" size={22} color={COLORS.white} />
          <Text style={pageStyles.primaryBtnText}>Create Ticket</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
    flexGrow: 1,
  },
  card: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketId: { ...TEXT.caption, color: PAGE.muted },
  ticketDate: { ...TEXT.caption, color: PAGE.mutedDim },
  categoryLine: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
    marginBottom: 12,
  },
  badgeRow: { flexDirection: 'row', gap: 8 },
  categoryBadge: {
    backgroundColor: PAGE.purple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.white },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(11,14,30,0.96)',
    borderTopWidth: 1,
    borderTopColor: PAGE.border,
  },
});
