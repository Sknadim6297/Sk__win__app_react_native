import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import { userService, walletService } from '../services/api';

const AccountScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAccountData();
    }, [])
  );

  const loadAccountData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      // Load user profile and wallet balance in parallel
      const [profileData, walletData] = await Promise.all([
        userService.getProfile(),
        walletService.getBalance(),
      ]);

      setUserData(profileData);
      setWalletBalance(walletData?.balance || 0);
    } catch (error) {
      console.log('Error loading account data:', error.message);
      Alert.alert('Error', 'Failed to load account data. Please refresh.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccountData(true);
  }, []);

  const menuItems = [
    {
      title: 'My Profile',
      icon: 'account',
      screen: 'AccountProfile',
    },
    {
      title: 'My Wallet',
      icon: 'wallet',
      screen: 'MyWallet',
    },
    {
      title: 'My Statistics',
      icon: 'chart-bar',
      screen: 'MyStatistics',
    },
    {
      title: 'Top Players',
      icon: 'podium',
      screen: 'TopPlayers',
    },
    {
      title: 'Notifications',
      icon: 'bell',
      screen: 'Notifications',
    },
    {
      title: 'Contact Us',
      icon: 'email',
      screen: 'ContactUs',
    },
    {
      title: 'FAQ',
      icon: 'help-circle',
      screen: 'FAQ',
    },
    {
      title: 'About Us',
      icon: 'information',
      screen: 'AboutUs',
    },
    {
      title: 'Privacy Policy',
      icon: 'shield-check',
      screen: 'PrivacyPolicy',
    },
    {
      title: 'Terms and Conditions',
      icon: 'file-document',
      screen: 'TermsAndConditions',
    },
    {
      title: 'Share App',
      icon: 'share-variant',
      screen: 'ShareApp',
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <>
          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons name="account-circle" size={60} color={COLORS.accent} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{userData?.name || userData?.username || 'User'}</Text>
                <Text style={styles.userEmail}>{userData?.email || 'N/A'}</Text>
                <Text style={styles.userPhone}>Balance: ₹{walletBalance.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
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
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.accent} />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
        >
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="logout" size={24} color="#FF6B6B" />
            <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
          </ScrollView>
        </>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userCard: {
    backgroundColor: COLORS.darkGray,
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 3,
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkGray,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.white,
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 20,
    borderBottomColor: '#FF6B6B',
  },
});

export default AccountScreen;
