# SK Win App Feature Test Guide

## 1. Purpose
This document explains:
- Which features are currently available in the app.
- Which features are user-facing vs admin-facing.
- Exact step-by-step test flows for major features.

## 2. Environments and Prerequisites

### 2.1 Required software
- Node.js (v14+ recommended)
- MongoDB local or MongoDB Atlas
- npm
- Expo CLI via project scripts

### 2.2 Backend setup
1. Open terminal in backend folder.
2. Install packages:
   - npm install
3. Create backend .env file with:
   - MONGODB_URI=mongodb://localhost:27017/sk-win
   - PORT=5000
   - JWT_SECRET=your-secret-key
4. Start backend:
   - npm run dev
5. Verify backend health endpoint:
   - http://localhost:5000/api/health

### 2.3 Frontend setup
1. Open terminal in project root.
2. Install packages:
   - npm install
3. Start app:
   - npm run web (for browser)
   - or npm start (Expo launcher)

### 2.4 Seed test data
1. In backend folder run:
   - npm run seed
2. Default seeded admin:
   - Email: admin@skwin.com
   - Password: admin123

Note: Current seed script creates admin only. Create normal users by registration flow.

## 3. Available Feature Map

### 3.1 Authentication
- Register user
- Login user
- Persistent auth session (token/user role in local storage)
- Role-based routing (admin vs user)

### 3.2 User app features
- Home dashboard with:
  - Wallet summary
  - Joined contest sections (incoming/ongoing/completed)
  - Popular games list
  - Tutorial video cards (How To Play)
- Tournament list and join flow
- Tournament details
- Slot booking with gaming username
- Wallet:
  - Balance
  - Deposit (manual flow)
  - Withdraw request
  - Transaction history
- Match history
- Notifications list with read/unread actions
- Profile and account menu:
  - View profile
  - Edit profile
  - Change password
  - My wallet
  - My statistics
  - Top players
  - FAQ/About/Policies/Share/Contact

### 3.3 Admin features
- Admin dashboard metrics
- User management:
  - View all users
  - Suspend/ban/activate/verify user
  - View user details
- Game management:
  - Create/update/delete game
  - Create/update/delete game mode
  - Upload images
- Tournament management:
  - Create/update/delete tournament
  - Lock/unlock tournament
  - Set room details and visibility
  - View participants
  - Submit result entries (rank/kills)
  - Distribute rewards
  - Declare winners and complete tournament
- Tournament history and participant views
- Tutorial management:
  - Create/update/delete tutorial videos

## 4. Step-by-Step Test Plan (Main Features)

## 4.1 Smoke test (must pass first)
1. Start backend and confirm health endpoint returns status OK.
2. Start frontend and open app.
3. Register a new normal user account.
4. Login with that account.
5. Verify app lands on user tab layout (Home, Leaderboard, Wallet, Account).
6. Logout and login with admin@skwin.com/admin123.
7. Verify app lands on admin dashboard.

Expected:
- No crash on login.
- Correct route by role.

## 4.2 User flow: Registration and login
1. From Landing screen, open Auth.
2. Register with unique username, email, password.
3. Logout.
4. Login using same credentials.

Expected:
- Registration success.
- Login success.
- Auth state persists after app refresh.

Negative checks:
- Password mismatch should fail register.
- Duplicate email/username should fail register.
- Wrong password should fail login.

## 4.3 User flow: Profile update and password change
1. Login as normal user.
2. Go to Account -> My Profile -> Edit Profile.
3. Update name, phone, game username, DOB and save.
4. Change password with:
   - wrong old password (expect fail)
   - weak new password (expect fail)
   - valid strong new password (expect success)

Expected:
- Profile fields persist.
- Password policy enforced.

## 4.4 User flow: Wallet operations
1. Go to Wallet tab.
2. Add money with valid amount (example 100).
3. Verify balance increased and transaction added.
4. Attempt add money below 10 (expect validation error).
5. Withdraw valid amount >= 50 and <= balance.
6. Verify balance reduced and withdrawal transaction appears.
7. Attempt withdraw above balance (expect fail).

Expected:
- Balance and totals update correctly.
- History list includes deposit and withdraw entries.

## 4.5 User flow: Tournament browse and join
1. Go to Tournament screen.
2. Check tabs:
   - My Contests
   - Incoming
   - Ongoing
   - Completed
3. Open an incoming tournament details page.
4. Try Join Now.
5. If slot booking modal appears:
   - pick available slot
   - enter gaming username
   - confirm
6. Return to list and confirm tournament shows joined state.
7. Verify wallet entry-fee deduction in wallet history.

Expected:
- Join success only when tournament is incoming and not locked/full.
- Duplicate join attempt should be blocked.
- User cannot join when balance is insufficient.

## 4.6 User flow: Tournament details and room credentials
1. Open a joined tournament details screen.
2. Before room visible time, verify room credentials are hidden.
3. After admin sets room and visibility, and when tournament is ongoing/live, verify joined user can see room ID/password.
4. Verify non-joined user cannot view room credentials.

Expected:
- Room credentials are access-controlled by join state and tournament state.

## 4.7 User flow: Match history
1. Go to History screen.
2. Verify joined tournaments appear.
3. Use filters All/Won/Lost.
4. Open any history item via View button.

Expected:
- History cards show entry fee, rank, prize, slot, gaming username.

## 4.8 User flow: Notifications
1. Go to Notifications screen.
2. Verify notification list loads.
3. Tap one notification to mark as read.
4. Tap top-right action to mark all as read.

Expected:
- Read state updates in UI and backend.

## 4.9 Admin flow: User management
1. Login as admin.
2. Open User Management.
3. Search for user by username/email.
4. Test actions on a normal user:
   - Suspend
   - Activate
   - Verify
   - Ban
   - Activate again
5. Open user details page.

Expected:
- Status transitions reflect correctly.
- Banned/suspended users should be blocked at login or restricted by server logic.

## 4.10 Admin flow: Game and mode management
1. Open Game Management.
2. Create game with name + image URL/upload.
3. Edit game fields and save.
4. Add one or more game modes for that game.
5. Edit and delete a mode.
6. Delete game and confirm related modes are removed.

Expected:
- CRUD operations succeed and persist after refresh.

## 4.11 Admin flow: Tournament lifecycle end-to-end
1. Open Tournament Management.
2. Select game and game mode.
3. Create new tournament with:
   - name, mode, map
   - entry fee and rewards
   - start date/time
   - participant limits
4. Login as user and join the tournament.
5. Login as admin and open participants view.
6. Set room details and enable visibility.
7. Lock tournament close to start (optional).
8. Submit match results (rank/kills payload).
9. Distribute prizes/rewards.
10. Set winners and complete tournament.
11. As user, verify wallet reward credits and results visibility.

Expected:
- Participant records, results, and transactions are consistent.
- Prize distribution should not duplicate on re-run.

## 4.12 Admin flow: Tutorial management
1. Open How To Play management.
2. Create tutorial with title, video link, thumbnail.
3. Edit tutorial fields.
4. Toggle active state.
5. Delete tutorial.
6. Login as user and verify active tutorials appear on Home.

Expected:
- Only active tutorials appear in user Home slider.

## 5. API Spot Checks (Recommended)
Use Postman or browser where applicable:
- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/wallet/balance
- POST /api/wallet/topup
- GET /api/tournaments/list
- POST /api/tournaments/:id/book-slot
- GET /api/notifications
- GET /api/admin/stats

Expected:
- Auth-required endpoints reject missing/invalid token.
- Admin endpoints reject non-admin token.

## 6. Known Caveats to Keep in Mind During Testing
- Default leaderboard screen currently uses static mock data in UI.
- Seed script creates admin only; user accounts must be created manually.
- Some admin dashboard shortcuts may point to screens not registered in navigator (test the linked modules from visible registered routes).
- For web testing, backend host must be reachable from browser origin.

## 7. Suggested Test Execution Order
1. Environment setup and health check.
2. Auth tests.
3. Wallet tests.
4. Tournament join and slot booking tests.
5. Tournament history and notifications.
6. Admin user management.
7. Admin game/mode management.
8. Admin tournament lifecycle and reward distribution.
9. Admin tutorial management and user home verification.

## 8. Pass/Fail Checklist Template
Use this format while testing:
- Feature: <name>
- Test case: <short description>
- Preconditions: <state>
- Steps executed: <numbered list>
- Expected: <result>
- Actual: <result>
- Status: PASS/FAIL
- Notes/bug link: <optional>
