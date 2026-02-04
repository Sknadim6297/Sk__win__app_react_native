import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { adminService } from '../../services/api';
import Toast from '../../components/Toast';

const UserManagement = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllUsers();
      setUsers(data);
    } catch (error) {
      showToast(error.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const handleUserAction = async (user, action) => {
    try {
      if (action === 'suspend') {
        await adminService.suspendUser(user._id);
        showToast(`${user.username} suspended successfully`, 'success');
      } else if (action === 'ban') {
        await adminService.banUser(user._id, 'Policy violation');
        showToast(`${user.username} banned successfully`, 'success');
      } else if (action === 'activate') {
        await adminService.activateUser(user._id);
        showToast(`${user.username} activated successfully`, 'success');
      } else if (action === 'verify') {
        await adminService.verifyUser(user._id);
        showToast(`${user.username} verified successfully`, 'success');
      }
      
      await fetchUsers();
    } catch (error) {
      showToast(error.message || `Failed to ${action} user`, 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'suspended': return '#FF9800';
      case 'banned': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'suspended': return 'pause-circle';
      case 'banned': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type}
        onHide={hideToast}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>USER MANAGEMENT</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.filter(u => u.status === 'active').length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.filter(u => u.status === 'suspended').length}</Text>
          <Text style={styles.summaryLabel}>Suspended</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.filter(u => u.status === 'banned').length}</Text>
          <Text style={styles.summaryLabel}>Banned</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user._id} style={styles.userCard}>
              {/* User Header with Avatar, Info, and Status */}
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: `${COLORS.primary}30` }]}>
                  <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{user.username}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>

                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(user.status) + '30', borderColor: getStatusColor(user.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(user.status)} 
                    size={16} 
                    color={getStatusColor(user.status)} 
                  />
                </View>
              </View>

              {/* User Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailBox}>
                  <MaterialCommunityIcons 
                    name="shield-check" 
                    size={16} 
                    color={user.verified ? COLORS.success : COLORS.gray} 
                  />
                  <Text style={styles.detailLabel}>Verified</Text>
                  <Text style={[styles.detailValue, { color: user.verified ? COLORS.success : COLORS.gray }]}>
                    {user.verified ? 'Yes' : 'No'}
                  </Text>
                </View>

                <View style={styles.detailBox}>
                  <MaterialCommunityIcons name="wallet" size={16} color={COLORS.accent} />
                  <Text style={styles.detailLabel}>Wallet</Text>
                  <Text style={styles.detailValue}>₹{user.wallet?.balance || 0}</Text>
                </View>

                <View style={styles.detailBox}>
                  <MaterialCommunityIcons name="tournament" size={16} color={COLORS.accent} />
                  <Text style={styles.detailLabel}>Tournaments</Text>
                  <Text style={styles.detailValue}>{user.tournament?.participatedCount || 0}</Text>
                </View>

                <View style={styles.detailBox}>
                  <MaterialCommunityIcons name="trophy" size={16} color={COLORS.accent} />
                  <Text style={styles.detailLabel}>Wins</Text>
                  <Text style={styles.detailValue}>{user.tournament?.wins || 0}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Ionicons name="calendar" size={16} color={COLORS.gray} />
                  <Text style={styles.detailLabel}>Joined</Text>
                  <Text style={styles.detailValue}>
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { 
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.viewBtn]}
                  onPress={() => navigation.navigate('UserDetails', { userId: user._id, username: user.username })}
                >
                  <Ionicons name="eye" size={14} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>View Details</Text>
                </TouchableOpacity>
                
                {user.status === 'active' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.suspendBtn]}
                      onPress={() => handleUserAction(user, 'suspend')}
                    >
                      <MaterialCommunityIcons name="pause-circle" size={14} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Suspend</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.banBtn]}
                      onPress={() => handleUserAction(user, 'ban')}
                    >
                      <Ionicons name="ban" size={14} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Ban</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(user.status === 'suspended' || user.status === 'banned') && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.activateBtn]}
                    onPress={() => handleUserAction(user, 'activate')}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Activate</Text>
                  </TouchableOpacity>
                )}

                {!user.verified && user.status === 'active' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.verifyBtn]}
                    onPress={() => handleUserAction(user, 'verify')}
                  >
                    <Ionicons name="checkmark-done" size={14} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Verify</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
        
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}40`,
    backgroundColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 15,
    marginVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
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
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 10,
  },
  userCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailBox: {
    width: '33.33%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  viewBtn: {
    backgroundColor: COLORS.accent,
    flex: 1,
    minWidth: '100%',
  },
  suspendBtn: {
    backgroundColor: '#FF9800',
    flex: 1,
  },
  banBtn: {
    backgroundColor: COLORS.error,
    flex: 1,
  },
  activateBtn: {
    backgroundColor: COLORS.success,
    flex: 1,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    flex: 1,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default UserManagement;
