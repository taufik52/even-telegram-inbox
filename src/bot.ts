// Telegram Bot API client (fallback backend) + clearly-labelled mock mode.
//
// Live mode needs a bot token in `.env.local` as VITE_TELEGRAM_BOT_TOKEN
// (see .env.example). The token is only ever read at runtime in the
// companion webview — it is never committed and never baked into the .ehpk.
// Without a token the inbox runs on mock messages, and EVERY surface
// (glasses text, web UI, demo video) labels them MOCK.

export const QUICK_REPLY_TEXT = "Got it — I'll reply soon."

export interface InboxMessage {
  updateId: number
  messageId: number
  chatId: number
  chatTitle: string
  fromName: string
  text: string
  date: number // unix seconds
  replied: boolean
  mock: boolean
}

interface TgUpdate {
  update_id: number
  message?: {
    message_id: number
    date: number
    text?: string
    caption?: string
    chat: { id: number; title?: string; first_name?: string; username?: string }
    from?: { first_name?: string; username?: string }
  }
}

function chatTitleOf(msg: NonNullable<TgUpdate['message']>): string {
  const c = msg.chat
  return c.title ?? c.first_name ?? c.username ?? `chat ${c.id}`
}

function fromNameOf(msg: NonNullable<TgUpdate['message']>): string {
  return msg.from?.first_name ?? msg.from?.username ?? chatTitleOf(msg)
}

/** Clearly fake inbox content, used ONLY when no bot token is configured. */
export function mockMessages(nowSeconds: number): InboxMessage[] {
  const at = (minutesAgo: number) => nowSeconds - minutesAgo * 60
  return [
    {
      updateId: 9001,
      messageId: 101,
      chatId: -1001,
      chatTitle: 'Family',
      fromName: 'Maya',
      text: 'Dinner at 7 tonight — bring the salad, I already bought the bread.',
      date: at(4),
      replied: false,
      mock: true,
    },
    {
      updateId: 9002,
      messageId: 102,
      chatId: -1002,
      chatTitle: 'Hackathon Team',
      fromName: 'Reno',
      text: 'Demo video is rendering now, will upload the final cut in 20 minutes.',
      date: at(11),
      replied: false,
      mock: true,
    },
    {
      updateId: 9003,
      messageId: 103,
      chatId: -1003,
      chatTitle: 'Dimas',
      fromName: 'Dimas',
      text: 'Can you review the PR before standup tomorrow? Two files only.',
      date: at(26),
      replied: false,
      mock: true,
    },
    {
      updateId: 9004,
      messageId: 104,
      chatId: -1004,
      chatTitle: 'Gym Buddies',
      fromName: 'Sinta',
      text: 'Leg day moved to Thursday, same time. Who is in?',
      date: at(48),
      replied: false,
      mock: true,
    },
  ]
}

export interface BotClient {
  readonly mode: 'live' | 'mock'
  /** New messages since the last poll (empty array when nothing new). */
  poll(): Promise<InboxMessage[]>
  /** Send the quick reply to a message's chat. Returns true on success. */
  sendQuickReply(msg: InboxMessage): Promise<boolean>
}

export function createBotClient(token: string | undefined): BotClient {
  if (!token) {
    let served = false
    return {
      mode: 'mock',
      async poll() {
        if (served) return []
        served = true
        return mockMessages(Math.floor(Date.now() / 1000))
      },
      async sendQuickReply(msg: InboxMessage) {
        // Mock "send": pretend the reply went out after a beat.
        await new Promise(r => setTimeout(r, 300))
        msg.replied = true
        return true
      },
    }
  }

  const base = `https://api.telegram.org/bot${token}`
  let offset = 0

  return {
    mode: 'live',
    async poll() {
      const url = `${base}/getUpdates?offset=${offset}&timeout=0&allowed_updates=${encodeURIComponent(JSON.stringify(['message']))}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`getUpdates failed: HTTP ${res.status}`)
      const data = (await res.json()) as { ok: boolean; result: TgUpdate[] }
      if (!data.ok || !Array.isArray(data.result)) throw new Error('getUpdates: bad response')
      const out: InboxMessage[] = []
      for (const u of data.result) {
        offset = Math.max(offset, u.update_id + 1)
        const m = u.message
        if (!m) continue
        const text = (m.text ?? m.caption ?? '').trim()
        if (!text) continue
        out.push({
          updateId: u.update_id,
          messageId: m.message_id,
          chatId: m.chat.id,
          chatTitle: chatTitleOf(m),
          fromName: fromNameOf(m),
          text,
          date: m.date,
          replied: false,
          mock: false,
        })
      }
      return out
    },
    async sendQuickReply(msg: InboxMessage) {
      const res = await fetch(`${base}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: msg.chatId, text: QUICK_REPLY_TEXT }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { ok: boolean }
      if (data.ok) msg.replied = true
      return data.ok
    },
  }
}
