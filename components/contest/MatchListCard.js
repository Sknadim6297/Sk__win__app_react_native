import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import { getMatchStructure, formatScheduleLine, getPlayerFormatLabel } from '../../utils/tournamentHelpers';
import { StatTriple, JoinProgressBar } from './ContestShared';
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
  const joined =
    item.joinedCount ?? item.participantCount ?? item.currentParticipants ?? 0;
  const capacity = item.capacity ?? item.totalSlots ?? structure.totalSlots;
  const spotsLeft = Math.max(capacity - joined, 0);
  const full = item.isFull != null ? Boolean(item.isFull) : spotsLeft <= 0;
  const matchNo = getMatchNumber(item);
  const lifecycleStatus = item.lifecycleStatus || item.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const isJoined = Boolean(item.userJoined);
  const scheduleLine = formatScheduleLine(item.startDate);

  const matchTypeName = resolveMatchTypeLabel(item, structure);
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

  // Title-case CTAs to match the reference "Joining Full" style
  let ctaLabel = 'Join Match';
  if (isCompleted) {
    ctaLabel = resultsPublished ? 'View Result' : 'Result Pending';
  } else if (lifecycleStatus === 'ongoing' || lifecycleStatus === 'live') {
    ctaLabel = 'Ongoing';
  } else if (isJoined) {
    ctaLabel = 'Joined';
  } else if (!isJoinOpen) {
    const raw = String(lifecycleStatus || 'Closed');
    ctaLabel = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  } else if (full) {
    ctaLabel = 'Joining Full';
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

        {playerFormatLabel ? (
          <Text style={styles.modeFormat} numberOfLines={1}>
            {String(playerFormatLabel || '').toUpperCase()}
          </Text>
        ) : null}

        {/* Screenshot layout: progress (bar + spots) | CTA button */}
        <View style={styles.ctaRow}>
          <JoinProgressBar
            joined={joined}
            capacity={capacity}
            unit={item.joinUnit}
            usesTeamRegistration={structure.usesTeamRegistration}
            playersPerTeam={structure.playersPerTeam}
            isFull={full}
            hide={isCompleted}
            compact
          />
          {isCompleted ? <View style={styles.progressSpacer} /> : null}
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
              {ctaLabel}
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
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  timeLine: {
    marginTop: 4,
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: PAGE.muted,
  },
  modeFormat: {
    marginTop: 8,
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#5CFFF7',
    letterSpacing: 0.5,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  progressSpacer: {
    flex: 1,
  },
  joinBtn: {
    backgroundColor: PAGE.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnMuted: {
    backgroundColor: '#2B3348',
  },
  joinBtnJoined: {
    backgroundColor: PAGE.purple,
  },
  joinBtnFull: {
    backgroundColor: '#5BA3E8',
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
