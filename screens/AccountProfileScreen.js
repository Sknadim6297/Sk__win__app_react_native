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
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { userService } from '../services/api';
import DefaultAvatar from '../components/ui/DefaultAvatar';
import AppIcon from '../components/ui/AppIcon';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const AccountProfileScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfileData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await userService.getProfile();
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile:', error.message);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const stats = profileData || {};
  const photo = stats.profilePhoto ? resolveMediaUrl(stats.profilePhoto) : '';

  if (loading) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ScreenHeader title="My Profile" onBack={() => navigation.goBack()} />
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const rows = [
    { label: 'Full Name', value: stats.name || 'Not set' },
    { label: 'Username', value: stats.username || user?.username || 'N/A' },
    { label: 'Game Username', value: stats.gameUsername || 'Not set' },
    { label: 'Email', value: stats.email || 'N/A' },
    { label: 'User ID', value: `#${stats._id?.slice(-8) || 'N/A'}` },
  ];

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader
        title="My Profile"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} hitSlop={10}>
            <AppIcon name="pencil" size={22} light />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={pageStyles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProfileData(true);
            }}
            tintColor={COLORS.white}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
              <DefaultAvatar uri={photo} size={96} />
          </View>
          <Text style={styles.name}>{stats.name || stats.username || 'User'}</Text>
          {stats.gameUsername ? (
            <Text style={styles.gameId}>@{stats.gameUsername}</Text>
          ) : null}
        </View>

        <Text style={pageStyles.sectionTitle}>Personal Information</Text>
        <View style={pageStyles.card}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[pageStyles.row, index === rows.length - 1 && pageStyles.rowLast]}
            >
              <Text style={pageStyles.label}>{row.label}</Text>
              <Text style={[pageStyles.value, styles.rowValue]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={pageStyles.primaryBtn}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.88}
        >
          <AppIcon name="pencil" size={20} light />
          <Text style={pageStyles.primaryBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountProfileScreen;

const styles = StyleSheet.create({
  heroCard: {
    ...pageStyles.heroCard,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: PAGE.cardAlt,
    borderWidth: 2,
    borderColor: PAGE.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: { width: 104, height: 104 },
  name: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  gameId: { ...TEXT.caption, color: PAGE.cyan, marginTop: 6 },
  rowValue: { flex: 1, textAlign: 'right', marginLeft: 12 },
});
