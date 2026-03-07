import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'

// Temporär: Auth-Check via localStorage (wird später durch Supabase ersetzt)
function isAuthenticated() {
  return localStorage.getItem('cleanops_auth') === 'true'
}

export default function AppLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
