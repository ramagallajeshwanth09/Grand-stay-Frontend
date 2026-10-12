import { NavLink, Navigate, useParams } from 'react-router-dom'
import Dashboard from './admin/Dashboard.jsx'
import RoomsPanel from './admin/RoomsPanel.jsx'
import Occupancy from './admin/Occupancy.jsx'
import BookingsPanel from './admin/BookingsPanel.jsx'
import GuestsPanel from './admin/GuestsPanel.jsx'

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', Comp: Dashboard },
  { key: 'rooms', label: 'Rooms', icon: '🛏️', Comp: RoomsPanel },
  { key: 'occupancy', label: 'Occupancy', icon: '🗓️', Comp: Occupancy },
  { key: 'bookings', label: 'Bookings', icon: '📖', Comp: BookingsPanel },
  { key: 'guests', label: 'Guests', icon: '👥', Comp: GuestsPanel }
]

export default function Admin() {
  const { section = 'dashboard' } = useParams()
  const current = SECTIONS.find((s) => s.key === section)
  if (!current) return <Navigate to="/admin" replace />
  const { Comp } = current

  return (
    <div className="admin-shell">
      <aside className="admin-side card">
        <div className="admin-side-title">Admin panel</div>
        {SECTIONS.map((s) => (
          <NavLink key={s.key} to={`/admin/${s.key}`} className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}>
            <span>{s.icon}</span>{s.label}
          </NavLink>
        ))}
      </aside>
      <section className="admin-main" key={section}>
        <h2 className="page-title">{current.icon} {current.label}</h2>
        <Comp />
      </section>
    </div>
  )
}
