import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Product, Settings } from '../../lib/types'
import { money, todayISO, waLink } from '../../lib/format'

type Cart = Record<string, number>

export default function Catalogo() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Cart>({})
  const [checkout, setCheckout] = useState(false)
  const [placed, setPlaced] = useState<{ total: number; advance: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ name: '', phone: '', date: '', address: '', zone: '', notes: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('products').select('*').eq('active', true).order('name'),
    ]).then(([s, p]) => {
      if (s.data) setSettings(s.data)
      if (p.data) setProducts(p.data)
      if (s.error || p.error) setError('No se pudo cargar el catálogo. Intenta de nuevo.')
      setLoading(false)
    })
  }, [])

  const zones = useMemo(
    () => (settings?.delivery_zones ?? '').split(',').map((z) => z.trim()).filter(Boolean),
    [settings],
  )
  const items = useMemo(
    () => products.filter((p) => cart[p.id] > 0).map((p) => ({ product: p, qty: cart[p.id] })),
    [products, cart],
  )
  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0)
  const currency = settings?.currency ?? 'Bs'
  const advancePct = settings?.advance_percent ?? 50

  function add(id: string, delta: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }))
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const orderId = crypto.randomUUID()
    const { error: e1 } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: form.name,
      phone: form.phone,
      delivery_date: form.date,
      address: form.address,
      zone: form.zone,
      notes: form.notes,
      total,
    })
    if (e1) { setError('No se pudo enviar el pedido. Revisa los datos e intenta de nuevo.'); return }
    const { error: e2 } = await supabase.from('order_items').insert(
      items.map(({ product, qty }) => ({
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        qty,
        unit_price: product.price,
      })),
    )
    if (e2) { setError('El pedido se creó pero hubo un problema con los productos. Escríbenos por WhatsApp.'); return }
    setPlaced({ total, advance: (total * advancePct) / 100 })
    setCart({})
    setCheckout(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500">Cargando…</div>

  if (placed) {
    const msg = `¡Hola! Soy ${form.name}. Acabo de hacer un pedido por ${money(placed.total, currency)} para el ${form.date}. Aquí envío mi comprobante del anticipo.`
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-brand-800 mb-2">¡Pedido recibido!</h1>
          <p className="text-sm text-stone-600 mb-4">
            Para confirmarlo, transfiere el anticipo del <b>{advancePct}%</b> ({money(placed.advance, currency)}) y envía el comprobante por WhatsApp.
          </p>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm text-left whitespace-pre-wrap mb-4">
            {settings?.payment_info}
          </div>
          {settings?.whatsapp && (
            <a className="btn w-full" href={waLink(settings.whatsapp, msg)} target="_blank" rel="noreferrer">
              Enviar comprobante por WhatsApp
            </a>
          )}
          <button className="btn-outline btn w-full mt-2" onClick={() => setPlaced(null)}>Volver al catálogo</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <header className="text-center py-6">
        <div className="text-5xl">🍪</div>
        <h1 className="text-2xl font-bold text-brand-800">{settings?.business_name ?? "Pau's Cookies"}</h1>
        <p className="text-sm text-stone-500 mt-1">Galletas artesanales hechas con amor · Pedidos con anticipación</p>
        <Link to="/reclamos" className="text-xs text-brand-600 underline mt-1 inline-block">¿Algo salió mal? Déjanos tu reclamo</Link>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {!checkout && (
        <div className="grid gap-3">
          {products.length === 0 && <p className="text-center text-stone-500 text-sm">Aún no hay productos publicados.</p>}
          {products.map((p) => (
            <div key={p.id} className="card flex gap-3 items-center">
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                : <div className="w-20 h-20 rounded-lg bg-brand-100 flex items-center justify-center text-3xl shrink-0">🍪</div>}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-stone-800">{p.name}</h2>
                {p.description && <p className="text-xs text-stone-500 line-clamp-2">{p.description}</p>}
                <p className="text-brand-700 font-bold mt-1">{money(p.price, currency)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn-outline btn !px-3" onClick={() => add(p.id, -1)} aria-label={`Quitar ${p.name}`}>−</button>
                <span className="w-6 text-center font-semibold">{cart[p.id] ?? 0}</span>
                <button className="btn !px-3" onClick={() => add(p.id, 1)} aria-label={`Agregar ${p.name}`}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {checkout && (
        <form onSubmit={placeOrder} className="card grid gap-3">
          <h2 className="font-bold text-brand-800">Datos de entrega</h2>
          <div className="text-sm bg-brand-50 rounded-lg p-3">
            {items.map(({ product, qty }) => (
              <div key={product.id} className="flex justify-between">
                <span>{qty} × {product.name}</span>
                <span>{money(product.price * qty, currency)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-brand-200 mt-2 pt-2">
              <span>Total</span><span>{money(total, currency)}</span>
            </div>
            <div className="flex justify-between text-brand-700">
              <span>Anticipo ({advancePct}%)</span><span>{money((total * advancePct) / 100, currency)}</span>
            </div>
          </div>
          <div><span className="label">Tu nombre</span>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><span className="label">Teléfono (WhatsApp)</span>
            <input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><span className="label">Fecha de entrega</span>
            <input className="input" type="date" required min={todayISO()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><span className="label">Zona</span>
            <input className="input" list="zonas" required value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
            <datalist id="zonas">{zones.map((z) => <option key={z} value={z} />)}</datalist></div>
          <div><span className="label">Dirección exacta</span>
            <input className="input" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><span className="label">Notas (opcional)</span>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline flex-1" onClick={() => setCheckout(false)}>Volver</button>
            <button type="submit" className="btn flex-1">Enviar pedido</button>
          </div>
        </form>
      )}

      {!checkout && total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-stone-500">{items.reduce((n, i) => n + i.qty, 0)} artículos</p>
              <p className="font-bold text-brand-800">{money(total, currency)}</p>
            </div>
            <button className="btn" onClick={() => setCheckout(true)}>Hacer pedido →</button>
          </div>
        </div>
      )}
    </div>
  )
}
