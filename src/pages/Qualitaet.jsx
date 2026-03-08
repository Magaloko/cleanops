import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { ShieldCheck, Loader2, Pencil, Trash2, Star, Calendar, Building2, User } from 'lucide-react'

const STATUSES = [
  { value: 'geplant',         label: 'Geplant',         color: 'bg-gray-100 text-gray-600' },
  { value: 'bestanden',       label: 'Bestanden',       color: 'bg-green-100 text-green-700' },
  { value: 'nacharbeit',      label: 'Nacharbeit nötig',color: 'bg-amber-100 text-amber-700' },
  { value: 'nicht_bestanden', label: 'Nicht bestanden', color: 'bg-red-100 text-red-600' },
]

const EMPTY_FORM = { title: '', object_id: '', inspector_id: '', check_date: new Date().toISOString().slice(0,10), rating: '', status: 'geplant', notes: '' }

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—' }

function StatusBadge({ value }) {
  const s = STATUSES.find(x=>x.value===value)??STATUSES[0]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

function Stars({ rating, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          type="button"
          onClick={()=>onChange && onChange(i===Number(rating)?'':i)}
          onMouseEnter={()=>onChange&&setHover(i)}
          onMouseLeave={()=>onChange&&setHover(0)}
          className={`transition-colors ${onChange?'cursor-pointer':'cursor-default'}`}
        >
          <Star
            size={onChange?20:16}
            className={`${(hover||Number(rating))>=i ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} transition-colors`}
          />
        </button>
      ))}
    </div>
  )
}

export default function Qualitaet() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [objects, setObjects] = useState([])
  const [employees, setEmployees] = useState([])
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
    const [{ data: qc }, { data: ob }, { data: emp }] = await Promise.all([
      supabase.from('quality_checks').select('*, objects(name), employees(full_name)').eq('company_id', companyId).order('check_date', { ascending: false }),
      supabase.from('objects').select('id,name').eq('company_id', companyId).order('name'),
      supabase.from('employees').select('id,full_name').eq('company_id', companyId).eq('status','aktiv').order('full_name'),
    ])
    setRows(qc??[]); setObjects(ob??[]); setEmployees(emp??[]); setLoading(false)
  }
  useEffect(() => { load() }, [companyId])

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(row) {
    setEditId(row.id)
    setForm({ title: row.title, object_id: row.object_id??'', inspector_id: row.inspector_id??'', check_date: row.check_date??'', rating: row.rating??'', status: row.status, notes: row.notes??'' })
    setModalOpen(true)
  }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { title: form.title, object_id: form.object_id||null, inspector_id: form.inspector_id||null, check_date: form.check_date||null, rating: form.rating?Number(form.rating):null, status: form.status, notes: form.notes||null }
    if (editId) await supabase.from('quality_checks').update(payload).eq('id', editId)
    else await supabase.from('quality_checks').insert({...payload, company_id: companyId})
    setSaving(false); setModalOpen(false); load()
  }

  async function confirmDelete() { await supabase.from('quality_checks').delete().eq('id', deleteId); setDeleteId(null); load() }

  const counts = STATUSES.reduce((a,s)=>({...a,[s.value]:rows.filter(r=>r.status===s.value).length}),{})
  const ratedRows = rows.filter(r=>r.rating)
  const avgRating = ratedRows.length ? (ratedRows.reduce((s,r)=>s+Number(r.rating),0)/ratedRows.length).toFixed(1) : null
  const filtered = filterStatus==='alle' ? rows : rows.filter(r=>r.status===filterStatus)

  return (
    <div className="p-8">
      <PageHeader title="Qualitätskontrolle" subtitle={`${rows.length} Prüfungen gesamt`} onAdd={openCreate} addLabel="Neue Prüfung" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 rounded-xl px-5 py-4 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-0.5">
            {avgRating ? <Stars rating={avgRating}/> : <span className="text-2xl font-bold text-gray-400">—</span>}
          </div>
          <p className="text-xs text-gray-500">{avgRating ? `Ø ${avgRating} von 5` : 'Noch keine Bewertung'}</p>
        </div>
        <div className="bg-green-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-green-700">{counts['bestanden']??0}</p><p className="text-xs text-gray-500 mt-0.5">Bestanden</p></div>
        <div className="bg-amber-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-amber-700">{counts['nacharbeit']??0}</p><p className="text-xs text-gray-500 mt-0.5">Nacharbeit nötig</p></div>
        <div className="bg-red-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-red-600">{counts['nicht_bestanden']??0}</p><p className="text-xs text-gray-500 mt-0.5">Nicht bestanden</p></div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[{value:'alle',label:'Alle'},...STATUSES].map(s=>(
          <button key={s.value} onClick={()=>setFilterStatus(s.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus===s.value?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {s.label}<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filterStatus===s.value?'bg-gray-100':'bg-gray-200'}`}>{s.value==='alle'?rows.length:counts[s.value]??0}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400"/></div>
        ) : filtered.length===0 ? (
          <EmptyState icon={ShieldCheck} title="Keine Prüfungen" description="Erstelle deine erste Qualitätskontrolle."/>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Titel','Objekt','Prüfer','Datum','Bewertung','Status',''].map(h=>(
                  <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{row.title}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {row.objects?.name ? <span className="flex items-center gap-1.5"><Building2 size={12}/>{row.objects.name}</span> : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {row.employees?.full_name ? <span className="flex items-center gap-1.5"><User size={12}/>{row.employees.full_name}</span> : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar size={12}/>{fmtDate(row.check_date)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {row.rating ? <Stars rating={row.rating}/> : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={row.status}/></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={()=>openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={15}/></button>
                      <button onClick={()=>setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editId?'Prüfung bearbeiten':'Neue Qualitätsprüfung'} size="lg">
        <div className="space-y-4">
          <Field label="Titel *"><input value={form.title} onChange={e=>f('title',e.target.value)} className={input} placeholder="z.B. Monatsbegehung Bürogebäude" autoFocus/></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Objekt"><select value={form.object_id} onChange={e=>f('object_id',e.target.value)} className={input}><option value="">— Kein Objekt —</option>{objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
            <Field label="Prüfer/in"><select value={form.inspector_id} onChange={e=>f('inspector_id',e.target.value)} className={input}><option value="">— Nicht zugewiesen —</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prüfdatum"><input type="date" value={form.check_date} onChange={e=>f('check_date',e.target.value)} className={input}/></Field>
            <Field label="Status"><select value={form.status} onChange={e=>f('status',e.target.value)} className={input}>{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          </div>
          <Field label="Bewertung (Sterne)">
            <div className="flex items-center gap-3 py-1">
              <Stars rating={form.rating} onChange={v=>f('rating',v)}/>
              {form.rating && <span className="text-sm text-gray-500">{form.rating} von 5 Sternen</span>}
              {form.rating && <button onClick={()=>f('rating','')} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Zurücksetzen</button>}
            </div>
          </Field>
          <Field label="Notizen / Bericht"><textarea value={form.notes} onChange={e=>f('notes',e.target.value)} className={`${input} h-24 resize-none`} placeholder="Mängel, Maßnahmen, Beobachtungen…"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">Abbrechen</button>
            <button onClick={save} disabled={saving||!form.title.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving&&<Loader2 size={14} className="animate-spin"/>}{editId?'Speichern':'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={()=>setDeleteId(null)} title="Prüfung löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Diese Qualitätsprüfung wird dauerhaft gelöscht.</p>
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
