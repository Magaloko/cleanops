import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, FileText, ScrollText,
  FolderKanban, ClipboardList, UserCog, ShieldCheck, Receipt,
  Package, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Zap
} from 'lucide-react'
import { useState } from 'react'

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Kunden', icon: Users, to: '/kunden' },
  { label: 'Objekte', icon: Building2, to: '/objekte' },
  { label: 'Angebote', icon: FileText, to: '/angebote' },
  { label: 'Verträge', icon: ScrollText, to: '/vertraege' },
  { label: 'Projekte', icon: FolderKanban, to: '/projekte' },
  { label: 'Aufgaben', icon: ClipboardList, to: '/aufgaben' },
  { label: 'Mitarbeiter', icon: UserCog, to: '/mitarbeiter' },
  { label: 'Qualität', icon: ShieldCheck, to: '/qualitaet' },
  { label: 'Rechnungen', icon: Receipt, to: '/rechnungen' },
  { label: 'Material', icon: Package, to: '/material' },
  { label: 'Berichte', icon: BarChart3, to: '/berichte' },
  { label: 'Einstellungen', icon: Settings, to: '/einstellungen' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

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

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
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
          onClick={() => navigate('/login')}
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
