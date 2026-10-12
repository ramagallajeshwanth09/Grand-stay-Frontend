import { useEffect, useMemo, useState } from 'react'
import api, { errMsg } from '../../api'
import { useUI } from '../../ui.jsx'
import { downloadCsv, money } from './common.js'

export default function BookingsPanel() {
  const { toast, confirm } = useUI()
  const [items, setItems] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const load = () => api.get('/admin/bookings').then((r) => setItems(r.data)).catch((e) => { setItems([]); toast(errMsg(e), 'error') })
  useEffect(() => { load() }, []) // eslint-disable-line

  const filtered = useMemo(() => (items || []).filter((b) =>
    (!status || b.status === status) &&
    (!q || `${b.id} ${b.guestName} ${b.guestEmail} ${b.roomNumber}`.toLowerCase().includes(q.toLowerCase()))
  ), [items, q, status])

  const cancel = async (b) => {
    const ok = await confirm({ title: `Cancel booking #${b.id}?`, message: `${b.guestName} · Room ${b.roomNumber} · ${b.checkIn} → ${b.checkOut}. The payment will be marked as refunded.`, confirmText: 'Cancel booking', danger: true })
    if (!ok) return
    try { await api.put(`/admin/bookings/${b.id}/cancel`); toast('Booking cancelled'); load() } catch (e) { toast(errMsg(e), 'error') }
  }

  const exportCsv = () => downloadCsv('bookings.csv', [
    ['ID', 'Guest', 'Email', 'Room', 'Check-in', 'Check-out', 'Guests', 'Total', 'Status', 'Payment', 'Reference'],
    ...filtered.map((b) => [b.id, b.guestName, b.guestEmail, b.roomNumber, b.checkIn, b.checkOut, b.guests, b.totalPrice, b.status, b.paymentStatus, b.paymentReference])
  ])

  if (items === null) return <div className="card skeleton" style={{ height: 260 }} />
  return (
    <>
      <div className="toolbar">
        <input className="grow" placeholder="Search guest, email, room or booking #…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option><option>CONFIRMED</option><option>CANCELLED</option>
        </select>
        <button className="btn ghost" onClick={exportCsv} disabled={!filtered.length}>⬇ Export CSV</button>
      </div>
      <p className="muted">{filtered.length} of {items.length} bookings</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Guest</th><th>Room</th><th>Dates</th><th>Guests</th><th>Total</th><th>Status</th><th>Payment</th><th>Booked on</th><th></th></tr></thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.guestName}<br /><small className="muted">{b.guestEmail}</small></td>
                <td>{b.roomNumber}</td><td>{b.checkIn} → {b.checkOut}</td><td>{b.guests}</td><td>{money(b.totalPrice)}</td>
                <td><span className={`badge ${b.status.toLowerCase()}`}>{b.status}</span></td>
                <td>{b.paymentStatus}<br /><small className="muted">{b.paymentReference}</small></td>
                <td><small>{new Date(b.createdAt).toLocaleString('en-IN')}</small></td>
                <td>{b.status === 'CONFIRMED' && <button className="btn small danger" onClick={() => cancel(b)}>Cancel</button>}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="10" className="muted">No bookings match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
