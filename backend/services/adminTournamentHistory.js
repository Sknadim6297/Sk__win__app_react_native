const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const WalletTransaction = require('../models/WalletTransaction');
const PaymentOrder = require('../models/PaymentOrder');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const BattleRoyaleTeamResult = require('../models/BattleRoyaleTeamResult');
const WinnerPayout = require('../models/WinnerPayout');
const lifecycle = require('./tournamentLifecycle');
const { getMatchStructure, collectedFromBooked } = require('./matchStructure');

function idKey(id) {
  return String(id);
}

function groupByTournament(docs) {
  const map = new Map();
  for (const doc of docs || []) {
    const key = idKey(doc.tournamentId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return map;
}

function groupBy(docs, field) {
  const map = new Map();
  for (const doc of docs || []) {
    const key = idKey(doc[field]);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return map;
}

function paidStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'PAID' || s === 'SUCCESS') return 'PAID';
  if (s === 'FAILED' || s === 'CANCELLED' || s === 'EXPIRED' || s === 'USER_DROPPED') return s;
  if (s === 'PENDING' || s === 'CREATED' || s === 'ACTIVE') return 'PENDING';
  return s || 'UNPAID';
}

function summarizePayments(orders = []) {
  const summary = { paid: 0, pending: 0, failed: 0, collected: 0 };
  for (const order of orders) {
    const status = paidStatus(order.status);
    if (status === 'PAID') {
      summary.paid += 1;
      summary.collected += Number(order.amount) || 0;
    } else if (status === 'PENDING') {
      summary.pending += 1;
    } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
      summary.failed += 1;
    }
  }
  return summary;
}

function paymentForUser(ordersByUser, userId, txnsByUser) {
  const list = ordersByUser.get(idKey(userId)) || [];
  const paid = list.find((o) => paidStatus(o.status) === 'PAID' && o.tournamentJoined);
  const anyPaid = list.find((o) => paidStatus(o.status) === 'PAID');
  const pending = list.find((o) => paidStatus(o.status) === 'PENDING');
  const chosen = paid || anyPaid || pending || list[0];
  if (chosen) {
    return {
      paymentStatus: paidStatus(chosen.status),
      orderId: chosen.orderId || null,
      transactionId: chosen.cashfreePaymentId || chosen.orderId || null,
      paidAmount: Number(chosen.amount) || 0,
      joinedAfterPayment: Boolean(chosen.tournamentJoined),
    };
  }
  const txn = (txnsByUser?.get(idKey(userId)) || [])[0];
  if (txn) {
    return {
      paymentStatus: 'PAID',
      orderId: null,
      transactionId: txn.transactionId || null,
      paidAmount: Number(txn.amount) || 0,
      joinedAfterPayment: true,
    };
  }
  return { paymentStatus: 'UNPAID', orderId: null, transactionId: null, paidAmount: 0 };
}

function assignMissingBrSlots(teams, totalSlots) {
  const used = new Set(
    (teams || [])
      .map((t) => Number(t.slotNumber))
      .filter((n) => n >= 1 && n <= totalSlots)
  );
  let next = 1;
  return (teams || []).map((team) => {
    if (Number(team.slotNumber) >= 1) return team;
    while (used.has(next) && next <= totalSlots) next += 1;
    const slotNumber = next <= totalSlots ? next : null;
    if (slotNumber) used.add(slotNumber);
    next += 1;
    return { ...team, slotNumber };
  });
}

async function loadLedger(tournamentIds) {
  const ids = tournamentIds;
  const [
    teams,
    members,
    participants,
    orders,
    entryTxns,
    soloResults,
    teamResults,
    payouts,
  ] = await Promise.all([
    Team.find({ tournamentId: { $in: ids }, status: 'registered' })
      .populate('captainUserId', 'username email')
      .lean(),
    TeamMember.find({ tournamentId: { $in: ids } })
      .populate('userId', 'username email')
      .lean(),
    TournamentParticipant.find({ tournamentId: { $in: ids } })
      .populate('userId', 'username email')
      .lean(),
    PaymentOrder.find({ tournamentId: { $in: ids }, purpose: 'tournament_entry' })
      .select('tournamentId userId orderId status amount tournamentJoined cashfreePaymentId createdAt')
      .lean(),
    WalletTransaction.find({
      tournamentId: { $in: ids },
      type: 'tournament_entry',
      status: 'completed',
    })
      .select('tournamentId userId amount transactionId paymentOrderId createdAt')
      .lean(),
    BattleRoyaleResult.find({ tournamentId: { $in: ids } }).lean(),
    BattleRoyaleTeamResult.find({ tournamentId: { $in: ids } }).lean(),
    WinnerPayout.find({ tournamentId: { $in: ids } })
      .select('tournamentId userId amount status resultId')
      .lean(),
  ]);

  return {
    teamsByT: groupByTournament(teams),
    membersByT: groupByTournament(members),
    participantsByT: groupByTournament(participants),
    ordersByT: groupByTournament(orders),
    entryTxnsByT: groupByTournament(entryTxns),
    soloResultsByT: groupByTournament(soloResults),
    teamResultsByT: groupByTournament(teamResults),
    payoutsByT: groupByTournament(payouts),
  };
}

function buildHistoryRow(tournament, ledger) {
  const key = idKey(tournament._id);
  const structure = getMatchStructure(tournament);
  const teams = ledger.teamsByT.get(key) || [];
  const participants = ledger.participantsByT.get(key) || [];
  const orders = ledger.ordersByT.get(key) || [];
  const entryTxns = ledger.entryTxnsByT.get(key) || [];
  const soloResults = ledger.soloResultsByT.get(key) || [];
  const teamResults = ledger.teamResultsByT.get(key) || [];

  const bookedSlots = structure.usesTeamRegistration ? teams.length : participants.length;
  const availableSlots = Math.max(0, structure.totalSlots - bookedSlots);
  const walletCollected = entryTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const paymentSummary = summarizePayments(orders);
  const collectedAmount =
    paymentSummary.collected > 0 ? paymentSummary.collected : walletCollected || collectedFromBooked(tournament.entryFee, bookedSlots);

  const perKill = structure.hasKillRewards ? Number(tournament.perKill) || 0 : 0;
  let totalKills = 0;
  let killRewardsDistributed = 0;
  if (structure.hasKillRewards) {
    if (structure.usesTeamRegistration) {
      totalKills = teamResults.reduce((sum, r) => sum + (Number(r.teamKills) || 0), 0);
      killRewardsDistributed = teamResults.reduce((sum, r) => sum + (Number(r.killReward) || 0), 0);
    } else {
      totalKills = soloResults.reduce((sum, r) => sum + (Number(r.kills) || 0), 0);
      killRewardsDistributed = totalKills * perKill;
    }
  }

  const joinTimes = [
    ...teams.map((t) => t.createdAt),
    ...participants.map((p) => p.joinedAt || p.createdAt),
  ].filter(Boolean);
  const lastJoinedAt = joinTimes.length
    ? new Date(Math.max(...joinTimes.map((d) => new Date(d).getTime())))
    : null;

  const status = lifecycle.getEffectiveStatus(tournament);

  return {
    _id: tournament._id,
    name: tournament.name,
    game: tournament.game,
    gameMode: tournament.gameMode,
    matchType: structure.matchType,
    matchKind: structure.kind,
    formatLabel: structure.formatLabel,
    mode: structure.mode,
    modeLabel: structure.modeLabel,
    playersPerTeam: structure.playersPerTeam,
    totalSlots: structure.totalSlots,
    bookedSlots,
    availableSlots,
    slotUnit: structure.slotUnit,
    entryUnit: structure.entryUnit,
    entryFee: Number(tournament.entryFee) || 0,
    collectedAmount,
    prizePool: Number(tournament.prizePool) || 0,
    perKill,
    hasKillRewards: structure.hasKillRewards,
    totalKills,
    killRewardsDistributed,
    status,
    lifecycleStatus: status,
    paymentStatus:
      paymentSummary.paid > 0
        ? `${paymentSummary.paid} paid`
        : bookedSlots > 0
          ? `${bookedSlots} wallet`
          : 'No entries',
    paymentSummary,
    startDate: tournament.startDate,
    lastJoinedAt,
    roomId: tournament.roomId,
    showRoomCredentials: tournament.showRoomCredentials,
    resultsPublished: lifecycle.areResultsPublished(tournament),
    usesTeamSides: structure.usesTeamSides,
    usesSlotGrid: structure.usesSlotGrid,
  };
}

function playerRow({
  slotNumber,
  side,
  teamName,
  teamId,
  displayName,
  gamingUsername,
  gamingUID,
  userId,
  username,
  email,
  role,
  entryFee,
  payment,
  joinStatus,
  joinedAt,
  kills,
  killReward,
  winnings,
  available,
}) {
  return {
    slotNumber: slotNumber || null,
    side: side || null,
    teamName: teamName || null,
    teamId: teamId || null,
    displayName: displayName || gamingUsername || username || teamName || '—',
    gamingUsername: gamingUsername || null,
    gamingUID: gamingUID || null,
    userId: userId || null,
    username: username || null,
    email: email || null,
    role: role || null,
    entryFee: Number(entryFee) || 0,
    paymentStatus: payment?.paymentStatus || (available ? 'AVAILABLE' : 'UNPAID'),
    orderId: payment?.orderId || null,
    transactionId: payment?.transactionId || null,
    joinStatus: available ? 'available' : joinStatus || 'joined',
    joinedAt: joinedAt || null,
    kills: kills == null ? null : Number(kills) || 0,
    killReward: killReward == null ? null : Number(killReward) || 0,
    finalWinnings: winnings == null ? null : Number(winnings) || 0,
    available: Boolean(available),
  };
}

function buildTeamVsTeamSlots({ tournament, teams, members, ordersByUser, txnsByUser, payoutsByUser, entryFee }) {
  const membersByTeam = groupBy(members, 'teamId');
  const sides = ['A', 'B'];
  const bySide = new Map(teams.filter((t) => t.side).map((t) => [String(t.side).toUpperCase(), t]));

  return sides.map((side) => {
    const team = bySide.get(side);
    if (!team) {
      return {
        slotNumber: side === 'A' ? 1 : 2,
        label: `Team ${side}`,
        side,
        available: true,
        teamName: null,
        teamId: null,
        paymentStatus: 'AVAILABLE',
        players: [],
      };
    }

    const captainId = team.captainUserId?._id || team.captainUserId;
    const payment = paymentForUser(ordersByUser, captainId, txnsByUser);
    const roster = Array.isArray(team.players) && team.players.length
      ? team.players
      : (membersByTeam.get(idKey(team._id)) || []).map((m) => ({
          name: m.gamingUsername,
          gamingUID: m.gamingUID,
          userId: m.userId,
          role: m.role,
        }));

    const players = roster.map((p, index) => {
      const isCaptain = index === 0;
      const member = (membersByTeam.get(idKey(team._id)) || [])[index];
      const user = isCaptain ? team.captainUserId : member?.userId;
      const uid = user?._id || user || p.userId?._id || p.userId;
      const win = (payoutsByUser.get(idKey(uid)) || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
      return playerRow({
        slotNumber: side === 'A' ? 1 : 2,
        side,
        teamName: team.name,
        teamId: team._id,
        displayName: p.name || p.gamingUsername,
        gamingUsername: p.name || p.gamingUsername,
        gamingUID: p.gamingUID,
        userId: uid,
        username: user?.username,
        email: user?.email,
        role: isCaptain ? 'captain' : 'member',
        entryFee: isCaptain ? entryFee : 0,
        payment: isCaptain ? payment : { paymentStatus: payment.paymentStatus === 'PAID' ? 'COVERED' : payment.paymentStatus },
        joinStatus: 'joined',
        joinedAt: team.createdAt,
        kills: null,
        killReward: null,
        winnings: isCaptain ? win : 0,
        available: false,
      });
    });

    return {
      slotNumber: side === 'A' ? 1 : 2,
      label: `Team ${side}`,
      side,
      available: false,
      teamName: team.name,
      teamId: team._id,
      paymentStatus: payment.paymentStatus,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      joinedAt: team.createdAt,
      players,
    };
  });
}

function buildBrSoloSlots({
  tournament,
  participants,
  ordersByUser,
  txnsByUser,
  payoutsByUser,
  soloByUser,
  entryFee,
  perKill,
  totalSlots,
}) {
  const bySlot = new Map(participants.map((p) => [Number(p.slotNumber), p]));
  const slots = [];
  for (let n = 1; n <= totalSlots; n += 1) {
    const p = bySlot.get(n);
    if (!p) {
      slots.push({
        slotNumber: n,
        label: `Slot ${n}`,
        available: true,
        teamName: null,
        players: [],
        paymentStatus: 'AVAILABLE',
      });
      continue;
    }
    const user = p.userId;
    const uid = user?._id || user;
    const payment = paymentForUser(ordersByUser, uid, txnsByUser);
    const result = soloByUser.get(idKey(uid));
    const kills = result ? Number(result.kills) || 0 : null;
    const killReward = kills == null ? null : kills * perKill;
    const winnings = (payoutsByUser.get(idKey(uid)) || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const row = playerRow({
      slotNumber: n,
      displayName: p.gamingUsername || user?.username,
      gamingUsername: p.gamingUsername,
      gamingUID: p.gamingUID,
      userId: uid,
      username: user?.username,
      email: user?.email,
      role: 'player',
      entryFee,
      payment,
      joinStatus: p.status || 'joined',
      joinedAt: p.joinedAt,
      kills,
      killReward,
      winnings,
      available: false,
    });
    slots.push({
      slotNumber: n,
      label: `Slot ${n}`,
      available: false,
      teamName: p.gamingUsername || user?.username,
      paymentStatus: payment.paymentStatus,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      joinedAt: p.joinedAt,
      players: [row],
    });
  }
  return slots;
}

function buildBrTeamSlots({
  teams,
  members,
  ordersByUser,
  txnsByUser,
  payoutsByUser,
  teamResultsById,
  entryFee,
  perKill,
  totalSlots,
}) {
  const assigned = assignMissingBrSlots(teams, totalSlots);
  const bySlot = new Map(assigned.filter((t) => t.slotNumber).map((t) => [Number(t.slotNumber), t]));
  const membersByTeam = groupBy(members, 'teamId');
  const slots = [];

  for (let n = 1; n <= totalSlots; n += 1) {
    const team = bySlot.get(n);
    if (!team) {
      slots.push({
        slotNumber: n,
        label: `Slot ${n}`,
        available: true,
        teamName: null,
        players: [],
        paymentStatus: 'AVAILABLE',
      });
      continue;
    }
    const captainId = team.captainUserId?._id || team.captainUserId;
    const payment = paymentForUser(ordersByUser, captainId, txnsByUser);
    const result = teamResultsById.get(idKey(team._id));
    const kills = result ? Number(result.teamKills) || 0 : null;
    const killReward = result ? Number(result.killReward) || (kills == null ? null : kills * perKill) : null;
    const roster = Array.isArray(team.players) && team.players.length
      ? team.players
      : (membersByTeam.get(idKey(team._id)) || []).map((m) => ({
          name: m.gamingUsername,
          gamingUID: m.gamingUID,
        }));
    const players = roster.map((p, index) => {
      const isCaptain = index === 0;
      const member = (membersByTeam.get(idKey(team._id)) || [])[index];
      const user = isCaptain ? team.captainUserId : member?.userId;
      const uid = user?._id || user;
      const win = isCaptain
        ? (payoutsByUser.get(idKey(uid)) || []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
        : 0;
      return playerRow({
        slotNumber: n,
        teamName: team.name,
        teamId: team._id,
        displayName: p.name || p.gamingUsername,
        gamingUsername: p.name || p.gamingUsername,
        gamingUID: p.gamingUID,
        userId: uid,
        username: user?.username,
        email: user?.email,
        role: isCaptain ? 'captain' : 'member',
        entryFee: isCaptain ? entryFee : 0,
        payment: isCaptain ? payment : { paymentStatus: payment.paymentStatus === 'PAID' ? 'COVERED' : payment.paymentStatus },
        joinStatus: 'joined',
        joinedAt: team.createdAt,
        kills: isCaptain ? kills : null,
        killReward: isCaptain ? killReward : null,
        winnings: win,
        available: false,
      });
    });
    slots.push({
      slotNumber: n,
      label: `Slot ${n}`,
      available: false,
      teamName: team.name,
      teamId: team._id,
      paymentStatus: payment.paymentStatus,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      joinedAt: team.createdAt,
      kills,
      killReward,
      players,
    });
  }
  return slots;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function statusFilter(status) {
  const s = String(status || '').trim();
  if (!s) return null;
  if (s === 'upcoming') return { $in: ['upcoming', 'incoming'] };
  if (s === 'live' || s === 'ongoing') return { $in: ['ongoing', 'live'] };
  if (s === 'completed') return { $in: ['completed', 'result_published'] };
  return s;
}

async function getAdminHistory(query = {}) {
  const page = query.page != null && query.page !== ''
    ? Math.max(1, Number(query.page) || 1)
    : null;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter = {};
  const search = String(query.search || '').trim();
  const status = statusFilter(query.status);
  const category = String(query.category || '').trim();

  if (search) filter.name = new RegExp(escapeRegex(search), 'i');
  if (status) {
    filter.$or = [{ lifecycleStatus: status }, { status }];
  }
  if (category === 'custom' || category === 'custom_match') {
    filter.category = { $in: ['custom', 'custom_match'] };
  } else if (category) {
    filter.category = category;
  }

  let find = Tournament.find(filter)
    .populate('game', 'name')
    .populate('gameMode', 'name')
    .sort({ startDate: -1 });

  let total = 0;
  if (page) {
    total = await Tournament.countDocuments(filter);
    find = find.skip((page - 1) * limit).limit(limit);
  }

  const tournaments = await find.lean();
  if (!tournaments.length) {
    return page ? { items: [], total, page, limit, pages: Math.ceil(total / limit) || 1 } : [];
  }

  const ledger = await loadLedger(tournaments.map((t) => t._id));
  const items = tournaments.map((t) => buildHistoryRow(t, ledger));
  if (!page) return items;
  return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

async function getAdminEntries(tournamentId) {
  const tournament = await Tournament.findById(tournamentId)
    .populate('game', 'name')
    .populate('gameMode', 'name');
  if (!tournament) return null;

  const structure = getMatchStructure(tournament);
  const ledger = await loadLedger([tournament._id]);
  const key = idKey(tournament._id);
  const teams = ledger.teamsByT.get(key) || [];
  const members = ledger.membersByT.get(key) || [];
  const participants = ledger.participantsByT.get(key) || [];
  const orders = ledger.ordersByT.get(key) || [];
  const payouts = ledger.payoutsByT.get(key) || [];
  const soloResults = ledger.soloResultsByT.get(key) || [];
  const teamResults = ledger.teamResultsByT.get(key) || [];

  const ordersByUser = groupBy(orders, 'userId');
  const txnsByUser = groupBy(ledger.entryTxnsByT.get(key) || [], 'userId');
  const payoutsByUser = groupBy(payouts, 'userId');
  const soloByUser = new Map(soloResults.map((r) => [idKey(r.userId), r]));
  const teamResultsById = new Map(teamResults.map((r) => [idKey(r.teamId), r]));
  const entryFee = Number(tournament.entryFee) || 0;
  const perKill = structure.hasKillRewards ? Number(tournament.perKill) || 0 : 0;

  let slots;
  if (structure.kind === 'team_vs_team') {
    slots = buildTeamVsTeamSlots({ tournament, teams, members, ordersByUser, txnsByUser, payoutsByUser, entryFee });
  } else if (structure.usesTeamRegistration) {
    slots = buildBrTeamSlots({
      teams,
      members,
      ordersByUser,
      txnsByUser,
      payoutsByUser,
      teamResultsById,
      entryFee,
      perKill,
      totalSlots: structure.totalSlots,
    });
  } else {
    slots = buildBrSoloSlots({
      tournament,
      participants,
      ordersByUser,
      txnsByUser,
      payoutsByUser,
      soloByUser,
      entryFee,
      perKill,
      totalSlots: structure.totalSlots,
    });
  }

  const history = buildHistoryRow(tournament, ledger);
  return {
    tournament: {
      _id: tournament._id,
      name: tournament.name,
      game: tournament.game,
      gameMode: tournament.gameMode,
      ...history,
    },
    slots,
    participants: slots.flatMap((s) => s.players || []),
    totalJoined: history.bookedSlots,
  };
}

module.exports = {
  getAdminHistory,
  getAdminEntries,
  getMatchStructure,
};
