import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import { getMatchStructure, formatScheduleLine, getPlayerFormatLabel, resolveModeLabel } from '../../utils/tournamentHelpers';
import { StatTriple } from './ContestShared';
import TournamentBanner from './TournamentBanner';

function getMatchNumber(item) {
  if (item.matchNumber) return item.matchNumber;
  const id = String(item._id || item.id || '');
  return 10000 + (parseInt(id.slice(-6), 16) % 80000);
}

function resolveMatchTypeLabel(item, structure) {
  if (item?.matchTypeName && String(item.matchTypeName) !== 'undefined') {
    return String(item.matchTypeName);
  }
  const mt = item?.matchType;
  if (mt && typeof mt === 'object' && mt.name) return String(mt.name);
  if (typeof mt === 'string' && mt && mt !== 'undefined' && !/^[a-f0-9]{24}$/i.test(mt)) {
    return mt;
  }
  const fallback = structure?.matchTypeName || structure?.matchType;
  if (fallback && String(fallback) !== 'undefined') return String(fallback);
  return '—';
}

export default function MatchListCard({ item, gameModeImage, onPress }) {
  const structure = getMatchStructure(item);
  const current = item.participantCount ?? item.currentParticipants ?? 0;
  const max = item.totalSlots || structure.totalSlots;
  const spotsLeft = Math.max(max - current, 0);
  const full = spotsLeft <= 0;
  const matchNo = getMatchNumber(item);
  const lifecycleStatus = item.lifecycleStatus || item.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const isJoined = Boolean(item.userJoined);
  const scheduleLine = formatScheduleLine(item.startDate);

  const matchTypeName = resolveMatchTypeLabel(item, structure);
  const gameModeLabel = resolveModeLabel(item);
  const playerFormatLabel =
    item.playerFormatLabel || structure.playerFormatLabel || getPlayerFormatLabel(item);
  const mapName = String(item.mapName || item.map || '—');
  const entryPerPlayer = Number(
    item.entryFeePerPlayer ?? item.feePerPlayer ?? item.entryFee ?? 0
  );
  const prizePool = Number(item.prizePool ?? 0);
  const showPrizePool = item.showPrizePool != null ? Boolean(item.showPrizePool) : prizePool > 0;
  const prizePerKill = Number(item.prizePerKill ?? item.perKill ?? 0);

  const bannerImage =
    item.bannerImage || item.gameMode?.image || gameModeImage || null;

  const isCompleted = lifecycleStatus === 'completed' || lifecycleStatus === 'result_published';
  const resultsPublished =
    item.resultsPublished != null
      ? Boolean(item.resultsPublished)
      : lifecycleStatus === 'result_published';

  let ctaLabel = 'JOIN MATCH';
  if (isCompleted) {
    ctaLabel = resultsPublished ? 'VIEW RESULT' : 'RESULT PENDING';
  } else if (lifecycleStatus === 'ongoing' || lifecycleStatus === 'live') {
    ctaLabel = 'ONGOING';
  } else if (isJoined) {
    ctaLabel = 'JOINED';
  } else if (!isJoinOpen) {
    ctaLabel = String(lifecycleStatus || 'CLOSED').toUpperCase();
  } else if (full) {
    ctaLabel = 'JOINING FULL';
  }

  const showViewResult = isCompleted && resultsPublished;
  const ctaDisabled = isCompleted
    ? !resultsPublished
    : isJoined || !isJoinOpen || full;

  const coinStats = [
    showPrizePool ? { label: 'PRIZE POOL', value: prizePool, coin: true } : null,
    { label: 'ENTRY FEE', value: entryPerPlayer, coin: true },
    { label: 'PER KILL', value: prizePerKill, coin: true },
  ].filter(Boolean);

  const infoStats = [
    { label: 'MODE', value: matchTypeName },
    { label: 'MAP', value: mapName },
    { label: 'ENTRY PER PLAYER', value: entryPerPlayer, coin: true },
  ];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => onPress(item)}>
      <TournamentBanner
        bannerImage={bannerImage}
        maxHeight={220}
        horizontalPadding={56}
        style={styles.banner}
      />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {String(item.name || 'Tournament').toUpperCase()} - ID#{matchNo}
        </Text>
        <Text style={styles.timeLine}>
          DATE & TIME : {String(scheduleLine || '').toUpperCase()}
        </Text>

        <StatTriple items={coinStats} />
        <StatTriple items={infoStats} />

        <View style={styles.ctaRow}>
          <View style={styles.modeBlock}>
            <Text style={styles.modeName} numberOfLines={1}>
              {String(gameModeLabel || matchTypeName || '').toUpperCase()}
            </Text>
            <Text style={styles.modeFormat} numberOfLines={1}>
              {String(playerFormatLabel || '').toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.joinBtn,
              ctaDisabled && styles.joinBtnMuted,
              isJoined && !isCompleted && styles.joinBtnJoined,
              full && isJoinOpen && styles.joinBtnFull,
              showViewResult && styles.joinBtnResult,
            ]}
            activeOpacity={0.88}
            disabled={ctaDisabled}
            onPress={() => onPress(item)}
          >
            <Text
              style={[
                styles.joinBtnText,
                showViewResult && styles.joinBtnTextDark,
              ]}
            >
              {String(ctaLabel).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PAGE.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PAGE.border,
    marginBottom: 14,
  },
  banner: {
    marginBottom: 0,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
    lineHeight: 20,
  },
  timeLine: {
    marginTop: 4,
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.muted,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modeBlock: {
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  modeName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFC53D',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(255, 180, 40, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  modeFormat: {
    marginTop: 2,
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#5CFFF7',
    letterSpacing: 0.5,
  },
  joinBtn: {
    backgroundColor: PAGE.green,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 128,
    alignItems: 'center',
  },
  joinBtnMuted: {
    backgroundColor: '#2B3348',
  },
  joinBtnJoined: {
    backgroundColor: PAGE.purple,
  },
  joinBtnFull: {
    backgroundColor: '#2563EB',
  },
  joinBtnResult: {
    backgroundColor: PAGE.gold,
  },
  joinBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  joinBtnTextDark: {
    color: '#1A1200',
  },
});
