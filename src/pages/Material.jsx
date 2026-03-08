import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../hooks/useCompany'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { Package, Loader2, Pencil, Trash2, AlertTriangle, Plus, Minus } from 'lucide-react'

const CATEGORIES = ['Reinigungsmittel','Verbrauchsmaterial','Werkzeug','Schutzausrüstung','Maschinen','Sonstiges']
const UNITS = ['Stück','Liter','kg','Rolle','Flasche','Paar','Karton','Sack']

const EMPTY_FORM = { name: '', category: '', unit: 'Stück', stock_quantity: 0, min_quantity: 0, unit_price: '', supplier: '', notes: '' }

function fmt(v) { return v!=null ? Number(v).toLocaleString('de-AT',{style:'currency',currency:'EUR'}) : '—' }

export default function Material() {
  const companyId = useCompany()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filterCat, setFilterCat] = useState('alle')
  const [search, setSearch] = useState('')
  const [adjustId, setAdjustId] = useState(null)
  const [adjustDelta, setAdjustDelta] = useState('')

  async function load() {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase.from('materials').select('*').eq('company_id', companyId).order('category').order('name')
    setRows(data??[])
    setLoading(false)
  }
  useEffect(() => { load() }, [companyId])

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(row) {
    setEditId(row.id)
    setForm({ name: row.name, category: row.category??'', unit: row.unit, stock_quantity: row.stock_quantity, min_quantity: row.min_quantity, unit_price: row.unit_price??'', supplier: row.supplier??'', notes: row.notes??'' })
    setModalOpen(true)
  }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name, category: form.category||null, unit: form.unit, stock_quantity: Number(form.stock_quantity), min_quantity: Number(form.min_quantity), unit_price: form.unit_price?Number(form.unit_price):null, supplier: form.supplier||null, notes: form.notes||null }
    if (editId) await supabase.from('materials').update(payload).eq('id', editId)
    else await supabase.from('materials').insert({...payload, company_id: companyId})
    setSaving(false); setModalOpen(false); load()
  }

  async function adjustStock(row, delta) {
    const newQty = Math.max(0, Number(row.stock_quantity) + delta)
    await supabase.from('materials').update({ stock_quantity: newQty }).eq('id', row.id)
    setRows(prev => prev.map(r => r.id===row.id ? {...r, stock_quantity: newQty} : r))
  }

  async function applyAdjust(row) {
    const delta = Number(adjustDelta)
    if (!delta) { setAdjustId(null); return }
    await adjustStock(row, delta)
    setAdjustId(null); setAdjustDelta('')
  }

  async function confirmDelete() { await supabase.from('materials').delete().eq('id', deleteId); setDeleteId(null); load() }

  // Stats
  const lowStock = rows.filter(r => Number(r.stock_quantity) <= Number(r.min_quantity) && Number(r.min_quantity) > 0)
  const stockValue = rows.reduce((s,r) => s + (Number(r.stock_quantity)*Number(r.unit_price??0)), 0)
  const categories = [...new Set(rows.map(r=>r.category).filter(Boolean))]

  const filtered = rows
    .filter(r => filterCat==='alle' || r.category===filterCat || (filterCat==='low' && Number(r.stock_quantity)<=Number(r.min_quantity) && Number(r.min_quantity)>0))
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.supplier??'').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8">
      <PageHeader title="Material & Lager" subtitle={`${rows.length} Artikel`} onAdd={openCreate} addLabel="Neuer Artikel" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-gray-700">{rows.length}</p><p className="text-xs text-gray-500 mt-0.5">Artikel gesamt</p></div>
        <div className={`${lowStock.length>0?'bg-red-50':'bg-green-50'} rounded-xl px-5 py-4 border border-gray-100`}>
          <p className={`text-2xl font-bold ${lowStock.length>0?'text-red-600':'text-green-700'}`}>{lowStock.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unter Mindestbestand</p>
        </div>
        <div className="bg-blue-50 rounded-xl px-5 py-4 border border-gray-100"><p className="text-2xl font-bold text-blue-700 font-mono">{fmt(stockValue)}</p><p className="text-xs text-gray-500 mt-0.5">Lagerwert</p></div>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
          {[{value:'alle',label:'Alle'},{value:'low',label:'⚠ Niedrig'},...categories.map(c=>({value:c,label:c}))].map(s=>(
            <button key={s.value} onClick={()=>setFilterCat(s.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterCat===s.value?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{s.label}</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suchen…" className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400"/></div>
        ) : filtered.length===0 ? (
          <EmptyState icon={Package} title="Kein Material" description={search?'Keine Treffer.':'Lege deinen ersten Artikel an.'}/>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Artikel','Kategorie','Bestand','Mindestbestand','Einzelpreis','Lieferant',''].map(h=>(
                  <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${['Bestand','Mindestbestand','Einzelpreis'].includes(h)?'text-right':'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => {
                const isLow = Number(row.min_quantity)>0 && Number(row.stock_quantity)<=Number(row.min_quantity)
                return (
                  <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors ${isLow?'bg-red-50/30':''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={14} className="text-red-400 shrink-0"/>}
                        <div>
                          <p className="font-medium text-gray-900">{row.name}</p>
                          <p className="text-xs text-gray-400">{row.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{row.category??'—'}</td>
                    <td className="px-6 py-4 text-right">
                      {adjustId===row.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input type="number" value={adjustDelta} onChange={e=>setAdjustDelta(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applyAdjust(row);if(e.key==='Escape'){setAdjustId(null);setAdjustDelta('')}}} autoFocus className="w-20 px-2 py-1 border border-blue-400 rounded text-right text-sm focus:outline-none" placeholder="±0"/>
                          <button onClick={()=>applyAdjust(row)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">OK</button>
                          <button onClick={()=>{setAdjustId(null);setAdjustDelta('')}} className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={()=>adjustStock(row,-1)} className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Minus size={13}/></button>
                          <span className={`font-semibold font-mono min-w-[2.5rem] text-center ${isLow?'text-red-600':'text-gray-900'}`} onClick={()=>setAdjustId(row.id)} title="Klicken zum Anpassen" style={{cursor:'pointer'}}>
                            {Number(row.stock_quantity)}
                          </span>
                          <button onClick={()=>adjustStock(row,1)} className="p-0.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><Plus size={13}/></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-mono">{Number(row.min_quantity)>0?Number(row.min_quantity):'—'}</td>
                    <td className="px-6 py-4 text-right text-gray-500 font-mono">{row.unit_price!=null?fmt(row.unit_price):'—'}</td>
                    <td className="px-6 py-4 text-gray-500">{row.supplier??'—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={()=>openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={15}/></button>
                        <button onClick={()=>setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editId?'Artikel bearbeiten':'Neuer Artikel'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name *"><input value={form.name} onChange={e=>f('name',e.target.value)} className={input} placeholder="z.B. Allzweckreiniger" autoFocus/></Field>
            <Field label="Kategorie">
              <input value={form.category} onChange={e=>f('category',e.target.value)} list="cats" className={input} placeholder="z.B. Reinigungsmittel"/>
              <datalist id="cats">{CATEGORIES.map(c=><option key={c} value={c}/>)}</datalist>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Einheit">
              <input value={form.unit} onChange={e=>f('unit',e.target.value)} list="units" className={input}/>
              <datalist id="units">{UNITS.map(u=><option key={u} value={u}/>)}</datalist>
            </Field>
            <Field label="Lagerbestand"><input type="number" min="0" step="1" value={form.stock_quantity} onChange={e=>f('stock_quantity',e.target.value)} className={input}/></Field>
            <Field label="Mindestbestand"><input type="number" min="0" step="1" value={form.min_quantity} onChange={e=>f('min_quantity',e.target.value)} className={input}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Einzelpreis (€)"><input type="number" min="0" step="0.01" value={form.unit_price} onChange={e=>f('unit_price',e.target.value)} className={input} placeholder="z.B. 4.90"/></Field>
            <Field label="Lieferant"><input value={form.supplier} onChange={e=>f('supplier',e.target.value)} className={input} placeholder="z.B. Kärcher GmbH"/></Field>
          </div>
          <Field label="Notizen"><textarea value={form.notes} onChange={e=>f('notes',e.target.value)} className={`${input} h-16 resize-none`} placeholder="Lagerort, Artikelnummer…"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">Abbrechen</button>
            <button onClick={save} disabled={saving||!form.name.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving&&<Loader2 size={14} className="animate-spin"/>}{editId?'Speichern':'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={()=>setDeleteId(null)} title="Artikel löschen?" size="sm">
        <p className="text-sm text-gray-600 mb-6">Dieser Artikel wird dauerhaft aus dem Lager entfernt.</p>
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
