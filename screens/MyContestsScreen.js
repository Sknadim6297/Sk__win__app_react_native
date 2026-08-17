import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService } from '../services/api';
import Toast from '../components/Toast';
import { LIST_PERF } from '../utils/listPerf';
import ScreenHeader from '../components/navigation/ScreenHeader';
import MatchListCard from '../components/contest/MatchListCard';

const STATUS_TABS = [
  { id: 'upcoming', label: 'UPCOMING', match: ['upcoming', 'incoming'] },
  { id: 'live', label: 'LIVE', match: ['ongoing', 'live'] },
  { id: 'completed', label: 'COMPLETED', match: ['completed', 'result_published'] },
];

function getEffective(t) {
  const s = t.lifecycleStatus || t.status || '';
  if (s === 'result_published') return 'completed';
  return s;
}

export default function MyContestsScreen({ navigation, route }) {
  const initialTab = route?.params?.initialTab === 'result_published'
    ? 'completed'
    : route?.params?.initialTab || 'upcoming';
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const load = useCallback(async () => {
    try {
      const data = await tournamentService.getMyTournaments();
      setContests(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load contests');
      setContests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      const tab = route?.params?.initialTab;
      if (!tab) return;
      setSelectedTab(tab === 'result_published' ? 'completed' : tab);
    }, [route?.params?.initialTab])
  );

  const filtered = contests.filter((t) => {
    const tab = STATUS_TABS.find((x) => x.id === selectedTab);
    const s = getEffective(t);
    return tab ? tab.match.includes(s) : true;
  });

  const openContest = (tournament) => {
    const s = getEffective(tournament);
    if (s === 'completed') {
      navigation.navigate('TournamentResults', { tournamentId: tournament._id });
      return;
    }
    navigation.navigate('TournamentDetails', { tournamentId: tournament._id });
  };

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ScreenHeader title="MY CONTESTS" onBack={() => navigation.goBack()} />

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
          <Text style={pageStyles.loadingText}>Loading your contests...</Text>
        </View>
      ) : (
        <FlatList
          {...LIST_PERF}
          data={filtered}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={PAGE.cyan}
            />
          }
          ListEmptyComponent={
            <View style={pageStyles.emptyWrap}>
              <AppIcon name="trophy-outline" size={48} muted />
              <Text style={pageStyles.emptyTitle}>No contests here</Text>
              <Text style={pageStyles.emptyText}>Join a tournament to see it in My Contests</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MatchListCard item={{ ...item, userJoined: true }} onPress={openContest} />
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
