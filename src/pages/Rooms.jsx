import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext.jsx'
import { useUI } from '../ui.jsx'

const pad = (n) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const money = (n) => '₹' + Number(n).toLocaleString('en-IN')
const ICONS = { SINGLE: '🛏️', DOUBLE: '🛌', DELUXE: '🛋️', SUITE: '👑' }

export default function Rooms() {
  const { user } = useAuth()
  const { toast, confirm } = useUI()
  const nav = useNavigate()
  const [params] = useSearchParams()

  const fromParams = () => ({
    checkIn: params.get('checkIn') || '', checkOut: params.get('checkOut') || '',
    guests: params.get('guests') || 1, type: params.get('type') || '',
    minPrice: '', maxPrice: params.get('maxPrice') || ''
  })

  const [filters, setFilters] = useState(fromParams)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  const doSearch = async (f = filters) => {
    setLoading(true)
    try {
      const p = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
      setRooms((await api.get('/rooms', { params: p })).data)
    } catch (err) {
      setRooms([])
      toast(errMsg(err), 'error')
    } finally { setLoading(false) }
  }

  // liquid-glass refraction uses backdrop-filter:url(#...) which only Chromium supports
  useEffect(() => {
    const chromium = navigator.userAgentData?.brands?.some((x) => /Chromium/i.test(x.brand))
    if (chromium && window.CSS?.supports?.('backdrop-filter', 'url(#liquid-glass)')) {
      document.documentElement.classList.add('lg-refract')
    }
  }, [])

  // light highlight that follows the pointer across the glass bar
  const glassMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const glassLeave = (e) => {
    e.currentTarget.style.removeProperty('--mx')
    e.currentTarget.style.removeProperty('--my')
  }

  // first load AND whenever the chatbot navigates here with new dates
  useEffect(() => {
    const f = fromParams()
    setFilters(f)
    doSearch(f)
  }, [params.toString()]) // eslint-disable-line

  const book = async (room) => {
    if (!user) return nav('/login')
    if (!filters.checkIn || !filters.checkOut) return toast('Select check-in and check-out dates first.', 'error')
    const guests = Number(filters.guests) || 1
    if (guests > room.capacity) return toast(`Room ${room.roomNumber} fits up to ${room.capacity} guests.`, 'error')
    const nights = nightsBetween(filters.checkIn, filters.checkOut)
    const total = nights * room.pricePerNight

    const ok = await confirm({
      title: 'Confirm your booking',
      confirmText: `Pay ${money(total)}`,
      body: (
        <div className="summary">
          <div><span>Room</span><b>{room.roomNumber} · {room.type}</b></div>
          <div><span>Check-in</span><b>{filters.checkIn}</b></div>
          <div><span>Check-out</span><b>{filters.checkOut}</b></div>
          <div><span>Guests</span><b>{guests}</b></div>
          <div><span>{money(room.pricePerNight)} × {nights} night{nights > 1 ? 's' : ''}</span><b className="total">{money(total)}</b></div>
        </div>
      )
    })
    if (!ok) return

    try {
      const { data } = await api.post('/bookings', { roomId: room.id, checkIn: filters.checkIn, checkOut: filters.checkOut, guests })
      toast(`Booking #${data.id} confirmed · ${data.paymentReference}`)
    } catch (err) {
      toast(errMsg(err), 'error')
    }
    doSearch()
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Grand Stay</p>
        <h1>Stay somewhere<br /><span className="grad">unforgettable.</span></h1>
        <p className="sub">Live availability, instant confirmation. Questions? The assistant in the corner has answers.</p>
      </section>

      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.007 0.011" numOctaves="2" seed="9" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.5" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="30" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <form
        className="card filters search-bar liquid reveal"
        onPointerMove={glassMove}
        onPointerLeave={glassLeave}
        onSubmit={(e) => { e.preventDefault(); doSearch() }}
      >
        <label>Check-in<input type="date" min={today()} value={filters.checkIn} onChange={set('checkIn')} /></label>
        <label>Check-out<input type="date" min={filters.checkIn || today()} value={filters.checkOut} onChange={set('checkOut')} /></label>
        <label>Guests<input type="number" min="1" value={filters.guests} onChange={set('guests')} /></label>
        <label>Type
          <select value={filters.type} onChange={set('type')}>
            <option value="">Any</option>
            {['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>Min ₹<input type="number" min="0" value={filters.minPrice} onChange={set('minPrice')} /></label>
        <label>Max ₹<input type="number" min="0" value={filters.maxPrice} onChange={set('maxPrice')} /></label>
        <button className="btn">Search</button>
      </form>

      {loading ? (
        <div className="grid">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card skeleton" />)}</div>
      ) : rooms.length === 0 ? (
        <div className="card empty reveal"><div className="empty-icon">🔍</div><h3>No rooms match</h3><p className="muted">Try different dates, fewer filters or a higher budget.</p></div>
      ) : (
        <div className="grid">
          {rooms.map((r, i) => (
            <div key={r.id} className={`card room reveal t-${r.type}`} style={{ '--i': i }}>
              <div className="room-img">
                {r.imageUrl ? <img src={r.imageUrl} alt={r.roomNumber} /> : <span className="float-icon">{ICONS[r.type] || '🛏️'}</span>}
              </div>
              <div className="room-body">
                <div className="row"><h3>Room {r.roomNumber}</h3><span className="badge type">{r.type}</span></div>
                <p className="muted desc">{r.description}</p>
                <p className="cap">👥 Up to {r.capacity} guests</p>
                <div className="row">
                  <strong className="price">{money(r.pricePerNight)}<small> / night</small></strong>
                  <button className="btn small" onClick={() => book(r)}>Book now</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
