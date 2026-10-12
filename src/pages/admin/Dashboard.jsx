import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../../api'
import { useUI, CountUp } from '../../ui.jsx'
import { addDays, money, todayStr } from './common.js'

function MiniList({ title, items, empty }) {
  return (
    <div className="card">
      <h3>{title} <span className="badge">{items.length}</span></h3>
      {items.length === 0 ? <p className="muted">{empty}</p> : items.map((b) => (
        <div className="li" key={b.id}>
          <div><b>{b.guestName}</b><small className="muted"> · Room {b.roomNumber}</small></div>
          <small className="muted">{b.guests} guest{b.guests > 1 ? 's' : ''}</small>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { toast } = useUI()
  const [d, setD] = useState(null)

  useEffect(() => {
    const t = todayStr()
    Promise.all([
      api.get('/admin/stats'), api.get('/admin/bookings'), api.get('/admin/rooms'),
      api.get('/admin/occupancy', { params: { from: t, to: addDays(t, 1) } })
    ]).then(([s, b, r, o]) => setD({ stats: s.data, bookings: b.data, rooms: r.data, occ: o.data }))
      .catch((e) => toast(errMsg(e), 'error'))
  }, []) // eslint-disable-line

  if (!d) return <div className="grid stats">{[0, 1, 2, 3].map((i) => <div key={i} className="card skeleton" style={{ height: 120 }} />)}</div>

  const t = todayStr()
  const active = d.rooms.filter((r) => r.active)
  const bookedNow = d.occ.filter((o) => o.room.active && o.bookings.length > 0).length
  const free = active.length - bookedNow
  const rate = active.length ? Math.round((bookedNow * 100) / active.length) : 0
  const confirmed = d.bookings.filter((b) => b.status === 'CONFIRMED')
  const arrivals = confirmed.filter((b) => b.checkIn === t)
  const departures = confirmed.filter((b) => b.checkOut === t)
  const byType = {}
  confirmed.forEach((b) => { byType[b.roomType] = (byType[b.roomType] || 0) + Number(b.totalPrice) })
  const maxRev = Math.max(1, ...Object.values(byType))

  const cards = [
    ['🏨', 'Active rooms', active.length, ''],
    ['🟢', 'Free tonight', free, ''],
    ['📖', 'Confirmed bookings', d.stats.confirmedBookings, ''],
    ['💰', 'Revenue', d.stats.revenue, '₹'],
    ['👥', 'Guests', d.stats.totalUsers, ''],
    ['❌', 'Cancelled', d.stats.cancelledBookings, '']
  ]

  return (
    <>
      <div className="grid stats">
        {cards.map(([icon, label, value, prefix], i) => (
          <div className="card stat reveal" style={{ '--i': i }} key={label}>
            <div className="stat-icon">{icon}</div>
            <div className="muted">{label}</div>
            <h2><CountUp value={value} prefix={prefix} /></h2>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card reveal" style={{ '--i': 6 }}>
          <h3>Tonight's occupancy</h3>
          <div className="occ-summary">
            <div className="ring" style={{ '--p': rate }}><span>{rate}%</span></div>
            <div>
              <p><b>{bookedNow}</b> of <b>{active.length}</b> active rooms occupied</p>
              <p className="muted">{free} available to sell</p>
              <Link to="/admin/occupancy" className="btn small ghost">Open calendar</Link>
            </div>
          </div>
        </div>

        <div className="card reveal" style={{ '--i': 7 }}>
          <h3>Revenue by room type</h3>
          {Object.keys(byType).length === 0 ? <p className="muted">No revenue yet.</p> : Object.entries(byType).map(([type, v]) => (
            <div className="bar-row" key={type}>
              <span>{type}</span>
              <div className="bar"><i style={{ width: `${(v / maxRev) * 100}%` }} /></div>
              <b>{money(v)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <MiniList title="Arrivals today" items={arrivals} empty="No check-ins today." />
        <MiniList title="Departures today" items={departures} empty="No check-outs today." />
      </div>

      <h3 style={{ marginTop: 26 }}>Recent bookings</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {d.bookings.slice(0, 6).map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td><td>{b.guestName}</td><td>{b.roomNumber}</td>
                <td>{b.checkIn} → {b.checkOut}</td><td>{money(b.totalPrice)}</td>
                <td><span className={`badge ${b.status.toLowerCase()}`}>{b.status}</span></td>
              </tr>
            ))}
            {d.bookings.length === 0 && <tr><td colSpan="6" className="muted">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
