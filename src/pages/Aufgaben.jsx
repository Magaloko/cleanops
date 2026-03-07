import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { ClipboardList, Loader2, Pencil, Trash2, Calendar, AlertCircle, User } from 'lucide-react'

const STATUSES = [
  { value: 'offen',         label: 'Offen',          color: 'bg-gray-100 text-gray-700' },
  { value: 'in_bearbeitung',label: 'In Bearbeitung',  color: 'bg-amber-100 text-amber-700' },
  { value: 'erledigt',      label: 'Erledigt',        color: 'bg-green-100 text-green-700' },
  { value: 'abgebrochen',   label: 'Abgebrochen',     color: 'bg-red-100 text-red-600' },
]

const PRIORITIES = [
  { value: 'niedrig', label: 'Niedrig', color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  { value: 'mittel',  label: 'Mittel',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  { value: 'hoch',    label: 'Hoch',    color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { value: 'dringend',label: 'Dringend',color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
]

const EMPTY_FORM = {
  title: '',
  object_id: '',
  assigned_to: '',
  status: 'offen',
  priority: 'mittel',
  due_date: '',
  description: '',
}

function StatusBadge({ value }) {
  const s = STATUSES.find(x => x.value === value) ?? STATUSES[0]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

function PriorityBadge({ value }) {
  const p = PRIORITIES.find(x => x.value === value) ?? PRIORITIES[1]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${p.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  )
}

function isOverdue(due_date, status) {
  if (!due_date || status === 'erledigt' || status === 'abgebrochen') return false
  return new Date(due_date) < new Date(new Date().toDateString())
}

export default function Aufgaben() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [objects, setObjects] = useState([])
  const [workers, setWorkers] = useState([])
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
    const [{ data: tasks }, { data: objs }, { data: profs }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, objects(name), profiles(full_name)')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase.from('objects').select('id, name').eq('company_id', companyId).order('name'),
      supabase.from('profiles').select('id, full_name').eq('company_id', companyId).order('full_name'),
    ])
    setRows(tasks ?? [])
    setObjects(objs ?? [])
    setWorkers(profs ?? [])
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
      title: row.title,
      object_id: row.object_id ?? '',
      assigned_to: row.assigned_to ?? '',
      status: row.status,
      priority: row.priority,
      due_date: row.due_date ?? '',
      description: row.description ?? '',
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title,
      object_id: form.object_id || null,
      assigned_to: form.assigned_to || null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      description: form.description || null,
    }
    if (editId) {
      await supabase.from('tasks').update(payload).eq('id', editId)
    } else {
      await supabase.from('tasks').insert({ ...payload, company_id: companyId })
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function quickStatus(id, newStatus) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  async function confirmDelete() {
    await supabase.from('tasks').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  // Stats
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = rows.filter(r => r.status === s.value).length
    return acc
  }, {})
  const overdueCount = rows.filter(r => isOverdue(r.due_date, r.status)).length

  const filtered = filterStatus === 'alle' ? rows : rows.filter(r => r.status === filterStatus)

  return (
    <div className="p-8">
      <PageHeader
        title="Aufgaben"
        subtitle={`${rows.length} Aufgaben gesamt`}
        onAdd={openCreate}
        addLabel="Neue Aufgabe"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Offen',          value: counts['offen'],          color: 'text-gray-700',   bg: 'bg-gray-50' },
          { label: 'In Bearbeitung', value: counts['in_bearbeitung'], color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Erledigt',       value: counts['erledigt'],       color: 'text-green-700',  bg: 'bg-green-50' },
          { label: 'Überfällig',     value: overdueCount,             color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl px-5 py-4 border border-gray-100`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ value: 'alle', label: 'Alle' }, ...STATUSES].map(s => (
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
            }`}>
              {s.value === 'alle' ? rows.length : counts[s.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Keine Aufgaben" description="Erstelle deine erste Aufgabe." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aufgabe</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Objekt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zugewiesen</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priorität</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fällig</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => {
                const overdue = isOverdue(row.due_date, row.status)
                return (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {overdue && <AlertCircle size={13} className="inline mr-1.5 -mt-0.5" />}
                        {row.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{row.objects?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {row.profiles?.full_name
                        ? <span className="flex items-center gap-1.5"><User size={12} />{row.profiles.full_name}</span>
                        : '—'}
                    </td>
                    <td className="px-6 py-4"><PriorityBadge value={row.priority} /></td>
                    <td className="px-6 py-4">
                      {row.due_date ? (
                        <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          <Calendar size={12} />
                          {new Date(row.due_date).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={row.status}
                        onChange={e => quickStatus(row.id, e.target.value)}
                        className="text-xs border-none bg-transparent focus:outline-none cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      >
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} size="lg">
        <div className="space-y-4">
          <Field label="Titel *">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={input} placeholder="z.B. Böden reinigen" autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Objekt">
              <select value={form.object_id} onChange={e => setForm(f => ({ ...f, object_id: e.target.value }))} className={input}>
                <option value="">— Kein Objekt —</option>
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Zugewiesen an">
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} className={input}>
                <option value="">— Nicht zugewiesen —</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.full_name || w.id.slice(0,8)}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={input}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Priorität">
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={input}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Fälligkeitsdatum">
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={input} />
            </Field>
          </div>

          <Field label="Beschreibung">
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${input} h-24 resize-none`} placeholder="Details zur Aufgabe…" />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editId ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Aufgabe löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Diese Aufgabe wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Löschen</button>
        </div>
      </Modal>
    </div>
  )
}

const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
