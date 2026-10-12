import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useUI } from '../ui.jsx'

const money = (n) => '₹' + Number(n).toLocaleString('en-IN')

export default function MyBookings() {
  const { toast, confirm } = useUI()
  const [items, setItems] = useState(null)

  const load = () => api.get('/bookings/my').then((r) => setItems(r.data)).catch((e) => { setItems([]); toast(errMsg(e), 'error') })
  useEffect(() => { load() }, []) // eslint-disable-line

  const cancel = async (b) => {
    const ok = await confirm({
      title: 'Cancel this booking?',
      message: `Room ${b.roomNumber}, ${b.checkIn} → ${b.checkOut}. Your payment of ${money(b.totalPrice)} will be refunded.`,
      confirmText: 'Yes, cancel booking',
      danger: true
    })
    if (!ok) return
    try { await api.put(`/bookings/${b.id}/cancel`); toast('Booking cancelled and refunded'); load() } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <>
      <h2 className="page-title">My Bookings</h2>
      {items === null && <div className="card skeleton" style={{ height: 160 }} />}
      {items?.length === 0 && (
        <div className="card empty reveal">
          <div className="empty-icon">🧳</div><h3>No bookings yet</h3>
          <p className="muted">Find a room and your trips will show up here.</p>
          <Link to="/" className="btn">Browse rooms</Link>
        </div>
      )}
      {items?.length > 0 && (
        <div className="table-wrap reveal">
          <table>
            <thead><tr><th>#</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Guests</th><th>Total</th><th>Status</th><th>Payment</th><th></th></tr></thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td><td>{b.roomNumber} ({b.roomType})</td><td>{b.checkIn}</td><td>{b.checkOut}</td>
                  <td>{b.guests}</td><td>{money(b.totalPrice)}</td>
                  <td><span className={`badge ${b.status.toLowerCase()}`}>{b.status}</span></td>
                  <td>{b.paymentStatus}</td>
                  <td>{b.status === 'CONFIRMED' && <button className="btn small danger" onClick={() => cancel(b)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
