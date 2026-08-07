import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusLabel = (status) => {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'closed') return 'Closed';
  return 'Open';
};

export default function SupportTicketDetailScreen({ navigation, route }) {
  const ticket = route.params?.ticket;

  if (!ticket) {
    return null;
  }

  return (
    <SafeAreaView style={pageStyles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title={`Ticket #${ticket.ticketCode}`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={pageStyles.scroll}>
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.badgeText}>{ticket.category}</Text>
          </View>
          <View style={[styles.statusBadge, ticket.status === 'closed' && styles.statusClosed]}>
            <Text style={styles.badgeText}>{statusLabel(ticket.status)}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>Created {formatDate(ticket.createdAt)}</Text>

        <Text style={pageStyles.sectionTitle}>Your message</Text>
        <View style={pageStyles.card}>
          <View style={[pageStyles.row, pageStyles.rowLast, styles.messagePad]}>
            <Text style={styles.messageText}>{ticket.message}</Text>
          </View>
        </View>

        {ticket.adminNote ? (
          <>
            <Text style={pageStyles.sectionTitle}>Support reply</Text>
            <View style={[pageStyles.card, styles.replyCard]}>
              <View style={[pageStyles.row, pageStyles.rowLast, styles.messagePad]}>
                <Text style={styles.messageText}>{ticket.adminNote}</Text>
              </View>
            </View>
          </>
        ) : ticket.status !== 'closed' ? (
          <Text style={styles.hint}>
            Our team will respond here. Pull to refresh on the tickets list.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  categoryBadge: {
    backgroundColor: PAGE.purple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadge: {
    backgroundColor: PAGE.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusClosed: { backgroundColor: '#EF4444' },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.white },
  dateText: { ...TEXT.caption, color: PAGE.muted, marginBottom: 18 },
  messagePad: { alignItems: 'flex-start' },
  messageText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.white,
  },
  replyCard: { borderColor: 'rgba(0,179,104,0.35)' },
  hint: { ...TEXT.caption, color: PAGE.muted, lineHeight: 20 },
});
