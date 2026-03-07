import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import {
  FolderKanban, Loader2, Pencil, Trash2,
  Calendar, Euro, Building2, User2, CheckCircle2
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
const STATUSES = [
  { value: 'planung',       label: 'In Planung',   color: 'bg-slate-100 text-slate-600',   bar: 'bg-slate-400' },
  { value: 'aktiv',         label: 'Aktiv',         color: 'bg-green-100 text-green-700',   bar: 'bg-green-500' },
  { value: 'abgeschlossen', label: 'Abgeschlossen', color: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  { value: 'pausiert',      label: 'Pausiert',      color: 'bg-amber-100 text-amber-700',   bar: 'bg-amber-400' },
  { value: 'abgebrochen',   label: 'Abgebrochen',   color: 'bg-red-100 text-red-500',       bar: 'bg-red-400' },
]

const EMPTY_FORM = {
  name: '',
  customer_id: '',
  object_id: '',
  status: 'planung',
  start_date: '',
  end_date: '',
  budget: '',
  description: '',
}

// ── Helpers ──────────────────────────────────────────────────
function fmt(val) {
  if (!val && val !== 0) return '—'
  return Number(val).toLocaleString('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function duration(start, end) {
  if (!start && !end) return '—'
  if (start && !end) return `ab ${fmtDate(start)}`
  if (!start && end) return `bis ${fmtDate(end)}`
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

function progress(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function StatusBadge({ value }) {
  const s = STATUSES.find(x => x.value === value) ?? STATUSES[0]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

// ── Main Component ───────────────────────────────────────────
export default function Projekte() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [objects, setObjects] = useState([])
  const [taskCounts, setTaskCounts] = useState({}) // { project_id: { total, done } }
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('alle')

  async function load() {
    if (!companyId) return
    setLoading(true)

    const [{ data: projects }, { data: cust }, { data: objs }, { data: tasks }] = await Promise.all([
      supabase
        .from('projects')
        .select('*, customers(name), objects(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').eq('company_id', companyId).order('name'),
      supabase.from('objects').select('id, name').eq('company_id', companyId).order('name'),
      supabase.from('tasks').select('project_id, status').eq('company_id', companyId).not('project_id', 'is', null),
    ])

    // Build task count map
    const counts = {}
    for (const t of tasks ?? []) {
      if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0 }
      counts[t.project_id].total++
      if (t.status === 'erledigt') counts[t.project_id].done++
    }

    setRows(projects ?? [])
    setCustomers(cust ?? [])
    setObjects(objs ?? [])
    setTaskCounts(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditId(row.id)
    setForm({
      name: row.name,
      customer_id: row.customer_id ?? '',
      object_id: row.object_id ?? '',
      status: row.status,
      start_date: row.start_date ?? '',
      end_date: row.end_date ?? '',
      budget: row.budget ?? '',
      description: row.description ?? '',
    })
    setModalOpen(true)
  }

  function f(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name,
      customer_id: form.customer_id || null,
      object_id: form.object_id || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? Number(form.budget) : null,
      description: form.description || null,
    }
    if (editId) {
      await supabase.from('projects').update(payload).eq('id', editId)
    } else {
      await supabase.from('projects').insert({ ...payload, company_id: companyId })
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function confirmDelete() {
    await supabase.from('projects').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  // ── Stats ──
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = rows.filter(r => r.status === s.value).length
    return acc
  }, {})
  const totalBudget = rows
    .filter(r => r.status !== 'abgebrochen')
    .reduce((s, r) => s + Number(r.budget ?? 0), 0)

  const filtered = filterStatus === 'alle' ? rows : rows.filter(r => r.status === filterStatus)

  return (
    <div className="p-8">
      <PageHeader
        title="Projekte"
        subtitle={`${rows.length} Projekte gesamt`}
        onAdd={openCreate}
        addLabel="Neues Projekt"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Aktiv',          value: counts['aktiv'] ?? 0,         color: 'text-green-700',  bg: 'bg-green-50' },
          { label: 'In Planung',     value: counts['planung'] ?? 0,       color: 'text-slate-600',  bg: 'bg-slate-50' },
          { label: 'Abgeschlossen',  value: counts['abgeschlossen'] ?? 0, color: 'text-emerald-700',bg: 'bg-emerald-50' },
          { label: 'Gesamtbudget',   value: fmt(totalBudget),             color: 'text-blue-700',   bg: 'bg-blue-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl px-5 py-4 border border-gray-100`}>
            <p className={`text-2xl font-bold ${color} font-mono`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ value: 'alle', label: 'Alle' }, ...STATUSES].map(s => {
          const cnt = s.value === 'alle' ? rows.length : (counts[s.value] ?? 0)
          return (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterStatus === s.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                filterStatus === s.value ? 'bg-gray-100' : 'bg-gray-200'
              }`}>{cnt}</span>
            </button>
          )
        })}
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <EmptyState icon={FolderKanban} title="Keine Projekte" description="Erstelle dein erstes Projekt." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(row => {
            const tc = taskCounts[row.id]
            const pct = tc ? progress(tc.done, tc.total) : null
            const statusDef = STATUSES.find(s => s.value === row.status) ?? STATUSES[0]

            return (
              <div key={row.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{row.name}</h3>
                    {row.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{row.description}</p>
                    )}
                  </div>
                  <StatusBadge value={row.status} />
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  {row.customers?.name && (
                    <span className="flex items-center gap-1.5 truncate">
                      <User2 size={12} className="shrink-0" />{row.customers.name}
                    </span>
                  )}
                  {row.objects?.name && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Building2 size={12} className="shrink-0" />{row.objects.name}
                    </span>
                  )}
                  {(row.start_date || row.end_date) && (
                    <span className="flex items-center gap-1.5 col-span-2 truncate">
                      <Calendar size={12} className="shrink-0" />
                      {duration(row.start_date, row.end_date)}
                    </span>
                  )}
                  {row.budget != null && (
                    <span className="flex items-center gap-1.5">
                      <Euro size={12} className="shrink-0" />
                      {fmt(row.budget)}
                    </span>
                  )}
                </div>

                {/* Task progress bar */}
                {tc && tc.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        {tc.done}/{tc.total} Aufgaben
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${statusDef.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-50">
                  <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Projekt bearbeiten' : 'Neues Projekt'} size="lg">
        <div className="space-y-4">
          <Field label="Projektname *">
            <input value={form.name} onChange={e => f('name', e.target.value)} className={input} placeholder="z.B. Jahresreinigung Büroturm" autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Kunde">
              <select value={form.customer_id} onChange={e => f('customer_id', e.target.value)} className={input}>
                <option value="">— Kein Kunde —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Objekt">
              <select value={form.object_id} onChange={e => f('object_id', e.target.value)} className={input}>
                <option value="">— Kein Objekt —</option>
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Status">
              <select value={form.status} onChange={e => f('status', e.target.value)} className={input}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Startdatum">
              <input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} className={input} />
            </Field>
            <Field label="Enddatum">
              <input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} className={input} />
            </Field>
          </div>

          <Field label="Budget (€)">
            <input
              type="number" min="0" step="100"
              value={form.budget}
              onChange={e => f('budget', e.target.value)}
              className={input}
              placeholder="z.B. 12000"
            />
          </Field>

          <Field label="Beschreibung">
            <textarea value={form.description} onChange={e => f('description', e.target.value)} className={`${input} h-24 resize-none`} placeholder="Projektbeschreibung, Leistungsumfang…" />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
            <button onClick={save} disabled={saving || !form.name.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editId ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Projekt löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Dieses Projekt wird dauerhaft gelöscht. Verknüpfte Aufgaben bleiben erhalten, verlieren jedoch die Projektzuordnung.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Löschen</button>
        </div>
      </Modal>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
