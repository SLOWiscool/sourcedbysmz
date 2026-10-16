# Stripe setup for Sourcedbysmz

Live payments are NOT active until the steps below are completed. The
storefront contains the Stripe Elements frontend (Payment Element +
Express Checkout Element for Apple Pay / Google Pay / cards) and this
repo now contains a real backend (`server/`) that prices orders from
trusted data and creates PaymentIntents.

## 1. Security warning

A live secret key was pasted into a chat message during this project.
Treat that key as exposed:

1. Go to Stripe Dashboard → Developers → API keys and roll/rotate it.
2. Never paste secret keys into chat, docs, or frontend code again.
3. Real secrets live only in `server/.env` (local) and hosting/server
   secret managers (production). Both are git-ignored.

## 2. Run it locally

Terminal 1 (backend):

```
cd server
npm install
cp .env.example .env   # then edit: add your sk_test_... key
npm start              # http://localhost:4242
```

Terminal 2 (storefront): `npm run dev` (http://localhost:5173).
The storefront calls `http://localhost:4242` automatically in dev.

Test cards: `4242 4242 4242 4242` (any future expiry, any CVC).
Test Apple Pay / Google Pay with the Stripe test wallets; the Express
Checkout Element only renders wallets the browser supports.

Local webhooks: install the Stripe CLI, then
`stripe listen --forward-to localhost:4242/api/stripe-webhook`
and put the printed `whsec_...` in `server/.env`.

## 3. How the backend works

- `POST /api/create-payment-intent` receives ONLY product IDs,
  variant IDs, quantities, email and delivery option. It validates
  everything against `server/catalogue.json`, computes subtotal +
  delivery (standard £3.99, free over £50, express £6.99) and creates a
  PaymentIntent. It returns `clientSecret` — never prices.
- Right now every price/stock is 0 (unconfirmed), so the API honestly
  refuses every purchase with 409 until the owners confirm real data.
- `POST /api/stripe-webhook` verifies the Stripe signature, processes
  each event idempotently (retries can't double-charge stock), marks
  orders paid/failed and decrements stock only on verified
  `payment_intent.succeeded`. Reaching a success page alone never
  confirms an order.
- A test (`src/tests/products.test.ts`) fails if
  `server/catalogue.json` drifts from the storefront catalogue.

## 4. Production checklist

- Deploy `server/` to a host with secret management (Render, Railway,
  Fly, VPS…). Set `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`,
  `PORT`, `FRONTEND_URLS=https://your-shop-domain`.
- Replace the in-memory order/sold/event stores with a database before
  real sales (see the NOTE at the top of `server/index.js`).
- Stripe Dashboard: activate Cards + Apple Pay + Google Pay; register
  and verify the production domain for Apple Pay (HTTPS required);
  add webhook `https://your-backend/api/stripe-webhook` for
  `payment_intent.succeeded`, `payment_intent.payment_failed`,
  `charge.refunded`.
- Set the storefront's `VITE_BACKEND_URL` to the backend URL and
  `VITE_STRIPE_PUBLISHABLE_KEY` to the live publishable key.
- Run a full test-mode order first; switch to live only when ready.
