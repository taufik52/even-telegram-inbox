// TG Heads — Telegram inbox on Even G2 glasses (sprint-minimal scope).
//
// Bot API fallback ONLY: poll getUpdates for unread messages, one card per
// 576×288 screen. No MTProto, no voice/STT, no AI drafts.
//   Scroll up/down  = previous / next message
//   Tap            = open message + send quick reply (once per message)
//   Tap in detail  = back to list
//   Long press     = refresh now
//   Double-tap     = exit (system dialog)
//
// Without VITE_TELEGRAM_BOT_TOKEN the inbox runs on MOCK data — the glasses
// text, the web UI and the demo video all label it MOCK. Mock "replies" are
// simulated locally and never touch Telegram.
import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { createBotClient, QUICK_REPLY_TEXT, type InboxMessage } from './bot'
import { mountUi, setStatus, renderInbox } from './ui'

mountUi({
  onSelect: i => {
    selected = clampIndex(i)
    view = 'list'
    renderAll()
  },
  onOpen: i => {
    selected = clampIndex(i)
    void openMessage()
  },
  onBack: () => {
    view = 'list'
    renderAll()
  },
  onRefresh: () => void pollNow(),
})

const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined
const bot = createBotClient(token)
const mode = bot.mode

if (mode === 'mock') {
  setStatus('mock', 'MOCK DATA — set VITE_TELEGRAM_BOT_TOKEN in .env.local for live')
  console.warn('No VITE_TELEGRAM_BOT_TOKEN — running on labelled mock data.')
} else {
  setStatus('connecting', 'Connecting to Telegram…')
}

const bridge = await waitForEvenAppBridge()

const inbox = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 1,
  containerName: 'inbox',
  content: 'TG Inbox…',
  isEventCapture: 1,
})

const created = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [inbox] }),
)
if (created !== 0) {
  setStatus('error', `createStartUpPageContainer failed: ${created}`)
  console.error('Failed to create startup page')
}

// ── State ────────────────────────────────────────────────────────────────
let messages: InboxMessage[] = []
let selected = 0
let view: 'list' | 'detail' = 'list'

function clampIndex(i: number): number {
  if (messages.length === 0) return 0
  return Math.max(0, Math.min(messages.length - 1, i))
}

function hhmm(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function snippet(text: string, max: number): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

function unreadCount(): number {
  return messages.filter(m => !m.replied).length
}

// ── Glasses rendering (debounced — BLE render queue is slow) ─────────────
let lastRender = ''
let renderTimer: number | null = null

function glassesText(): string {
  const mockTag = mode === 'mock' ? ' · MOCK' : ''
  if (messages.length === 0) {
    return `TG INBOX${mockTag}\nNo unread messages.\nLong-press to refresh.`
  }
  const m = messages[selected]
  const head = `TG INBOX ${selected + 1}/${messages.length} · ${unreadCount()} unread${mockTag}`
  if (view === 'detail') {
    const replied = m.replied ? '\n[Reply sent ✓] · Tap: back' : `\n[Tap: back]`
    return `${head}\n${m.fromName} · ${hhmm(m.date)}\n${snippet(m.text, 170)}${replied}`
  }
  const flag = m.replied ? '✓' : '●'
  return (
    `${head}\n${flag} ${m.fromName} · ${hhmm(m.date)}\n` +
    `${snippet(m.text, 120)}\nTap: open + reply · Scroll: move`
  )
}

function scheduleGlassesRender() {
  if (renderTimer !== null) return
  renderTimer = window.setTimeout(async () => {
    renderTimer = null
    const content = glassesText()
    if (content === lastRender) return
    lastRender = content
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 1, containerName: 'inbox', content }),
    )
  }, 120)
}

function renderAll() {
  renderInbox({ messages, selected, view, mode })
  scheduleGlassesRender()
}

// ── Polling ──────────────────────────────────────────────────────────────
let polling = false

async function pollNow(): Promise<void> {
  if (polling) return
  polling = true
  try {
    const fresh = await bot.poll()
    if (fresh.length > 0) {
      const seen = new Set(messages.map(m => m.messageId))
      const added = fresh.filter(m => !seen.has(m.messageId))
      if (added.length > 0) {
        messages = [...messages, ...added]
          .sort((a, b) => b.date - a.date)
          .slice(0, 20)
        selected = clampIndex(selected)
        renderAll()
      }
    }
    setStatus(
      mode === 'mock' ? 'mock' : 'live',
      mode === 'mock'
        ? `MOCK DATA — ${messages.length} messages · set VITE_TELEGRAM_BOT_TOKEN for live`
        : `Live · ${messages.length} messages · ${unreadCount()} unread`,
    )
  } catch (err) {
    setStatus('error', `Telegram poll failed: ${(err as Error)?.message ?? err}`)
    console.error('Poll failed:', err)
  } finally {
    polling = false
  }
}

const pollTimer = window.setInterval(() => void pollNow(), 10_000)

// ── Actions ──────────────────────────────────────────────────────────────
async function openMessage(): Promise<void> {
  const m = messages[selected]
  if (!m) return
  view = 'detail'
  renderAll()
  if (!m.replied) {
    const ok = await bot.sendQuickReply(m)
    setStatus(
      mode === 'mock' ? 'mock' : 'live',
      ok
        ? `Quick reply sent to ${m.fromName}${mode === 'mock' ? ' (MOCK)' : ''}: “${QUICK_REPLY_TEXT}”`
        : `Quick reply FAILED for ${m.fromName} — tap again to retry`,
    )
    renderAll()
  }
}

function move(delta: number) {
  if (messages.length === 0) return
  selected = clampIndex(selected + delta)
  view = 'list'
  renderAll()
}

let cleanedUp = false
function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  window.clearInterval(pollTimer)
  unsubscribe()
}

// Reads the event type out of one envelope.
//
// CLICK_EVENT is 0, and protobuf omits zero-value fields on the wire, so a
// single tap arrives as an envelope whose `eventType` is `undefined`. The
// default has to be resolved INSIDE the envelope check. Writing
// `event.sysEvent?.eventType ?? OsEventTypeList.CLICK_EVENT` instead would
// read CLICK on events that carry no `sysEvent` at all.
function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

// Event routing, critical details:
//   • Taps/double-taps/lifecycle come through `event.sysEvent`.
//   • Double-tap → `shutDownPageContainer(1)` is a root-level check: it
//     must fire no matter which envelope the event arrives in, so users
//     can always exit the app. System exit confirmation dialog appears;
//     SYSTEM_EXIT_EVENT fires on confirm and we clean up there.
//   • Check DOUBLE_CLICK_EVENT before CLICK_EVENT.
const unsubscribe = bridge.onEvenHubEvent(event => {
  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    bridge.shutDownPageContainer(1)
    return
  }

  if (sysType === OsEventTypeList.SCROLL_TOP_EVENT || textType === OsEventTypeList.SCROLL_TOP_EVENT) {
    move(-1)
    return
  }

  if (sysType === OsEventTypeList.SCROLL_BOTTOM_EVENT || textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    move(1)
    return
  }

  if (sysType === OsEventTypeList.LONG_PRESS_EVENT || textType === OsEventTypeList.LONG_PRESS_EVENT) {
    setStatus(mode === 'mock' ? 'mock' : 'live', 'Refreshing…')
    void pollNow()
    return
  }

  if (sysType === OsEventTypeList.CLICK_EVENT || textType === OsEventTypeList.CLICK_EVENT) {
    if (view === 'detail') {
      view = 'list'
      renderAll()
    } else {
      void openMessage()
    }
    return
  }

  if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
    cleanup()
  }
})

window.addEventListener('beforeunload', cleanup)

// First poll right away so the glasses show messages immediately.
void pollNow()
