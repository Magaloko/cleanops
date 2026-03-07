import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'
import { Play } from 'lucide-react'

export default function AppLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const roleConfig = ROLES[session.role]

  function handleRoleSwitch() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Demo Banner */}
        {session.demo && (
          <div className="flex items-center justify-between px-6 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <Play size={14} className="text-amber-500" />
              <span className="font-medium">Demo-Modus</span>
              <span className="text-amber-600">·</span>
              <span>
                Rolle:&nbsp;
                <span className={`inline-flex items-center gap-1 font-semibold`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${roleConfig?.color}`} />
                  {roleConfig?.label}
                </span>
              </span>
              <span className="text-amber-500 hidden sm:inline">· {roleConfig?.description}</span>
            </div>
            <button
              onClick={handleRoleSwitch}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
            >
              Rolle wechseln
            </button>
          </div>
        )}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
