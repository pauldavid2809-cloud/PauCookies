import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Order, OrderItem, OrderStatus, Settings } from '../../lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/types'
import { fmtDate, money, todayISO, waLink } from '../../lib/format'

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
  const [search, setSearch] = useState('')
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([
      supabase.from('orders').select('*').order('delivery_date'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])
    const loadedOrders: Order[] = o.data ?? []
    setOrders(loadedOrders)
    setSettings(s.data)
    if (loadedOrders.length > 0) {
      const ids = loadedOrders.map((x) => x.id)
      const { data } = await supabase.from('order_items').select('*').in('order_id', ids)
      setItems(data ?? [])
    } else {
      setItems([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(order: Order, status: OrderStatus) {
    await supabase.from('orders').update({ status }).eq('id', order.id)
    load()
  }

  async function togglePayment(order: Order) {
    const newVal = !order.payment_confirmed
    await supabase.from('orders').update({ payment_confirmed: newVal }).eq('id', order.id)
    setConfirmedIds((prev) => {
      const next = new Set(prev)
      if (newVal) next.add(order.id)
      else next.delete(order.id)
      return next
    })
    load()
  }

  const currency = settings?.currency ?? 'Bs'
  const today = todayISO()

  const active = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado')
  const todayOrders = active.filter((o) => o.delivery_date === today)
  const todayTotal = todayOrders.reduce((s, o) => s + o.total, 0)
  const pendingPayment = active.filter((o) => !o.payment_confirmed).length

  const visible = orders
    .filter((o) => showDelivered || (o.status !== 'entregado' && o.status !== 'cancelado'))
    .filter((o) => !search.trim() || o.customer_name.toLowerCase().includes(search.toLowerCase().trim()))

  const byDate = visible.reduce<Record<string, Order[]>>((acc, o) => {
    ;(acc[o.delivery_date] ??= []).push(o)
    return acc
  }, {})

  if (loading) return <p className="text-stone-500">Cargando…</p>

  return (
    <div>
      {/* Métricas del día */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card !py-3 text-center">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Hoy — entregas</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{todayOrders.length}</p>
        </div>
        <div className="card !py-3 text-center">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Hoy — facturado</p>
          <p className="text-lg font-bold text-brand-700 mt-1 leading-tight">{money(todayTotal, currency)}</p>
        </div>
        <div className={`card !py-3 text-center ${pendingPayment > 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Sin verificar pago</p>
          <p className={`text-2xl font-bold mt-1 ${pendingPayment > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {pendingPayment}
          </p>
        </div>
      </div>

      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-xl font-bold text-brand-800">Pedidos</h1>
        <input
          className="input max-w-xs"
          placeholder="Buscar por nombre de clienta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="text-sm text-stone-600 flex items-center gap-2 ml-auto">
          <input type="checkbox" checked={showDelivered} onChange={(e) => setShowDelivered(e.target.checked)} />
          Ver entregados/cancelados
        </label>
      </div>

      {visible.length === 0 && (
        <p className="text-stone-500 text-sm">
          {search
            ? `No hay pedidos que coincidan con "${search}".`
            : 'No hay pedidos activos. Comparte el link del catálogo para recibir pedidos 🎉'}
        </p>
      )}

      {Object.entries(byDate).map(([date, dayOrders]) => (
        <section key={date} className="mb-6">
          <h2 className="font-semibold text-brand-700 mb-2 capitalize">
            {fmtDate(date)} · {dayOrders.length} pedido(s)
          </h2>
          <div className="grid gap-3">
            {dayOrders.map((o) => {
              const orderItems = items.filter((i) => i.order_id === o.id)
              const next = NEXT_STATUS[o.status]
              const justConfirmed = confirmedIds.has(o.id)
              return (
                <div key={o.id} className="card">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold">{o.customer_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
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
                      <a
                        className="text-brand-600 underline ml-1"
                        href={`https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`}
                        target="_blank" rel="noreferrer"
                      >
                        ver ubicación GPS
                      </a>
                    )}
                  </p>
                  {o.notes && <p className="text-xs text-stone-500 italic">📝 {o.notes}</p>}

                  {/* Banner de pago recién confirmado */}
                  {justConfirmed && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-green-800 font-semibold">✓ Pago confirmado — ¿Avisarle a la clienta?</span>
                      <a
                        className="btn !py-1 !px-3 !text-xs"
                        href={waLink(
                          o.phone,
                          `¡Hola ${o.customer_name}! 🍪 Tu pago fue verificado y tu pedido de Pau's Cookies está confirmado para el ${fmtDate(o.delivery_date)}. ¡Gracias! 💛`,
                        )}
                        target="_blank" rel="noreferrer"
                      >
                        Enviar confirmación WhatsApp ↗
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      className="btn btn-outline !py-1 !px-3 !text-xs"
                      href={waLink(o.phone, `¡Hola ${o.customer_name}! Te escribe Pau's Cookies 🍪`)}
                      target="_blank" rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                    {o.receipt_url && (
                      <a className="btn btn-outline !py-1 !px-3 !text-xs" href={o.receipt_url} target="_blank" rel="noreferrer">
                        🧾 Ver comprobante
                      </a>
                    )}
                    <button className="btn btn-outline !py-1 !px-3 !text-xs" onClick={() => togglePayment(o)}>
                      {o.payment_confirmed ? 'Quitar pago confirmado' : '✓ Confirmar pago'}
                    </button>
                    {next && (
                      <button className="btn !py-1 !px-3 !text-xs" onClick={() => setStatus(o, next.to)}>
                        {next.label}
                      </button>
                    )}
                    {o.status !== 'cancelado' && o.status !== 'entregado' && (
                      <button
                        className="text-xs text-red-500 underline ml-auto"
                        onClick={() => setStatus(o, 'cancelado')}
                      >
                        Cancelar
                      </button>
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
