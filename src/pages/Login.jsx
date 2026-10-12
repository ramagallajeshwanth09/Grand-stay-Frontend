import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { errMsg } from '../api'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try { await login(email, password); nav('/') } catch (err) { setError(errMsg(err)) }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Welcome back</h2>
      {error && <div className="alert error">{error}</div>}
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button className="btn">Login</button>
      <p className="muted">No account? <Link to="/register">Sign up</Link></p>
      <p className="muted small-text">Demo admin: admin@hotel.com / Admin@123</p>
    </form>
  )
}
