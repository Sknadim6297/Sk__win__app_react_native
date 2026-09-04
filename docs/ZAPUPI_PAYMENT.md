# ZapUPI Payment Integration — WAREZONE

Production ZapUPI flows for **wallet top-up** and **tournament entry (Pay & Join)**.

Server-side webhook + Order Status API verification is the source of truth.  
The app never credits wallet or joins a tournament from a frontend-only success callback.

---

## 1. Environment variables

### Backend (`backend/.env` and Render `sk-win-api`)

| Variable | Purpose |
|---|---|
| `PAYMENT_ENABLED` | Master switch. Must be `true` for live ZapUPI. |
| `ZAPUPI_ENABLED` | Gateway switch (default true if unset). |
| `ZAPUPI_KEY` | Merchant key from ZapUPI (server-only). Alias: `ZAPUPI_ZAP_KEY`. |
| `ZAPUPI_ENV` | `test` or `production` / `cashier` / `zappay`. |
| `PUBLIC_BASE_URL` | Public HTTPS API origin used to build webhook URL. |
| `ZAPUPI_MIN_AMOUNT` | Min INR (default `1`). |
| `ZAPUPI_MAX_AMOUNT` | Max INR (default `10000`). |
| `ZAPUPI_ALLOWED_TOPUP_AMOUNTS` | Optional `100,500,1000` — empty = any amount in range. |
| `ZAPUPI_ORDER_EXPIRY_MINUTES` | Pending order expiry (default `20`). |

### App / PWA (`/.env` and `eas.json`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_PAYMENT_ENABLED` | Must be `true` so the app opens ZapUPI instead of dummy top-up. |

**Never** put `ZAPUPI_KEY` in the React Native app, APK, or website JS.

---

## 2. ZapUPI dashboard

1. Create / log into your ZapUPI merchant account.
2. Copy the API key (`zap_key`).
3. Set webhook URL to:

```text
https://YOUR_API_DOMAIN/api/payments/zapupi/webhook
```

Examples:

- Local tunnel: `https://xxxx.ngrok-free.dev/api/payments/zapupi/webhook`
- Render: `https://sk-win-api.onrender.com/api/payments/zapupi/webhook`

4. Start in **test** environment (`ZAPUPI_ENV=test`). Test txn IDs may start with `DUMMY` and are ignored when `ZAPUPI_ENV` is production/cashier/zappay.

---

## 3. How tournament payment works

1. User fills Game ID/UID (or team roster) and taps Join.
2. App calls `POST /api/payments/zapupi/create-order` with tournament + join metadata (no trusted amount).
3. Backend loads tournament fee from DB (`resolveEntryCharge`), creates `PaymentOrder` (`purpose: tournament_entry`), calls ZapUPI create-order.
4. App opens `payment_url` in `ZapUpiPaymentScreen` WebView (same screen).
5. User pays via ZapUPI QR / UPI.
6. ZapUPI webhook → backend always returns `{ status: "ok" }`, then verifies via Order Status API.
7. On verified SUCCESS + amount match → `fulfillTournamentEntryPayment` joins once (idempotent).
8. App polls `GET /api/payments/zapupi/status/:orderId` and shows success only after `tournamentJoined` / `PAID`.

---

## 4. How wallet top-up works

1. User picks amount (presets ₹100 / ₹500 / ₹1000 or custom).
2. App calls `POST /api/payments/zapupi/create-qr` with amount.
3. Backend validates min/max/(optional allow-list), creates `PaymentOrder` (`purpose: wallet_topup`).
4. Same WebView payment UX.
5. Webhook + Order Status verification → atomic wallet `$inc` + ledger row (`transactionId: ZAP_{orderId}`).
6. Duplicate webhooks cannot credit twice (`walletCredited` claim + unique txn key).

---

## 5. API endpoints

| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/api/payments/config` | yes | Public config (no secrets) |
| POST | `/api/payments/zapupi/create-qr` | yes | Wallet top-up order |
| POST | `/api/payments/zapupi/create-order` | yes | Tournament entry order |
| GET | `/api/payments/zapupi/status/:orderId` | yes | Poll + verify |
| POST | `/api/payments/zapupi/cancel/:orderId` | yes | User cancel (still verifies first) |
| POST | `/api/payments/zapupi/webhook` | no | ZapUPI webhook (always 200) |

---

## 6. Troubleshooting webhooks

- Confirm `PUBLIC_BASE_URL` is HTTPS and reachable from the internet.
- Confirm dashboard webhook path ends with `/api/payments/zapupi/webhook`.
- Check API logs for `WEBHOOK_RECEIVED`, `AMOUNT_MISMATCH`, `WEBHOOK_TEST_IGNORED`.
- Inspect `PaymentOrder` and `PaymentLog` in MongoDB.
- If status stays PENDING, poll status endpoint manually after paying.

---

## 7. Testing checklist

- [ ] Wallet top-up success credits once
- [ ] Duplicate webhook does not double-credit
- [ ] Tournament entry success joins once
- [ ] Already-joined user cannot create another paid join
- [ ] Amount mismatch fails without delivery
- [ ] `PAYMENT_ENABLED=false` blocks gateway and allows testing top-up only
- [ ] Test env payments ignored when `ZAPUPI_ENV=production`
