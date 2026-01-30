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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { tournamentService } from '../services/api';

const TournamentDetailsScreen = ({ navigation, route }) => {
  const { tournamentId } = route.params || {};
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDetails();
  }, [tournamentId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!tournamentId) {
        setError('Tournament ID not provided');
        return;
      }
      const data = await tournamentService.getDetails(tournamentId);
      setTournament(data);
    } catch (error) {
      console.error('Error loading tournament details:', error);
      setError(error.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live':
        return '#FF3B30';
      case 'upcoming':
        return '#FF9500';
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
        return 'signal';
      case 'upcoming':
        return 'calendar';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'calendar';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading tournament details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tournament) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tournament Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>{error || 'Tournament not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournament Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Tournament Card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{tournament.name}</Text>
              <Text style={styles.subtitle}>
                {tournament.game?.name} - {tournament.gameMode?.name}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
              <MaterialCommunityIcons name={getStatusIcon(tournament.status)} size={16} color={COLORS.white} />
              <Text style={styles.statusText}>{tournament.status?.toUpperCase() || 'UPCOMING'}</Text>
            </View>
          </View>

          {tournament.description && (
            <Text style={styles.description}>{tournament.description}</Text>
          )}

          {/* Tournament Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="currency-usd" size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Entry Fee</Text>
              <Text style={styles.infoValue}>₹{tournament.entryFee || 0}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="trophy" size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Prize Pool</Text>
              <Text style={styles.infoValue}>₹{tournament.prizePool || 0}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="skull-crossbones" size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Per Kill</Text>
              <Text style={styles.infoValue}>₹{tournament.perKill || 0}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="account-group" size={20} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Players</Text>
              <Text style={styles.infoValue}>
                {tournament.currentParticipants || 0}/{tournament.maxParticipants || 0}
              </Text>
            </View>
          </View>

          {/* Game Details */}
          <View style={styles.gameDetails}>
            <Text style={styles.sectionTitle}>Game Details</Text>
            <View style={styles.gameInfo}>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoLabel}>Mode:</Text>
                <Text style={styles.gameInfoValue}>{tournament.mode || 'Solo'}</Text>
              </View>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoLabel}>Map:</Text>
                <Text style={styles.gameInfoValue}>{tournament.map || 'Bermuda'}</Text>
              </View>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoLabel}>Version:</Text>
                <Text style={styles.gameInfoValue}>{tournament.version || 'TPP'}</Text>
              </View>
            </View>
          </View>

          {/* Rules Section */}
          {tournament.rules && tournament.rules.length > 0 && (
            <View style={styles.rulesSection}>
              <Text style={styles.sectionTitle}>Rules & Requirements</Text>
              {tournament.rules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <MaterialCommunityIcons name="circle-small" size={16} color={COLORS.accent} />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Schedule */}
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <View style={styles.scheduleItem}>
              <MaterialCommunityIcons name="calendar-start" size={20} color={COLORS.accent} />
              <Text style={styles.scheduleLabel}>Start Date:</Text>
              <Text style={styles.scheduleValue}>{formatDate(tournament.startDate)}</Text>
            </View>
            {tournament.endDate && (
              <View style={styles.scheduleItem}>
                <MaterialCommunityIcons name="calendar-end" size={20} color={COLORS.accent} />
                <Text style={styles.scheduleLabel}>End Date:</Text>
                <Text style={styles.scheduleValue}>{formatDate(tournament.endDate)}</Text>
              </View>
            )}
          </View>

          {/* Room Credentials */}
          {tournament.showRoomCredentials && tournament.roomId && (
            <View style={styles.roomSection}>
              <Text style={styles.sectionTitle}>Room Credentials</Text>
              <View style={styles.roomItem}>
                <MaterialCommunityIcons name="key" size={20} color={COLORS.accent} />
                <Text style={styles.roomLabel}>Room ID:</Text>
                <Text style={styles.roomValue}>{tournament.roomId}</Text>
              </View>
              {tournament.roomPassword && (
                <View style={styles.roomItem}>
                  <MaterialCommunityIcons name="lock" size={20} color={COLORS.accent} />
                  <Text style={styles.roomLabel}>Password:</Text>
                  <Text style={styles.roomValue}>{tournament.roomPassword}</Text>
                </View>
              )}
            </View>
          )}

          {/* Join Button */}
          <View style={styles.joinSection}>
            <TouchableOpacity 
              style={[
                styles.joinButton,
                tournament.status === 'completed' && styles.joinButtonDisabled
              ]}
              disabled={tournament.status === 'completed'}
            >
              <Text style={styles.joinButtonText}>
                {tournament.status === 'completed' ? 'Tournament Ended' : 'JOIN TOURNAMENT'}
              </Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.lightGray,
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  infoItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  gameDetails: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  gameInfo: {
    gap: 8,
  },
  gameInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameInfoLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  gameInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  rulesSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
    flex: 1,
  },
  scheduleSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
    flex: 1,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  roomSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
    flex: 1,
  },
  roomValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  joinSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  joinButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default TournamentDetailsScreen;