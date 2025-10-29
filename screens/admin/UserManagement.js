import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

const UserManagement = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState([
    { id: 1, username: 'ProGamer123', email: 'progamer@example.com', status: 'active', tournaments: 45, wins: 23, joined: '2024-01-15' },
    { id: 2, username: 'FireMaster99', email: 'firemaster@example.com', status: 'active', tournaments: 32, wins: 18, joined: '2024-02-20' },
    { id: 3, username: 'SquadLeader', email: 'leader@example.com', status: 'inactive', tournaments: 28, wins: 12, joined: '2024-03-10' },
    { id: 4, username: 'SniperKing', email: 'sniper@example.com', status: 'active', tournaments: 67, wins: 34, joined: '2023-12-05' },
    { id: 5, username: 'BattleQueen', email: 'queen@example.com', status: 'banned', tournaments: 15, wins: 5, joined: '2024-04-01' },
  ]);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserAction = (user, action) => {
    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${action.toLowerCase()} ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => Alert.alert('Success', `User ${action.toLowerCase()}ed`) },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'inactive': return COLORS.gray;
      case 'banned': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>USER MANAGEMENT</Text>
        <View style={{ width: 24 }} />
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
          <Text style={styles.summaryLabel}>Total Users</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.filter(u => u.status === 'active').length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.filter(u => u.status === 'banned').length}</Text>
          <Text style={styles.summaryLabel}>Banned</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) }]}>
                <Text style={styles.statusText}>{user.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="tournament" size={18} color={COLORS.accent} />
                <Text style={styles.statText}>{user.tournaments} tournaments</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="trophy" size={18} color={COLORS.accent} />
                <Text style={styles.statText}>{user.wins} wins</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={18} color={COLORS.accent} />
                <Text style={styles.statText}>Joined {user.joined}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.viewBtn]}
                onPress={() => Alert.alert('View User', `Viewing details for ${user.username}`)}
              >
                <Ionicons name="eye" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>View</Text>
              </TouchableOpacity>

              {user.status === 'active' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.banBtn]}
                  onPress={() => handleUserAction(user, 'Ban')}
                >
                  <Ionicons name="ban" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Ban</Text>
                </TouchableOpacity>
              )}

              {user.status === 'banned' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.unbanBtn]}
                  onPress={() => handleUserAction(user, 'Unban')}
                >
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Unban</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleUserAction(user, 'Delete')}
              >
                <Ionicons name="trash" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
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
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
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
    paddingHorizontal: 20,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.gray,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userStats: {
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 3,
  },
  viewBtn: {
    backgroundColor: COLORS.primary,
  },
  banBtn: {
    backgroundColor: COLORS.error,
  },
  unbanBtn: {
    backgroundColor: COLORS.success,
  },
  deleteBtn: {
    backgroundColor: COLORS.darkGray,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default UserManagement;
