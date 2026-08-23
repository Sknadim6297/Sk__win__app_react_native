const mongoose = require('mongoose');

/**
 * Admin-managed Match Type catalog (product / game category).
 * Examples: Battle Royale, Clash Squad, Lone Wolf.
 * Player count is NOT stored here — that is tournament.playerFormat (Solo/Duo/Squad).
 */
const matchTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    /** Clash Squad style: Team A vs Team B (typically 2 sides). */
    isTeamVsTeam: {
      type: Boolean,
      default: false,
    },
    /** Whether Prize per Kill is allowed for this match type. */
    hasKillRewards: {
      type: Boolean,
      default: true,
    },
    /** Suggested default joining slots when admin picks this type (optional hint). */
    defaultSlots: {
      type: Number,
      default: 48,
      min: 1,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MatchType', matchTypeSchema);
