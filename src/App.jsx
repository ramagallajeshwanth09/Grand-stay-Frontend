import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Scene3D from './components/Scene3D.jsx'
import ChatBot from './components/ChatBot.jsx'
import Rooms from './pages/Rooms.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import MyBookings from './pages/MyBookings.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  const loc = useLocation()
  return (
    <>
      <Scene3D />
      <Navbar />
      <main className="container">
        {/* key forces a fresh fade-up animation on every page change */}
        <div className="page" key={loc.pathname}>
          <Routes location={loc}>
            <Route path="/" element={<Rooms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/admin/:section?" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
      <ChatBot />
    </>
  )
}
