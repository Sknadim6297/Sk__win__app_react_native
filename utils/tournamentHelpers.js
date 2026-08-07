export function parseRules(rules) {
  if (!rules) return [];
  if (Array.isArray(rules)) {
    return rules.flatMap((r) => String(r).split('\n')).map((r) => r.trim()).filter(Boolean);
  }
  return String(rules).split('\n').map((r) => r.trim()).filter(Boolean);
}

export function getTeamSize(mode) {
  const m = (mode || 'solo').toLowerCase();
  if (m === 'duo') return 2;
  if (m === 'squad') return 4;
  return 1;
}

/** Duo/Squad — captain pays once per team (Custom Match + Battle Royale). */
export function isTeamEntryMode(mode) {
  return getTeamSize(mode) > 1;
}

export function getPayingUnitCount(mode, maxParticipants = 50) {
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
  const isCustom =
    tournament?.category === 'custom' ||
    tournament?.category === 'custom_match' ||
    tournament?.tournamentType === 'custom_match' ||
    tournament?.isCustomMatch;

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

export function formatModeLabel(mode) {
  const m = (mode || 'solo').toLowerCase();
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export function isBattleRoyaleMatch(tournamentOrMode) {
  if (!tournamentOrMode) return false;
  if (tournamentOrMode.category === 'battle_royale') return true;
  if (
    tournamentOrMode.category === 'custom' ||
    tournamentOrMode.category === 'custom_match' ||
    tournamentOrMode.tournamentType === 'custom_match'
  ) {
    return false;
  }
  const name =
    tournamentOrMode.gameMode?.name ||
    tournamentOrMode.name ||
    tournamentOrMode.gameType ||
    '';
  return String(name).toLowerCase().includes('battle royale');
}

export function isCustomMatch(tournament) {
  const c = tournament?.category || tournament?.tournamentType;
  return c === 'custom' || c === 'custom_match' || !!tournament?.isCustomMatch;
}

const STATUS_LABELS = {
  draft: 'Draft',
  incoming: 'Upcoming',
  upcoming: 'Upcoming',
  locked: 'Upcoming',
  ongoing: 'Live',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function getDisplayStatus(status) {
  return STATUS_LABELS[status] || 'Upcoming';
}

export function getCountdownParts(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, expired: false };
}

export function formatCountdown(targetDate) {
  const { hours, minutes, seconds, expired } = getCountdownParts(targetDate);
  if (expired) return '00h : 00m : 00s';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
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
