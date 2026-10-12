import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { errMsg } from '../api'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try { await register(f.name, f.email, f.password); nav('/') } catch (err) { setError(errMsg(err)) }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Create your account</h2>
      {error && <div className="alert error">{error}</div>}
      <label>Full name<input value={f.name} onChange={set('name')} required /></label>
      <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
      <label>Password (min 6)<input type="password" minLength={6} value={f.password} onChange={set('password')} required /></label>
      <button className="btn">Sign up</button>
      <p className="muted">Already registered? <Link to="/login">Login</Link></p>
    </form>
  )
}
