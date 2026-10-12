import { useEffect, useMemo, useState } from 'react'
import api, { errMsg } from '../../api'
import { useUI, Modal } from '../../ui.jsx'
import { money, TYPES } from './common.js'

const EMPTY = { roomNumber: '', type: 'SINGLE', capacity: 1, pricePerNight: '', description: '', imageUrl: '', active: true }

/** Click the price to edit it in place. Enter saves, Esc cancels. */
function PriceCell({ room, onSave }) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(room.pricePerNight)
  useEffect(() => setVal(room.pricePerNight), [room.pricePerNight])

  const commit = () => {
    setEdit(false)
    if (val !== '' && Number(val) >= 0 && Number(val) !== Number(room.pricePerNight)) onSave(room, Number(val))
    else setVal(room.pricePerNight)
  }
  if (!edit) return <button className="price-edit" onClick={() => setEdit(true)} title="Click to edit price">{money(room.pricePerNight)} ✎</button>
  return (
    <input className="price-input" type="number" min="0" autoFocus value={val}
      onChange={(e) => setVal(e.target.value)} onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setVal(room.pricePerNight); setEdit(false) }
      }} />
  )
}

function RoomForm({ room, onClose, onSaved }) {
  const { toast } = useUI()
  const [f, setF] = useState(room ? { ...room, description: room.description || '', imageUrl: room.imageUrl || '' } : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const body = {
      roomNumber: f.roomNumber.trim(), type: f.type, capacity: Number(f.capacity),
      pricePerNight: Number(f.pricePerNight), description: f.description, imageUrl: f.imageUrl, active: f.active
    }
    try {
      room ? await api.put(`/admin/rooms/${room.id}`, body) : await api.post('/admin/rooms', body)
      toast(room ? 'Room updated' : 'Room created')
      onSaved()
    } catch (err) { toast(errMsg(err), 'error') } finally { setSaving(false) }
  }

  return (
    <Modal title={room ? `Edit room ${room.roomNumber}` : 'Add new room'} onClose={onClose} wide>
      <form className="room-form" onSubmit={submit}>
        <label>Room number<input value={f.roomNumber} onChange={set('roomNumber')} required autoFocus /></label>
        <label>Type
          <select value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label>Capacity (guests)<input type="number" min="1" value={f.capacity} onChange={set('capacity')} required /></label>
        <label>Price per night (₹)<input type="number" min="0" value={f.pricePerNight} onChange={set('pricePerNight')} required /></label>
        <label className="full">Image URL (optional)<input value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></label>
        {f.imageUrl && <img className="img-prev full" src={f.imageUrl} alt="preview" onError={(e) => { e.currentTarget.style.display = 'none' }} onLoad={(e) => { e.currentTarget.style.display = 'block' }} />}
        <label className="full">Description<textarea rows="3" value={f.description} onChange={set('description')} /></label>
        <label className="switch-row full">
          <span className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /><span /></span>
          Available for booking
        </label>
        <div className="modal-actions full">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : room ? 'Save changes' : 'Create room'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function RoomsPanel() {
  const { toast, confirm } = useUI()
  const [rooms, setRooms] = useState(null)
  const [q, setQ] = useState('')
  const [typeF, setTypeF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [sel, setSel] = useState(new Set())
  const [form, setForm] = useState(undefined) // undefined = closed, null = new, object = edit

  const load = async () => {
    try {
      const data = (await api.get('/admin/rooms')).data
      data.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
      setRooms(data)
    } catch (e) { setRooms([]); toast(errMsg(e), 'error') }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const filtered = useMemo(() => (rooms || []).filter((r) =>
    (!q || (r.roomNumber + ' ' + (r.description || '')).toLowerCase().includes(q.toLowerCase())) &&
    (!typeF || r.type === typeF) &&
    (!statusF || (statusF === 'active' ? r.active : !r.active))
  ), [rooms, q, typeF, statusF])

  const patch = (updated) => setRooms((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))

  const toggle = async (r, value) => {
    try { patch((await api.put(`/admin/rooms/${r.id}/active`, null, { params: { value } })).data); toast(`Room ${r.roomNumber} ${value ? 'activated' : 'deactivated'}`) }
    catch (e) { toast(errMsg(e), 'error') }
  }

  const savePrice = async (r, price) => {
    try { patch((await api.put(`/admin/rooms/${r.id}`, { ...r, pricePerNight: price })).data); toast(`Room ${r.roomNumber} price → ₹${price.toLocaleString('en-IN')}`) }
    catch (e) { toast(errMsg(e), 'error') }
  }

  const remove = async (r) => {
    const ok = await confirm({
      title: `Delete room ${r.roomNumber}?`,
      message: 'Permanent delete only works for rooms that never had a booking. Otherwise use the Available switch to take it off sale.',
      confirmText: 'Delete permanently', danger: true
    })
    if (!ok) return
    try { await api.delete(`/admin/rooms/${r.id}/permanent`); toast('Room deleted'); setSel((s) => { const n = new Set(s); n.delete(r.id); return n }); load() }
    catch (e) { toast(errMsg(e), 'error') }
  }

  const bulk = async (value) => {
    const ids = [...sel]
    const ok = await confirm({ title: `${value ? 'Activate' : 'Deactivate'} ${ids.length} room${ids.length > 1 ? 's' : ''}?`, confirmText: value ? 'Activate' : 'Deactivate', danger: !value })
    if (!ok) return
    try { await Promise.all(ids.map((id) => api.put(`/admin/rooms/${id}/active`, null, { params: { value } }))); toast(`${ids.length} room(s) updated`); setSel(new Set()); load() }
    catch (e) { toast(errMsg(e), 'error'); load() }
  }

  const allSelected = filtered.length > 0 && filtered.every((r) => sel.has(r.id))
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(filtered.map((r) => r.id)))
  const toggleOne = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (rooms === null) return <div className="card skeleton" style={{ height: 260 }} />
  const activeCount = rooms.filter((r) => r.active).length

  return (
    <>
      <div className="toolbar">
        <input className="grow" placeholder="Search room number or description…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">All status</option><option value="active">Available</option><option value="inactive">Off sale</option>
        </select>
        <button className="btn" onClick={() => setForm(null)}>+ Add room</button>
      </div>
      <p className="muted">{rooms.length} rooms · {activeCount} available · {rooms.length - activeCount} off sale</p>

      {sel.size > 0 && (
        <div className="bulk-bar card">
          <b>{sel.size} selected</b>
          <button className="btn small" onClick={() => bulk(true)}>Activate</button>
          <button className="btn small danger" onClick={() => bulk(false)}>Deactivate</button>
          <button className="btn small ghost" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Room</th><th>Type</th><th>Guests</th><th>Price / night</th><th>Available</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={r.active ? '' : 'dim'}>
                <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleOne(r.id)} /></td>
                <td><b>{r.roomNumber}</b><br /><small className="muted desc-cell">{r.description}</small></td>
                <td><span className={`badge type t-${r.type}`}>{r.type}</span></td>
                <td>{r.capacity}</td>
                <td><PriceCell room={r} onSave={savePrice} /></td>
                <td><label className="switch"><input type="checkbox" checked={r.active} onChange={(e) => toggle(r, e.target.checked)} /><span /></label></td>
                <td className="actions">
                  <button className="btn small ghost" onClick={() => setForm(r)}>Edit</button>
                  <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="7" className="muted">No rooms match.</td></tr>}
          </tbody>
        </table>
      </div>

      {form !== undefined && <RoomForm room={form} onClose={() => setForm(undefined)} onSaved={() => { setForm(undefined); load() }} />}
    </>
  )
}
