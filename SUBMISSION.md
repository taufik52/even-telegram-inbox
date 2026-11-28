# TG Heads — Submission (Even Realities, Messaging & News / Telegram)

## Description

TG Heads brings Telegram triage to Even G2 glasses. Unread messages appear
one card at a time on the 576×288 display — Up/Down to move between
messages, Tap to open and send a quick reply, Double-tap to exit. A
companion bot delivers the inbox via the Telegram Bot API, so no phone is
needed to stay on top of chats. Built for heavy Telegram users who want
glanceable, hands-light triage. Track: Messaging & News / Telegram. Demo
recorded in the Even Hub simulator.

## Honesty notes (please read)

- **Simulator demo only.** No G2 glasses hardware was available, so the
  demo was recorded in the Even Hub simulator. It is NOT an on-device or
  hands-free demo.
- **Mock data in this demo.** No bot token was available at recording time,
  so the inbox shows clearly labelled MOCK messages and the quick reply is
  simulated locally. With a bot token in `.env.local`
  (`VITE_TELEGRAM_BOT_TOKEN`) the same build polls real `getUpdates` and
  sends a real `sendMessage` quick reply — no code change needed.
- **Scope:** Bot API fallback only. No MTProto, no voice/STT, no AI drafts.

## How to run

```bash
npm install
cp .env.example .env.local   # add VITE_TELEGRAM_BOT_TOKEN for live mode
npm run dev
xvfb-run -a node node_modules/@evenrealities/evenhub-simulator/bin/index.js --automation-port 9898 http://localhost:5173
npm run pack   # → tgheads.ehpk
```

## Feature requests (max 5)

1. Push/background updates for messaging apps instead of polling — so an
   inbox can wake on a new message without a 10-second poll loop.
2. On-glasses text input beyond preset quick replies — even a small
   canned-phrase picker would make replies far more useful.
3. Text-measurement / auto-fit API so long messages paginate cleanly on
   the 576×288 display instead of being truncated by the app.
4. Notification-listener API to react to incoming messages without polling.
5. Haptic confirmation event after a send completes, so the wearer knows
   a reply went out without looking at the phone.
