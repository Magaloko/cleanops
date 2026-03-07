import {
  ClipboardList, FolderKanban, Receipt, Users,
  TrendingUp, AlertCircle, CheckCircle2, Clock
} from 'lucide-react'

const kpis = [
  {
    label: 'Aufgaben heute',
    value: '24',
    sub: '6 noch offen',
    icon: ClipboardList,
    color: 'bg-blue-500',
    trend: '+3 vs. gestern',
    up: true,
  },
  {
    label: 'Aktive Projekte',
    value: '12',
    sub: '2 starten diese Woche',
    icon: FolderKanban,
    color: 'bg-violet-500',
    trend: 'Stabil',
    up: null,
  },
  {
    label: 'Offene Rechnungen',
    value: '€ 14.200',
    sub: '8 Rechnungen',
    icon: Receipt,
    color: 'bg-amber-500',
    trend: '3 überfällig',
    up: false,
  },
  {
    label: 'Mitarbeiter aktiv',
    value: '18 / 23',
    sub: '5 heute abwesend',
    icon: Users,
    color: 'bg-emerald-500',
    trend: 'Kapazität: 78%',
    up: true,
  },
]

const recentTasks = [
  { id: 1, objekt: 'Bürokomplex Mariahilf', mitarbeiter: 'T. Kovač', status: 'abgeschlossen', zeit: '07:30' },
  { id: 2, objekt: 'Schule Favoriten', mitarbeiter: 'A. Müller', status: 'in_arbeit', zeit: '09:00' },
  { id: 3, objekt: 'Arztpraxis Dr. Hof', mitarbeiter: 'S. Yilmaz', status: 'in_arbeit', zeit: '10:15' },
  { id: 4, objekt: 'Einkaufszentrum Nord', mitarbeiter: 'M. Berger', status: 'ausstehend', zeit: '13:00' },
  { id: 5, objekt: 'Hotel Zentrum', mitarbeiter: 'L. Patel', status: 'ausstehend', zeit: '14:30' },
]

const statusBadge = {
  abgeschlossen: { label: 'Abgeschlossen', cls: 'bg-emerald-100 text-emerald-700' },
  in_arbeit: { label: 'In Arbeit', cls: 'bg-blue-100 text-blue-700' },
  ausstehend: { label: 'Ausstehend', cls: 'bg-gray-100 text-gray-600' },
}

export default function Dashboard() {
  const today = new Date().toLocaleDateString('de-AT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {kpis.map(({ label, value, sub, icon: Icon, color, trend, up }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className={`flex items-center justify-center w-10 h-10 ${color} rounded-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${
                up === true ? 'text-emerald-600' : up === false ? 'text-red-500' : 'text-gray-400'
              }`}>
                {up === true && <TrendingUp size={12} />}
                {up === false && <AlertCircle size={12} />}
                {trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Heutige Aufgaben</h2>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">Alle anzeigen →</button>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTasks.map(task => {
            const badge = statusBadge[task.status]
            return (
              <div key={task.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full shrink-0">
                  {task.status === 'abgeschlossen'
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : task.status === 'in_arbeit'
                    ? <Clock size={16} className="text-blue-500" />
                    : <ClipboardList size={16} className="text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.objekt}</p>
                  <p className="text-xs text-gray-400">{task.mitarbeiter}</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">{task.zeit}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
