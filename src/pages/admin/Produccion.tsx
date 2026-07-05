import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Ingredient, Order, OrderItem, Product, RecipeItem, Settings } from '../../lib/types'
import { fmtDate, money, todayISO } from '../../lib/format'

export default function Produccion() {
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(todayISO())
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<RecipeItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)

  const load = useCallback(async () => {
    const [o, p, i, r, s] = await Promise.all([
      supabase.from('orders').select('*').gte('delivery_date', from).lte('delivery_date', to).in('status', ['pendiente', 'confirmado', 'en_produccion']),
      supabase.from('products').select('*'),
      supabase.from('ingredients').select('*'),
      supabase.from('recipe_items').select('*'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])
    setOrders(o.data ?? [])
    setProducts(p.data ?? [])
    setIngredients(i.data ?? [])
    setRecipes(r.data ?? [])
    setSettings(s.data)
    const ids = (o.data ?? []).map((x: Order) => x.id)
    if (ids.length) {
      const { data } = await supabase.from('order_items').select('*').in('order_id', ids)
      setItems(data ?? [])
    } else setItems([])
  }, [from, to])
  useEffect(() => { load() }, [load])

  const plan = useMemo(() => {
    const perProduct: Record<string, number> = {}
    for (const it of items) perProduct[it.product_id] = (perProduct[it.product_id] ?? 0) + it.qty

    const rows = Object.entries(perProduct).map(([pid, qty]) => {
      const product = products.find((p) => p.id === pid)
      const batches = product ? Math.ceil(qty / product.batch_size) : 0
      return { product, qty, batches }
    }).filter((r) => r.product)

    const shopping: Record<string, number> = {}
    for (const row of rows) {
      for (const r of recipes.filter((x) => x.product_id === row.product!.id)) {
        shopping[r.ingredient_id] = (shopping[r.ingredient_id] ?? 0) + r.qty * row.batches
      }
    }
    return { rows, shopping }
  }, [items, products, recipes])

  const currency = settings?.currency ?? 'Bs'

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-800 mb-4">Hoja de producción</h1>
      <div className="card flex flex-wrap gap-3 items-end mb-4">
        <div><span className="label">Desde</span><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><span className="label">Hasta</span><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <p className="text-sm text-stone-500">{orders.length} pedido(s) activos en el rango</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="card">
          <h2 className="font-bold text-brand-700 mb-2">🥣 Qué hornear</h2>
          {plan.rows.length === 0 && <p className="text-sm text-stone-500">No hay pedidos activos entre {fmtDate(from)} y {fmtDate(to)}.</p>}
          {plan.rows.map(({ product, qty, batches }) => (
            <div key={product!.id} className="flex justify-between text-sm py-1.5 border-b border-stone-100 last:border-0">
              <span>{product!.name}</span>
              <span className="font-semibold">{qty} unid. → {batches} tanda(s)</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-bold text-brand-700 mb-2">🛒 Lista de compras</h2>
          {Object.keys(plan.shopping).length === 0 && <p className="text-sm text-stone-500">Agrega recetas a tus productos para calcular los ingredientes.</p>}
          {Object.entries(plan.shopping).map(([ingId, qty]) => {
            const ing = ingredients.find((i) => i.id === ingId)
            if (!ing) return null
            const cost = (ing.package_price / ing.package_size) * qty
            return (
              <div key={ingId} className="flex justify-between text-sm py-1.5 border-b border-stone-100 last:border-0">
                <span>{ing.name}</span>
                <span className="font-semibold">{qty.toLocaleString('es-VE')} {ing.unit} <span className="text-stone-400 font-normal">(~{money(cost, currency)})</span></span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
