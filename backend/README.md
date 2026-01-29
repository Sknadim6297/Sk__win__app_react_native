# SK Win Backend Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (installed locally or MongoDB Atlas account)
- npm

## Installation Steps

### 1. Navigate to backend folder
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the backend folder with:
```
MONGODB_URI=mongodb://localhost:27017/sk-win
PORT=5000
JWT_SECRET=your-secret-key-here-change-in-production
```

For MongoDB Atlas, use:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sk-win
```

### 4. Start MongoDB
If running locally:
```bash
mongod
```

### 5. Seed Database (Optional)
```bash
npm run seed
```
This creates:
- Admin user (admin@skwin.com / admin123)
- Sample players (player1, player2)

### 6. Start Backend Server
```bash
npm start
```
or for development with auto-reload:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/profile` - Get user profile
- `POST /api/users/kyc` - Update KYC details

### Admin
- `GET /api/admin/all` - Get all users (admin only)
- `GET /api/admin/stats` - Get user statistics (admin only)
- `POST /api/admin/suspend/:userId` - Suspend user (admin only)
- `POST /api/admin/ban/:userId` - Ban user (admin only)
- `POST /api/admin/activate/:userId` - Activate user (admin only)
- `POST /api/admin/verify/:userId` - Verify user (admin only)

### Wallet
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/topup` - Top up wallet
- `POST /api/wallet/withdraw` - Withdraw from wallet
- `GET /api/wallet/history` - Get transaction history

### Tournaments
- `GET /api/tournaments/list` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament details
- `GET /api/tournaments/:id/canJoin` - Check if user can join
- `POST /api/tournaments/:id/join` - Join tournament
- `GET /api/tournaments/user/history` - Get user's tournament history

## User Eligibility Requirements for Tournament

A user can join a tournament only if:
1. Account status is 'active' (not banned/suspended)
2. KYC verification is completed (if required)
3. Sufficient wallet balance (entry fee + minimum balance)
4. Tournament has available spots
5. User not already registered

## Admin Capabilities

Admins can:
- View all users with statistics
- Suspend/Ban/Activate users
- Verify users
- View wallet transactions
- Manage tournaments

## Testing Credentials

Default admin account:
- Email: admin@skwin.com
- Password: admin123

Sample players:
- Email: player1@skwin.com | Password: password123
- Email: player2@skwin.com | Password: password123
