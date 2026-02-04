import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import { userService } from '../services/api';
import SKWinLogo from '../components/SKWinLogo';

const AccountProfileScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await userService.getProfile();
      setProfileData(data);
    } catch (error) {
      console.log('Error loading profile:', error.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData(true);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const stats = profileData || {};
  const tournament = stats.tournament || {};
  const gameStats = stats.gameStats || {};
  const wallet = stats.wallet || {};

  const totalMatches = tournament.participatedCount || 0;
  const totalKills = gameStats.totalKills || 0;
  const totalDeaths = gameStats.totalDeaths || 0;
  const winMatches = tournament.wins || 0;
  const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
  const totalEarnings = wallet.totalWinnings || tournament.earnings || 0;
  const lastMatchDate = gameStats.lastMatchDate 
    ? new Date(gameStats.lastMatchDate).toLocaleDateString() 
    : 'Never';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <MaterialCommunityIcons name="pencil" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Profile Picture */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <SKWinLogo size={100} />
          </View>
          <Text style={styles.userName}>
            {stats.name || stats.username || 'User'}
          </Text>
          {stats.gameUsername && (
            <Text style={styles.gameUsername}>@{stats.gameUsername}</Text>
          )}
        </View>

        {/* Stats Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="gamepad-variant" size={28} color={COLORS.accent} />
              <Text style={styles.statValue}>{totalMatches}</Text>
              <Text style={styles.statLabel}>Matches Played</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialCommunityIcons name="target" size={28} color="#FF6B6B" />
              <Text style={styles.statValue}>{totalKills}</Text>
              <Text style={styles.statLabel}>Total Kills</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
              <Text style={styles.statValue}>{winMatches}</Text>
              <Text style={styles.statLabel}>Win Matches</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialCommunityIcons name="chart-line" size={28} color="#4CAF50" />
              <Text style={styles.statValue}>{kdRatio}</Text>
              <Text style={styles.statLabel}>K/D Ratio</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialCommunityIcons name="currency-inr" size={28} color="#2196F3" />
              <Text style={styles.statValue}>₹{totalEarnings.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color={COLORS.gray} />
              <Text style={styles.statValue}>{lastMatchDate}</Text>
              <Text style={styles.statLabel}>Last Match</Text>
            </View>
          </View>
        </View>

        {/* Profile Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{stats.name || 'Not set'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{stats.username || 'N/A'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Game Username</Text>
              <Text style={styles.infoValue}>{stats.gameUsername || 'Not set'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{stats.email || 'N/A'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>
                {stats.dateOfBirth 
                  ? new Date(stats.dateOfBirth).toLocaleDateString() 
                  : 'Not set'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>#{stats._id?.slice(-8) || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={COLORS.white} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  gameUsername: {
    fontSize: 14,
    color: COLORS.accent,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray + '20',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  verified: {
    backgroundColor: '#4CAF50' + '20',
  },
  pending: {
    backgroundColor: '#FF9800' + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountProfileScreen;
