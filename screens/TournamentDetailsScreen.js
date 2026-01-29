import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeftIcon from 'react-native-heroicons/outline/ArrowLeftIcon';
import CalendarDaysIcon from 'react-native-heroicons/outline/CalendarDaysIcon';
import SignalIcon from 'react-native-heroicons/outline/SignalIcon';
import CheckCircleIcon from 'react-native-heroicons/outline/CheckCircleIcon';
import XCircleIcon from 'react-native-heroicons/outline/XCircleIcon';
import CurrencyDollarIcon from 'react-native-heroicons/outline/CurrencyDollarIcon';
import TrophyIcon from 'react-native-heroicons/outline/TrophyIcon';
import UserGroupIcon from 'react-native-heroicons/outline/UserGroupIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import KeyIcon from 'react-native-heroicons/outline/KeyIcon';
import LockClosedIcon from 'react-native-heroicons/outline/LockClosedIcon';
import { COLORS } from '../styles/theme';
import { tournamentService } from '../services/api';

const TournamentDetailsScreen = ({ navigation, route }) => {
  const { tournamentId } = route.params || {};
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [tournamentId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      if (!tournamentId) {
        setTournament(null);
        return;
      }
      const data = await tournamentService.getDetails(tournamentId);
      setTournament(data);
    } catch (error) {
      console.error('Error loading tournament details:', error);
      setTournament(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live':
        return '#FF3B30';
      case 'upcoming':
        return COLORS.accent;
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return COLORS.gray;
      default:
        return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'live':
        return SignalIcon;
      case 'upcoming':
        return CalendarDaysIcon;
      case 'completed':
        return CheckCircleIcon;
      case 'cancelled':
        return XCircleIcon;
      default:
        return CalendarDaysIcon;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tournament details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tournament) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Unable to load tournament.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const StatusIcon = getStatusIcon(tournament?.status);
  const roomMessage = tournament && !tournament.showRoomCredentials
    ? 'Room ID & Password will be shared before match start.'
    : 'Join the tournament to view room credentials.';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeftIcon size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournament Details</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{tournament.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}
            >
              <StatusIcon size={20} color={COLORS.white} />
              <Text style={styles.statusText}>{tournament.status ? tournament.status.toUpperCase() : 'UPCOMING'}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{tournament.gameType || tournament.game || 'Battle Royale'}</Text>

          {tournament.description && tournament.description.length > 0 ? (
            <Text style={styles.description}>{tournament.description}</Text>
          ) : null}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <CurrencyDollarIcon size={18} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Entry Fee</Text>
              <Text style={styles.infoValue}>₹{tournament.entryFee}</Text>
            </View>
            <View style={styles.infoItem}>
              <TrophyIcon size={18} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Prize Pool</Text>
              <Text style={styles.infoValue}>₹{tournament.prizePool}</Text>
            </View>
            <View style={styles.infoItem}>
              <UserGroupIcon size={18} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Players</Text>
              <Text style={styles.infoValue}>{tournament.participantCount || 0}/{tournament.maxPlayers}</Text>
            </View>
            <View style={styles.infoItem}>
              <ClockIcon size={18} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Start Time</Text>
              <Text style={styles.infoValue}>{new Date(tournament.startDate).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <KeyIcon size={18} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Room Credentials</Text>
          </View>

          {tournament.roomCredentialsVisible ? (
            <View style={styles.roomDetails}>
              <View style={styles.roomRow}>
                <Text style={styles.roomLabel}>Room ID</Text>
                <Text style={styles.roomValue}>{tournament.roomId || 'Not set'}</Text>
              </View>
              <View style={styles.roomRow}>
                <Text style={styles.roomLabel}>Room Password</Text>
                <Text style={styles.roomValue}>{tournament.roomPassword || 'Not set'}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.roomHidden}>
              <LockClosedIcon size={18} color={COLORS.gray} />
              <Text style={styles.roomHiddenText}>{roomMessage}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 10,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
  },
  subtitle: {
    color: COLORS.gray,
    marginTop: 4,
    fontSize: 12,
  },
  description: {
    color: COLORS.gray,
    marginTop: 12,
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },
  statusText: {
    color: COLORS.white,
    marginLeft: 6,
    fontWeight: '700',
    fontSize: 11,
  },
  infoGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: '47%',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 12,
  },
  infoLabel: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 6,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  roomDetails: {
    marginTop: 12,
    gap: 12,
  },
  roomRow: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    padding: 12,
  },
  roomLabel: {
    color: COLORS.gray,
    fontSize: 11,
  },
  roomValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  roomHidden: {
    marginTop: 12,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  roomHiddenText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default TournamentDetailsScreen;
