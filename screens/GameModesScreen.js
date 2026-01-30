import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../styles/theme';
import { gameService } from '../services/api';

const GameModesScreen = ({ navigation, route }) => {
  const gameId = route?.params?.gameId;
  const [gameModes, setGameModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);

  const defaultModes = [
    {
      id: 1,
      name: 'FF Full Match',
      description: 'Play the classic Free Fire battle royale mode with up to 50 players',
      icon: 'fire',
      players: '50 players',
      duration: '10-20 mins',
      color: '#FF6B6B',
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      joinText: 'Join Now',
      image: require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg'),
    },
    {
      id: 2,
      name: 'Only Headshot',
      description: 'Prove your aiming skills! Only headshots count, one hit K/O',
      icon: 'target',
      players: '32 players',
      duration: '5-8 mins',
      color: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      joinText: 'Join Now',
      image: require('../assets/images/87904deacf9b547a95f019e0a322152a.jpg'),
    },
    {
      id: 3,
      name: 'Clash Squad',
      description: 'Competitive squad-based mode with intense team battles',
      icon: 'sword',
      players: '4v4',
      duration: '8-12 mins',
      color: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      joinText: 'Join Now',
      image: require('../assets/images/87904deacf9b547a95f019e0a322152a77.jpg'),
    },
    {
      id: 4,
      name: 'Power Squad',
      description: 'Fast-paced squad battles with special power-ups and abilities',
      icon: 'lightning-bolt',
      players: '4v4',
      duration: '6-10 mins',
      color: '#00BCD4',
      backgroundColor: 'rgba(0, 188, 212, 0.1)',
      joinText: 'Join Now',
      image: require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg'),
    },
  ];

  useEffect(() => {
    if (gameId) {
      loadGameModes();
    } else {
      // If no gameId provided, use defaults
      setGameModes(defaultModes);
      setLoading(false);
    }
  }, [gameId]);

  const loadGameModes = async () => {
    try {
      setLoading(true);
      const [gameData, modesData] = await Promise.all([
        gameService.getGameDetails(gameId).catch(() => null),
        gameService.getGameModes(gameId).catch(() => []),
      ]);

      setGame(gameData);
      
      if (Array.isArray(modesData) && modesData.length > 0) {
        // Map API data to display format
        const modes = modesData.map((mode, index) => ({
          id: mode._id || index,
          name: mode.name,
          description: mode.description || 'Join this game mode to play',
          icon: 'gamepad-variant',
          players: '32+ players',
          duration: '5-20 mins',
          color: ['#FF6B6B', '#FFD700', '#4CAF50', '#00BCD4'][index % 4],
          backgroundColor: ['rgba(255, 107, 107, 0.1)', 'rgba(255, 215, 0, 0.1)', 'rgba(76, 175, 80, 0.1)', 'rgba(0, 188, 212, 0.1)'][index % 4],
          joinText: 'Join Now',
          image: mode.image || require('../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg'),
        }));
        setGameModes(modes);
      } else {
        setGameModes(defaultModes);
      }
    } catch (error) {
      console.error('Failed to load game modes:', error);
      setGameModes(defaultModes);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading game modes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{game?.name || 'Game'}</Text>
          <Text style={styles.headerSubtitle}>Choose Your Game Mode</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.accent} />
          <Text style={styles.infoText}>Select a game mode to join and start playing!</Text>
        </View>

        {/* Game Modes Grid */}
        <View style={styles.gameModeGrid}>
          {gameModes.map((mode) => (
            <TouchableOpacity 
              key={mode.id} 
              style={[styles.gameModeBox, { borderTopColor: mode.color }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GameDetails', { gameMode: mode })}
            >
              <View 
                style={[
                  styles.modeBoxIconContainer,
                  { backgroundColor: mode.backgroundColor }
                ]}
              >
                <Image
                  source={typeof mode.image === 'string' ? { uri: mode.image } : mode.image}
                  style={styles.modeBoxIcon}
                  resizeMode="cover"
                />
              </View>
              
              <Text style={styles.modeBoxName}>{mode.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ready to compete?</Text>
          <Text style={styles.footerSubtext}>Good luck and have fun!</Text>
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
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  infoText: {
    color: COLORS.white,
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },
  gameModeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gameModeBox: {
    width: '48%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    borderTopWidth: 4,
    alignItems: 'center',
  },
  modeBoxIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  modeBoxIcon: {
    width: '100%',
    height: '100%',
  },
  modeBoxName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  modeBoxDescription: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 14,
  },
  modeBoxDetails: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  boxDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 3,
  },
  boxDetailText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '600',
  },
  boxJoinButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  boxJoinButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  footerText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerSubtext: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },
});

export default GameModesScreen;
