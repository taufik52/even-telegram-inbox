// Companion web UI for TG Heads (the phone-side view of the glasses app).
// Mirrors the glasses controls so the demo can be driven from here too:
// click a row to select, "Open + quick reply" to act, "Back" to return.
import type { InboxMessage } from './bot'

export type UiStatus = 'connecting' | 'live' | 'mock' | 'error'

export interface InboxState {
  messages: InboxMessage[]
  selected: number
  view: 'list' | 'detail'
  mode: 'live' | 'mock'
}

export interface UiCallbacks {
  onSelect: (i: number) => void
  onOpen: (i: number) => void
  onBack: () => void
  onRefresh: () => void
}

let statusEl: HTMLDivElement
let listEl: HTMLDivElement
let detailEl: HTMLDivElement
let callbacks: UiCallbacks

function hhmm(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function mountUi(cb: UiCallbacks) {
  callbacks = cb
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <main class="panel">
      <header>
        <h1>Telegram Inbox</h1>
        <div id="status" class="status status-connecting">Connecting…</div>
      </header>
      <section id="list" class="list" aria-label="Unread messages"></section>
      <section id="detail" class="detail" aria-live="polite"></section>
      <footer>
        Scroll: move · Tap: open + quick reply · Long-press: refresh · Double-tap: exit.
        <span id="mocknote"></span>
      </footer>
    </main>
  `
  statusEl = app.querySelector<HTMLDivElement>('#status')!
  listEl = app.querySelector<HTMLDivElement>('#list')!
  detailEl = app.querySelector<HTMLDivElement>('#detail')!
  injectStyles()
}

export function setStatus(kind: UiStatus, text: string) {
  if (!statusEl) return
  statusEl.className = `status status-${kind}`
  statusEl.textContent = text
}

export function renderInbox(state: InboxState) {
  if (!listEl) return
  const { messages, selected, view, mode } = state

  const note = document.querySelector<HTMLSpanElement>('#mocknote')
  if (note) {
    note.textContent =
      mode === 'mock'
        ? ' MOCK DATA — demo only, no bot token configured.'
        : ''
  }

  if (messages.length === 0) {
    listEl.innerHTML = `<div class="empty">No unread messages.<br/>Long-press the glasses (or Refresh below) to poll again.</div>`
  } else {
    listEl.innerHTML = messages
      .map((m, i) => {
        const flag = m.replied ? '✓ replied' : '● unread'
        const sel = i === selected ? ' selected' : ''
        return `<button class="row${sel}" data-i="${i}">
          <span class="row-flag">${flag}</span>
          <span class="row-from">${esc(m.fromName)} · ${esc(m.chatTitle)} · ${hhmm(m.date)}</span>
          <span class="row-text">${esc(m.text)}</span>
        </button>`
      })
      .join('')
    listEl.querySelectorAll<HTMLButtonElement>('.row').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.i)
        callbacks.onSelect(i)
        callbacks.onOpen(i)
      })
    })
  }

  if (view === 'detail' && messages[selected]) {
    const m = messages[selected]
    detailEl.innerHTML = `
      <div class="detail-head">${esc(m.fromName)} · ${esc(m.chatTitle)} · ${hhmm(m.date)}</div>
      <div class="detail-text">${esc(m.text)}</div>
      <div class="detail-actions">
        <span class="detail-reply">${m.replied ? '✓ Quick reply sent' : 'Quick reply: “Got it — I’ll reply soon.”'}</span>
        <button id="back">← Back to list</button>
        <button id="refresh">Refresh</button>
      </div>
    `
    detailEl.querySelector<HTMLButtonElement>('#back')!.addEventListener('click', callbacks.onBack)
    detailEl.querySelector<HTMLButtonElement>('#refresh')!.addEventListener('click', callbacks.onRefresh)
  } else {
    detailEl.innerHTML = `
      <div class="detail-hint">Select a message to open it. Opening sends the quick reply.</div>
      <div class="detail-actions"><button id="refresh">Refresh</button></div>
    `
    detailEl.querySelector<HTMLButtonElement>('#refresh')!.addEventListener('click', callbacks.onRefresh)
  }
}

function injectStyles() {
  // ER brand dark-theme surfaces: #232323 / #2E2E2E / #3E3E3E.
  // ER OS green (#3CFA44) + signal red (#FF453A) for state chips.
  const css = `
    :root { color-scheme: dark; }
    html, body { margin: 0; height: 100%; background: #232323; color: #E5E5E5;
      font: 16px/1.4 -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif;
      touch-action: manipulation; -webkit-text-size-adjust: 100%;
      overscroll-behavior: none; }
    #app { display: flex; height: 100%; }
    .panel { display: flex; flex-direction: column; gap: 16px;
      width: 100%; max-width: 640px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
    header { display: flex; align-items: center; justify-content: space-between; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.02em; }
    .status { font-size: 12px; padding: 4px 10px; border-radius: 999px;
      border: 1px solid transparent; letter-spacing: 0.04em; text-transform: uppercase; }
    .status-connecting { color: #A7A7A7; border-color: #3E3E3E; }
    .status-live       { color: #3CFA44; border-color: #3CFA44; background: rgba(60,250,68,0.08); }
    .status-mock       { color: #FFD60A; border-color: #FFD60A; background: rgba(255,214,10,0.08); }
    .status-error      { color: #FF453A; border-color: #FF453A; background: rgba(255,69,58,0.08); }
    .list { display: flex; flex-direction: column; gap: 8px; }
    .empty { background: #2E2E2E; border: 1px solid #3E3E3E; border-radius: 12px;
      padding: 20px; color: #A7A7A7; font-size: 14px; line-height: 1.5; }
    .row { display: flex; flex-direction: column; gap: 2px; text-align: left;
      background: #2E2E2E; border: 1px solid #3E3E3E; border-radius: 12px;
      padding: 12px 14px; color: #E5E5E5; cursor: pointer; font: inherit; }
    .row.selected { border-color: #3CFA44; }
    .row-flag { font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: #3CFA44; }
    .row-from { font-size: 13px; font-weight: 600; }
    .row-text { font-size: 14px; color: #A7A7A7; overflow: hidden;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .detail { background: #2E2E2E; border: 1px solid #3E3E3E; border-radius: 12px;
      padding: 16px 20px; min-height: 120px; }
    .detail-head { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .detail-text { font-size: 16px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .detail-hint { font-size: 14px; color: #A7A7A7; }
    .detail-actions { display: flex; gap: 12px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
    .detail-reply { font-size: 13px; color: #3CFA44; }
    .detail-actions button { background: #3E3E3E; color: #E5E5E5; border: 1px solid #3E3E3E;
      border-radius: 8px; padding: 8px 14px; font: inherit; font-size: 14px; cursor: pointer; }
    footer { font-size: 12px; color: #7B7B7B; text-align: center; line-height: 1.6; }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
