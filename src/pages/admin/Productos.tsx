import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Ingredient, Product, RecipeItem, Settings } from '../../lib/types'
import { money } from '../../lib/format'

const EMPTY = { name: '', description: '', image_url: '', price: 0, batch_size: 12, active: true }

export default function Productos() {
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<RecipeItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [recipeFor, setRecipeFor] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)

  const load = useCallback(async () => {
    const [p, i, r, s] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('recipe_items').select('*'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])
    setProducts(p.data ?? [])
    setIngredients(i.data ?? [])
    setRecipes(r.data ?? [])
    setSettings(s.data)
  }, [])
  useEffect(() => { load() }, [load])

  const currency = settings?.currency ?? 'Bs'
  const margin = settings?.margin_multiplier ?? 2

  const costPerUnit = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of products) {
      const batchCost = recipes
        .filter((r) => r.product_id === p.id)
        .reduce((sum, r) => {
          const ing = ingredients.find((i) => i.id === r.ingredient_id)
          return ing ? sum + (ing.package_price / ing.package_size) * r.qty : sum
        }, 0)
      map[p.id] = p.batch_size > 0 ? batchCost / p.batch_size : 0
    }
    return map
  }, [products, recipes, ingredients])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (editing) await supabase.from('products').update(form).eq('id', editing)
    else await supabase.from('products').insert(form)
    setForm(EMPTY)
    setEditing(null)
    load()
  }


  async function remove(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return

    // Verificar si hay pedidos que usan este producto
    const { count } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)

    if (count && count > 0) {
      alert(
        `Este producto tiene ${count} pedido(s) registrado(s) y no puede eliminarse.\n\n` +
        `👉 Desactívalo en su lugar: edita el producto y desmarca "Visible en el catálogo". Así deja de aparecer sin perder el historial de pedidos.`,
      )
      return
    }

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert('No se pudo eliminar el producto: ' + error.message)
      return
    }
    load()
  }


  async function addRecipeItem(productId: string, ingredientId: string, qty: number) {
    if (!ingredientId || qty <= 0) return
    await supabase.from('recipe_items').insert({ product_id: productId, ingredient_id: ingredientId, qty })
    load()
  }

  async function removeRecipeItem(id: string) {
    await supabase.from('recipe_items').delete().eq('id', id)
    load()
  }

  async function handleImageUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) { alert('La imagen no puede superar 10 MB.'); return }
    setImageUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('productos').upload(path, file)
    if (!error) {
      const url = supabase.storage.from('productos').getPublicUrl(path).data.publicUrl
      setForm((f) => ({ ...f, image_url: url }))
    } else {
      alert('No se pudo subir la imagen. Verifica que el bucket \'productos\' existe en Supabase Storage.')
    }
    setImageUploading(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">
      <form onSubmit={save} className="card grid gap-3">
        <h1 className="text-lg font-bold text-brand-800">{editing ? 'Editar producto' : 'Nuevo producto'}</h1>
        <div><span className="label">Nombre</span>
          <input className="input" required placeholder="Caja de 12 galletas de chocolate" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><span className="label">Descripción</span>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div>
          <span className="label">Foto del producto</span>
          <div className="flex items-center gap-3 mt-1">
            {form.image_url
              ? <img src={form.image_url} alt="preview" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-stone-200" />
              : <div className="w-16 h-16 rounded-lg bg-brand-100 flex items-center justify-center text-2xl shrink-0">🍪</div>}
            <div className="flex-1">
              <input
                className="input"
                type="file"
                accept="image/*"
                disabled={imageUploading}
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              />
              {imageUploading && <p className="text-xs text-stone-500 mt-1">Subiendo imagen…</p>}
              {form.image_url && !imageUploading && (
                <p className="text-xs text-green-700 mt-1">✓ Imagen cargada</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="label">Precio de venta</span>
            <input className="input" type="number" min={0} step="any" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
          <div><span className="label">Unidades por tanda</span>
            <input className="input" type="number" min={1} required value={form.batch_size} onChange={(e) => setForm({ ...form, batch_size: Number(e.target.value) })} /></div>
        </div>
        <label className="text-sm text-stone-600 flex items-center gap-2">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Visible en el catálogo
        </label>
        <div className="flex gap-2">
          {editing && <button type="button" className="btn btn-outline flex-1" onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancelar</button>}
          <button className="btn flex-1">{editing ? 'Guardar cambios' : 'Agregar'}</button>
        </div>
      </form>

      <div className="grid gap-2">
        {products.length === 0 && <p className="text-sm text-stone-500">Crea tu primer producto. Luego ábrele la receta para calcular su costo real.</p>}
        {products.map((p) => {
          const cost = costPerUnit[p.id] ?? 0
          const suggested = cost * margin
          const productRecipe = recipes.filter((r) => r.product_id === p.id)
          const losing = cost > 0 && p.price < cost
          return (
            <div key={p.id} className="card">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{p.name} {!p.active && <span className="text-xs text-stone-400">(oculto)</span>}</p>
                  <p className="text-xs text-stone-500">
                    Venta: <b>{money(p.price, currency)}</b>
                    {cost > 0 && <> · Costo: <b>{money(cost, currency)}</b> · Sugerido (×{margin}): <b>{money(suggested, currency)}</b></>}
                  </p>
                  {losing && <p className="text-xs text-red-600 font-semibold">⚠️ ¡Estás vendiendo por debajo del costo!</p>}
                </div>
                <button className="text-xs text-brand-600 underline" onClick={() => setRecipeFor(recipeFor === p.id ? null : p.id)}>Receta</button>
                <button className="text-xs text-brand-600 underline" onClick={() => { setEditing(p.id); setForm({ name: p.name, description: p.description, image_url: p.image_url, price: p.price, batch_size: p.batch_size, active: p.active }) }}>Editar</button>
                <button className="text-xs text-red-500 underline" onClick={() => remove(p.id)}>Eliminar</button>
              </div>

              {recipeFor === p.id && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <p className="text-xs text-stone-500 mb-2">Ingredientes por tanda ({p.batch_size} unidades):</p>
                  {productRecipe.map((r) => {
                    const ing = ingredients.find((i) => i.id === r.ingredient_id)
                    if (!ing) return null
                    return (
                      <div key={r.id} className="flex items-center gap-2 text-sm py-0.5">
                        <span className="flex-1">{ing.name} — {r.qty} {ing.unit}</span>
                        <span className="text-xs text-stone-500">{money((ing.package_price / ing.package_size) * r.qty, currency)}</span>
                        <button className="text-xs text-red-500" onClick={() => removeRecipeItem(r.id)}>✕</button>
                      </div>
                    )
                  })}
                  <AddRecipeRow
                    ingredients={ingredients.filter((i) => !productRecipe.some((r) => r.ingredient_id === i.id))}
                    onAdd={(ingId, qty) => addRecipeItem(p.id, ingId, qty)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddRecipeRow({ ingredients, onAdd }: { ingredients: Ingredient[]; onAdd: (id: string, qty: number) => void }) {
  const [ingId, setIngId] = useState('')
  const [qty, setQty] = useState(0)
  if (ingredients.length === 0) return <p className="text-xs text-stone-400 mt-1">Agrega ingredientes en la pestaña Ingredientes.</p>
  return (
    <div className="flex gap-2 mt-2">
      <select className="input flex-1" value={ingId} onChange={(e) => setIngId(e.target.value)}>
        <option value="">Ingrediente…</option>
        {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
      </select>
      <input className="input !w-24" type="number" min={0} step="any" placeholder="Cant." value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} />
      <button type="button" className="btn !px-3" onClick={() => { onAdd(ingId, qty); setIngId(''); setQty(0) }}>+</button>
    </div>
  )
}
