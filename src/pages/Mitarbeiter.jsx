import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import {
  Users, Loader2, Pencil, Trash2,
  Mail, Phone, MapPin, Euro, Calendar, Briefcase
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const STATUSES = [
  { value: 'aktiv',    label: 'Aktiv',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  { value: 'urlaub',   label: 'Urlaub',    color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  { value: 'krank',    label: 'Krank',     color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  { value: 'inaktiv',  label: 'Inaktiv',   color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
]

const POSITIONS = [
  'Reinigungskraft',
  'Vorarbeiter/in',
  'Objektleiter/in',
  'Supervisor',
  'Dispatcher',
  'Fahrer/in',
  'Haustechniker/in',
  'Teamleiter/in',
]

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  position: '',
  status: 'aktiv',
  hourly_rate: '',
  start_date: '',
  address: '',
  city: '',
  notes: '',
}

// ── Helpers ───────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name = '') {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500',
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ value }) {
  const s = STATUSES.find(x => x.value === value) ?? STATUSES[0]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Mitarbeiter() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('alle')
  const [search, setSearch] = useState('')

  async function load() {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('full_name')
    setRows(data ?? [])
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
      full_name:   row.full_name,
      email:       row.email ?? '',
      phone:       row.phone ?? '',
      position:    row.position ?? '',
      status:      row.status,
      hourly_rate: row.hourly_rate ?? '',
      start_date:  row.start_date ?? '',
      address:     row.address ?? '',
      city:        row.city ?? '',
      notes:       row.notes ?? '',
    })
    setModalOpen(true)
  }

  function f(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function save() {
    if (!form.full_name.trim()) return
    setSaving(true)
    const payload = {
      full_name:   form.full_name,
      email:       form.email || null,
      phone:       form.phone || null,
      position:    form.position || null,
      status:      form.status,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      start_date:  form.start_date || null,
      address:     form.address || null,
      city:        form.city || null,
      notes:       form.notes || null,
    }
    if (editId) {
      await supabase.from('employees').update(payload).eq('id', editId)
    } else {
      await supabase.from('employees').insert({ ...payload, company_id: companyId })
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function confirmDelete() {
    await supabase.from('employees').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  // ── Stats ──
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = rows.filter(r => r.status === s.value).length
    return acc
  }, {})
  const avgRate = rows.filter(r => r.hourly_rate).length
    ? (rows.reduce((s, r) => s + Number(r.hourly_rate ?? 0), 0) / rows.filter(r => r.hourly_rate).length).toFixed(2)
    : null

  // ── Filtered ──
  const filtered = rows
    .filter(r => filterStatus === 'alle' || r.status === filterStatus)
    .filter(r => !search || r.full_name.toLowerCase().includes(search.toLowerCase())
      || (r.position ?? '').toLowerCase().includes(search.toLowerCase())
      || (r.city ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8">
      <PageHeader
        title="Mitarbeiter"
        subtitle={`${rows.length} Mitarbeiter gesamt`}
        onAdd={openCreate}
        addLabel="Neuer Mitarbeiter"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Aktiv"         value={counts['aktiv'] ?? 0}   color="text-green-700"  bg="bg-green-50" />
        <StatCard label="Urlaub"        value={counts['urlaub'] ?? 0}  color="text-blue-700"   bg="bg-blue-50" />
        <StatCard label="Krank"         value={counts['krank'] ?? 0}   color="text-amber-700"  bg="bg-amber-50" />
        <StatCard label="Ø Stundensatz" value={avgRate ? `€ ${avgRate}` : '—'} color="text-gray-700" bg="bg-gray-50" />
      </div>

      {/* Filter + Search bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
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
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen…"
          className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Keine Mitarbeiter" description={search ? 'Keine Treffer für deine Suche.' : 'Lege deinen ersten Mitarbeiter an.'} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mitarbeiter</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontakt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Standort</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Seit</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stundensatz</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${avatarColor(row.full_name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials(row.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{row.full_name}</p>
                        {row.position && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Briefcase size={10} />{row.position}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      {row.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={11} />{row.email}</p>}
                      {row.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={11} />{row.phone}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {row.city
                      ? <span className="flex items-center gap-1.5"><MapPin size={11} />{row.city}</span>
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {row.start_date
                      ? <span className="flex items-center gap-1.5"><Calendar size={11} />{fmtDate(row.start_date)}</span>
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm font-mono">
                    {row.hourly_rate
                      ? <span className="flex items-center gap-1"><Euro size={12} />{Number(row.hourly_rate).toFixed(2)}</span>
                      : '—'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'} size="lg">
        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Name *" className="col-span-2">
              <input value={form.full_name} onChange={e => f('full_name', e.target.value)} className={input} placeholder="Vorname Nachname" autoFocus />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Position / Funktion">
              <input
                value={form.position}
                onChange={e => f('position', e.target.value)}
                list="positions-list"
                className={input}
                placeholder="z.B. Reinigungskraft"
              />
              <datalist id="positions-list">
                {POSITIONS.map(p => <option key={p} value={p} />)}
              </datalist>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => f('status', e.target.value)} className={input}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="E-Mail">
              <input type="email" value={form.email} onChange={e => f('email', e.target.value)} className={input} placeholder="max@beispiel.at" />
            </Field>
            <Field label="Telefon">
              <input type="tel" value={form.phone} onChange={e => f('phone', e.target.value)} className={input} placeholder="+43 660 1234567" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Adresse">
              <input value={form.address} onChange={e => f('address', e.target.value)} className={input} placeholder="Straße Nr." />
            </Field>
            <Field label="Stadt">
              <input value={form.city} onChange={e => f('city', e.target.value)} className={input} placeholder="Wien" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Eintrittsdatum">
              <input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} className={input} />
            </Field>
            <Field label="Stundensatz (€)">
              <input type="number" min="0" step="0.5" value={form.hourly_rate} onChange={e => f('hourly_rate', e.target.value)} className={input} placeholder="z.B. 14.50" />
            </Field>
          </div>

          <Field label="Notizen">
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} className={`${input} h-20 resize-none`} placeholder="Qualifikationen, Zertifikate, interne Notizen…" />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
            <button onClick={save} disabled={saving || !form.full_name.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editId ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Mitarbeiter löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Dieser Mitarbeiter wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Löschen</button>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl px-5 py-4 border border-gray-100`}>
      <p className={`text-2xl font-bold ${color} font-mono`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
