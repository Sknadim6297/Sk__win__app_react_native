import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { getMatchStructure } from '../../utils/tournamentHelpers';
import { StatTriple, useTimeLeft } from './ContestShared';

const DEFAULT_BANNER = require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');

function getMatchNumber(item) {
  if (item.matchNumber) return item.matchNumber;
  const id = String(item._id || item.id || '');
  return 10000 + (parseInt(id.slice(-6), 16) % 80000);
}

export default function MatchListCard({ item, gameModeImage, onPress }) {
  const structure = getMatchStructure(item);
  const current = item.participantCount ?? item.currentParticipants ?? 0;
  const max = item.totalSlots || structure.totalSlots;
  const spotsLeft = Math.max(max - current, 0);
  const progress = max > 0 ? Math.min(current / max, 1) : 0;
  const full = spotsLeft <= 0;
  const matchNo = getMatchNumber(item);
  const lifecycleStatus = item.lifecycleStatus || item.status;
  const isJoinOpen = lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
  const isJoined = Boolean(item.userJoined);
  const timeLeft = useTimeLeft(item.startDate);
  const modeName =
    structure.formatLabel === 'Battle Royale'
      ? structure.modeLabel.toUpperCase()
      : structure.formatLabel;
  const typeLabel = Number(item.entryFee) > 0 ? 'PAID' : 'FREE';

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
        ? 'LIVE'
        : lifecycleStatus === 'completed' || lifecycleStatus === 'result_published'
          ? 'COMPLETED'
          : String(lifecycleStatus || 'CLOSED').toUpperCase()
      : full
        ? 'Joining Full'
        : 'Join Match';

  const ctaDisabled = isJoined || !isJoinOpen || full;

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
          {item.name || 'Tournament'} #{matchNo}
        </Text>
        <Text style={styles.timeLine}>Time Left : {timeLeft}</Text>

        <StatTriple
          items={[
            { label: 'PRIZE POOL', value: item.prizePool ?? 0, coin: true },
            structure.hasKillRewards
              ? { label: 'PER KILL', value: item.perKill ?? 0, coin: true }
              : { label: 'FORMAT', value: structure.formatLabel },
            { label: 'ENTRY FEE', value: item.entryFee ?? 0, coin: true },
          ]}
        />

        <StatTriple
          items={[
            { label: 'TYPE', value: modeName },
            {
              label: 'ENTRY / PLAYER',
              value: item.entryFee ?? 0,
              coin: true,
            },
            { label: 'MAP', value: (item.map || 'BERMUDA').toUpperCase() },
          ]}
        />

        <View style={styles.spotRow}>
          <View style={styles.spotBlock}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  full && styles.progressFull,
                  { width: `${Math.max(progress * 100, 4)}%` },
                ]}
              />
            </View>
            <View style={styles.spotMeta}>
              <Text style={[styles.spotsLeft, full && styles.spotsFull]}>
                {full ? 'Only 0 Spot Left' : `Only ${spotsLeft} Spot${spotsLeft === 1 ? '' : 's'} Left`}
              </Text>
              <Text style={styles.spotCount}>
                {current}/{max}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Text style={styles.matchType}>{typeLabel}</Text>
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
            <Text style={styles.joinBtnText}>{ctaLabel}</Text>
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
  spotRow: { marginTop: 12 },
  spotBlock: { flex: 1 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PAGE.cyan,
    borderRadius: 3,
  },
  progressFull: {
    backgroundColor: '#EF4444',
  },
  spotMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  spotsLeft: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: PAGE.cyan,
  },
  spotsFull: {
    color: '#F87171',
  },
  spotCount: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
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
