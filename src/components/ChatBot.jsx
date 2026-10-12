import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext.jsx'

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, '0')
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const money = (n) => '₹' + Number(n).toLocaleString('en-IN')
const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

/** Understands: 2026-10-12, 12/10/2026, today, tomorrow, weekend, "2 nights". */
function parseDates(text) {
  const t = text.toLowerCase()
  const found = []
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) found.push(`${m[1]}-${m[2]}-${m[3]}`)
  for (const m of t.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g)) found.push(`${m[3]}-${pad(m[2])}-${pad(m[1])}`)
  const now = new Date()
  if (/day after tomorrow/.test(t)) found.push(fmt(addDays(now, 2)))
  else if (/tomorrow/.test(t)) found.push(fmt(addDays(now, 1)))
  else if (/today|tonight/.test(t)) found.push(fmt(now))
  if (/weekend/.test(t) && !found.length) {
    const d = addDays(now, (6 - now.getDay() + 7) % 7 || 7)
    found.push(fmt(d), fmt(addDays(d, 2)))
  }
  if (!found.length) return null
  found.sort()
  const nights = Number((t.match(/(\d+)\s*nights?/) || [])[1]) || 1
  if (found.length >= 2 && found[0] !== found[1]) return { checkIn: found[0], checkOut: found[1] }
  return { checkIn: found[0], checkOut: fmt(addDays(new Date(found[0] + 'T00:00:00'), nights)) }
}

function parseFilters(text) {
  const t = text.toLowerCase()
  const f = {}
  const g = t.match(/(\d+)\s*(guest|people|person|adult|pax|member)/)
  if (g) f.guests = Number(g[1])
  const ty = t.match(/\b(single|double|deluxe|suite)\b/)
  if (ty) f.type = ty[1].toUpperCase()
  const p = t.match(/(?:under|below|less than|within|max)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/)
  if (p) f.maxPrice = Number(p[1].replace(/,/g, ''))
  return f
}

const HELP = 'I can help with:\n• Room availability for your dates\n• Room types & prices\n• Your bookings\n• Cancellation, payment & check-in info\n\nTry: "rooms for 2 guests tomorrow for 2 nights"'

/* ---------- brain ---------- */
async function reply(text, { user }) {
  const t = text.toLowerCase().trim()

  if (/^(hi|hello|hey|hola|namaste|good (morning|evening|afternoon))\b/.test(t))
    return { text: `Hello${user ? ' ' + user.name.split(' ')[0] : ''}! 👋 How can I help with your stay?` }
  if (/thank|thx/.test(t)) return { text: "You're welcome! Anything else I can help with? 😊" }

  if (/how (do|to|can).*(book|reserve)|steps to book|booking process/.test(t))
    return { text: '1️⃣ Pick check-in & check-out dates on the Rooms page\n2️⃣ Filter by type, guests or price\n3️⃣ Click "Book now" on a room\n4️⃣ Confirm the total — you get a booking ID and payment reference instantly.\n\nYou need to be logged in to book.', action: { label: 'Go to rooms', to: '/' } }

  if (/cancel|refund/.test(t))
    return { text: 'You can cancel any confirmed booking from "My Bookings" up to the day before check-in. The payment is marked as REFUNDED automatically.', action: { label: 'Open My Bookings', to: '/my-bookings' } }

  if (/check.?in time|check.?out time|what time|timing/.test(t))
    return { text: 'Standard check-in is from 12:00 PM and check-out is by 11:00 AM. Need early check-in? Please contact the front desk.' }

  if (/pay|card|upi/.test(t) && !/available/.test(t))
    return { text: 'Payment is recorded when you confirm a booking. This demo uses a simulated gateway — each booking gets a payment reference like PAY-XXXXXXXX.' }

  if (/contact|phone|call|email address|address|reception|front desk/.test(t))
    return { text: 'Front desk is open 24×7 (demo contact: front-desk@grandstay.example).' }

  if (/my (booking|reservation)|booking status|upcoming (stay|booking)/.test(t)) {
    if (!user) return { text: 'Please log in so I can look up your bookings.', action: { label: 'Login', to: '/login' } }
    try {
      const { data } = await api.get('/bookings/my')
      if (!data.length) return { text: "You don't have any bookings yet. Tell me your dates and I'll find a room!" }
      const lines = data.slice(0, 5).map((b) => `#${b.id} · Room ${b.roomNumber} · ${b.checkIn} → ${b.checkOut} · ${b.status}`)
      return { text: 'Your latest bookings:\n' + lines.join('\n'), action: { label: 'Manage bookings', to: '/my-bookings' } }
    } catch (e) { return { text: errMsg(e) } }
  }

  const dates = parseDates(t)
  const filters = parseFilters(t)
  const wantsAvail = /available|availability|vacan|free room|find (a )?room|search|book (a )?room|stay|rooms? (for|on|from)/.test(t)

  if (dates || (wantsAvail && !/type|price|cost|rate/.test(t))) {
    if (!dates)
      return { text: 'Sure! Which dates? For example:\n"rooms 2026-10-12 to 2026-10-14 for 2 guests"\nor "double room tomorrow for 2 nights".' }
    if (new Date(dates.checkIn + 'T00:00:00') < new Date(fmt(new Date()) + 'T00:00:00'))
      return { text: 'That check-in date is in the past — please give me a future date.' }
    try {
      const params = { ...dates, ...filters }
      const { data } = await api.get('/rooms', { params })
      const n = nightsBetween(dates.checkIn, dates.checkOut)
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString()
      if (!data.length)
        return { text: `😕 No rooms are free from ${dates.checkIn} to ${dates.checkOut}${filters.type ? ' for ' + filters.type.toLowerCase() : ''}. Try different dates or a different room type.` }
      return {
        text: `🎉 ${data.length} room${data.length > 1 ? 's' : ''} available for ${n} night${n > 1 ? 's' : ''} (${dates.checkIn} → ${dates.checkOut}):`,
        rooms: data.slice(0, 4).map((r) => ({ ...r, total: r.pricePerNight * n })),
        action: { label: 'View & book on these dates', to: '/?' + qs }
      }
    } catch (e) { return { text: errMsg(e) } }
  }

  if (/price|cost|rate|cheap|tariff|how much|room type|types|rooms|suite|deluxe|single|double|budget/.test(t)) {
    try {
      const { data } = await api.get('/rooms', { params: filters })
      if (!data.length) return { text: 'No rooms match that. Try a higher budget or a different type.' }
      const byType = {}
      data.forEach((r) => {
        const x = (byType[r.type] ||= { count: 0, min: Infinity, cap: 0 })
        x.count++; x.min = Math.min(x.min, Number(r.pricePerNight)); x.cap = Math.max(x.cap, r.capacity)
      })
      const lines = Object.entries(byType).map(([ty, x]) => `• ${ty}: from ${money(x.min)}/night · up to ${x.cap} guests · ${x.count} room${x.count > 1 ? 's' : ''}`)
      return { text: 'Here are our rooms:\n' + lines.join('\n') + '\n\nGive me dates and I\'ll check availability.', action: { label: 'Browse all rooms', to: '/' } }
    } catch (e) { return { text: errMsg(e) } }
  }

  return { text: "I'm not sure about that yet 🤔\n\n" + HELP }
}

/* ---------- component ---------- */
const CHIPS = ['Check availability', 'Room types & prices', 'Cancellation policy', 'How to book', 'My bookings']

export default function ChatBot() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(true)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: "Hi! I'm Stay Assistant 🤖\nAsk me about availability, prices or your bookings." }
  ])
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing, open])

  const send = async (raw) => {
    const text = (raw ?? input).trim()
    if (!text || typing) return
    setInput('')
    setMsgs((m) => [...m, { from: 'user', text }])
    setTyping(true)
    const [res] = await Promise.all([reply(text, { user }), new Promise((r) => setTimeout(r, 450))])
    setTyping(false)
    setMsgs((m) => [...m, { from: 'bot', ...res }])
  }

  const go = (to) => { nav(to); if (window.innerWidth < 640) setOpen(false) }

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat assistant">
          <div className="chat-head">
            <div className="chat-avatar">🤖</div>
            <div>
              <strong>Stay Assistant</strong>
              <small><span className="dot" /> Online · replies instantly</small>
            </div>
            <button className="chat-x" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble-row ${m.from}`}>
                <div className={`bubble ${m.from}`}>
                  {m.text}
                  {m.rooms && (
                    <div className="mini-rooms">
                      {m.rooms.map((r) => (
                        <div className="mini-room" key={r.id}>
                          <div><strong>Room {r.roomNumber}</strong> <span className="badge">{r.type}</span></div>
                          <small>👥 {r.capacity} · {money(r.pricePerNight)}/night · total {money(r.total)}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.action && <button className="chat-action" onClick={() => go(m.action.to)}>{m.action.label} →</button>}
                </div>
              </div>
            ))}
            {typing && <div className="bubble-row bot"><div className="bubble bot typing"><i /><i /><i /></div></div>}
            <div ref={endRef} />
          </div>

          <div className="chips">
            {CHIPS.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}
          </div>

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send() }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" maxLength={300} />
            <button disabled={!input.trim() || typing} aria-label="Send">➤</button>
          </form>
        </div>
      )}

      <button className="chat-fab" onClick={() => { setOpen(!open); setUnread(false) }} aria-label="Open chat assistant">
        {open ? '✕' : '💬'}
        {unread && !open && <span className="fab-dot" />}
      </button>
    </>
  )
}
