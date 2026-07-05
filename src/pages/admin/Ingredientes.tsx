import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Ingredient, Settings } from '../../lib/types'
import { money } from '../../lib/format'

const EMPTY = { name: '', unit: 'g', package_size: 1000, package_price: 0 }

export default function Ingredientes() {
  const [list, setList] = useState<Ingredient[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [i, s] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])
    setList(i.data ?? [])
    setSettings(s.data)
  }, [])
  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (editing) await supabase.from('ingredients').update(form).eq('id', editing)
    else await supabase.from('ingredients').insert(form)
    setForm(EMPTY)
    setEditing(null)
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este ingrediente? Se quitará de las recetas que lo usan.')) return
    await supabase.from('ingredients').delete().eq('id', id)
    load()
  }

  const currency = settings?.currency ?? 'Bs'

  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">
      <form onSubmit={save} className="card grid gap-3">
        <h1 className="text-lg font-bold text-brand-800">{editing ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h1>
        <div><span className="label">Nombre</span>
          <input className="input" required placeholder="Harina de trigo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><span className="label">Unidad</span>
            <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="g">gramos</option>
              <option value="ml">mililitros</option>
              <option value="unidad">unidades</option>
            </select></div>
          <div><span className="label">Empaque ({form.unit})</span>
            <input className="input" type="number" min={0.01} step="any" required value={form.package_size} onChange={(e) => setForm({ ...form, package_size: Number(e.target.value) })} /></div>
          <div><span className="label">Precio empaque</span>
            <input className="input" type="number" min={0} step="any" required value={form.package_price} onChange={(e) => setForm({ ...form, package_price: Number(e.target.value) })} /></div>
        </div>
        <p className="text-xs text-stone-500">
          Ej.: compras harina en bulto de 1000 g a {money(form.package_price || 0, currency)} → el sistema calcula el costo por gramo.
        </p>
        <div className="flex gap-2">
          {editing && <button type="button" className="btn btn-outline flex-1" onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancelar</button>}
          <button className="btn flex-1">{editing ? 'Guardar cambios' : 'Agregar'}</button>
        </div>
      </form>

      <div className="grid gap-2">
        {list.length === 0 && <p className="text-sm text-stone-500">Agrega tus ingredientes con el precio al que los compras. Son la base de la calculadora de costos.</p>}
        {list.map((i) => (
          <div key={i.id} className="card !py-2 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{i.name}</p>
              <p className="text-xs text-stone-500">
                {i.package_size} {i.unit} → {money(i.package_price, currency)} ({money(i.package_price / i.package_size, currency)}/{i.unit})
              </p>
            </div>
            <button className="text-xs text-brand-600 underline" onClick={() => { setEditing(i.id); setForm({ name: i.name, unit: i.unit, package_size: i.package_size, package_price: i.package_price }) }}>Editar</button>
            <button className="text-xs text-red-500 underline" onClick={() => remove(i.id)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
