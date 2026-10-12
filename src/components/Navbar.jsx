import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const nav = useNavigate()
  return (
    <header className="navbar">
      <Link to="/" className="brand"><span className="brand-mark">◆</span> Grand Stay</Link>
      <nav>
        <NavLink to="/" end>Rooms</NavLink>
        {user && <NavLink to="/my-bookings">My Bookings</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <>
            <span className="muted hello">Hi, {user.name.split(' ')[0]}</span>
            <button className="btn small ghost" onClick={() => { logout(); nav('/') }}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <Link to="/register" className="btn small">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  )
}
