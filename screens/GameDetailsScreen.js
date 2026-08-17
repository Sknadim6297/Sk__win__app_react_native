import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { LIST_PERF } from '../utils/listPerf';
import ScreenHeader from '../components/navigation/ScreenHeader';
import MatchListCard from '../components/contest/MatchListCard';

const STATUS_TABS = [
  { id: 'ongoing', label: 'LIVE' },
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'completed', label: 'COMPLETED' },
];

export default function GameDetailsScreen({ navigation, route }) {
  const gameMode = route?.params?.gameMode;
  const modeId = gameMode?.id || gameMode?._id;
  const headerTitle = (gameMode?.name || 'FULL MAP').toUpperCase();
  const gameModeImage =
    gameMode?.image?.uri ||
    (typeof gameMode?.image === 'string' ? resolveMediaUrl(gameMode.image) : null);

  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getList().catch(() => []);
      let filtered = Array.isArray(data) ? data : [];

      if (modeId) {
        filtered = filtered.filter(
          (t) => String(t.gameMode?._id || t.gameMode) === String(modeId)
        );
      } else if (gameMode?.name) {
        filtered = filtered.filter((t) => t.gameMode?.name === gameMode.name);
      }

      if (selectedTab === 'upcoming') {
        filtered = filtered.filter((t) => {
          const s = t.lifecycleStatus || t.status;
          return s === 'incoming' || s === 'upcoming';
        });
      } else if (selectedTab === 'ongoing') {
        filtered = filtered.filter((t) => {
          const s = t.lifecycleStatus || t.status;
          return s === 'ongoing' || s === 'live';
        });
      } else if (selectedTab === 'completed') {
        filtered = filtered.filter((t) => {
          const s = t.lifecycleStatus || t.status;
          return s === 'completed' || s === 'result_published';
        });
      }

      filtered = filtered.filter((t) => {
        const s = t.lifecycleStatus || t.status;
        return s !== 'draft';
      });

      setTournaments(filtered);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [modeId, gameMode?.name, selectedTab]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleJoin = (item) => {
    navigation.navigate('TournamentDetails', { tournamentId: item._id || item.id });
  };

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title={headerTitle} onBack={() => navigation.goBack()} />

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const active = selectedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setSelectedTab(tab.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.cyan} />
          <Text style={pageStyles.loadingText}>Loading matches...</Text>
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={tournaments}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <AppIcon name="trophy-outline" size={48} muted />
              <Text style={pageStyles.emptyTitle}>No matches here</Text>
              <Text style={pageStyles.emptyText}>Check other tabs or come back later</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MatchListCard item={item} gameModeImage={gameModeImage} onPress={handleJoin} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: PAGE.cardAlt,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: PAGE.purple,
  },
  tabLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.muted,
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
});
