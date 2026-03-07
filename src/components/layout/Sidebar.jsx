import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, FileText, ScrollText,
  FolderKanban, ClipboardList, UserCog, ShieldCheck, Receipt,
  Package, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Zap
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'

const ALL_NAV = [
  { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard, to: '/dashboard' },
  { key: 'kunden',       label: 'Kunden',        icon: Users,           to: '/kunden' },
  { key: 'objekte',      label: 'Objekte',       icon: Building2,       to: '/objekte' },
  { key: 'angebote',     label: 'Angebote',      icon: FileText,        to: '/angebote' },
  { key: 'vertraege',    label: 'Verträge',      icon: ScrollText,      to: '/vertraege' },
  { key: 'projekte',     label: 'Projekte',      icon: FolderKanban,    to: '/projekte' },
  { key: 'aufgaben',     label: 'Aufgaben',      icon: ClipboardList,   to: '/aufgaben' },
  { key: 'mitarbeiter',  label: 'Mitarbeiter',   icon: UserCog,         to: '/mitarbeiter' },
  { key: 'qualitaet',    label: 'Qualität',      icon: ShieldCheck,     to: '/qualitaet' },
  { key: 'rechnungen',   label: 'Rechnungen',    icon: Receipt,         to: '/rechnungen' },
  { key: 'material',     label: 'Material',      icon: Package,         to: '/material' },
  { key: 'berichte',     label: 'Berichte',      icon: BarChart3,       to: '/berichte' },
  { key: 'einstellungen',label: 'Einstellungen', icon: Settings,        to: '/einstellungen' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const { session, logout } = useAuth()

  const roleConfig = session ? ROLES[session.role] : null
  const allowedKeys = roleConfig?.nav ?? ALL_NAV.map(n => n.key)
  const nav = ALL_NAV.filter(n => allowedKeys.includes(n.key))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`flex flex-col bg-gray-900 text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} min-h-screen shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">CleanOps</span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && roleConfig && (
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${roleConfig.color}`} />
            <span className="text-xs font-medium text-gray-300">{roleConfig.label}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map(({ key, label, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Abmelden</span>}
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mt-0.5"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Einklappen</span>}
        </button>
      </div>
    </aside>
  )
}
