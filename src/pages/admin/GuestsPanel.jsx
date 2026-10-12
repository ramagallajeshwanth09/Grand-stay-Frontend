import { useEffect, useMemo, useState } from 'react'
import api, { errMsg } from '../../api'
import { useUI } from '../../ui.jsx'

export default function GuestsPanel() {
  const { toast } = useUI()
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data)).catch((e) => { setUsers([]); toast(errMsg(e), 'error') })
  }, []) // eslint-disable-line

  const filtered = useMemo(() => (users || []).filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [users, q])
  if (users === null) return <div className="card skeleton" style={{ height: 240 }} />

  return (
    <>
      <div className="toolbar"><input className="grow" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <p className="muted">{filtered.length} of {users.length} accounts</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Bookings</th></tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.name}</td><td>{u.email}</td>
                <td><span className={`badge ${u.role === 'ADMIN' ? '' : 'confirmed'}`}>{u.role}</span></td>
                <td>{u.bookings}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="5" className="muted">No accounts match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
