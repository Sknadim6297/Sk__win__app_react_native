# SK Win Backend & Admin System Implementation

## 🎯 Overview
Complete backend system with Node.js/Express, MongoDB, and Admin dashboard for SK Win tournament platform.

## 📦 What's Included

### Backend (`/backend`)
- **Express.js API Server** - RESTful API with JWT authentication
- **MongoDB Database** - User, Tournament, and Transaction schemas
- **Authentication** - Register, Login with password hashing (bcryptjs)
- **User Management** - KYC verification, profile management
- **Admin Controls** - Suspend, ban, verify users
- **Wallet System** - Deposits, withdrawals, transaction history
- **Tournament Logic** - Registration with eligibility checks

### Frontend Updates
- **Updated AuthContext** - Connects to backend API
- **API Service Module** - Centralized API calls
- **Admin Dashboard** - Real-time user statistics
- **User Management Interface** - User status management

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/sk-win
PORT=5000
JWT_SECRET=your-secret-key
```

Seed database (optional):
```bash
node seed.js
```

Start server:
```bash
npm start
```

### 2. Frontend Configuration

Update API URL in `/services/api.js` if needed:
```javascript
const API_URL = 'http://localhost:5000/api';
```

## 📱 User Eligibility System

### Tournament Join Requirements
Users can participate in tournaments only if:

1. ✅ **Account Status** - Active (not banned/suspended)
2. ✅ **KYC Verification** - Required if tournament mandates it
3. ✅ **Wallet Balance** - Sufficient funds for entry + minimum balance
4. ✅ **Registration Status** - Not already registered
5. ✅ **Availability** - Tournament has available spots

### User Restrictions
- **Banned** - Completely blocked from platform
- **Suspended** - Temporary block, can be reactivated
- **Inactive** - Cannot join tournaments (KYC not verified)

## 💰 Wallet System

### Operations
1. **Top-up** - Deposit funds via payment gateway
   - Instant balance update
   - Transaction recorded

2. **Withdrawal** - Withdraw to bank account
   - Requires KYC verification
   - Pending approval process
   - Transaction history

3. **Tournament Entry** - Automatic deduction
   - Entry fee deducted on registration
   - Refund if disqualified

4. **Winnings** - Credited automatically
   - Prize distribution post-tournament

## 👨‍💼 Admin Capabilities

### User Management
- **View All Users** - Complete user list with details
- **User Statistics** - Total users, verified, KYC done, blocked
- **Suspend Users** - Temporary deactivation
- **Ban Users** - Permanent blocking with reason
- **Activate/Unban** - Reactivate suspended users
- **Verify Users** - Manual verification
- **Wallet Overview** - Total balance across all users

### Monitoring
- Real-time statistics
- User transaction history
- Tournament participation tracking
- Wallet balance overview

## 🔑 API Endpoints

### Authentication
```
POST   /api/auth/register       - Register user
POST   /api/auth/login          - Login user
```

### Users
```
GET    /api/users/profile       - Get user profile
POST   /api/users/kyc           - Submit KYC details
```

### Admin
```
GET    /api/admin/all           - Get all users (admin)
GET    /api/admin/stats         - Get platform statistics
POST   /api/admin/suspend/:id   - Suspend user
POST   /api/admin/ban/:id       - Ban user
POST   /api/admin/activate/:id  - Activate user
POST   /api/admin/verify/:id    - Verify user
```

### Wallet
```
GET    /api/wallet/balance      - Get balance
POST   /api/wallet/topup        - Deposit funds
POST   /api/wallet/withdraw     - Request withdrawal
GET    /api/wallet/history      - Transaction history
```

### Tournaments
```
GET    /api/tournaments/list                 - All tournaments
GET    /api/tournaments/:id                  - Tournament details
GET    /api/tournaments/:id/canJoin          - Check eligibility
POST   /api/tournaments/:id/join             - Join tournament
GET    /api/tournaments/user/history         - User's tournaments

ADMIN ENDPOINTS:
POST   /api/tournaments/admin/create         - Create tournament (admin)
PUT    /api/tournaments/admin/:id            - Update tournament (admin)  
DELETE /api/tournaments/admin/:id            - Delete tournament (admin)
GET    /api/tournaments/admin/all            - Get all tournaments (admin)
GET    /api/tournaments/admin/history        - Tournament history with participants (admin)
GET    /api/tournaments/admin/:id/participants - Get tournament participants (admin)
PUT    /api/tournaments/admin/:id/room       - Set room credentials (admin)
PUT    /api/tournaments/admin/:id/status     - Update tournament status (admin)
POST   /api/tournaments/admin/:id/winners    - Select winners (admin)
POST   /api/tournaments/admin/:id/distribute-prizes - Distribute prizes (admin)
```

## 🧪 Test Credentials

### Admin Account
- Email: `admin@skwin.com`
- Password: `admin123`

### Test Players
- Email: `player1@skwin.com` | Password: `password123`
- Email: `player2@skwin.com` | Password: `password123`

## 📊 Database Schema

### User
- Basic info (username, email, password)
- Role (user/admin)
- Status (active/suspended/banned)
- KYC details & verification
- Wallet (balance, total deposited, total withdrawn)
- Tournament stats (participated, wins, earnings)

### Tournament
- Name, description, entry fee, prize pool
- Max players, registered players list
- Status (upcoming/live/completed)
- Start/end dates
- Minimum KYC & balance requirements
- Winners and rewards

### Wallet Transaction
- User ID, transaction type
- Amount, status
- Payment method, transaction ID
- Associated tournament

## 🔒 Security Features

1. **Password Hashing** - bcryptjs with salt rounds
2. **JWT Authentication** - Secure token-based auth
3. **Role-based Access** - Admin routes protected
4. **Input Validation** - All inputs validated
5. **Error Handling** - Proper error responses

## 📝 Future Enhancements

- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Email verification
- [ ] SMS notifications
- [ ] Advanced reporting
- [ ] Fraud detection
- [ ] Leaderboards
- [ ] Real-time notifications

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running
- Check connection string in .env
- Verify MongoDB port (27017)

### "CORS Error"
- Backend CORS is enabled for all origins
- Check API URL in frontend matches backend

### "Invalid Token"
- Ensure token is being sent in Authorization header
- Token format: `Bearer <token>`
- Check JWT_SECRET matches frontend

## 📞 Support

For issues or questions, refer to the backend README.md and check:
1. Console logs for error details
2. MongoDB connection status
3. API endpoint responses
4. Network tab in browser dev tools
