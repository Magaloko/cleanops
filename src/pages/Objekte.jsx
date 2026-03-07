import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { Building2, Loader2, Pencil, Trash2, MapPin, Ruler } from 'lucide-react'

const EMPTY_FORM = { name: '', customer_id: '', address: '', city: '', area_m2: '', notes: '' }

export default function Objekte() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  async function load() {
    if (!companyId) return
    setLoading(true)
    const [{ data: objekte }, { data: cust }] = await Promise.all([
      supabase
        .from('objects')
        .select('*, customers(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'aktiv')
        .order('name'),
    ])
    setRows(objekte ?? [])
    setCustomers(cust ?? [])
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
      address: row.address ?? '',
      city: row.city ?? '',
      area_m2: row.area_m2 ?? '',
      notes: row.notes ?? '',
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name,
      customer_id: form.customer_id || null,
      address: form.address || null,
      city: form.city || null,
      area_m2: form.area_m2 ? Number(form.area_m2) : null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('objects').update(payload).eq('id', editId)
    } else {
      await supabase.from('objects').insert({ ...payload, company_id: companyId })
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function confirmDelete() {
    await supabase.from('objects').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Objekte"
        subtitle={`${rows.length} Objekte gesamt`}
        onAdd={openCreate}
        addLabel="Neues Objekt"
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Building2} title="Noch keine Objekte" description="Lege deinen ersten Einsatzort an." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kunde</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fläche</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 text-gray-500">{row.customers?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {(row.address || row.city) ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {[row.address, row.city].filter(Boolean).join(', ')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {row.area_m2 ? (
                      <span className="flex items-center gap-1.5">
                        <Ruler size={12} />
                        {row.area_m2} m²
                      </span>
                    ) : '—'}
                  </td>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Objekt bearbeiten' : 'Neues Objekt'}>
        <div className="space-y-4">
          <Field label="Name *">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} placeholder="z.B. Bürogebäude Zentrum" />
          </Field>
          <Field label="Kunde">
            <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} className={input}>
              <option value="">— Kein Kunde —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adresse">
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={input} placeholder="Straße Nr." />
            </Field>
            <Field label="Stadt">
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={input} placeholder="Wien" />
            </Field>
          </div>
          <Field label="Fläche (m²)">
            <input type="number" min="0" value={form.area_m2} onChange={e => setForm(f => ({ ...f, area_m2: e.target.value }))} className={input} placeholder="z.B. 350" />
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
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Objekt löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Dieses Objekt wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
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
