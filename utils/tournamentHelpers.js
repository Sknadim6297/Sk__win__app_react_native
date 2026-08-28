export function parseRules(rules) {
  if (!rules) return [];
  if (Array.isArray(rules)) {
    return rules.flatMap((r) => String(r).split('\n')).map((r) => r.trim()).filter(Boolean);
  }
  return String(rules).split('\n').map((r) => r.trim()).filter(Boolean);
}

export const DEFAULT_MATCH_RULES = [
  'Minimum level 40+ required to join.',
  'Room ID and password shared 8–10 minutes before match.',
  'No hacks, emulators, or teaming — instant disqualification.',
  'Wrong gaming ID / UID = no refund.',
  'Review prize pool distribution before joining.',
];

export function resolveMatchRules(tournament) {
  const fromRules = parseRules(tournament?.rules);
  if (fromRules.length) return fromRules;
  return DEFAULT_MATCH_RULES;
}

export function getTeamSize(mode) {
  const m = (mode || 'solo').toLowerCase();
  if (m === 'duo') return 2;
  if (m === 'squad' || m === 'team') return 4;
  return 1;
}

export function formatModeLabel(mode) {
  const m = (mode || 'solo').toLowerCase();
  if (m === 'team') return 'Team';
  if (m === 'duo') return 'Duo';
  if (m === 'squad') return 'Squad';
  if (m === 'solo') return 'Solo';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** Player Format label: Solo / Duo / Squad — never shown as a field named "Format". */
export function getPlayerFormatLabel(modeOrTournament) {
  if (modeOrTournament && typeof modeOrTournament === 'object') {
    if (modeOrTournament.playerFormatLabel) return modeOrTournament.playerFormatLabel;
    return formatModeLabel(modeOrTournament.playerFormat || modeOrTournament.mode || 'solo');
  }
  return formatModeLabel(modeOrTournament);
}

export const CLASH_SQUAD_LABEL = 'Clash Squad';

/** Show Clash Squad instead of the old "Custom Match" wording. */
export function toPlayerMatchLabel(text) {
  if (text == null || text === '') return text;
  return String(text).replace(/Custom Match/gi, CLASH_SQUAD_LABEL);
}

/** Player-facing mode label (Esports game mode, e.g. LW 1V1/2V2). */
export function resolveModeLabel(tournamentOrItem) {
  const gameMode =
    tournamentOrItem?.gameMode?.name ||
    (typeof tournamentOrItem?.gameMode === 'string' ? tournamentOrItem.gameMode : null) ||
    tournamentOrItem?.gameModeName ||
    '';
  if (gameMode) return toPlayerMatchLabel(String(gameMode));

  const fallback =
    tournamentOrItem?.matchTypeName ||
    (tournamentOrItem?.matchType &&
    typeof tournamentOrItem.matchType === 'object' &&
    tournamentOrItem.matchType.name
      ? tournamentOrItem.matchType.name
      : null) ||
    (typeof tournamentOrItem?.matchType === 'string' &&
    tournamentOrItem.matchType &&
    !/^[a-f0-9]{24}$/i.test(tournamentOrItem.matchType)
      ? tournamentOrItem.matchType
      : null);
  return fallback ? toPlayerMatchLabel(String(fallback)) : '—';
}

export function resolveEntryFeePerPlayer(tournamentOrItem) {
  return Number(
    tournamentOrItem?.entryFeePerPlayer ??
      tournamentOrItem?.feePerPlayer ??
      tournamentOrItem?.entryFee ??
      0
  );
}

export function shouldShowPrizePerKill(tournamentOrItem, structure) {
  const prizePerKill = Number(
    tournamentOrItem?.prizePerKill ?? tournamentOrItem?.perKill ?? 0
  );
  if (prizePerKill <= 0) return false;
  if (tournamentOrItem?.showPrizePerKill != null) {
    return Boolean(tournamentOrItem.showPrizePerKill);
  }
  const custom = isCustomMatch(tournamentOrItem);
  return !custom && Boolean(structure?.hasKillRewards);
}

export function isCustomMatch(tournament) {
  const c = tournament?.category || tournament?.tournamentType;
  if (c === 'custom' || c === 'custom_match' || !!tournament?.isCustomMatch) return true;
  const mt = tournament?.matchType;
  if (mt && typeof mt === 'object' && mt.isTeamVsTeam) return true;
  return false;
}

export function resolveMatchTypeName(tournament) {
  return (
    (tournament?.matchType && typeof tournament.matchType === 'object' && tournament.matchType.name) ||
    tournament?.matchTypeName ||
    (typeof tournament?.matchType === 'string' &&
    tournament.matchType &&
    !/^[a-f0-9]{24}$/i.test(tournament.matchType)
      ? tournament.matchType
      : '') ||
    ''
  );
}

/** Lone Wolf uses Team A/B joining — not the 48-slot Battle Royale grid. */
export function isLoneWolfMatch(tournament) {
  if (!tournament) return false;
  if (tournament.matchKind === 'lone_wolf') return true;
  return /lone\s*wolf|^lw\b/i.test(String(resolveMatchTypeName(tournament)));
}

export function isBattleRoyaleMatch(tournamentOrMode) {
  if (!tournamentOrMode) return false;
  if (isCustomMatch(tournamentOrMode)) return false;
  if (tournamentOrMode.category === 'battle_royale') return true;
  const name =
    tournamentOrMode.gameMode?.name ||
    tournamentOrMode.name ||
    tournamentOrMode.gameType ||
    '';
  return String(name).toLowerCase().includes('battle royale');
}

/** Captain registers team: Custom Match (any size) or Battle Royale Duo/Squad. */
export function isTeamEntryMode(modeOrTournament, tournament) {
  if (tournament || (modeOrTournament && typeof modeOrTournament === 'object' && (modeOrTournament.mode || modeOrTournament.playerFormat))) {
    const t = tournament || modeOrTournament;
    return getMatchStructure(t).usesTeamRegistration;
  }
  return getTeamSize(modeOrTournament) > 1;
}

export function getMatchStructure(tournament) {
  const playerFormat = String(tournament?.playerFormat || tournament?.mode || 'solo').toLowerCase();
  const formatPpt = getTeamSize(playerFormat);
  // Prefer Player Format over a stale playersPerTeam / playersCharged value
  const apiPpt = Number(tournament?.playersPerTeam);
  const playersPerTeam =
    apiPpt > 0 && apiPpt === formatPpt
      ? apiPpt
      : formatPpt;

  // Prefer backend-resolved public fields when present (and consistent)
  if (tournament?.totalSlots != null && tournament?.matchTypeName) {
    const custom = isCustomMatch(tournament) || tournament.matchKind === 'team_vs_team';
    const loneWolf = isLoneWolfMatch(tournament);
    const teamJoin = custom || loneWolf;
    const slots = teamJoin
      ? Number(tournament.slots ?? tournament.totalSlots) || 2
      : Number(tournament.totalSlots) || 48;
    const playerFormatLabel =
      tournament.playerFormatLabel || formatModeLabel(playerFormat);
    const matchTypeName = String(
      tournament.matchTypeName || tournament.matchType || (custom ? 'Clash Squad' : loneWolf ? 'Lone Wolf' : 'Battle Royale')
    );
    return {
      kind: custom ? 'team_vs_team' : loneWolf ? 'lone_wolf' : 'battle_royale',
      matchType: matchTypeName,
      matchTypeName,
      playerFormat,
      playerFormatLabel,
      formatLabel: teamJoin
        ? playersPerTeam === 4
          ? '4v4'
          : playersPerTeam === 2
            ? '2v2'
            : '1v1'
        : matchTypeName,
      mode: playerFormat,
      modeLabel: playerFormatLabel,
      playersPerTeam,
      slotsRequiredToJoin: playersPerTeam,
      slots,
      totalSlots: slots,
      totalPlayerCapacity: teamJoin ? slots * playersPerTeam : 48,
      slotUnit: teamJoin ? 'teams' : 'slots',
      entryUnit: 'player',
      hasKillRewards:
        tournament.hasKillRewards != null ? Boolean(tournament.hasKillRewards) : !custom,
      usesTeamRegistration: teamJoin,
      usesSlotGrid: !teamJoin,
      usesTeamSides: teamJoin,
    };
  }

  const fallbackFormat = String(tournament?.playerFormat || tournament?.mode || 'solo').toLowerCase();
  const fallbackPpt = getTeamSize(fallbackFormat);
  const custom = isCustomMatch(tournament);
  const loneWolf = isLoneWolfMatch(tournament);
  const playerFormatLabel = formatModeLabel(fallbackFormat);
  const mt = resolveMatchTypeName(tournament) || null;

  if (custom || loneWolf) {
    return {
      kind: custom ? 'team_vs_team' : 'lone_wolf',
      matchType: mt || (custom ? 'Clash Squad' : 'Lone Wolf'),
      matchTypeName: mt || (custom ? 'Clash Squad' : 'Lone Wolf'),
      playerFormat: fallbackFormat,
      playerFormatLabel,
      formatLabel: fallbackPpt === 4 ? '4v4' : fallbackPpt === 2 ? '2v2' : '1v1',
      mode: fallbackFormat,
      modeLabel: playerFormatLabel,
      playersPerTeam: fallbackPpt,
      slotsRequiredToJoin: fallbackPpt,
      slots: 2,
      totalSlots: 2,
      totalPlayerCapacity: 2 * fallbackPpt,
      slotUnit: 'teams',
      entryUnit: 'player',
      hasKillRewards: loneWolf,
      usesTeamRegistration: true,
      usesSlotGrid: false,
      usesTeamSides: true,
    };
  }

  return {
    kind: 'battle_royale',
    matchType: mt || 'Battle Royale',
    matchTypeName: mt || 'Battle Royale',
    playerFormat: fallbackFormat,
    playerFormatLabel,
    formatLabel: mt || 'Battle Royale',
    mode: fallbackFormat,
    modeLabel: playerFormatLabel,
    playersPerTeam: fallbackPpt,
    slotsRequiredToJoin: fallbackPpt,
    slots: 48,
    totalSlots: 48,
    totalPlayerCapacity: 48,
    slotUnit: 'slots',
    entryUnit: 'player',
    hasKillRewards: true,
    usesTeamRegistration: false,
    usesSlotGrid: true,
    usesTeamSides: false,
  };
}

/**
 * entryFee on tournament = per player.
 * Duo/Squad: captain pays fee × playersPerTeam (also when picking 2/4 slots).
 */
export function resolveEntryCharge(tournament) {
  const feePerPlayer = Math.max(
    0,
    Number(tournament?.entryFeePerPlayer ?? tournament?.feePerPlayer ?? tournament?.entryFee) || 0
  );
  const backendTotal = Number(
    tournament?.totalAmount ?? tournament?.entryCharge?.totalAmount ?? NaN
  );
  if (Number.isFinite(backendTotal) && backendTotal >= 0) {
    const playersCharged =
      Number(tournament?.playersCharged ?? tournament?.entryCharge?.playersCharged) ||
      (feePerPlayer > 0 ? Math.max(1, Math.round(backendTotal / feePerPlayer)) : 1);
    return {
      feePerPlayer,
      playersCharged,
      totalAmount: backendTotal,
      entryUnit: 'player',
      chargedPer: playersCharged > 1 ? 'team_total' : 'player',
      usesTeamRegistration: false,
    };
  }
  const structure = getMatchStructure(tournament);
  const playersCharged = Math.max(1, Number(structure.playersPerTeam) || 1);
  const totalAmount = feePerPlayer * playersCharged;
  return {
    feePerPlayer,
    playersCharged,
    totalAmount,
    entryUnit: 'player',
    chargedPer: playersCharged > 1 ? 'team_total' : 'player',
    usesTeamRegistration: structure.usesTeamRegistration,
  };
}

export function getPayingUnitCount(mode, maxParticipants = 50, tournament) {
  if (tournament) {
    return getMatchStructure(tournament).totalSlots;
  }
  const max = Number(maxParticipants) || 50;
  const teamSize = getTeamSize(mode);
  if (teamSize === 1) return max;
  return Math.floor(max / teamSize);
}

/** Split prize pool into 1st / 2nd / 3rd (50% / 30% / 20%) — Battle Royale only. */
export function getPrizeBreakdown(prizePool) {
  const pool = Number(prizePool) || 0;
  if (pool <= 0) {
    return { pool: 0, first: 0, second: 0, third: 0 };
  }
  return {
    pool,
    first: Math.floor(pool * 0.5),
    second: Math.floor(pool * 0.3),
    third: Math.floor(pool * 0.2),
  };
}

/** Custom Match: entire prize pool goes to the single winning team. */
export function getCustomWinnerPrize(prizePool) {
  return Math.max(0, Number(prizePool) || 0);
}

/** Build `prizes` object for create/update based on tournament type. */
export function buildPrizesForCategory(category, prizePool) {
  const pool = Number(prizePool) || 0;
  const isCustom = category === 'custom' || category === 'custom_match';
  if (isCustom) {
    return { first: getCustomWinnerPrize(pool), second: 0, third: 0 };
  }
  const breakdown = getPrizeBreakdown(pool);
  return { first: breakdown.first, second: breakdown.second, third: breakdown.third };
}

export function resolveDisplayPrizePool(tournament) {
  const configured = Number(tournament?.prizePool) || 0;
  const prizes = tournament?.prizes || {};
  const splitTotal =
    Number(prizes.first || 0) + Number(prizes.second || 0) + Number(prizes.third || 0);
  return configured > 0 ? configured : splitTotal;
}

/**
 * Prefer configured prize places; fall back to pool split when missing or misconfigured.
 * Custom Match → winnerPrize only (100% of pool); 2nd/3rd always 0.
 */
export function resolvePrizePlaces(tournament) {
  const pool = resolveDisplayPrizePool(tournament);
  const structure = getMatchStructure(tournament);
  const isCustom = structure.kind === 'team_vs_team';

  if (isCustom) {
    const winnerPrize =
      Number(tournament?.prizes?.first) > 0
        ? Number(tournament.prizes.first)
        : getCustomWinnerPrize(pool);
    return { pool: pool || winnerPrize, first: winnerPrize, second: 0, third: 0, winnerPrize };
  }

  const configured = tournament?.prizes || {};
  const fromConfig = {
    first: Number(configured.first || 0),
    second: Number(configured.second || 0),
    third: Number(configured.third || 0),
  };
  const configSum = fromConfig.first + fromConfig.second + fromConfig.third;
  const breakdown = getPrizeBreakdown(pool);
  const entry = Number(tournament?.entryFee) || 0;
  const looksLikeEntryFeeBug =
    pool > entry && entry > 0 && fromConfig.first === entry && configSum <= entry * 1.5;

  if (configSum > 0 && !looksLikeEntryFeeBug && (pool === 0 || configSum <= pool * 1.05)) {
    return { pool: pool || configSum, ...fromConfig };
  }

  return {
    pool,
    first: breakdown.first,
    second: breakdown.second,
    third: breakdown.third,
  };
}

export function getPaymentSplit(entryFee, bonusBalance = 0) {
  const fee = Number(entryFee) || 0;
  const bonus = Number(bonusBalance) || 0;
  const maxBonusAllowed = Math.floor(fee * 0.2);
  const usableBonus = Math.min(bonus, maxBonusAllowed);
  const realRequired = Math.max(fee - usableBonus, 0);
  const totalPayable = fee;
  return { fee, maxBonusAllowed, usableBonus, realRequired, totalPayable };
}

export function formatScheduleLine(dateString) {
  if (!dateString) return 'Schedule TBA';
  const date = new Date(dateString);
  const d = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const t = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${d} at ${t}`;
}

const STATUS_LABELS = {
  draft: 'Draft',
  incoming: 'Upcoming',
  upcoming: 'Upcoming',
  locked: 'Upcoming',
  ongoing: 'Ongoing',
  live: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function getDisplayStatus(status) {
  return STATUS_LABELS[status] || 'Upcoming';
}

export function getCountdownParts(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, expired: false };
}

export function formatTimeLeft(targetDate) {
  const { days, hours, minutes, expired } = getCountdownParts(targetDate);
  if (expired) return '0d 0h 0m';
  return `${days}d ${hours}h ${minutes}m`;
}

export function formatCountdown(targetDate) {
  const { days, hours, minutes, seconds, expired } = getCountdownParts(targetDate);
  if (expired) return '00h : 00m : 00s';
  const pad = (n) => String(n).padStart(2, '0');
  const h = days * 24 + hours;
  return `${pad(h)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

/** Client-side join block (mirrors backend messages). */
export function getJoinBlockReason(tournament) {
  if (!tournament) return null;
  if (tournament.joinBlockReason) return tournament.joinBlockReason;
  const status = tournament.lifecycleStatus || tournament.status;
  if (status === 'draft') {
    return 'Tournament is not published yet';
  }
  if (tournament.resultsPublished || status === 'completed' || status === 'cancelled') {
    return 'This tournament is not open for joining';
  }
  if (status === 'ongoing' || status === 'live') {
    return 'Match is already ongoing';
  }
  if (status === 'locked') {
    return 'Registration is closed';
  }
  if (status !== 'upcoming' && status !== 'incoming') {
    return 'Match is not open for joining';
  }
  const max = tournament.maxParticipants || 50;
  const joined = tournament.participantCount ?? tournament.currentParticipants ?? 0;
  if (joined >= max) {
    return 'All slots are full';
  }
  if (tournament.canJoin === false) {
    return 'Match is not open for joining';
  }
  return null;
}
