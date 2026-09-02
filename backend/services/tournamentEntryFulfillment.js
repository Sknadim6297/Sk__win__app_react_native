const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const WalletTransaction = require('../models/WalletTransaction');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const lifecycle = require('./tournamentLifecycle');
const { notifyTournamentJoined } = require('./tournamentPushEvents');

/**
 * Idempotent tournament join after verified ZapUPI SUCCESS/PAID.
 * Does NOT credit wallet — the ZapUPI payment IS the entry fee.
 */
async function fulfillTournamentEntryPayment(paymentOrder, { source = 'api' } = {}) {
  if (!paymentOrder) {
    return { joined: false, reason: 'ORDER_NOT_FOUND' };
  }

  const purpose = paymentOrder.purpose || paymentOrder.metadata?.purpose;
  if (purpose !== 'tournament_entry') {
    return { joined: false, reason: 'NOT_TOURNAMENT_ENTRY' };
  }

  if (!['SUCCESS', 'PAID'].includes(paymentOrder.status)) {
    return { joined: false, reason: 'NOT_PAID' };
  }

  if (paymentOrder.tournamentJoined) {
    return {
      joined: false,
      reason: 'ALREADY_JOINED',
      tournamentId: paymentOrder.tournamentId,
    };
  }

  const claim = await PaymentOrder.findOneAndUpdate(
    {
      _id: paymentOrder._id,
      tournamentJoined: false,
      status: { $in: ['SUCCESS', 'PAID'] },
      purpose: 'tournament_entry',
    },
    {
      $set: {
        tournamentJoined: true,
        status: 'PAID',
        lastVerifiedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claim) {
    const again = await PaymentOrder.findById(paymentOrder._id);
    return {
      joined: Boolean(again?.tournamentJoined),
      reason: 'ALREADY_JOINED',
      tournamentId: again?.tournamentId,
    };
  }

  try {
    const tournament = await Tournament.findById(claim.tournamentId);
    if (!tournament) {
      await PaymentOrder.findByIdAndUpdate(claim._id, {
        tournamentJoined: false,
        failureReason: 'TOURNAMENT_NOT_FOUND',
      });
      return { joined: false, reason: 'TOURNAMENT_NOT_FOUND' };
    }

    const user = await User.findById(claim.userId);
    if (!user) {
      await PaymentOrder.findByIdAndUpdate(claim._id, {
        tournamentJoined: false,
        failureReason: 'USER_NOT_FOUND',
      });
      return { joined: false, reason: 'USER_NOT_FOUND' };
    }

    const joinKind =
      claim.metadata?.joinKind ||
      (lifecycle.isCustomMatch(tournament) || lifecycle.usesTeamRegistration(tournament)
        ? 'team'
        : 'solo');

    let result;
    if (joinKind === 'team') {
      result = await joinTeamFromPayment(claim, tournament, user);
    } else {
      result = await joinSoloFromPayment(claim, tournament, user);
    }

    if (!result.ok) {
      await PaymentOrder.findByIdAndUpdate(claim._id, {
        tournamentJoined: false,
        failureReason: result.reason || 'JOIN_FAILED',
      });
      return { joined: false, reason: result.reason || 'JOIN_FAILED', message: result.message };
    }

    const txnId = `ZAP_ENTRY_${claim.orderId}`;
    let transaction = await WalletTransaction.findOne({ transactionId: txnId });
    if (!transaction) {
      transaction = await WalletTransaction.create({
        userId: claim.userId,
        type: 'tournament_entry',
        amount: claim.amount,
        tournamentId: claim.tournamentId,
        description: `ZapUPI entry for ${tournament.name} (order ${claim.orderId})`,
        status: 'completed',
        paymentMethod: 'ZapUPI',
        transactionId: txnId,
        paymentOrderId: claim._id,
        zapupiTxnId: claim.zapupiTxnId,
        zapupiUtr: claim.zapupiUtr,
      });
    }

    claim.walletTransactionId = transaction._id;
    claim.status = 'PAID';
    await claim.save();

    await PaymentLog.create({
      orderId: claim.orderId,
      paymentOrderId: claim._id,
      userId: claim.userId,
      event: 'TOURNAMENT_JOINED_AFTER_PAYMENT',
      source,
      success: true,
      message: `Joined tournament ${tournament._id}`,
      responsePayload: { joinKind, slotNumber: result.slotNumber, teamId: result.teamId },
    }).catch(() => {});

    await notifyTournamentJoined(claim.userId, tournament).catch(() => {});

    return {
      joined: true,
      reason: 'JOINED',
      tournamentId: tournament._id,
      joinKind,
      slotNumber: result.slotNumber,
      teamId: result.teamId,
      alreadyMember: result.alreadyMember,
    };
  } catch (error) {
    await PaymentOrder.findByIdAndUpdate(paymentOrder._id, {
      tournamentJoined: false,
      failureReason: error.message,
    });
    throw error;
  }
}

async function joinSoloFromPayment(claim, tournament, user) {
  const existing = await TournamentParticipant.findOne({
    tournamentId: tournament._id,
    userId: user._id,
  });
  if (existing) {
    return { ok: true, alreadyMember: true, slotNumber: existing.slotNumber };
  }

  const existingMember = await TeamMember.findOne({
    tournamentId: tournament._id,
    userId: user._id,
  });
  if (existingMember) {
    return { ok: true, alreadyMember: true };
  }

  const meta = claim.metadata || {};
  const structure = lifecycle.getMatchStructure(tournament);
  const required = Math.max(1, Number(structure.slotsRequiredToJoin || structure.playersPerTeam) || 1);

  let nums = [];
  if (Array.isArray(meta.slotNumbers) && meta.slotNumbers.length) {
    nums = meta.slotNumbers.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  } else if (meta.slotNumber != null) {
    nums = [Number(meta.slotNumber)];
  }
  nums = [...new Set(nums)].sort((a, b) => a - b);

  let players = [];
  if (Array.isArray(meta.players) && meta.players.length === (nums.length || required)) {
    players = meta.players.map((p, i) => ({
      slotNumber: nums[i] || null,
      gamingUsername: String(p?.gamingUsername || p?.gamingID || p?.name || '').trim(),
      gamingUID: String(p?.gamingUID || p?.uid || '').trim(),
    }));
  } else {
    const gamingUsername = String(meta.gamingUsername || meta.gamingID || '').trim();
    const gamingUID = String(meta.gamingUID || '').trim();
    if (gamingUsername.length < 3 || gamingUID.length < 3) {
      return {
        ok: false,
        reason: 'MISSING_GAME_IDS',
        message: 'Game ID and UID are required to join after payment',
      };
    }
    players = (nums.length ? nums : Array.from({ length: required })).map((n) => ({
      slotNumber: Number.isFinite(n) ? n : null,
      gamingUsername,
      gamingUID,
    }));
  }

  for (const p of players) {
    if (!p.gamingUsername || p.gamingUsername.length < 3 || !p.gamingUID || p.gamingUID.length < 3) {
      return {
        ok: false,
        reason: 'MISSING_GAME_IDS',
        message: 'Game Name and Game UID are required for every selected slot',
      };
    }
  }
  const gamingUsername = players[0].gamingUsername;
  const gamingUID = players[0].gamingUID;

  if (!tournament.slots || tournament.slots.length === 0) {
    const newSlots = [];
    for (let i = 1; i <= structure.totalSlots; i += 1) {
      newSlots.push({
        slotNumber: i,
        userId: null,
        gamingUsername: null,
        gamingUID: null,
        bookedAt: null,
        isBooked: false,
      });
    }
    tournament.slots = newSlots;
  }

  if (nums.length && nums.length !== required) {
    return {
      ok: false,
      reason: 'SLOT_COUNT_MISMATCH',
      message: `Select exactly ${required} slots for this match`,
    };
  }

  const targetSlots = [];
  if (nums.length === required) {
    for (const n of nums) {
      const slot = tournament.slots.find((s) => Number(s.slotNumber) === n);
      if (!slot) {
        return { ok: false, reason: 'INVALID_SLOT', message: `Slot ${n} does not exist` };
      }
      if (slot.isBooked) {
        return { ok: false, reason: 'SLOT_TAKEN', message: `Slot ${n} is already booked` };
      }
      targetSlots.push(slot);
    }
  } else {
    const free = tournament.slots.filter((s) => !s.isBooked);
    if (free.length < required) {
      return { ok: false, reason: 'TOURNAMENT_FULL', message: 'No free slots left' };
    }
    targetSlots.push(...free.slice(0, required));
    nums = targetSlots.map((s) => s.slotNumber);
    players = players.map((p, i) => ({ ...p, slotNumber: nums[i] }));
  }

  const booked = tournament.slots.filter((s) => s.isBooked).length;
  if (booked + required > structure.totalSlots) {
    return { ok: false, reason: 'TOURNAMENT_FULL', message: 'Tournament is full' };
  }

  const now = new Date();
  for (let i = 0; i < targetSlots.length; i += 1) {
    const targetSlot = targetSlots[i];
    const p = players[i] || players[0];
    targetSlot.userId = user._id;
    targetSlot.gamingUsername = p.gamingUsername;
    targetSlot.gamingUID = p.gamingUID;
    targetSlot.bookedAt = now;
    targetSlot.isBooked = true;
  }

  await tournament.save();

  const existingAfter = await TournamentParticipant.findOne({
    tournamentId: tournament._id,
    userId: user._id,
  });
  if (!existingAfter) {
    await TournamentParticipant.create({
      tournamentId: tournament._id,
      userId: user._id,
      slotNumber: nums[0],
      gamingUsername,
      gamingUID,
      status: 'joined',
      joinedAt: now,
    });
  }

  if (!tournament.registeredPlayers.some((id) => String(id) === String(user._id))) {
    tournament.registeredPlayers.push(user._id);
  }
  tournament.currentParticipants = (tournament.currentParticipants || 0) + 1;
  await tournament.save();

  user.tournament = user.tournament || {};
  user.tournament.participatedCount = (user.tournament.participatedCount || 0) + 1;
  await user.save();

  return { ok: true, slotNumber: nums[0], slotNumbers: nums };
}

async function joinTeamFromPayment(claim, tournament, user) {
  const existingMember = await TeamMember.findOne({
    tournamentId: tournament._id,
    userId: user._id,
  });
  if (existingMember) {
    return { ok: true, alreadyMember: true, teamId: existingMember.teamId };
  }

  const meta = claim.metadata || {};
  const teamName = String(meta.teamName || '').trim();
  const players = Array.isArray(meta.players) ? meta.players : [];
  const structure = lifecycle.getMatchStructure(tournament);
  const requiredPlayers = Math.max(1, Number(structure.playersPerTeam) || 1);
  const isCustom = lifecycle.isCustomMatch(tournament);

  const needsTeamSide = Boolean(structure.usesTeamSides);

  if (!teamName) {
    return { ok: false, reason: 'MISSING_TEAM_NAME', message: 'Team name is required' };
  }
  if (players.length !== requiredPlayers) {
    return {
      ok: false,
      reason: 'INVALID_PLAYERS',
      message: `Expected ${requiredPlayers} players with Game ID + UID`,
    };
  }

  const normalized = players.map((p, idx) => {
    const name = String(p?.name || p?.gamingUsername || '').trim();
    const gamingUID = String(p?.gamingUID || p?.uid || '').trim();
    return { name, gamingUID, index: idx };
  });
  if (normalized.some((p) => p.name.length < 3 || p.gamingUID.length < 3)) {
    return {
      ok: false,
      reason: 'MISSING_GAME_IDS',
      message: 'Every player needs Game ID and UID (min 3 chars)',
    };
  }

  let side = null;
  if (needsTeamSide) {
    const sideRaw = String(meta.teamSide || meta.side || '')
      .trim()
      .toUpperCase()
      .replace('TEAM ', '');
    side = sideRaw === 'A' || sideRaw === 'B' ? sideRaw : null;
    if (!side) {
      return { ok: false, reason: 'MISSING_SIDE', message: 'Team side A or B is required' };
    }
    const sideTaken = await Team.findOne({
      tournamentId: tournament._id,
      side,
      status: 'registered',
    });
    if (sideTaken) {
      return { ok: false, reason: 'SIDE_TAKEN', message: `Team ${side} is already registered` };
    }
  }

  const teamCount = await Team.countDocuments({ tournamentId: tournament._id, status: 'registered' });
  const maxTeams = needsTeamSide
    ? Number(tournament.maxTeams || structure.totalSlots || 2)
    : isCustom
      ? tournament.maxTeams || 2
      : tournament.maxTeams ||
        Math.floor((tournament.maxParticipants || 50) / requiredPlayers);
  if (teamCount >= maxTeams) {
    return { ok: false, reason: 'TOURNAMENT_FULL', message: 'All team slots are full' };
  }

  const teamPayload = {
    tournamentId: tournament._id,
    name: teamName,
    players: normalized.map(({ name, gamingUID }) => ({ name, gamingUID })),
    captainUserId: user._id,
    status: 'registered',
  };
  if (side) teamPayload.side = side;

  if (!needsTeamSide && structure.usesTeamRegistration) {
    let slotNumber = Number(meta.slotNumber);
    if (!slotNumber || slotNumber < 1 || slotNumber > structure.totalSlots) {
      const taken = await Team.find({ tournamentId: tournament._id, status: 'registered' }).select('slotNumber');
      const used = new Set(taken.map((t) => Number(t.slotNumber)).filter(Boolean));
      slotNumber = null;
      for (let i = 1; i <= structure.totalSlots; i += 1) {
        if (!used.has(i)) {
          slotNumber = i;
          break;
        }
      }
    }
    if (!slotNumber) {
      return { ok: false, reason: 'TOURNAMENT_FULL', message: 'All slots are full' };
    }
    const slotTaken = await Team.findOne({
      tournamentId: tournament._id,
      slotNumber,
      status: 'registered',
    });
    if (slotTaken) {
      return { ok: false, reason: 'SLOT_TAKEN', message: `Slot ${slotNumber} is already booked` };
    }
    teamPayload.slotNumber = slotNumber;
  }

  const team = await Team.create(teamPayload);
  await TeamMember.create({
    tournamentId: tournament._id,
    teamId: team._id,
    userId: user._id,
    gamingUsername: normalized[0].name,
    gamingUID: normalized[0].gamingUID,
    role: 'captain',
  });

  if (!tournament.registeredPlayers.some((id) => String(id) === String(user._id))) {
    tournament.registeredPlayers.push(user._id);
  }
  tournament.currentParticipants = (teamCount + 1) * requiredPlayers;
  await tournament.save();

  user.tournament = user.tournament || {};
  user.tournament.participatedCount = (user.tournament.participatedCount || 0) + 1;
  await user.save();

  return { ok: true, teamId: team._id, slotNumber: team.slotNumber || null };
}

module.exports = {
  fulfillTournamentEntryPayment,
};
