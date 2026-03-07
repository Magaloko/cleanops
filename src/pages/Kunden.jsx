import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { Users, Loader2, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react'

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', city: '', status: 'lead', notes: '' }

export default function Kunden() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  async function load() {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
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
    setForm({ name: row.name, email: row.email ?? '', phone: row.phone ?? '', address: row.address ?? '', city: row.city ?? '', status: row.status, notes: row.notes ?? '' })
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('customers').update(form).eq('id', editId)
    } else {
      await supabase.from('customers').insert({ ...form, company_id: companyId })
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function confirmDelete() {
    await supabase.from('customers').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  const statusCount = (s) => rows.filter(r => r.status === s).length

  return (
    <div className="p-8">
      <PageHeader
        title="Kunden"
        subtitle={`${rows.length} Kunden gesamt`}
        onAdd={openCreate}
        addLabel="Neuer Kunde"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['lead', 'Leads', 'bg-blue-50 text-blue-700'], ['aktiv', 'Aktiv', 'bg-emerald-50 text-emerald-700'], ['inaktiv', 'Inaktiv', 'bg-gray-50 text-gray-500']].map(([s, l, cls]) => (
          <div key={s} className={`rounded-xl px-5 py-4 ${cls} border border-current/10`}>
            <p className="text-2xl font-bold">{statusCount(s)}</p>
            <p className="text-sm font-medium mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="Noch keine Kunden" description="Lege deinen ersten Kunden an." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontakt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stadt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex flex-col gap-0.5">
                      {row.email && <span className="flex items-center gap-1.5"><Mail size={12} />{row.email}</span>}
                      {row.phone && <span className="flex items-center gap-1.5"><Phone size={12} />{row.phone}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {row.city && <span className="flex items-center gap-1.5"><MapPin size={12} />{row.city}</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Kunde bearbeiten' : 'Neuer Kunde'}>
        <div className="space-y-4">
          <Field label="Name *">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} placeholder="Firmenname oder Vollname" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-Mail">
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={input} placeholder="kontakt@firma.at" />
            </Field>
            <Field label="Telefon">
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={input} placeholder="+43 1 234 5678" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adresse">
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={input} placeholder="Straße Nr." />
            </Field>
            <Field label="Stadt">
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={input} placeholder="Wien" />
            </Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={input}>
              <option value="lead">Lead</option>
              <option value="aktiv">Aktiv</option>
              <option value="inaktiv">Inaktiv</option>
            </select>
          </Field>
          <Field label="Notizen">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${input} h-20 resize-none`} placeholder="Interne Notizen…" />
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
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Kunde löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Dieser Kunde wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
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
