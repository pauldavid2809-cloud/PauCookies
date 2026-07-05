import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Order } from '../../lib/types'
import { todayISO, waLink } from '../../lib/format'

export default function Rutas() {
  const [date, setDate] = useState(todayISO())
  const [orders, setOrders] = useState<Order[]>([])
  const [onlyPaid, setOnlyPaid] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_date', date)
      .in('status', ['pendiente', 'confirmado', 'en_produccion'])
      .order('created_at')
    setOrders(data ?? [])
  }, [date])
  useEffect(() => { load() }, [load])

  const visible = onlyPaid ? orders.filter((o) => o.payment_confirmed) : orders

  function mapsUrl(o: Order) {
    if (o.lat != null && o.lng != null) return `https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`
  }

  async function markDelivered(o: Order) {
    await supabase.from('orders').update({ status: 'entregado' }).eq('id', o.id)
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-800 mb-4">Ruta de entregas</h1>
      <div className="card flex flex-wrap gap-3 items-end mb-4">
        <div><span className="label">Día</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <p className="text-sm text-stone-500">{visible.length} entrega(s) pendientes</p>
        <label className="text-sm text-stone-600 flex items-center gap-2 ml-auto">
          <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} />
          Solo con pago confirmado
        </label>
      </div>

      {visible.length === 0 && <p className="text-sm text-stone-500">No hay entregas pendientes para este día{onlyPaid ? ' con pago confirmado' : ''}. 🎉</p>}

      <div className="grid gap-2">
        {visible.map((o, idx) => (
          <div key={o.id} className={`card !py-3 flex items-center gap-3 ${!o.payment_confirmed ? 'border-red-300 bg-red-50/30' : ''}`}>
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {o.customer_name} <span className="font-normal text-stone-400">· {o.phone}</span>
                {o.lat != null && <span className="text-xs text-green-700 ml-1">📍 GPS</span>}
              </p>
              <p className="text-xs text-stone-500 truncate">{o.address}</p>
              {!o.payment_confirmed && <p className="text-xs text-red-600 font-semibold">⚠️ Pago no verificado — revisar antes de entregar</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <a className="btn btn-outline !py-1 !px-2 !text-xs" href={mapsUrl(o)} target="_blank" rel="noreferrer">Mapa</a>
              <a className="btn btn-outline !py-1 !px-2 !text-xs" href={waLink(o.phone, `¡Hola ${o.customer_name}! Voy en camino con tu pedido de Pau's Cookies 🍪🛵`)} target="_blank" rel="noreferrer">Aviso</a>
              <button className="btn !py-1 !px-2 !text-xs" onClick={() => markDelivered(o)}>Entregado ✓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
