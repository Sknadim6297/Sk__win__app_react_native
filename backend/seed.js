require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});

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

    mongoose.connection.close();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
}

seedDatabase();
