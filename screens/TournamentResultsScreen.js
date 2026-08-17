import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppIcon from '../components/ui/AppIcon';
import ConfettiBurst from '../components/ConfettiBurst';
import { COLORS, FONTS } from '../styles/theme';
import { tournamentService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const CYAN = '#00E5FF';
const GOLD = '#FBBF24';
const SILVER = '#C0C0C0';
const BRONZE = '#CD7F32';
const MEDAL = { 1: GOLD, 2: SILVER, 3: BRONZE };

function sameId(a, b) {
  return a != null && b != null && String(a) === String(b);
}

function resolveMyResult(data, user) {
  if (data?.myResult?.participated) return data.myResult;
  const uid = user?._id || user?.id;
  if (!uid || !data) return { participated: false, outcome: null };

  const teams = data.customMatch?.teams || [];
  for (const team of teams) {
    const member = (team.members || []).find((m) => sameId(m.userId, uid));
    if (member) {
      const isWin = Boolean(team.isWinner);
      return {
        participated: true,
        outcome: isWin ? 'win' : 'loss',
        teamId: team._id,
        teamName: team.name,
        teamSide: team.side,
        playerName: member.gamingUsername || member.username || user.username,
        gamingUID: member.gamingUID,
        role: member.role,
        prize: isWin ? data.customMatch?.winnerPrize || 0 : 0,
      };
    }
  }

  const mine = (data.leaderboard || []).find((p) => sameId(p.userId, uid));
  if (mine) {
    return {
      participated: true,
      outcome: mine.rank === 1 ? 'win' : 'loss',
      playerName: mine.gamingID || mine.username || user.username,
      gamingUID: mine.gamingUID,
      rank: mine.rank,
      prize: mine.totalReward || 0,
    };
  }
  return { participated: false, outcome: null };
}

function ResultHeader({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.headerIconBtn}>
        <AppIcon name="arrow-left" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function PersonalHero({ mine }) {
  const won = mine?.outcome === 'win';
  const scale = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  if (!mine?.participated) return null;

  return (
    <Animated.View style={[styles.heroWrap, { transform: [{ scale }] }]}>
      <LinearGradient
        colors={won ? ['#3A2E0A', '#1A1408', '#0F0C08'] : ['#152033', '#10141F', '#0B0F18']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, won ? styles.heroWinBorder : styles.heroLossBorder]}
      >
        <LinearGradient
          colors={won ? ['#FBBF24', '#F59E0B', '#D97706'] : ['#64748B', '#475569']}
          style={styles.heroRibbon}
        >
          <MaterialCommunityIcons
            name={won ? 'crown' : 'emoticon-sad-outline'}
            size={16}
            color={won ? '#1A1200' : '#F8FAFC'}
          />
          <Text style={[styles.heroRibbonText, !won && { color: '#F8FAFC' }]}>
            {won ? 'YOU WON' : 'YOU LOST'}
          </Text>
        </LinearGradient>
        <View style={[styles.heroTrophy, !won && styles.heroTrophyLoss]}>
          <MaterialCommunityIcons
            name={won ? 'trophy' : 'emoticon-cry-outline'}
            size={42}
            color={won ? GOLD : '#93C5FD'}
          />
        </View>
        <Text style={[styles.heroKicker, !won && { color: '#93C5FD' }]}>
          {won ? 'Congratulations!' : 'Better luck next time'}
        </Text>
        <Text style={styles.heroName}>{mine.playerName || 'You'}</Text>
        {mine.teamName ? (
          <Text style={styles.heroSub}>Your team · {mine.teamName}</Text>
        ) : mine.rank ? (
          <Text style={styles.heroSub}>Your rank · #{mine.rank}</Text>
        ) : null}
        {mine.gamingUID ? <Text style={styles.heroSub}>UID {mine.gamingUID}</Text> : null}
        <View style={[styles.prizePill, !won && styles.prizePillLoss]}>
          <Text style={styles.prizeLabel}>{won ? 'Prize won' : 'Prize'}</Text>
          <Text style={[styles.prizeValue, !won && { color: '#94A3B8' }]}>
            ₹{Number(mine.prize || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function TeamCard({ team, viewerId, prize }) {
  const won = Boolean(team?.isWinner);
  const members = team?.members || [];
  return (
    <View style={[styles.teamCard, won ? styles.teamCardWin : styles.teamCardLoss]}>
      <View style={styles.teamHead}>
        <View style={[styles.teamBadge, won ? styles.teamBadgeWin : styles.teamBadgeLoss]}>
          <Text style={[styles.teamBadgeText, !won && { color: '#FECACA' }]}>
            {won ? 'WINNER' : 'LOSER'}
          </Text>
        </View>
        {won ? (
          <Text style={styles.teamPrize}>₹{Number(prize || 0).toLocaleString('en-IN')}</Text>
        ) : (
          <Text style={styles.teamPrizeMuted}>₹0</Text>
        )}
      </View>
      <Text style={styles.teamName}>{team?.name || 'Team'}</Text>
      {members.length ? (
        members.map((m) => {
          const isYou = sameId(m.userId, viewerId);
          return (
            <View key={String(m.userId || m.gamingUsername)} style={[styles.memberRow, isYou && styles.memberYou]}>
              <Text style={styles.memberName}>
                {m.gamingUsername || m.username || 'Player'}
                {isYou ? '  ·  YOU' : ''}
              </Text>
              <Text style={styles.memberMeta}>
                {m.role === 'captain' ? 'Captain' : 'Player'}
                {m.gamingUID ? ` · ${m.gamingUID}` : ''}
              </Text>
            </View>
          );
        })
      ) : (
        <Text style={styles.memberMeta}>No players listed</Text>
      )}
    </View>
  );
}

function ResultRow({ icon, iconColor, iconBg, label, name, amount, tone = 'default', yours }) {
  return (
    <View
      style={[
        styles.infoCard,
        tone === 'loss' && styles.infoCardLoss,
        tone === 'mvp' && styles.infoCardMvp,
        yours && styles.infoCardYours,
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>
          {label}
          {yours ? '  ·  YOUR TEAM' : ''}
        </Text>
        <Text style={styles.infoName}>{name}</Text>
      </View>
      {amount != null ? (
        <Text style={[styles.infoAmount, tone === 'loss' && styles.infoAmountMuted]}>
          ₹{Number(amount || 0).toLocaleString('en-IN')}
        </Text>
      ) : null}
    </View>
  );
}

export default function TournamentResultsScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await tournamentService.getResults(tournamentId);
      setData(res);
    } catch (e) {
      if (/not published|result pending/i.test(e.message || '')) {
        setData({
          resultPending: true,
          message: 'Result Pending',
          tournament: { name: 'Results' },
        });
      } else {
        setError(e.message || 'Results not available');
      }
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const mine = resolveMyResult(data, user);
  const mood = mine.outcome === 'loss' ? 'sad' : 'win';

  useEffect(() => {
    if (!data || data.resultPending || !mine.participated) {
      setCelebrate(false);
      return undefined;
    }
    setCelebrate(true);
    const timer = setTimeout(() => setCelebrate(false), 4200);
    return () => clearTimeout(timer);
  }, [data, mine.participated, mine.outcome]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
        <Text style={styles.loadingText}>Loading results…</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.errorText}>{error || 'No results'}</Text>
      </SafeAreaView>
    );
  }

  if (data.resultPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ResultHeader title={data.tournament?.name || 'Results'} onBack={() => navigation.goBack()} />
        <View style={styles.pendingWrap}>
          <MaterialCommunityIcons name="timer-sand" size={40} color="#F59E0B" />
          <Text style={styles.pendingTitle}>Result Not Published Yet</Text>
          <Text style={styles.pendingSub}>
            The match is completed. Results will appear here once the admin publishes them.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { winner, leaderboard = [], isBattleRoyale, tournament, customMatch, tournamentType } = data;
  const viewerId = user?._id || user?.id;

  if (tournamentType === 'custom_match' && customMatch) {
    const winnerName = customMatch.winnerTeam?.name || 'Winner';
    const runnerName = customMatch.runnerUpTeam?.name || 'Runner-up';
    const mvpName =
      customMatch.mvp?.gamingUsername || customMatch.mvp?.username || 'MVP';
    const teams = customMatch.teams || [];
    const winnerTeamId = customMatch.winnerTeam?._id || customMatch.winnerTeam;
    const runnerTeamId = customMatch.runnerUpTeam?._id || customMatch.runnerUpTeam;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ResultHeader title={tournament?.name || 'Results'} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.matchResultLabel, mine.outcome === 'loss' && { color: '#93C5FD' }]}>
            {mine.participated
              ? mine.outcome === 'win'
                ? 'YOUR RESULT · VICTORY'
                : 'YOUR RESULT · DEFEAT'
              : 'MATCH RESULT'}
          </Text>
          <PersonalHero mine={mine} />
          <Text style={styles.sectionTitle}>Teams</Text>
          {teams.length
            ? teams.map((team) => (
                <TeamCard
                  key={String(team._id)}
                  team={team}
                  viewerId={viewerId}
                  prize={team.isWinner ? customMatch.winnerPrize : 0}
                />
              ))
            : (
              <>
                <ResultRow
                  icon="trophy"
                  iconColor={GOLD}
                  iconBg="rgba(251,191,36,0.16)"
                  label="Winner"
                  name={winnerName}
                  amount={customMatch.winnerPrize}
                  yours={sameId(winnerTeamId, mine.teamId)}
                />
                <ResultRow
                  icon="sword-cross"
                  iconColor="#FCA5A5"
                  iconBg="rgba(239,68,68,0.16)"
                  label="Loser"
                  name={runnerName}
                  amount={0}
                  tone="loss"
                  yours={sameId(runnerTeamId, mine.teamId)}
                />
              </>
            )}
          <ResultRow
            icon="star"
            iconColor={CYAN}
            iconBg="rgba(0,229,255,0.14)"
            label="Player of the Match"
            name={mvpName}
            tone="mvp"
            yours={sameId(customMatch.mvp?.userId, viewerId)}
          />
        </ScrollView>
        {mine.participated ? <ConfettiBurst active={celebrate} mood={mood} /> : null}
      </SafeAreaView>
    );
  }

  const top3 = leaderboard.filter((e) => e.rank >= 1 && e.rank <= 3);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ResultHeader title={tournament?.name || 'Results'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {mine.participated ? <PersonalHero mine={mine} /> : null}
        {!mine.participated && winner ? (
          <PersonalHero
            mine={{
              participated: true,
              outcome: 'win',
              playerName: winner.gamingID || winner.username || 'Champion',
              prize: winner.totalReward,
              rank: 1,
              gamingUID: winner.gamingUID,
            }}
          />
        ) : null}

        {top3.length > 0 && (
          <View style={styles.top3Row}>
            {top3.map((player) => (
              <View
                key={player.userId}
                style={[
                  styles.podiumCard,
                  player.rank === 1 && styles.podiumFirst,
                  sameId(player.userId, viewerId) && styles.podiumYou,
                  { borderColor: MEDAL[player.rank] || CYAN },
                ]}
              >
                <Text style={[styles.podiumRank, { color: MEDAL[player.rank] }]}>#{player.rank}</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {player.gamingID || player.username}
                  {sameId(player.userId, viewerId) ? ' · YOU' : ''}
                </Text>
                <Text style={styles.podiumReward}>₹{player.totalReward}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {leaderboard.map((player, idx) => (
          <View
            key={`${player.userId}-${idx}`}
            style={[styles.row, sameId(player.userId, viewerId) && styles.rowYou]}
          >
            <View style={[styles.rankBadge, player.isWinner && styles.rankBadgeWinner]}>
              <Text style={styles.rankText}>{player.rank || '—'}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>
                {player.gamingID || player.username}
                {sameId(player.userId, viewerId) ? '  ·  YOU' : ''}
              </Text>
              <Text style={styles.rowSub}>UID: {player.gamingUID || '—'}</Text>
              {isBattleRoyale && (
                <Text style={styles.rowSub}>Kills: {player.kills ?? 0}</Text>
              )}
            </View>
            <View style={styles.rowRight}>
              {player.isWinner ? (
                <Text style={styles.statusWin}>Winner</Text>
              ) : (
                <Text style={styles.statusLose}>Lose</Text>
              )}
              <Text style={styles.rowReward}>₹{player.totalReward ?? 0}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      {mine.participated ? <ConfettiBurst active={celebrate} mood={mood} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },
  loadingText: { color: COLORS.gray, textAlign: 'center', marginTop: 12 },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  backBtn: { padding: 16 },
  matchResultLabel: {
    color: GOLD,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 14,
  },
  pendingWrap: {
    marginTop: 80,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    alignItems: 'center',
    gap: 8,
  },
  pendingTitle: { color: '#F59E0B', fontFamily: FONTS.bold, fontSize: 20, marginBottom: 4 },
  pendingSub: { color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
  heroWrap: { marginBottom: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  heroWinBorder: { borderColor: 'rgba(251,191,36,0.55)' },
  heroLossBorder: { borderColor: 'rgba(96,165,250,0.4)' },
  heroRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  heroRibbonText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#1A1200',
    letterSpacing: 1.2,
  },
  heroTrophy: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251,191,36,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  heroTrophyLoss: {
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderColor: 'rgba(96,165,250,0.35)',
  },
  heroKicker: {
    color: 'rgba(251,191,36,0.85)',
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  heroName: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.white,
    textAlign: 'center',
  },
  heroSub: { color: COLORS.gray, marginTop: 6, fontSize: 13, textAlign: 'center' },
  prizePill: {
    marginTop: 16,
    minWidth: 160,
    alignItems: 'center',
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  prizePillLoss: {
    backgroundColor: 'rgba(148,163,184,0.1)',
    borderColor: 'rgba(148,163,184,0.28)',
  },
  prizeLabel: { color: COLORS.gray, fontSize: 11, letterSpacing: 0.8, fontFamily: FONTS.bold },
  prizeValue: { color: CYAN, fontFamily: FONTS.bold, fontSize: 28, marginTop: 2 },
  teamCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: '#121A28',
  },
  teamCardWin: { borderColor: 'rgba(251,191,36,0.45)' },
  teamCardLoss: { borderColor: 'rgba(239,68,68,0.28)', backgroundColor: '#161018' },
  teamHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  teamBadgeWin: { backgroundColor: GOLD },
  teamBadgeLoss: { backgroundColor: 'rgba(239,68,68,0.2)' },
  teamBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: '#1A1200', letterSpacing: 0.6 },
  teamPrize: { color: CYAN, fontFamily: FONTS.bold, fontSize: 16 },
  teamPrizeMuted: { color: '#94A3B8', fontFamily: FONTS.bold, fontSize: 16 },
  teamName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 20, marginTop: 10, marginBottom: 8 },
  memberRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  memberYou: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderTopColor: 'transparent',
  },
  memberName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 14 },
  memberMeta: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A28',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  infoCardLoss: {
    borderColor: 'rgba(239,68,68,0.22)',
    backgroundColor: '#161018',
  },
  infoCardMvp: {
    borderColor: 'rgba(0,229,255,0.28)',
    backgroundColor: '#101820',
  },
  infoCardYours: {
    borderColor: 'rgba(0,229,255,0.45)',
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1 },
  infoLabel: { color: COLORS.gray, fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 0.3 },
  infoName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16, marginTop: 2 },
  infoAmount: { color: CYAN, fontFamily: FONTS.bold, fontSize: 18 },
  infoAmountMuted: { color: '#94A3B8' },
  top3Row: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  podiumCard: {
    flex: 1,
    backgroundColor: '#121A21',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  podiumFirst: { transform: [{ scale: 1.03 }] },
  podiumYou: { backgroundColor: 'rgba(0,229,255,0.08)' },
  podiumRank: { fontFamily: FONTS.bold, fontSize: 18 },
  podiumName: { color: COLORS.white, fontSize: 12, marginTop: 6 },
  podiumReward: { color: CYAN, fontFamily: FONTS.bold, marginTop: 6, fontSize: 13 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.white, marginBottom: 12, fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A21',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowYou: {
    borderColor: 'rgba(0,229,255,0.45)',
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e2633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeWinner: { backgroundColor: 'rgba(251,191,36,0.2)' },
  rankText: { fontFamily: FONTS.bold, color: COLORS.white },
  rowBody: { flex: 1 },
  rowName: { color: COLORS.white, fontFamily: FONTS.bold },
  rowSub: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  statusWin: { color: GOLD, fontFamily: FONTS.bold, fontSize: 11 },
  statusLose: { color: COLORS.gray, fontSize: 11 },
  rowReward: { color: CYAN, fontFamily: FONTS.bold, marginTop: 4 },
});
