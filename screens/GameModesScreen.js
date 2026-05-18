import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { gameService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 12;
const GRID_GAP = 10;
const NUM_COLUMNS = 3;
const CARD_WIDTH =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.22;

const mapMode = (mode, index) => {
  const id = mode._id || mode.id || String(index);
  const imageUri =
    mode.image && typeof mode.image === 'string' ? resolveMediaUrl(mode.image) : null;

  return {
    id,
    name: (mode.name || 'GAME MODE').toUpperCase(),
    description: mode.description,
    tournamentCount: mode.tournamentCount ?? mode.liveCount ?? mode.activeTournaments ?? 0,
    image: imageUri ? { uri: imageUri } : null,
  };
};

function GameModeCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, !item.image && styles.cardPlaceholder]}
      activeOpacity={0.88}
      onPress={() => onPress(item)}
    >
      {item.image ? (
        <ImageBackground source={item.image} style={styles.cardImage} resizeMode="cover">
          <View style={styles.countBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>{item.tournamentCount}</Text>
          </View>
          <View style={styles.titleBar}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.cardImage}>
          <View style={styles.countBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>{item.tournamentCount}</Text>
          </View>
          <View style={styles.titleBar}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function GameModesScreen({ navigation, route }) {
  const gameId = route?.params?.gameId;
  const [gameModes, setGameModes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGameModes = useCallback(async () => {
    if (!gameId) {
      setGameModes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const modesData = await gameService.getGameModes(gameId).catch(() => []);
      const list = Array.isArray(modesData) ? modesData : [];
      setGameModes(list.map(mapMode));
    } catch (error) {
      console.error('Failed to load game modes:', error);
      setGameModes([]);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadGameModes();
  }, [loadGameModes]);

  const handleModePress = (mode) => {
    navigation.navigate('GameDetails', { gameMode: mode, gameId });
  };

  const columnWrapperStyle = useMemo(
    () => ({ gap: GRID_GAP, marginBottom: GRID_GAP }),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game List</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game List</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.headerLine} />

      {gameModes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="game-controller-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No game modes yet</Text>
          <Text style={styles.emptySub}>
            Ask admin to add modes for this game in Game Management.
          </Text>
        </View>
      ) : (
        <FlatList
          data={gameModes}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={columnWrapperStyle}
          renderItem={({ item }) => <GameModeCard item={item} onPress={handleModePress} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TEXT.h3,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  headerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: GRID_PADDING,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    ...TEXT.body,
    color: COLORS.gray,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    marginTop: 16,
  },
  emptySub: {
    ...TEXT.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
  },
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 14,
    paddingBottom: 28,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#12162B',
  },
  cardPlaceholder: {
    backgroundColor: '#1a2238',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  countBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  liveCount: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    lineHeight: 14,
    color: COLORS.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
