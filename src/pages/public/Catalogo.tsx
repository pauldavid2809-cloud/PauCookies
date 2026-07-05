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

  const [form, setForm] = useState({ name: '', phone: '', date: '', address: '', notes: '' })
  const [receipt, setReceipt] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locStatus, setLocStatus] = useState<'idle' | 'getting' | 'ok' | 'error'>('idle')

  function shareLocation() {
    if (!navigator.geolocation) { setLocStatus('error'); return }
    setLocStatus('getting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocStatus('ok')
      },
      () => setLocStatus('error'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

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

  const items = useMemo(
    () => products.filter((p) => cart[p.id] > 0).map((p) => ({ product: p, qty: cart[p.id] })),
    [products, cart],
  )
  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0)
  const itemCount = items.reduce((n, i) => n + i.qty, 0)
  const currency = settings?.currency ?? 'Bs'
  const advancePct = settings?.advance_percent ?? 50

  function add(id: string, delta: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }))
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!receipt) { setError('Adjunta la captura de tu comprobante de pago para enviar el pedido.'); return }
    setError('')
    setSending(true)
    const orderId = crypto.randomUUID()
    const ext = (receipt.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${orderId}.${ext}`
    const { error: eUp } = await supabase.storage.from('comprobantes').upload(path, receipt)
    if (eUp) { setSending(false); setError('No se pudo subir el comprobante. Verifica tu conexión e intenta de nuevo.'); return }
    const receiptUrl = supabase.storage.from('comprobantes').getPublicUrl(path).data.publicUrl
    const { error: e1 } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: form.name,
      phone: form.phone,
      delivery_date: form.date,
      address: form.address,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      notes: form.notes,
      total,
      receipt_url: receiptUrl,
    })
    if (e1) { setSending(false); setError('No se pudo enviar el pedido. Revisa los datos e intenta de nuevo.'); return }
    const { error: e2 } = await supabase.from('order_items').insert(
      items.map(({ product, qty }) => ({
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        qty,
        unit_price: product.price,
      })),
    )
    if (e2) { setSending(false); setError('El pedido se creó pero hubo un problema con los productos. Escríbenos por WhatsApp.'); return }
    setSending(false)
    setPlaced({ total, advance: (total * advancePct) / 100 })
    setCart({})
    setCheckout(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500">Cargando…</div>

  if (placed) {
    const msg = `¡Hola! Soy ${form.name}. Acabo de hacer un pedido por ${money(placed.total, currency)} para el ${form.date} y ya subí mi comprobante del anticipo de ${money(placed.advance, currency)}.`
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-brand-800 mb-2">¡Pedido recibido!</h1>
          <p className="text-sm text-stone-600 mb-4">
            Ya recibimos tu comprobante del anticipo ({money(placed.advance, currency)}).
            Verificaremos el pago y te confirmaremos tu pedido por WhatsApp. 💛
          </p>
          {settings?.whatsapp && (
            <a className="btn w-full" href={waLink(settings.whatsapp, msg)} target="_blank" rel="noreferrer">
              Escribir al negocio por WhatsApp
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
            <div className="flex justify-between text-brand-700 font-bold">
              <span>Anticipo a pagar ({advancePct}%)</span><span>{money((total * advancePct) / 100, currency)}</span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-amber-900 mb-1">💳 Paga el anticipo a estos datos:</p>
            <p className="whitespace-pre-wrap text-amber-900">{settings?.payment_info}</p>
          </div>
          <div>
            <span className="label">Comprobante de pago (obligatorio)</span>
            <input
              className="input"
              type="file"
              accept="image/*,.pdf"
              required
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-stone-500 mt-1">Haz la transferencia o pago móvil y adjunta aquí la captura.</p>
          </div>
          <div><span className="label">Tu nombre</span>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><span className="label">Teléfono (WhatsApp)</span>
            <input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><span className="label">Fecha de entrega</span>
            <input className="input" type="date" required min={todayISO()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div>
            <span className="label">Ubicación para la entrega</span>
            {locStatus !== 'ok' ? (
              <button type="button" className="btn btn-outline w-full" onClick={shareLocation} disabled={locStatus === 'getting'}>
                {locStatus === 'getting' ? 'Obteniendo ubicación…' : '📍 Compartir mi ubicación'}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                <span>✓ Ubicación capturada</span>
                <a className="underline" href={`https://www.google.com/maps?q=${coords!.lat},${coords!.lng}`} target="_blank" rel="noreferrer">Ver en mapa</a>
              </div>
            )}
            {locStatus === 'error' && (
              <p className="text-xs text-amber-700 mt-1">No pudimos obtener tu ubicación (¿negaste el permiso?). No te preocupes: escribe tu dirección bien detallada abajo.</p>
            )}
          </div>
          <div><span className="label">Dirección / punto de referencia</span>
            <input className="input" required placeholder="Edificio, casa, punto de referencia…" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><span className="label">Notas (opcional)</span>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline flex-1" onClick={() => setCheckout(false)} disabled={sending}>Volver</button>
            <button type="submit" className="btn flex-1" disabled={sending}>{sending ? 'Enviando…' : 'Enviar pedido'}</button>
          </div>
        </form>
      )}

      {!checkout && itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-stone-500">{itemCount} artículos</p>
              <p className="font-bold text-brand-800">{money(total, currency)}</p>
            </div>
            <button className="btn" onClick={() => setCheckout(true)}>Hacer pedido →</button>
          </div>
        </div>
      )}
    </div>
  )
}
