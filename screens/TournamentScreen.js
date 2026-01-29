import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarDaysIcon from 'react-native-heroicons/outline/CalendarDaysIcon';
import SignalIcon from 'react-native-heroicons/outline/SignalIcon';
import CheckCircleIcon from 'react-native-heroicons/outline/CheckCircleIcon';
import XCircleIcon from 'react-native-heroicons/outline/XCircleIcon';
import PlusCircleIcon from 'react-native-heroicons/outline/PlusCircleIcon';
import UserGroupIcon from 'react-native-heroicons/outline/UserGroupIcon';
import TrophyIcon from 'react-native-heroicons/outline/TrophyIcon';
import CurrencyDollarIcon from 'react-native-heroicons/outline/CurrencyDollarIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import { COLORS } from '../styles/theme';
import { tournamentService } from '../services/api';
import Toast from '../components/Toast';

const TournamentScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [tournaments, setTournaments] = useState([]);
  const [joinedTournaments, setJoinedTournaments] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningTournamentId, setJoiningTournamentId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getList();
      setTournaments(data);

      // Build set of joined tournaments from API data
      const joined = new Set();
      data.forEach((tournament) => {
        if (tournament.userJoined) {
          joined.add(tournament._id);
        }
      });
      setJoinedTournaments(joined);
    } catch (error) {
      showToast(error.message || 'Failed to fetch tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  };

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const shouldShowJoinToast = (message = '') => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('balance') ||
      normalized.includes('full') ||
      normalized.includes('started')
    );
  };

  const handleJoinTournament = async (tournament) => {
    try {
      // Check if already joined
      if (joinedTournaments.has(tournament._id)) {
        return;
      }

      try {
        setJoiningTournamentId(tournament._id);
        await tournamentService.join(tournament._id);
        const updated = new Set(joinedTournaments);
        updated.add(tournament._id);
        setJoinedTournaments(updated);
        await fetchTournaments();
      } catch (error) {
        const message = error.message || 'Failed to join tournament';
        if (shouldShowJoinToast(message)) {
          showToast(message, 'error');
        }
      } finally {
        setJoiningTournamentId(null);
      }
    } catch (error) {
      setJoiningTournamentId(null);
      const message = error.message || 'Failed to check eligibility';
      if (shouldShowJoinToast(message)) {
        showToast(message, 'error');
      }
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

  const getTimeRemaining = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start - now;

    if (diff < 0) return 'Live';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;

    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${minutes}m`;
  };

  const getTournamentsByStatus = (status) => {
    return tournaments.filter((t) => t.status === status);
  };

  const isUserJoined = (tournamentId) => {
    return joinedTournaments.has(tournamentId);
  };

  const canJoinTournament = (tournament) => {
    if (tournament.status === 'live' || tournament.status === 'completed' || tournament.status === 'cancelled') {
      return false;
    }
    return true;
  };

  const getJoinButtonState = (tournament) => {
    const userJoined = isUserJoined(tournament._id);
    const canJoin = canJoinTournament(tournament);

    if (userJoined) {
      return {
        label: 'JOINED',
        Icon: CheckCircleIcon,
        disabled: true,
        buttonStyle: styles.joinedButton,
        textStyle: styles.joinedButtonText,
        showIcon: true,
      };
    }

    if (!canJoin) {
      let label = 'Tournament Ended';
      if (tournament.status === 'cancelled') {
        label = 'Tournament Cancelled';
      } else if (tournament.status === 'live') {
        label = 'Tournament Live';
      }
      return {
        label,
        Icon: null,
        disabled: true,
        buttonStyle: styles.disabledJoinButton,
        textStyle: styles.disabledJoinButtonText,
        showIcon: false,
      };
    }

    return {
      label: 'Join Now',
      Icon: PlusCircleIcon,
      disabled: false,
      buttonStyle: styles.joinButton,
      textStyle: styles.joinButtonText,
      showIcon: true,
    };
  };

  if (loading && tournaments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TournamentCard = ({ tournament }) => (
    <TouchableOpacity
      style={styles.tournamentCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('TournamentDetails', { tournamentId: tournament._id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleSection}>
          <Text style={styles.tournamentTitle}>{tournament.name}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{tournament.gameType}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
          {(() => {
            const StatusIcon = getStatusIcon(tournament.status);
            return <StatusIcon size={12} color={COLORS.white} />;
          })()}
          <Text style={styles.statusText}>{tournament.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
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
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <ClockIcon size={18} color={COLORS.accent} />
            <Text style={styles.infoLabel}>Start In</Text>
            <Text style={styles.infoValue}>{getTimeRemaining(tournament.startDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <UserGroupIcon size={18} color={COLORS.accent} />
            <Text style={styles.infoLabel}>Players</Text>
            <Text style={styles.infoValue}>
              {(tournament.participantCount ?? tournament.registeredPlayers?.length ?? 0)}/{tournament.maxPlayers}
            </Text>
          </View>
        </View>

        {tournament.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>{tournament.description}</Text>
          </View>
        )}
      </View>

      {/* Join Button */}
      {(() => {
        const buttonState = getJoinButtonState(tournament);
        const isJoining = joiningTournamentId === tournament._id;

        return (
          <TouchableOpacity
            style={[buttonState.buttonStyle, isJoining && { opacity: 0.7 }]}
            onPress={() => handleJoinTournament(tournament)}
            disabled={buttonState.disabled || isJoining}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {isJoining ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  {buttonState.showIcon && buttonState.Icon && (
                    <View style={{ marginRight: 6 }}>
                      <buttonState.Icon
                        size={16}
                        color={buttonState.disabled ? COLORS.gray : COLORS.white}
                      />
                    </View>
                  )}
                  <Text style={buttonState.textStyle}>{buttonState.label}</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        );
      })()}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <Text style={styles.headerSubtitle}>Join and compete for amazing prizes!</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['upcoming', 'live', 'completed', 'cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab === 'live'
                ? 'Live'
                : tab === 'upcoming'
                ? 'Upcoming'
                : tab === 'completed'
                ? 'Completed'
                : 'Cancelled'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tournament List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {getTournamentsByStatus(selectedTab).length === 0 ? (
          <View style={styles.emptyContainer}>
            <TrophyIcon size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No {selectedTab} tournaments</Text>
          </View>
        ) : (
          getTournamentsByStatus(selectedTab).map((tournament) => (
            <TournamentCard key={tournament._id} tournament={tournament} />
          ))
        )}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}40`,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 12,
  },
  tournamentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
  },
  tournamentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  typeTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 3,
  },
  cardContent: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  descriptionSection: {
    backgroundColor: `${COLORS.primary}20`,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 10,
  },
  disabledJoinButton: {
    backgroundColor: COLORS.darkGray,
    paddingVertical: 12,
    borderRadius: 10,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  joinedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  disabledJoinButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default TournamentScreen;