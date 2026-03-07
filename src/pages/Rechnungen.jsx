import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import {
  Receipt, Loader2, Pencil, Trash2, Plus, X,
  Calendar, AlertCircle, TrendingUp, Clock, CheckCircle2, Ban
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
const STATUSES = [
  { value: 'entwurf',   label: 'Entwurf',   color: 'bg-gray-100 text-gray-600' },
  { value: 'gesendet',  label: 'Gesendet',  color: 'bg-blue-100 text-blue-700' },
  { value: 'bezahlt',   label: 'Bezahlt',   color: 'bg-green-100 text-green-700' },
  { value: 'storniert', label: 'Storniert', color: 'bg-red-100 text-red-500' },
]
const TAX_RATES = [0, 10, 19, 20]

const EMPTY_ITEM = () => ({ _key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 })
const EMPTY_FORM = () => ({
  invoice_number: '',
  customer_id: '',
  status: 'entwurf',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  tax_rate: 20,
  notes: '',
})

// ── Helpers ──────────────────────────────────────────────────
function fmt(val) {
  return Number(val ?? 0).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(row) {
  if (!row.due_date || row.status !== 'gesendet') return false
  return new Date(row.due_date) < new Date(new Date().toDateString())
}

function StatusBadge({ value }) {
  const s = STATUSES.find(x => x.value === value) ?? STATUSES[0]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

function calcItems(items, taxRate) {
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
  const tax_amount = subtotal * (Number(taxRate) / 100)
  const total = subtotal + tax_amount
  return { subtotal, tax_amount, total }
}

// ── Main Component ───────────────────────────────────────────
export default function Rechnungen() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM())
  const [items, setItems] = useState([EMPTY_ITEM()])
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('alle')

  async function load() {
    if (!companyId) return
    setLoading(true)
    const [{ data: inv }, { data: cust }] = await Promise.all([
      supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name'),
    ])
    setRows(inv ?? [])
    setCustomers(cust ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  function nextInvoiceNumber(currentRows) {
    const year = new Date().getFullYear()
    const n = (currentRows ?? rows).filter(r => r.invoice_number?.startsWith(`RE-${year}`)).length + 1
    return `RE-${year}-${String(n).padStart(3, '0')}`
  }

  async function openCreate() {
    setEditId(null)
    setForm({ ...EMPTY_FORM(), invoice_number: nextInvoiceNumber() })
    setItems([EMPTY_ITEM()])
    setModalOpen(true)
  }

  async function openEdit(row) {
    setEditId(row.id)
    setForm({
      invoice_number: row.invoice_number,
      customer_id: row.customer_id ?? '',
      status: row.status,
      issue_date: row.issue_date ?? '',
      due_date: row.due_date ?? '',
      tax_rate: row.tax_rate ?? 20,
      notes: row.notes ?? '',
    })
    // fetch line items
    const { data: existing } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', row.id)
      .order('sort_order')
    setItems(
      existing?.length
        ? existing.map(i => ({ ...i, _key: i.id }))
        : [EMPTY_ITEM()]
    )
    setModalOpen(true)
  }

  function f(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  function updateItem(key_val, field, val) {
    setItems(prev => prev.map(i => {
      if (i._key !== key_val) return i
      const updated = { ...i, [field]: val }
      updated.total = Number(updated.quantity) * Number(updated.unit_price)
      return updated
    }))
  }

  function removeItem(key_val) {
    setItems(prev => prev.length === 1 ? prev : prev.filter(i => i._key !== key_val))
  }

  const totals = calcItems(items, form.tax_rate)

  async function save() {
    if (!form.invoice_number.trim()) return
    setSaving(true)

    const invoicePayload = {
      invoice_number: form.invoice_number,
      customer_id: form.customer_id || null,
      status: form.status,
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      tax_rate: Number(form.tax_rate),
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
      notes: form.notes || null,
    }

    let invoiceId = editId
    if (editId) {
      await supabase.from('invoices').update(invoicePayload).eq('id', editId)
      await supabase.from('invoice_items').delete().eq('invoice_id', editId)
    } else {
      const { data: created } = await supabase
        .from('invoices')
        .insert({ ...invoicePayload, company_id: companyId })
        .select('id')
        .single()
      invoiceId = created?.id
    }

    if (invoiceId) {
      const lineItems = items
        .filter(i => i.description.trim())
        .map((i, idx) => ({
          invoice_id: invoiceId,
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          total: Number(i.quantity) * Number(i.unit_price),
          sort_order: idx,
        }))
      if (lineItems.length) await supabase.from('invoice_items').insert(lineItems)
    }

    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function confirmDelete() {
    await supabase.from('invoices').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  // ── Stats ──
  const totalOpen = rows
    .filter(r => ['entwurf', 'gesendet'].includes(r.status))
    .reduce((s, r) => s + Number(r.total ?? 0), 0)
  const totalPaid = rows
    .filter(r => r.status === 'bezahlt')
    .reduce((s, r) => s + Number(r.total ?? 0), 0)
  const overdueCount = rows.filter(isOverdue).length

  const filtered = filterStatus === 'alle' ? rows : rows.filter(r => r.status === filterStatus)

  return (
    <div className="p-8">
      <PageHeader
        title="Rechnungen"
        subtitle={`${rows.length} Rechnungen gesamt`}
        onAdd={openCreate}
        addLabel="Neue Rechnung"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock}         label="Offen"      value={fmt(totalOpen)}  color="text-blue-700"  bg="bg-blue-50" />
        <StatCard icon={CheckCircle2}  label="Bezahlt"    value={fmt(totalPaid)}  color="text-green-700" bg="bg-green-50" />
        <StatCard icon={AlertCircle}   label="Überfällig" value={overdueCount}    color="text-red-600"   bg="bg-red-50" />
        <StatCard icon={TrendingUp}    label="Gesamt"     value={rows.length}     color="text-gray-700"  bg="bg-gray-50" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ value: 'alle', label: 'Alle' }, ...STATUSES].map(s => {
          const cnt = s.value === 'alle' ? rows.length : rows.filter(r => r.status === s.value).length
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="Keine Rechnungen" description="Erstelle deine erste Rechnung." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nr.</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kunde</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ausgestellt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fällig</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Netto</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gesamt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => {
                const overdue = isOverdue(row)
                return (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{row.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-700">{row.customers?.name ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-6 py-4 text-gray-500">{fmtDate(row.issue_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {overdue && <AlertCircle size={12} />}
                        {fmtDate(row.due_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-mono">{fmt(row.subtotal)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 font-mono">{fmt(row.total)}</td>
                    <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Rechnung bearbeiten' : 'Neue Rechnung'} size="xl">
        <div className="space-y-5">
          {/* Header row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rechnungsnummer *">
              <input value={form.invoice_number} onChange={e => f('invoice_number', e.target.value)} className={input} placeholder="RE-2026-001" />
            </Field>
            <Field label="Kunde">
              <select value={form.customer_id} onChange={e => f('customer_id', e.target.value)} className={input}>
                <option value="">— Kein Kunde —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Ausstellungsdatum">
              <input type="date" value={form.issue_date} onChange={e => f('issue_date', e.target.value)} className={input} />
            </Field>
            <Field label="Fälligkeitsdatum">
              <input type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)} className={input} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => f('status', e.target.value)} className={input}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Line items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Positionen</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-full">Beschreibung</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-20">Menge</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Einzelpreis</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Gesamt</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item._key}>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.description}
                          onChange={e => updateItem(item._key, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                          placeholder="Leistung beschreiben…"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" min="0" step="0.5"
                          value={item.quantity}
                          onChange={e => updateItem(item._key, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unit_price}
                          onChange={e => updateItem(item._key, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-700">
                        {fmt(Number(item.quantity) * Number(item.unit_price))}
                      </td>
                      <td className="px-1 py-1.5">
                        <button
                          onClick={() => removeItem(item._key)}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t border-gray-100">
                <button
                  onClick={() => setItems(prev => [...prev, EMPTY_ITEM()])}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <Plus size={13} /> Position hinzufügen
                </button>
              </div>
            </div>
          </div>

          {/* Totals + tax */}
          <div className="flex gap-6 justify-end items-start">
            <Field label="MwSt %">
              <select value={form.tax_rate} onChange={e => f('tax_rate', e.target.value)} className={`${input} w-24`}>
                {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
            <div className="text-right space-y-1 min-w-[180px]">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Nettobetrag</span>
                <span className="font-mono">{fmt(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>MwSt ({form.tax_rate}%)</span>
                <span className="font-mono">{fmt(totals.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                <span>Gesamtbetrag</span>
                <span className="font-mono">{fmt(totals.total)}</span>
              </div>
            </div>
          </div>

          <Field label="Notizen">
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} className={`${input} h-20 resize-none`} placeholder="Zahlungshinweise, Bankdaten…" />
          </Field>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
            <button onClick={save} disabled={saving || !form.invoice_number.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editId ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Rechnung löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Diese Rechnung und alle Positionen werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Abbrechen</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Löschen</button>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl px-5 py-4 border border-gray-100`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} className={color} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-xl font-bold ${color} font-mono`}>{value}</p>
    </div>
  )
}
