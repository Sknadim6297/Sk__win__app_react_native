require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Game = require('./models/Game');
const GameMode = require('./models/GameMode');
const Tournament = require('./models/Tournament');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Game.deleteMany({});
    await GameMode.deleteMany({});
    await Tournament.deleteMany({});

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',
      email: 'admin@skwin.com',
      password: adminPassword,
      role: 'admin',
      verified: true,
      wallet: { balance: 10000 },
    });
    await admin.save();
    console.log('Admin user created');

    // Create sample users
    const password = await bcrypt.hash('password123', 10);
    const users = [
      new User({
        username: 'player1',
        email: 'player1@skwin.com',
        password: password,
        role: 'user',
        verified: true,
        wallet: { balance: 1000 },
      }),
      new User({
        username: 'player2',
        email: 'player2@skwin.com',
        password: password,
        role: 'user',
        verified: true,
        wallet: { balance: 2500 },
      }),
    ];

    await User.insertMany(users);
    console.log('Sample users created');

    // Create games - Only Free Fire
    const games = [
      new Game({
        name: 'Free Fire',
        image: 'https://via.placeholder.com/300x200?text=Free+Fire',
        rating: 4.8,
        players: '2.5M',
        description: 'Battle Royale game with fast-paced action',
        isPopular: true,
        status: 'active',
      }),
    ];

    const savedGames = await Game.insertMany(games);
    console.log(`${savedGames.length} games created`);

    // Create game modes for Free Fire only
    const gameModes = [];
    
    // Free Fire modes
    gameModes.push(new GameMode({
      game: savedGames[0]._id,
      name: 'FF Full Match',
      description: 'Classic battle royale with 50 players',
      status: 'active',
    }));
    gameModes.push(new GameMode({
      game: savedGames[0]._id,
      name: 'Only Headshot',
      description: 'Only headshots count, one hit K/O',
      status: 'active',
    }));
    gameModes.push(new GameMode({
      game: savedGames[0]._id,
      name: 'Clash Squad',
      description: 'Competitive squad-based battles',
      status: 'active',
    }));

    await GameMode.insertMany(gameModes);
    console.log(`${gameModes.length} game modes created`);

    // Helper function to create 50 empty slots
    const createSlots = () => {
      const slots = [];
      for (let i = 1; i <= 50; i++) {
        slots.push({
          slotNumber: i,
          userId: null,
          gamingUsername: null,
          bookedAt: null,
          isBooked: false,
        });
      }
      return slots;
    };

    // Create 5 upcoming Free Fire tournaments only
    const tournaments = [];
    const now = new Date();
    
    // Tournament 1 - Upcoming Free Fire (Today 6 PM)
    const today6PM = new Date(now);
    today6PM.setHours(18, 0, 0, 0);
    tournaments.push(new Tournament({
      name: 'FF Solo Championship',
      description: 'Free Fire Solo Tournament - Win big prizes!',
      game: savedGames[0]._id,
      gameMode: gameModes[0]._id,
      mode: 'solo',
      map: 'Bermuda',
      rules: ['No hacking', 'Fair play only', 'Must join room on time'],
      entryFee: 50,
      prizePool: 5000,
      perKill: 10,
      maxParticipants: 100,
      currentParticipants: 0,
      status: 'upcoming',
      startDate: today6PM,
      minimumBalance: 100,
      prizes: { first: 2500, second: 1500, third: 1000 },
      slots: createSlots(),
      createdBy: admin._id,
    }));

    // Tournament 2 - Upcoming Free Fire Duo (Today 9 PM)
    const today9PM = new Date(now);
    today9PM.setHours(21, 0, 0, 0);
    tournaments.push(new Tournament({
      name: 'FF Duo Showdown',
      description: 'Free Fire Duo Tournament - Bring your partner!',
      game: savedGames[0]._id,
      gameMode: gameModes[2]._id,
      mode: 'duo',
      map: 'Kalahari',
      rules: ['2 players per team', 'Both must join', 'No switching teams'],
      entryFee: 75,
      prizePool: 7500,
      perKill: 15,
      maxParticipants: 80,
      currentParticipants: 0,
      status: 'upcoming',
      startDate: today9PM,
      minimumBalance: 150,
      prizes: { first: 3750, second: 2250, third: 1500 },
      slots: createSlots(),
      createdBy: admin._id,
    }));

    // Tournament 3 - Upcoming Free Fire Headshot (Tomorrow 5 PM)
    const tomorrow5PM = new Date(now);
    tomorrow5PM.setDate(tomorrow5PM.getDate() + 1);
    tomorrow5PM.setHours(17, 0, 0, 0);
    tournaments.push(new Tournament({
      name: 'FF Headshot Master',
      description: 'Free Fire Only Headshot Mode - Precision wins!',
      game: savedGames[0]._id,
      gameMode: gameModes[1]._id,
      mode: 'solo',
      map: 'Purgatory',
      rules: ['Only headshots count', 'One shot elimination', 'Be accurate'],
      entryFee: 80,
      prizePool: 8000,
      perKill: 20,
      maxParticipants: 100,
      currentParticipants: 0,
      status: 'upcoming',
      startDate: tomorrow5PM,
      minimumBalance: 150,
      prizes: { first: 4000, second: 2400, third: 1600 },
      slots: createSlots(),
      createdBy: admin._id,
    }));

    // Tournament 4 - Upcoming Free Fire Clash Squad (In 3 days at 6 PM)
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(18, 0, 0, 0);
    tournaments.push(new Tournament({
      name: 'FF Clash Squad Pro',
      description: 'Free Fire Clash Squad - Elite competition!',
      game: savedGames[0]._id,
      gameMode: gameModes[2]._id,
      mode: 'squad',
      map: 'CS-Factory',
      rules: ['4 players squad', 'Elimination mode', 'Strategic gameplay'],
      entryFee: 90,
      prizePool: 9000,
      perKill: 16,
      maxParticipants: 64,
      currentParticipants: 0,
      status: 'upcoming',
      startDate: threeDaysLater,
      minimumBalance: 180,
      prizes: { first: 4500, second: 2700, third: 1800 },
      slots: createSlots(),
      createdBy: admin._id,
    }));

    // Tournament 5 - Upcoming Free Fire Grand Championship (In 7 days at 8 PM)
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    sevenDaysLater.setHours(20, 0, 0, 0);
    tournaments.push(new Tournament({
      name: 'FF Grand Championship 2026',
      description: 'Free Fire Grand Championship - The biggest event of the year!',
      game: savedGames[0]._id,
      gameMode: gameModes[0]._id,
      mode: 'solo',
      map: 'Bermuda',
      rules: ['Solo players only', 'Professional conduct', 'Fair play mandatory', 'Recording required'],
      entryFee: 200,
      prizePool: 20000,
      perKill: 30,
      maxParticipants: 100,
      currentParticipants: 0,
      status: 'upcoming',
      startDate: sevenDaysLater,
      minimumBalance: 400,
      prizes: { first: 10000, second: 6000, third: 4000 },
      slots: createSlots(),
      createdBy: admin._id,
    }));

    await Tournament.insertMany(tournaments);
    console.log(`${tournaments.length} tournaments created`);

    mongoose.connection.close();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
}

seedDatabase();
