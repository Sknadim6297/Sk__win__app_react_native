require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Game = require('./models/Game');
const GameMode = require('./models/GameMode');

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

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',
      email: 'admin@skwin.com',
      password: adminPassword,
      role: 'admin',
      verified: true,
      wallet: { balance: 10000 },
      kycVerified: true,
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
        kycVerified: true,
      }),
      new User({
        username: 'player2',
        email: 'player2@skwin.com',
        password: password,
        role: 'user',
        verified: true,
        wallet: { balance: 2500 },
        kycVerified: false,
      }),
    ];

    await User.insertMany(users);
    console.log('Sample users created');

    // Create games
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
      new Game({
        name: 'PUBG Mobile',
        image: 'https://via.placeholder.com/300x200?text=PUBG+Mobile',
        rating: 4.7,
        players: '1.8M',
        description: 'Ultimate battle royale experience',
        isPopular: true,
        status: 'active',
      }),
      new Game({
        name: 'Call of Duty',
        image: 'https://via.placeholder.com/300x200?text=Call+of+Duty',
        rating: 4.6,
        players: '950K',
        description: 'Intense first-person shooter action',
        isPopular: true,
        status: 'active',
      }),
    ];

    const savedGames = await Game.insertMany(games);
    console.log(`${savedGames.length} games created`);

    // Create game modes for each game
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

    // PUBG modes
    gameModes.push(new GameMode({
      game: savedGames[1]._id,
      name: 'Classic',
      description: 'Original PUBG battle royale mode',
      status: 'active',
    }));
    gameModes.push(new GameMode({
      game: savedGames[1]._id,
      name: 'Arcade',
      description: 'Fast-paced arcade gameplay',
      status: 'active',
    }));

    // Call of Duty modes
    gameModes.push(new GameMode({
      game: savedGames[2]._id,
      name: 'Multiplayer',
      description: 'Team-based multiplayer battles',
      status: 'active',
    }));
    gameModes.push(new GameMode({
      game: savedGames[2]._id,
      name: 'Warzone',
      description: 'Large-scale battle royale',
      status: 'active',
    }));

    await GameMode.insertMany(gameModes);
    console.log(`${gameModes.length} game modes created`);

    mongoose.connection.close();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
}

seedDatabase();
