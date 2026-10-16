# Stripe setup — where the keys go and what to do

## 1. Where the keys go

Everything lives in **`server/.env`** on the machine that runs the backend
(the Pterodactyl container). Create it from the template:

```bash
cd server
cp .env.example .env
nano .env
```

Fill in these three lines:

```
PORT=25609
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

- `STRIPE_SECRET_KEY` — starts with `sk_test_` for testing, `sk_live_` for real money.
- `STRIPE_WEBHOOK_SECRET` — printed by the Stripe CLI in step 3.
- `PORT` — must match the Pterodactyl allocation (25609).

**Never** put the secret key in the frontend, in a `VITE_` variable, in chat,
or in git. `server/.env` is git-ignored.

## 2. Frontend publishable key

The storefront needs the **publishable** key (`pk_test_...` / `pk_live_...`).
It goes in the **root** `.env` (next to `package.json`):

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
VITE_BACKEND_URL=
```

`VITE_BACKEND_URL=` (empty) means "same origin" — the launcher serves the shop
and API from one port, so leave it empty on Pterodactyl.

## 3. Webhooks (required for real orders)

The server only marks an order paid when Stripe's webhook confirms it.
Run this **on the same machine as the backend**, in a separate terminal:

```bash
stripe listen --forward-to localhost:25609/api/stripe-webhook
```

It prints `whsec_...` — paste that into `STRIPE_WEBHOOK_SECRET` in
`server/.env`, then restart the server.

For production (deployed backend), add the endpoint in Stripe Dashboard →
Developers → Webhooks → `https://sourcedbysmz.co.uk/api/stripe-webhook`
and subscribe to `payment_intent.succeeded` and `payment_intent.payment_failed`.

## 4. Test it

1. Restart the Pterodactyl server.
2. Add a priced, in-stock product in `/admin`.
3. Go to checkout, pay with Stripe test card `4242 4242 4242 4242`
   (any future expiry, any CVC).
4. Apple Pay / Google Pay appear automatically on supported devices/browsers.
5. The success page polls the order status and shows "Order Confirmed" only
   after the webhook marks it paid.

## 5. Going live

1. Replace `sk_test_...` with `sk_live_...` in `server/.env`.
2. Replace `pk_test_...` with `pk_live_...` in root `.env`.
3. Register `https://sourcedbysmz.co.uk` in Stripe Dashboard → Payments →
   Apple Pay (domain verification).
4. Add the production webhook endpoint (step 3).
5. Run one more test-mode order, then switch.

## Security note

A live secret key was pasted into a chat during development. **Roll it now**
in Stripe Dashboard → Developers → API keys → rotate, and use the new key.
Chat history is not a safe place for secrets.
