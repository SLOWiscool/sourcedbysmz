# Owner guide — Sourcedbysmz

## 1. Running everything

Local development (two terminals):

```
npm run dev      # shop at http://localhost:5173
npm run server   # backend at http://localhost:4242
```

Single-command hosting / Pterodactyl panel:

```
node launcher.js  # or: npm start
```

The launcher installs what is missing, builds the shop if needed, then
serves shop + API + admin on one port (default **25609**, override with
the `PORT` or `SERVER_PORT` environment variable).

Pterodactyl setup: Node.js egg, startup command `node launcher.js`,
one port allocation (make it 25609 or leave the default and map any
allocation through `SERVER_PORT`). Upload the project files, start the
server, open the panel's address. No build step needed on the panel —
the launcher builds automatically on first boot.

## 2. Creating your admin account

On the machine that runs the backend:

```
npm run setup:admin
```

Type a username and a long unique password (12+ characters, typed
blind). Only a salted hash is saved into `server/.env` — the password
itself is never stored, printed or committed. Restart the backend, then
open `/admin/login` (there is an "Owner sign-in" link in the shop
footer).

Never put the password in chat, docs, code or environment files that get
committed. If a password you use anywhere was ever pasted into a chat,
change it.

## 3. Posting and managing products

Sign in at `/admin`, then Products → New product:

- Title, page address (slug), category, description — plain words.
- Price in £ (`0` = "to be confirmed", shown as Coming Soon).
- Stock, status (`draft` = hidden, `active` = in shop, `sold_out` =
  visible but not buyable, `archived` = hidden).
- Condition + honest condition notes (flaws are shown to customers).
- Photos: add from the image library or upload new ones (JPG/PNG/WebP,
  up to 8MB). Every photo needs alt text.
- Colour options: label, swatch, stock, optional own price; tick which
  photos show that option.
- Publish toggles a listing live instantly — no rebuild needed.

Edits apply to the shop immediately (the storefront loads the live
catalogue, with a bundled fallback if the backend is down). Leaving a
half-filled form warns before the tab closes. Deleting asks first and
cannot be undone.

## 4. Orders and money

Orders appear under Orders only after Stripe confirms payment — a
customer reaching a success page never creates one. Prices, delivery
(standard £3.99, free over £50, express £6.99) and stock are always
computed by the server; anything the browser sends is re-checked.

Nothing can be bought until you set real prices and stock (the server
refuses unpriced items). See `docs/stripe-setup.md` for keys, webhooks,
Apple/Google Pay and the live checklist. Rotate any secret key that was
ever pasted into a chat before going live.
