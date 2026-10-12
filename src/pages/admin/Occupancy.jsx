import { useEffect, useMemo, useState } from 'react'
import api, { errMsg } from '../../api'
import { useUI } from '../../ui.jsx'
import { addDays, money, todayStr } from './common.js'

function buildCells(bookings, days) {
  const cells = []
  let i = 0
  while (i < days.length) {
    const d = days[i]
    const b = bookings.find((x) => x.checkIn <= d && d < x.checkOut)
    if (b) {
      let span = 1
      while (i + span < days.length && days[i + span] < b.checkOut) span++
      cells.push({ b, span, key: `b${b.id}-${i}` })
      i += span
    } else {
      cells.push({ d, span: 1, key: `f${i}` })
      i++
    }
  }
  return cells
}

export default function Occupancy() {
  const { toast, confirm } = useUI()
  const [from, setFrom] = useState(todayStr())
  const [n, setN] = useState(14)
  const [occ, setOcc] = useState(null)

  const days = useMemo(() => Array.from({ length: n }, (_, i) => addDays(from, i)), [from, n])
  const today = todayStr()

  const load = () => {
    setOcc(null)
    api.get('/admin/occupancy', { params: { from, to: addDays(from, n) } })
      .then((r) => setOcc(r.data))
      .catch((e) => { setOcc([]); toast(errMsg(e), 'error') })
  }
  useEffect(() => { load() }, [from, n]) // eslint-disable-line

  const openBooking = async (b, roomNumber) => {
    const ok = await confirm({
      title: `Booking #${b.id} · Room ${roomNumber}`,
      confirmText: 'Cancel this booking', cancelText: 'Close', danger: true,
      body: (
        <div className="summary">
          <div><span>Guest</span><b>{b.guestName}</b></div>
          <div><span>Email</span><b>{b.guestEmail}</b></div>
          <div><span>Stay</span><b>{b.checkIn} → {b.checkOut}</b></div>
          <div><span>Guests</span><b>{b.guests}</b></div>
          <div><span>Total</span><b className="total">{money(b.totalPrice)}</b></div>
        </div>
      )
    })
    if (!ok) return
    try { await api.put(`/admin/bookings/${b.id}/cancel`); toast('Booking cancelled and refunded'); load() }
    catch (e) { toast(errMsg(e), 'error') }
  }

  const freeOnStart = occ ? occ.filter((o) => o.room.active && !o.bookings.some((b) => b.checkIn <= from && from < b.checkOut)).length : 0
  const activeCount = occ ? occ.filter((o) => o.room.active).length : 0

  return (
    <>
      <div className="toolbar">
        <button className="btn ghost" onClick={() => setFrom(addDays(from, -n))}>◀ Prev</button>
        <button className="btn ghost" onClick={() => setFrom(todayStr())}>Today</button>
        <button className="btn ghost" onClick={() => setFrom(addDays(from, n))}>Next ▶</button>
        <label className="inline">From<input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
        <label className="inline">Days
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>{[7, 14, 21, 30].map((x) => <option key={x}>{x}</option>)}</select>
        </label>
      </div>

      <div className="legend">
        <span><i className="sw free" /> Free</span>
        <span><i className="sw booked" /> Booked (click for details / cancel)</span>
        <span><i className="sw off" /> Off sale</span>
        {occ && <span className="muted">· <b>{freeOnStart}</b> of {activeCount} rooms free on {from}</span>}
      </div>

      {occ === null ? <div className="card skeleton" style={{ height: 300 }} /> : (
        <div className="table-wrap occ-wrap">
          <table className="occ">
            <thead>
              <tr>
                <th className="sticky">Room</th>
                {days.map((d) => {
                  const dt = new Date(d + 'T00:00:00')
                  const wk = dt.getDay() === 0 || dt.getDay() === 6
                  return (
                    <th key={d} className={`${d === today ? 'is-today' : ''} ${wk ? 'is-weekend' : ''}`}>
                      <small>{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</small>
                      <b>{dt.getDate()}</b>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {occ.map((o) => (
                <tr key={o.room.id}>
                  <td className="sticky">
                    <b>{o.room.roomNumber}</b> <span className={`badge type t-${o.room.type}`}>{o.room.type}</span>
                  </td>
                  {!o.room.active
                    ? <td colSpan={days.length} className="occ-off">Off sale (inactive)</td>
                    : buildCells(o.bookings, days).map((c) => c.b
                      ? <td key={c.key} colSpan={c.span} className="occ-b" title={`${c.b.guestName} · ${c.b.checkIn} → ${c.b.checkOut}`} onClick={() => openBooking(c.b, o.room.roomNumber)}>
                          <div>{c.b.guestName}</div>
                        </td>
                      : <td key={c.key} className={`occ-f ${c.d === today ? 'is-today' : ''}`} />)}
                </tr>
              ))}
              {occ.length === 0 && <tr><td className="muted">No rooms yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
