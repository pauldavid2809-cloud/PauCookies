import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Order, OrderItem, OrderStatus, Settings } from '../../lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/types'
import { fmtDate, money, waLink } from '../../lib/format'

const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pendiente: { to: 'confirmado', label: 'Confirmar' },
  confirmado: { to: 'en_produccion', label: 'A producción' },
  en_produccion: { to: 'entregado', label: 'Entregado ✓' },
}

export default function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showDelivered, setShowDelivered] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [o, i, s] = await Promise.all([
      supabase.from('orders').select('*').order('delivery_date'),
      supabase.from('order_items').select('*'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])
    setOrders(o.data ?? [])
    setItems(i.data ?? [])
    setSettings(s.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(order: Order, status: OrderStatus) {
    await supabase.from('orders').update({ status }).eq('id', order.id)
    load()
  }

  async function togglePayment(order: Order) {
    await supabase.from('orders').update({ payment_confirmed: !order.payment_confirmed }).eq('id', order.id)
    load()
  }

  const currency = settings?.currency ?? 'Bs'
  const visible = orders.filter((o) => showDelivered || (o.status !== 'entregado' && o.status !== 'cancelado'))
  const byDate = visible.reduce<Record<string, Order[]>>((acc, o) => {
    ;(acc[o.delivery_date] ??= []).push(o)
    return acc
  }, {})

  if (loading) return <p className="text-stone-500">Cargando…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-brand-800">Pedidos</h1>
        <label className="text-sm text-stone-600 flex items-center gap-2">
          <input type="checkbox" checked={showDelivered} onChange={(e) => setShowDelivered(e.target.checked)} />
          Ver entregados/cancelados
        </label>
      </div>

      {visible.length === 0 && <p className="text-stone-500 text-sm">No hay pedidos activos. Comparte el link del catálogo para recibir pedidos 🎉</p>}

      {Object.entries(byDate).map(([date, dayOrders]) => (
        <section key={date} className="mb-6">
          <h2 className="font-semibold text-brand-700 mb-2 capitalize">{fmtDate(date)} · {dayOrders.length} pedido(s)</h2>
          <div className="grid gap-3">
            {dayOrders.map((o) => {
              const orderItems = items.filter((i) => i.order_id === o.id)
              const next = NEXT_STATUS[o.status]
              return (
                <div key={o.id} className="card">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold">{o.customer_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${o.payment_confirmed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                      {o.payment_confirmed ? 'Pago verificado ✓' : 'Pago por verificar'}
                    </span>
                    <span className="ml-auto font-bold text-brand-700">{money(o.total, currency)}</span>
                  </div>
                  <ul className="text-sm text-stone-600 mb-1">
                    {orderItems.map((i) => <li key={i.id}>{i.qty} × {i.product_name}</li>)}
                  </ul>
                  <p className="text-xs text-stone-500">
                    📍 {o.address}
                    {o.lat != null && o.lng != null && (
                      <a className="text-brand-600 underline ml-1" href={`https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`} target="_blank" rel="noreferrer">ver ubicación GPS</a>
                    )}
                  </p>
                  {o.notes && <p className="text-xs text-stone-500 italic">📝 {o.notes}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a className="btn btn-outline !py-1 !px-3 !text-xs" href={waLink(o.phone, `¡Hola ${o.customer_name}! Te escribe Pau's Cookies 🍪`)} target="_blank" rel="noreferrer">WhatsApp</a>
                    {o.receipt_url && (
                      <a className="btn btn-outline !py-1 !px-3 !text-xs" href={o.receipt_url} target="_blank" rel="noreferrer">🧾 Ver comprobante</a>
                    )}
                    <button className="btn btn-outline !py-1 !px-3 !text-xs" onClick={() => togglePayment(o)}>
                      {o.payment_confirmed ? 'Quitar pago confirmado' : '✓ Confirmar pago'}
                    </button>
                    {next && <button className="btn !py-1 !px-3 !text-xs" onClick={() => setStatus(o, next.to)}>{next.label}</button>}
                    {o.status !== 'cancelado' && o.status !== 'entregado' && (
                      <button className="text-xs text-red-500 underline ml-auto" onClick={() => setStatus(o, 'cancelado')}>Cancelar</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
