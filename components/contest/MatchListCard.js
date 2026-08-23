import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { getMatchStructure, formatScheduleLine, getPlayerFormatLabel } from '../../utils/tournamentHelpers';
import { StatTriple } from './ContestShared';

const DEFAULT_BANNER = require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

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
  const playerFormatLabel =
    item.playerFormatLabel || structure.playerFormatLabel || getPlayerFormatLabel(item);
  const mapName = String(item.mapName || item.map || '—');
  const entryPerPlayer = Number(
    item.entryFeePerPlayer ?? item.feePerPlayer ?? item.entryFee ?? 0
  );
  const prizePool = Number(item.prizePool ?? 0);
  const showPrizePool = item.showPrizePool != null ? Boolean(item.showPrizePool) : prizePool > 0;
  const prizePerKill = Number(item.prizePerKill ?? item.perKill ?? 0);
  const showPerKill =
    item.showPrizePerKill != null
      ? Boolean(item.showPrizePerKill)
      : Boolean(structure.hasKillRewards) && prizePerKill > 0;

  const bannerUri = item.bannerImage
    ? resolveMediaUrl(item.bannerImage)
    : item.gameMode?.image
      ? resolveMediaUrl(item.gameMode.image)
      : gameModeImage;
  const bannerSource = bannerUri ? { uri: bannerUri } : DEFAULT_BANNER;

  const ctaLabel = isJoined
    ? 'JOINED'
    : !isJoinOpen
      ? lifecycleStatus === 'ongoing' || lifecycleStatus === 'live'
        ? 'ONGOING'
        : lifecycleStatus === 'completed' || lifecycleStatus === 'result_published'
          ? 'COMPLETED'
          : String(lifecycleStatus || 'CLOSED').toUpperCase()
      : full
        ? 'Joining Full'
        : 'Join Match';

  const ctaDisabled = isJoined || !isJoinOpen || full;

  const topStats = [
    showPrizePool ? { label: 'PRIZE POOL', value: prizePool, coin: true } : null,
    showPerKill ? { label: 'PRIZE PER KILL', value: prizePerKill, coin: true } : null,
    { label: 'MATCH TYPE', value: matchTypeName },
  ].filter(Boolean);

  while (topStats.length < 3) {
    if (!topStats.find((s) => s.label === 'ENTRY FEE / PLAYER')) {
      topStats.push({ label: 'ENTRY FEE / PLAYER', value: entryPerPlayer, coin: true });
    } else if (!topStats.find((s) => s.label === 'MAP')) {
      topStats.push({ label: 'MAP', value: mapName });
    } else if (!topStats.find((s) => s.label === 'PLAYER FORMAT')) {
      topStats.push({ label: 'PLAYER FORMAT', value: playerFormatLabel });
    } else break;
  }

  const usedLabels = new Set(topStats.map((s) => s.label));
  const bottomStats = [
    !usedLabels.has('ENTRY FEE / PLAYER')
      ? { label: 'ENTRY FEE / PLAYER', value: entryPerPlayer, coin: true }
      : null,
    !usedLabels.has('MAP') ? { label: 'MAP', value: mapName } : null,
    !usedLabels.has('PLAYER FORMAT')
      ? { label: 'PLAYER FORMAT', value: playerFormatLabel }
      : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => onPress(item)}>
      <ImageBackground source={bannerSource} style={styles.banner} resizeMode="cover">
        <LinearGradient
          colors={['rgba(11,14,30,0.05)', 'rgba(11,14,30,0.72)']}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {String(item.name || 'Tournament').toUpperCase()} - ID#{matchNo}
        </Text>
        <Text style={styles.timeLine}>
          DATE & TIME : {String(scheduleLine || '').toUpperCase()}
        </Text>

        <StatTriple items={topStats} />
        {bottomStats.length ? <StatTriple items={bottomStats} /> : null}

        <View style={styles.ctaRow}>
          <Text style={styles.matchType} numberOfLines={1}>
            {String(matchTypeName || '').toUpperCase()} · {String(playerFormatLabel || '').toUpperCase()}
          </Text>
          <TouchableOpacity
            style={[
              styles.joinBtn,
              ctaDisabled && styles.joinBtnMuted,
              isJoined && styles.joinBtnJoined,
              full && isJoinOpen && styles.joinBtnFull,
            ]}
            activeOpacity={0.88}
            disabled={ctaDisabled && !isJoinOpen}
            onPress={() => onPress(item)}
          >
            <Text style={styles.joinBtnText}>{String(ctaLabel).toUpperCase()}</Text>
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
    height: 168,
    justifyContent: 'flex-end',
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
  matchType: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: PAGE.gold,
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 8,
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
  joinBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
});
