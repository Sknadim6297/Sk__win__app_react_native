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
  if (tournamentOrMode.category === 'custom') return false;
  const name =
    tournamentOrMode.gameMode?.name ||
    tournamentOrMode.name ||
    tournamentOrMode.gameType ||
    '';
  return String(name).toLowerCase().includes('battle royale');
}

export function isCustomMatch(tournament) {
  return tournament?.category === 'custom';
}

const STATUS_LABELS = {
  incoming: 'Upcoming',
  upcoming: 'Upcoming',
  locked: 'Upcoming',
  ongoing: 'Ongoing',
  live: 'Ongoing',
  completed: 'Completed',
  result_published: 'Result Published',
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
  const status = tournament.status;
  if (tournament.resultsPublished || status === 'result_published') {
    return 'Results have been published for this match';
  }
  if (status === 'ongoing' || status === 'live') {
    return 'Match is already ongoing';
  }
  if (status === 'completed' || status === 'cancelled') {
    return 'This tournament is not open for joining';
  }
  if (status === 'locked') {
    return 'Registration is closed';
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
