require('dotenv').config();
const mongoose = require('mongoose');
const Tournament = require('./models/Tournament');
const TournamentParticipant = require('./models/TournamentParticipant');
const TournamentResult = require('./models/TournamentResult');
const WalletTransaction = require('./models/WalletTransaction');
const Notification = require('./models/Notification');
const Game = require('./models/Game');
const GameMode = require('./models/GameMode');
const TutorialVideo = require('./models/TutorialVideo');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win';

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // Delete all tournaments data
    await Tournament.deleteMany({});
    console.log('✓ Deleted all tournaments');

    await TournamentParticipant.deleteMany({});
    console.log('✓ Deleted all tournament participants');

    await TournamentResult.deleteMany({});
    console.log('✓ Deleted all tournament results');

    // Delete tournament-related wallet transactions
    await WalletTransaction.deleteMany({
      type: { $in: ['tournament_entry', 'tournament_reward', 'refund'] },
    });
    console.log('✓ Deleted tournament wallet transactions');

    // Delete tournament notifications
    await Notification.deleteMany({
      type: { $in: ['tournament_reminder', 'tournament_update'] },
    });
    console.log('✓ Deleted tournament notifications');

    // Optional: Delete games, game modes, tutorials if needed
    await Game.deleteMany({});
    console.log('✓ Deleted all games');

    await GameMode.deleteMany({});
    console.log('✓ Deleted all game modes');

    await TutorialVideo.deleteMany({});
    console.log('✓ Deleted all tutorial videos');

    console.log('\n✅ All tournament data removed successfully');
    console.log('👤 Users remain in database');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
