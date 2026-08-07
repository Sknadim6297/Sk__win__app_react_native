# Cashfree Wallet QR — Expo SDK 54 + Express Backend

> **Note:** This SK-Win repo uses an **Express + MongoDB** backend (not Laravel).  
> Integration follows the same security model you described: Cashfree REST APIs only on the server; Expo app never holds App ID / Secret.

## Stack

| Layer | Tech |
|-------|------|
| App | Expo SDK 54, RN 0.81, React 19 |
| QR UI | `react-native-qrcode-svg` (+ Metro alias for `qrcode` core — Expo Go safe) |
| Backend | Express (`backend/`), MongoDB |
| Payments | Cashfree PG REST (sandbox or production) |

**No native Cashfree Android/iOS SDK** — works with Expo Go, EAS Build, Android, and web.

## Flow

```
Wallet → Add Coins → amount
  → GET  /api/payments/config
  → POST /api/payments/cashfree/create-qr   (server → Cashfree order + UPI QR)
  → CashfreeQrPaymentScreen (QR + timer + poll / Refresh Status)
  → GET  /api/payments/cashfree/status/:orderId  (verify + credit)
  → OR webhook POST /api/payments/cashfree/webhook
  → WalletTransaction + User.wallet balance
```

## Env (`backend/.env`)

```env
CASHFREE_ENABLED=true
CASHFREE_ENV=sandbox          # or production
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_API_VERSION=2023-08-01
CASHFREE_QR_EXPIRY_MINUTES=10
PUBLIC_BASE_URL=https://your-public-api-host
```

Restart backend after changing `.env`.

### Cashfree dashboard

1. S2S (Server-to-Server) enabled for Order Pay / UPI QR  
2. UPI enabled  
3. Webhook: `{PUBLIC_BASE_URL}/api/payments/cashfree/webhook`

## Security

- App ID / Secret only in backend env  
- Frontend never calls Cashfree directly  
- Webhook HMAC signature check  
- Amount match before credit  
- Idempotent credit (`walletCredited` + unique `transactionId`)  
- Direct `/wallet/topup` blocked when Cashfree is ready  

## Key files

- `backend/config/cashfree.js`
- `backend/services/cashfreeService.js`
- `backend/services/walletCreditService.js`
- `backend/routes/payments.js`
- `backend/models/PaymentOrder.js`, `PaymentLog.js`
- `screens/CashfreeQrPaymentScreen.js`
- `metro.config.js` (qrcode → core, no Node `fs`)
