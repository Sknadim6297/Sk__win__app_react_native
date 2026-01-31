import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/theme';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Landing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.logoSmall}>
          <MaterialCommunityIcons name="trophy" size={28} color={COLORS.white} />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Ionicons name="game-controller" size={32} color={COLORS.accent} />
          <Text style={styles.welcomeText}>BATTLE ARENA</Text>
        </View>
        
        <View style={styles.playerBadge}>
          <Ionicons name="person-circle" size={24} color={COLORS.accent} />
          <Text style={styles.usernameText}>
            {user?.username ? `@${user.username}` : '@Player'}
          </Text>
          <View style={styles.statusIndicator}>
            <Ionicons name="ellipse" size={12} color={COLORS.success} />
            <Text style={styles.statusText}>ONLINE</Text>
          </View>
        </View>
        
        <View style={styles.comingSoonContainer}>
          <View style={styles.tournamentHeader}>
            <MaterialCommunityIcons name="trophy-award" size={28} color={COLORS.accent} />
            <Text style={styles.comingSoonTitle}>LIVE TOURNAMENTS</Text>
          </View>
          <View style={styles.statusBar}>
            <Ionicons name="radio-button-on" size={16} color={COLORS.primary} />
            <Text style={styles.comingSoonText}>Loading tournaments...</Text>
          </View>
          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="people" size={18} color={COLORS.accent} />
              <Text style={styles.descriptionText}>Free Fire Squad Battles</Text>
            </View>
            <View style={styles.featureRow}>
              <FontAwesome5 name="coins" size={16} color={COLORS.accent} />
              <Text style={styles.descriptionText}>Prize Pools up to ₹50,000</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="sword-cross" size={18} color={COLORS.accent} />
              <Text style={styles.descriptionText}>Compete with Top Players</Text>
            </View>
          </View>
        </View>

        <View style={styles.featureContainer}>
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="game-controller" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.featureTitle}>PLAY</Text>
            <Text style={styles.featureText}>Join matches</Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="trophy-variant" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.featureTitle}>COMPETE</Text>
            <Text style={styles.featureText}>Win battles</Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="coins" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.featureTitle}>EARN</Text>
            <Text style={styles.featureText}>Get rewards</Text>
          </View>
        </View>
      </View>
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
    borderBottomColor: COLORS.lightGray,
  },
  logoSmall: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  logoTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 12,
    letterSpacing: 3,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  usernameText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  comingSoonContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 10,
    letterSpacing: 2,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.darkGray,
    borderRadius: 20,
    alignSelf: 'center',
  },
  comingSoonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  featureList: {
    marginTop: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  featureCard: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
    letterSpacing: 1,
  },
  featureText: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
  },
});

export default HomeScreen;
