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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppIcon from '../components/ui/AppIcon';
import ConfettiBurst from '../components/ConfettiBurst';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';
import { tournamentService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { formatScheduleLine } from '../utils/tournamentHelpers';
import TournamentBanner from '../components/contest/TournamentBanner';

const CYAN = '#00E5FF';
const GOLD = '#FBBF24';
const SILVER = '#C0C0C0';
const BRONZE = '#CD7F32';
const MEDAL = { 1: GOLD, 2: SILVER, 3: BRONZE };

function sameId(a, b) {
  return a != null && b != null && String(a) === String(b);
}

function getMatchNumber(tournament) {
  if (tournament?.matchNumber) return tournament.matchNumber;
  const id = String(tournament?._id || '');
  return 10000 + (parseInt(id.slice(-6), 16) % 80000 || 0);
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

function MatchSummary({ tournament, entryFee, prizePool, perKill, showPerKill }) {
  const matchNo = getMatchNumber(tournament);
  const organizedLine = tournament?.startDate ? formatScheduleLine(tournament.startDate) : null;

  return (
    <View style={styles.summaryWrap}>
      <TournamentBanner
        bannerImage={tournament?.bannerImage || tournament?.gameMode?.image || tournament?.game?.image}
        maxHeight={220}
        horizontalPadding={32}
        style={styles.banner}
      />

      <Text style={styles.matchTitle}>
        {String(tournament?.name || 'Tournament').toUpperCase()} - ID#{matchNo}
      </Text>

      {organizedLine ? (
        <View style={styles.pillCenterRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Organized on {organizedLine}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.pillRow}>
        <View style={[styles.pill, styles.pillFlex]}>
          <Text style={styles.pillLabel}>Prize Pool</Text>
          <Text style={styles.pillValue}>₹{Number(prizePool || 0).toLocaleString('en-IN')}</Text>
        </View>
        {showPerKill ? (
          <View style={[styles.pill, styles.pillFlex]}>
            <Text style={styles.pillLabel}>Per Kill</Text>
            <Text style={styles.pillValue}>₹{Number(perKill || 0).toLocaleString('en-IN')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.pillCenterRow}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Entry Fee</Text>
          <Text style={styles.pillValue}>₹{Number(entryFee || 0).toLocaleString('en-IN')}</Text>
        </View>
      </View>
    </View>
  );
}

function ResultNoteBox({ note }) {
  if (!note) return null;
  return (
    <View style={styles.noteSection}>
      <Text style={styles.sectionTitleGold}>Result Note</Text>
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>{note}</Text>
      </View>
    </View>
  );
}

function ResultTable({ rows, viewerId }) {
  return (
    <View style={styles.tableSection}>
      <Text style={styles.sectionTitleGold}>Result</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeadRow}>
          <Text style={[styles.tableHeadText, styles.colRank]}>#</Text>
          <Text style={[styles.tableHeadText, styles.colName]}>Player Name</Text>
          <Text style={[styles.tableHeadText, styles.colKills]}>Kills</Text>
          <Text style={[styles.tableHeadText, styles.colPrize]}>Prize</Text>
        </View>
        {rows.map((player, idx) => {
          const isYou = sameId(player.userId, viewerId);
          return (
            <View
              key={`${player.userId || player.gamingID}-${idx}`}
              style={[
                styles.tableRow,
                idx % 2 === 1 && styles.tableRowAlt,
                isYou && styles.tableRowYou,
              ]}
            >
              <Text style={[styles.tableCellRank, styles.colRank, { color: MEDAL[player.rank] || COLORS.white }]}>
                {player.rank || idx + 1}
              </Text>
              <View style={styles.colName}>
                <Text style={styles.tableCellName} numberOfLines={1}>
                  {player.gamingID || player.username || 'Player'}
                  {isYou ? '  ·  YOU' : ''}
                </Text>
              </View>
              <Text style={[styles.tableCellText, styles.colKills]}>{player.kills ?? 0}</Text>
              <Text style={[styles.tableCellPrize, styles.colPrize]}>
                ₹{Number(player.totalReward ?? player.prize ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          );
        })}
        {!rows.length ? <Text style={styles.emptyRowsText}>No results entered yet.</Text> : null}
      </View>
    </View>
  );
}

function TeamResultTable({ teams, viewerId, winnerPrize }) {
  const rows = teams.flatMap((team) =>
    (team.members || []).map((m) => ({ ...m, teamName: team.name, isWinner: Boolean(team.isWinner) }))
  );

  return (
    <View style={styles.tableSection}>
      <Text style={styles.sectionTitleGold}>Result</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeadRow}>
          <Text style={[styles.tableHeadText, styles.colName]}>Player Name</Text>
          <Text style={[styles.tableHeadText, styles.colTeam]}>Team</Text>
          <Text style={[styles.tableHeadText, styles.colResult]}>Result</Text>
          <Text style={[styles.tableHeadText, styles.colPrize]}>Prize</Text>
        </View>
        {rows.map((player, idx) => {
          const isYou = sameId(player.userId, viewerId);
          return (
            <View
              key={`${player.userId || player.gamingUsername}-${idx}`}
              style={[
                styles.tableRow,
                idx % 2 === 1 && styles.tableRowAlt,
                isYou && styles.tableRowYou,
              ]}
            >
              <View style={styles.colName}>
                <Text style={styles.tableCellName} numberOfLines={1}>
                  {player.gamingUsername || player.username || 'Player'}
                  {isYou ? '  ·  YOU' : ''}
                </Text>
              </View>
              <Text style={[styles.tableCellText, styles.colTeam]} numberOfLines={1}>
                {player.teamName || '—'}
              </Text>
              <Text
                style={[
                  styles.tableCellResult,
                  styles.colResult,
                  { color: player.isWinner ? GOLD : COLORS.gray },
                ]}
              >
                {player.isWinner ? 'WINNER' : 'LOSER'}
              </Text>
              <Text style={[styles.tableCellPrize, styles.colPrize]}>
                ₹{Number(player.isWinner ? winnerPrize || 0 : 0).toLocaleString('en-IN')}
              </Text>
            </View>
          );
        })}
        {!rows.length ? <Text style={styles.emptyRowsText}>No results entered yet.</Text> : null}
      </View>
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
        <ResultHeader title="Match Result" onBack={() => navigation.goBack()} />
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
    const teams = customMatch.teams || [];
    const winnerTeamId = customMatch.winnerTeam?._id || customMatch.winnerTeam;
    const runnerTeamId = customMatch.runnerUpTeam?._id || customMatch.runnerUpTeam;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ResultHeader title="Match Result" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <MatchSummary
            tournament={tournament}
            entryFee={tournament?.entryFee}
            prizePool={tournament?.prizePool ?? customMatch.winnerPrize}
            showPerKill={false}
          />

          <ResultNoteBox note={tournament?.resultNote} />

          {teams.length ? (
            <TeamResultTable teams={teams} viewerId={viewerId} winnerPrize={customMatch.winnerPrize} />
          ) : (
            <>
              <Text style={styles.sectionTitleGold}>Result</Text>
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
        </ScrollView>
        {mine.participated ? <ConfettiBurst active={celebrate} mood={mood} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ResultHeader title="Match Result" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <MatchSummary
          tournament={tournament}
          entryFee={tournament?.entryFee}
          prizePool={tournament?.prizePool}
          perKill={tournament?.perKill}
          showPerKill={Boolean(isBattleRoyale)}
        />

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

        <ResultNoteBox note={tournament?.resultNote} />

        <ResultTable rows={leaderboard} viewerId={viewerId} />
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

  summaryWrap: { marginBottom: 18 },
  banner: {
    marginBottom: 14,
  },
  matchTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: GOLD,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  pillCenterRow: { alignItems: 'center', marginBottom: 10 },
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pillFlex: { flex: 1 },
  pill: {
    backgroundColor: PAGE.cardAlt,
    borderWidth: 1,
    borderColor: PAGE.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pillText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  pillLabel: { fontFamily: FONTS.semiBold, fontSize: 10, color: PAGE.muted, letterSpacing: 0.5, marginBottom: 3 },
  pillValue: { fontFamily: FONTS.bold, fontSize: 15, color: GOLD },

  noteSection: { marginBottom: 18 },
  sectionTitleGold: {
    fontFamily: FONTS.bold,
    color: GOLD,
    marginBottom: 10,
    fontSize: 15,
    textAlign: 'center',
  },
  noteBox: {
    backgroundColor: PAGE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    padding: 16,
  },
  noteText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  tableSection: { marginBottom: 18 },
  tableCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1B3D',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableHeadText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAGE.cardAlt,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableRowAlt: { backgroundColor: PAGE.card },
  tableRowYou: { backgroundColor: 'rgba(0,229,255,0.1)' },
  colRank: { width: 30 },
  colName: { flex: 1.6 },
  colKills: { width: 52, textAlign: 'center' },
  colTeam: { flex: 1, textAlign: 'left' },
  colResult: { width: 66, textAlign: 'center' },
  colPrize: { width: 72, textAlign: 'right' },
  tableCellRank: { fontFamily: FONTS.bold, fontSize: 13 },
  tableCellName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13 },
  tableCellText: { color: COLORS.gray, fontSize: 13, fontFamily: FONTS.medium },
  tableCellResult: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  tableCellPrize: { color: CYAN, fontFamily: FONTS.bold, fontSize: 13 },
  emptyRowsText: {
    color: COLORS.gray,
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: PAGE.cardAlt,
  },

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
});
