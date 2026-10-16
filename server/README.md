# SendPulse email (server)

Production-ready SendPulse SMTP API integration for stock-alert emails.
No OAuth — one API key. No secrets in this repo; everything comes from
`server/.env` (see `server/.env.example`).

## Setup

1. Copy the template and fill in the key:
   ```bash
   cd server
   cp .env.example .env
   ```
2. Set in `server/.env`:
   ```
   SENDPULSE_API_KEY=sp_...
   ```
   Optional overrides (defaults shown):
   ```
   SENDPULSE_API_FROM_EMAIL=devtest@sendpulseemail.com
   SENDPULSE_API_FROM_NAME=SOURCEDBYSMZ
   SENDPULSE_API_BASE_URL=https://api.sendpulse.com
   ```
3. Verify the key and send yourself a test email:
   ```bash
   node server/send-test-email.js you@example.com
   ```
4. Restart the backend so the shop picks it up.

## Usage (code)

```js
import { verifySendPulseAuth, sendStockAlert } from './email.js';

await verifySendPulseAuth(); // GET /user/info — throws on bad key
await sendStockAlert({       // POST /smtp/emails
  to: 'fan@example.com',
  productSlug: 'down-vest',
  productTitle: 'Down Vest',
  unsubscribeToken: 'abc123',
});
```

Payload shape sent to SendPulse:

```json
{
  "email": {
    "subject": "Test",
    "html": "<base64>",
    "text": "Hello",
    "from": { "email": "from@example.com", "name": "Sender" },
    "to": [{ "email": "to@example.com" }]
  }
}
```

If `SENDPULSE_API_KEY` is empty, mail falls back to `SMTP_URL` relay, then
direct port-25 delivery. Every attempt (any path) is recorded in
`server/data/outbox.json` with its status and reason.

## Test-plan notes (read before panicking)

- New accounts start on the **SMTP Test plan**. Its sender
  `devtest@sendpulseemail.com` is pre-verified and Active out of the box —
  that is why it is the default `SENDPULSE_API_FROM_EMAIL`.
- In demo mode SendPulse **overrides** the sender to
  `SP test <devtest@sendpulseemail.com>` and **prefixes the subject** with
  `For development purposes only: `, regardless of what you pass. Expected.
- `devtest@sendpulseemail.com` exists **only** on the Test plan and is
  removed after you verify your own domain. On Free/paid plans set
  `SENDPULSE_API_FROM_EMAIL` to your own verified sender — sending from an
  unverified one returns HTTP 422 `Sender is not valid`.
- Test plan limits: **50 emails total, 10 per hour**. HTTP 429 means quota
  trouble: the server surfaces it as a rate-limit error instead of
  retry-looping. These numbers live with SendPulse, not in our code.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 401 from `/user/info` | Bad or missing API key | Re-create the key, paste into `server/.env`, restart |
| 422 `Sender is not valid` | Unverified custom sender | Use the default test sender, or verify your domain first |
| 429 | Quota exhausted | Wait, then retry; check the email log in Admin → Watchlist |
| Nothing arrives, log says `sent` | Spam folder / receiver policy | Check spam; complete SPF/DKIM for your domain |
