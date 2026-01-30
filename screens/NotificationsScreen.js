import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../styles/theme';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'tournament',
      title: 'Tournament Started',
      message: 'Pro Gaming Tournament has started. Join now!',
      time: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'wallet',
      title: 'Wallet Credited',
      message: 'Prize money of ₹500 has been added to your wallet',
      time: '5 hours ago',
      read: false,
    },
    {
      id: 3,
      type: 'result',
      title: 'Match Result',
      message: 'You won the PUBG Tournament! Check your prizes.',
      time: '1 day ago',
      read: true,
    },
    {
      id: 4,
      type: 'announcement',
      title: 'New Tournament',
      message: 'New tournament has been added. Check details now.',
      time: '2 days ago',
      read: true,
    },
  ]);

  useFocusEffect(
    useCallback(() => {
      // Load notifications
    }, [])
  );

  const getIcon = (type) => {
    switch (type) {
      case 'tournament':
        return 'trophy';
      case 'wallet':
        return 'wallet';
      case 'result':
        return 'check-circle';
      case 'announcement':
        return 'bell';
      default:
        return 'information-circle';
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity style={[styles.notificationCard, !item.read && styles.unread]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={getIcon(item.type)} size={24} color={COLORS.accent} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  unread: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  iconContainer: {
    marginRight: 15,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  message: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 8,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: COLORS.gray,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginLeft: 10,
  },
});

export default NotificationsScreen;
