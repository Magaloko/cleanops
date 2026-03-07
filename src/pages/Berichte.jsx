import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import {
  TrendingUp, Euro, AlertCircle, CheckCircle2,
  Users, ClipboardList, Loader2, Calendar
} from 'lucide-react'

// ── Date range helpers ────────────────────────────────────────
const RANGES = [
  { value: 'month',       label: 'Dieser Monat' },
  { value: 'last_month',  label: 'Letzter Monat' },
  { value: 'quarter',     label: 'Letztes Quartal' },
  { value: 'year',        label: 'Dieses Jahr' },
]

function getRangeWindow(range) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (range) {
    case 'month':
      return [new Date(y, m, 1), new Date(y, m + 1, 0)]
    case 'last_month':
      return [new Date(y, m - 1, 1), new Date(y, m, 0)]
    case 'quarter': {
      const qStart = m - 2 < 0 ? new Date(y - 1, 10, 1) : new Date(y, m - 2, 1)
      return [qStart, now]
    }
    case 'year':
      return [new Date(y, 0, 1), new Date(y, 11, 31)]
    default:
      return [new Date(y, m, 1), new Date(y, m + 1, 0)]
  }
}

function toISO(d) { return d.toISOString().slice(0, 10) }

// ── Formatting ────────────────────────────────────────────────
function fmt(val, compact = false) {
  if (!val && val !== 0) return '€ 0'
  return Number(val).toLocaleString('de-AT', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
    notation: compact && val >= 10000 ? 'compact' : 'standard',
  })
}

// ── Task status config ────────────────────────────────────────
const TASK_STATUSES = [
  { value: 'offen',          label: 'Offen',           color: 'bg-gray-400' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung',  color: 'bg-amber-400' },
  { value: 'erledigt',       label: 'Erledigt',        color: 'bg-green-500' },
  { value: 'abgebrochen',    label: 'Abgebrochen',     color: 'bg-red-400' },
]

// ── Last 6 months labels ──────────────────────────────────────
function last6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('de-AT', { month: 'short' }),
      year: d.getFullYear(),
    })
  }
  return months
}

// ── Main Component ────────────────────────────────────────────
export default function Berichte() {
  const companyId = useCompany()
  const [range, setRange] = useState('month')
  const [invoices, setInvoices] = useState([])
  const [tasks, setTasks] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!companyId) return
    setLoading(true)
    const [{ data: inv }, { data: t }, { data: c }] = await Promise.all([
      supabase.from('invoices').select('id,status,issue_date,due_date,subtotal,total,customer_id,customers(name)').eq('company_id', companyId),
      supabase.from('tasks').select('id,status,priority,created_at').eq('company_id', companyId),
      supabase.from('customers').select('id,name,status').eq('company_id', companyId),
    ])
    setInvoices(inv ?? [])
    setTasks(t ?? [])
    setCustomers(c ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  // ── Derived data ──────────────────────────────────────────
  const [rangeStart, rangeEnd] = useMemo(() => getRangeWindow(range), [range])

  const inRange = useMemo(() => invoices.filter(inv => {
    const d = new Date(inv.issue_date)
    return d >= rangeStart && d <= rangeEnd
  }), [invoices, rangeStart, rangeEnd])

  const tasksInRange = useMemo(() => tasks.filter(t => {
    const d = new Date(t.created_at)
    return d >= rangeStart && d <= rangeEnd
  }), [tasks, rangeStart, rangeEnd])

  // KPIs
  const revenue = useMemo(() =>
    inRange.filter(i => i.status === 'bezahlt').reduce((s, i) => s + Number(i.total ?? 0), 0),
    [inRange])
  const openAmount = useMemo(() =>
    invoices.filter(i => ['gesendet', 'entwurf'].includes(i.status)).reduce((s, i) => s + Number(i.total ?? 0), 0),
    [invoices])
  const completedTasks = useMemo(() =>
    tasksInRange.filter(t => t.status === 'erledigt').length,
    [tasksInRange])
  const activeCustomers = useMemo(() =>
    customers.filter(c => c.status === 'aktiv').length,
    [customers])
  const overdueInvoices = useMemo(() =>
    invoices.filter(i => {
      if (i.status !== 'gesendet' || !i.due_date) return false
      return new Date(i.due_date) < new Date(new Date().toDateString())
    }),
    [invoices])

  // Monthly revenue chart (last 6 months)
  const months = useMemo(() => last6Months(), [])
  const monthlyData = useMemo(() => {
    return months.map(m => {
      const total = invoices
        .filter(i => i.status === 'bezahlt' && i.issue_date?.startsWith(m.key))
        .reduce((s, i) => s + Number(i.total ?? 0), 0)
      return { ...m, total }
    })
  }, [invoices, months])
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1)

  // Tasks by status
  const tasksByStatus = useMemo(() => {
    const total = tasks.length || 1
    return TASK_STATUSES.map(s => ({
      ...s,
      count: tasks.filter(t => t.status === s.value).length,
      pct: Math.round((tasks.filter(t => t.status === s.value).length / total) * 100),
    }))
  }, [tasks])

  // Top customers by revenue
  const topCustomers = useMemo(() => {
    const map = {}
    invoices.filter(i => i.status === 'bezahlt' && i.customer_id).forEach(inv => {
      const name = inv.customers?.name ?? '—'
      if (!map[inv.customer_id]) map[inv.customer_id] = { name, total: 0, count: 0 }
      map[inv.customer_id].total += Number(inv.total ?? 0)
      map[inv.customer_id].count++
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [invoices])
  const maxCustomerRevenue = Math.max(...topCustomers.map(c => c.total), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Berichte</h1>
          <p className="text-sm text-gray-500 mt-0.5">Übersicht & Kennzahlen</p>
        </div>
        {/* Range selector */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Euro}         label="Umsatz"            value={fmt(revenue)}        sub={RANGES.find(r=>r.value===range)?.label} color="blue" />
        <KpiCard icon={AlertCircle}  label="Offene Forderungen" value={fmt(openAmount)}    sub={`${overdueInvoices.length} überfällig`} color="amber" />
        <KpiCard icon={CheckCircle2} label="Aufgaben erledigt"  value={completedTasks}     sub="im Zeitraum"                            color="green" />
        <KpiCard icon={Users}        label="Aktive Kunden"      value={activeCustomers}    sub={`von ${customers.length} gesamt`}       color="violet" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly revenue bar chart — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Umsatz (letzte 6 Monate)</h2>
          <p className="text-xs text-gray-400 mb-6">Nur bezahlte Rechnungen</p>
          <div className="flex items-end gap-2 h-40">
            {monthlyData.map(m => {
              const heightPct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
                  {m.total > 0 && (
                    <span className="text-xs text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {fmt(m.total, true)}
                    </span>
                  )}
                  <div className="w-full flex items-end" style={{ height: '128px' }}>
                    <div
                      className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-400 transition-colors min-h-[3px]"
                      style={{ height: `${Math.max(heightPct, m.total > 0 ? 3 : 0)}%` }}
                      title={fmt(m.total)}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Task status donut-style */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Aufgaben nach Status</h2>
          <p className="text-xs text-gray-400 mb-4">{tasks.length} Aufgaben gesamt</p>

          {/* Segmented bar */}
          <div className="flex w-full h-3 rounded-full overflow-hidden mb-5 gap-px">
            {tasksByStatus.filter(s => s.count > 0).map(s => (
              <div
                key={s.value}
                className={`${s.color} transition-all`}
                style={{ width: `${s.pct}%` }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {tasksByStatus.map(s => (
              <div key={s.value} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                  <span className="text-sm text-gray-600">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{s.count}</span>
                  <span className="text-xs text-gray-400 w-8 text-right">{s.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top customers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Kunden nach Umsatz</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Noch keine bezahlten Rechnungen</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 w-4">#{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.count} RE</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 font-mono">{fmt(c.total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 ml-6">
                    <div
                      className="h-1.5 bg-blue-400 rounded-full"
                      style={{ width: `${(c.total / maxCustomerRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue invoices */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400" />
            Überfällige Rechnungen
            {overdueInvoices.length > 0 && (
              <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {overdueInvoices.length}
              </span>
            )}
          </h2>
          {overdueInvoices.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle2 size={28} className="text-green-400" />
              <p className="text-sm text-gray-400">Keine überfälligen Rechnungen 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueInvoices.slice(0, 6).map(inv => {
                const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date)) / 86400000)
                return (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{inv.customers?.name ?? '—'}</p>
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {daysOverdue} {daysOverdue === 1 ? 'Tag' : 'Tage'} überfällig
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-500 font-mono">{fmt(inv.total)}</span>
                  </div>
                )
              })}
              {overdueInvoices.length > 6 && (
                <p className="text-xs text-gray-400 text-center pt-1">+{overdueInvoices.length - 6} weitere</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-blue-700' },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  val: 'text-amber-700' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-500', val: 'text-violet-700' },
}

function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.val} font-mono`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
