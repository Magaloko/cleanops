import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { ScrollText, Loader2, Pencil, Trash2, Calendar, Euro, Building2, User2, RefreshCw } from 'lucide-react'

const STATUSES = [
  { value: 'entwurf',    label: 'Entwurf',    color: 'bg-gray-100 text-gray-600',   bar: 'bg-gray-400' },
  { value: 'aktiv',      label: 'Aktiv',       color: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
  { value: 'gekündigt',  label: 'Gekündigt',   color: 'bg-red-100 text-red-500',     bar: 'bg-red-400' },
  { value: 'abgelaufen', label: 'Abgelaufen',  color: 'bg-amber-100 text-amber-600', bar: 'bg-amber-400' },
]
const BILLING = [
  { value: 'monatlich', label: 'Monatlich' },
  { value: 'quartal',   label: 'Quartalsweise' },
  { value: 'jährlich',  label: 'Jährlich' },
]

const EMPTY_FORM = { title: '', customer_id: '', object_id: '', status: 'entwurf', start_date: '', end_date: '', monthly_value: '', billing_cycle: 'monatlich', description: '', notes: '' }

function fmt(v) { return v!=null&&v!=='' ? Number(v).toLocaleString('de-AT',{style:'currency',currency:'EUR',maximumFractionDigits:0}) : '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'}) : null }
function duration(s, e) { if (!s&&!e) return null; if (s&&!e) return `ab ${fmtDate(s)}`; if (!s&&e) return `bis ${fmtDate(e)}`; return `${fmtDate(s)} – ${fmtDate(e)}` }

function StatusBadge({ value }) {
  const s = STATUSES.find(x=>x.value===value)??STATUSES[0]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

export default function Vertraege() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [objects, setObjects] = useState([])
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
    const [{ data: c1 }, { data: cu }, { data: ob }] = await Promise.all([
      supabase.from('contracts').select('*, customers(name), objects(name)').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('customers').select('id,name').eq('company_id', companyId).order('name'),
      supabase.from('objects').select('id,name').eq('company_id', companyId).order('name'),
    ])
    setRows(c1??[]); setCustomers(cu??[]); setObjects(ob??[]); setLoading(false)
  }
  useEffect(() => { load() }, [companyId])

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(row) {
    setEditId(row.id)
    setForm({ title: row.title, customer_id: row.customer_id??'', object_id: row.object_id??'', status: row.status, start_date: row.start_date??'', end_date: row.end_date??'', monthly_value: row.monthly_value??'', billing_cycle: row.billing_cycle, description: row.description??'', notes: row.notes??'' })
    setModalOpen(true)
  }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { title: form.title, customer_id: form.customer_id||null, object_id: form.object_id||null, status: form.status, start_date: form.start_date||null, end_date: form.end_date||null, monthly_value: form.monthly_value?Number(form.monthly_value):null, billing_cycle: form.billing_cycle, description: form.description||null, notes: form.notes||null }
    if (editId) await supabase.from('contracts').update(payload).eq('id', editId)
    else await supabase.from('contracts').insert({...payload, company_id: companyId})
    setSaving(false); setModalOpen(false); load()
  }

  async function confirmDelete() { await supabase.from('contracts').delete().eq('id', deleteId); setDeleteId(null); load() }

  const counts = STATUSES.reduce((a,s)=>({...a,[s.value]:rows.filter(r=>r.status===s.value).length}),{})
  const monthlyRecurring = rows.filter(r=>r.status==='aktiv').reduce((s,r)=>s+Number(r.monthly_value??0),0)
  const filtered = filterStatus==='alle' ? rows : rows.filter(r=>r.status===filterStatus)

  return (
    <div className="p-8">
      <PageHeader title="Verträge" subtitle={`${rows.length} Verträge gesamt`} onAdd={openCreate} addLabel="Neuer Vertrag" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-green-700">{counts['aktiv']??0}</p><p className="text-xs text-gray-500 mt-0.5">Aktiv</p></div>
        <div className="bg-gray-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-gray-700">{counts['entwurf']??0}</p><p className="text-xs text-gray-500 mt-0.5">Entwurf</p></div>
        <div className="bg-red-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-red-600">{counts['gekündigt']??0}</p><p className="text-xs text-gray-500 mt-0.5">Gekündigt</p></div>
        <div className="bg-blue-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-blue-700 font-mono">{fmt(monthlyRecurring)}</p><p className="text-xs text-gray-500 mt-0.5">Monatlich (aktiv)</p></div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[{value:'alle',label:'Alle'},...STATUSES].map(s=>(
          <button key={s.value} onClick={()=>setFilterStatus(s.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus===s.value?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {s.label}<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filterStatus===s.value?'bg-gray-100':'bg-gray-200'}`}>{s.value==='alle'?rows.length:counts[s.value]??0}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400"/></div>
      ) : filtered.length===0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm"><EmptyState icon={ScrollText} title="Keine Verträge" description="Erstelle deinen ersten Servicevertrag."/></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(row => (
            <div key={row.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{row.title}</h3>
                  {row.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{row.description}</p>}
                </div>
                <StatusBadge value={row.status}/>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {row.customers?.name && <span className="flex items-center gap-1.5 truncate"><User2 size={12} className="shrink-0"/>{row.customers.name}</span>}
                {row.objects?.name   && <span className="flex items-center gap-1.5 truncate"><Building2 size={12} className="shrink-0"/>{row.objects.name}</span>}
                {duration(row.start_date, row.end_date) && <span className="flex items-center gap-1.5 col-span-2"><Calendar size={12} className="shrink-0"/>{duration(row.start_date, row.end_date)}</span>}
                {row.monthly_value!=null && (
                  <span className="flex items-center gap-1.5 col-span-2">
                    <Euro size={12} className="shrink-0"/>
                    <span className="font-semibold text-gray-800">{fmt(row.monthly_value)}</span>
                    <span className="text-gray-400">/ {BILLING.find(b=>b.value===row.billing_cycle)?.label??row.billing_cycle}</span>
                    {row.billing_cycle!=='monatlich' && <span className="text-gray-400">({fmt(row.monthly_value * (row.billing_cycle==='quartal'?3:12))} / Jahr)</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-50">
                <button onClick={()=>openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14}/></button>
                <button onClick={()=>setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editId?'Vertrag bearbeiten':'Neuer Vertrag'} size="lg">
        <div className="space-y-4">
          <Field label="Vertragsbezeichnung *"><input value={form.title} onChange={e=>f('title',e.target.value)} className={input} placeholder="z.B. Jahresvertrag Büroreinigung" autoFocus/></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kunde"><select value={form.customer_id} onChange={e=>f('customer_id',e.target.value)} className={input}><option value="">— Kein Kunde —</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Objekt"><select value={form.object_id} onChange={e=>f('object_id',e.target.value)} className={input}><option value="">— Kein Objekt —</option>{objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Status"><select value={form.status} onChange={e=>f('status',e.target.value)} className={input}>{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
            <Field label="Startdatum"><input type="date" value={form.start_date} onChange={e=>f('start_date',e.target.value)} className={input}/></Field>
            <Field label="Enddatum"><input type="date" value={form.end_date} onChange={e=>f('end_date',e.target.value)} className={input}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Wert (€)"><input type="number" min="0" step="10" value={form.monthly_value} onChange={e=>f('monthly_value',e.target.value)} className={input} placeholder="z.B. 1200"/></Field>
            <Field label="Abrechnungszeitraum"><select value={form.billing_cycle} onChange={e=>f('billing_cycle',e.target.value)} className={input}>{BILLING.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></Field>
          </div>
          <Field label="Leistungsbeschreibung"><textarea value={form.description} onChange={e=>f('description',e.target.value)} className={`${input} h-20 resize-none`} placeholder="Welche Leistungen sind enthalten…"/></Field>
          <Field label="Notizen"><textarea value={form.notes} onChange={e=>f('notes',e.target.value)} className={`${input} h-16 resize-none`} placeholder="Interne Notizen…"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">Abbrechen</button>
            <button onClick={save} disabled={saving||!form.title.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving&&<Loader2 size={14} className="animate-spin"/>}{editId?'Speichern':'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={()=>setDeleteId(null)} title="Vertrag löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Dieser Vertrag wird dauerhaft gelöscht.</p>
        <div className="flex justify-end gap-3">
          <button onClick={()=>setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600">Abbrechen</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg">Löschen</button>
        </div>
      </Modal>
    </div>
  )
}

const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
function Field({ label, children }) { return <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div> }
