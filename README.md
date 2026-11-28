# TG Heads — Telegram Inbox on Even G2 Smart Glasses

**Heads Up: Even Realities Hackathon** (TVM Ventures × Daos Hub × Even Realities) ·
Track **Messaging & News** · Solo · Remote · **No G2 hardware — simulator only.**

> **Status: SPRINT MINIMAL (28 Nov 2026).** The original 7-day plan
> ([`PLAN.md`](PLAN.md)) was not executed — no code was written 23–27 Nov.
> On 28 Nov the scope was cut to the minimum below and built in one sprint.
> **Demo recorded in the Even Hub simulator. No G2 glasses were available,
> so no on-device or hands-free test was possible — the demo is a simulator
> demo, and the submission says so.**

## What this build does (minimal scope)

One unread Telegram message per screen on the 576×288 glasses display,
via the **Telegram Bot API fallback only**:

- Poll `getUpdates` → unread messages, newest first (max 20, poll every 10 s).
- **Scroll up/down** = previous / next message.
- **Tap** = open the message **and** send the quick reply
  “Got it — I’ll reply soon.” (once per message, via `sendMessage`).
- **Tap in detail view** = back to the list.
- **Long press** = refresh now. **Double-tap** = exit (system dialog).

**Out of scope for this sprint:** MTProto/GramJS, voice/STT, AI drafts,
channel digests. `src/asr/stt.ts` is the unused template stub.

## Mock mode (honesty note)

Without a bot token the app runs on **clearly labelled mock data** — the
glasses text, the web UI and the demo video all say MOCK. Mock "replies"
are simulated locally and never touch Telegram. A live demo needs the
owner's bot token (see Setup).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in VITE_TELEGRAM_BOT_TOKEN (see below)
npm run dev                  # Vite on http://localhost:5173
```

- **Bot token (live mode):** create a bot with [@BotFather](https://t.me/BotFather),
  put the token in `.env.local` as `VITE_TELEGRAM_BOT_TOKEN`. The token is
  read at runtime only — never committed, never baked into the `.ehpk`.
- **Telegram api_id / api_hash** (https://my.telegram.org/apps) are documented
  in `.env.example` for the future MTProto backend; this sprint does not use
  them.
- **Simulator:** `xvfb-run -a node node_modules/@evenrealities/evenhub-simulator/bin/index.js --automation-port 9898 http://localhost:5173`
  (needs `libwebkit2gtk-4.1-0` on the machine). Automation API:
  `GET /api/ping`, `GET /api/screenshot/glasses`,
  `POST /api/input {"action":"up"|"down"|"click"|"double_click"|"long_press"}`.

## Build & pack

```bash
npm run build   # tsc + vite build
npm run pack    # build + evenhub pack app.json dist -o tgheads.ehpk
```

## Submission

- Public repo + this README + demo video (≤ 3 min, simulator, mock-labelled).
- Description + max 5 feature requests: see `SUBMISSION.md`.
- **No API keys / session strings in repo or `.ehpk`.**
- Demo uses only the owner's own Telegram account, chats, and groups.
- Prizes in reach: Best Telegram Integration $1,000 · Track 1st Messaging &
  News $1,250 + G2 · Grand Prize $2,000. Submit by **30 Nov 2026 02:59 WIB**.
  Demo Day 3 Dec (remote demo allowed).

## Links

- Hackathon (DoraHacks): https://dorahacks.io/hackathon/even-realities/detail
- Even Hub docs: https://hub.evenrealities.com
- Templates: https://github.com/even-realities/evenhub-templates
- Research notes: `~/workspace/research_notes/even-realities-telegram-track.md`
