import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, TYPO } from '../styles/theme';

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.ticketCode}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.badgeText}>{ticket.category}</Text>
          </View>
          <View style={[styles.statusBadge, ticket.status === 'closed' && styles.statusClosed]}>
            <Text style={styles.badgeText}>{statusLabel(ticket.status)}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>Created {formatDate(ticket.createdAt)}</Text>

        <Text style={styles.sectionLabel}>Your message</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{ticket.message}</Text>
        </View>

        {ticket.adminNote ? (
          <>
            <Text style={styles.sectionLabel}>Support reply</Text>
            <View style={[styles.messageCard, styles.replyCard]}>
              <Text style={styles.messageText}>{ticket.adminNote}</Text>
            </View>
          </>
        ) : ticket.status !== 'closed' ? (
          <Text style={styles.hint}>Our team will respond here. Pull to refresh on the tickets list.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    fontFamily: TYPO.fontSemiBold,
  },
  content: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusClosed: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: TYPO.fontSemiBold,
  },
  dateText: {
    color: '#8B949E',
    fontSize: 13,
    marginBottom: 20,
    fontFamily: TYPO.fontRegular,
  },
  sectionLabel: {
    color: '#8B949E',
    fontSize: 12,
    fontFamily: TYPO.fontMedium,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  messageCard: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  replyCard: {
    borderColor: 'rgba(34,197,94,0.35)',
  },
  messageText: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: TYPO.fontRegular,
  },
  hint: {
    color: '#8B949E',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: TYPO.fontRegular,
  },
});
