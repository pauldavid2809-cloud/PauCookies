import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase'
import type { Order, Settings } from '../../lib/types'
import { money, todayISO, waLink } from '../../lib/format'

// Marcador numerado con color según estado de pago
function createIcon(num: number, paid: boolean) {
  const bg = paid ? '#d03578' : '#ef4444'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${bg};color:white;
      font-weight:800;font-size:13px;
      display:flex;align-items:center;justify-content:center;
      border:2.5px solid white;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);
      font-family:system-ui;
    ">${num}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  })
}

// Ajusta el mapa para mostrar todos los marcadores
function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  const key = coords.map((c) => c.join(',')).join('|')
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

export default function Rutas() {
  const [date, setDate] = useState(todayISO())
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [onlyPaid, setOnlyPaid] = useState(false)

  const load = useCallback(async () => {
    const [{ data: ordersData }, { data: settingsData }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('delivery_date', date)
        .in('status', ['pendiente', 'confirmado', 'en_produccion'])
        .order('created_at'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])
    setOrders(ordersData ?? [])
    setSettings(settingsData)
  }, [date])

  useEffect(() => { load() }, [load])

  const visible = onlyPaid ? orders.filter((o) => o.payment_confirmed) : orders
  const gpsOrders = visible.filter((o) => o.lat != null && o.lng != null)
  const coords: [number, number][] = gpsOrders.map((o) => [o.lat!, o.lng!])
  const currency = settings?.currency ?? 'Bs'

  function mapsUrl(o: Order) {
    if (o.lat != null && o.lng != null)
      return `https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`
  }

  async function markDelivered(o: Order) {
    await supabase.from('orders').update({ status: 'entregado' }).eq('id', o.id)
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-800 mb-4">Ruta de entregas</h1>

      {/* Controles */}
      <div className="card flex flex-wrap gap-3 items-end mb-4">
        <div>
          <span className="label">Día</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p className="text-sm text-stone-500">
          {visible.length} entrega(s) · {gpsOrders.length} con GPS
        </p>
        <label className="text-sm text-stone-600 flex items-center gap-2 ml-auto">
          <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} />
          Solo con pago confirmado
        </label>
      </div>

      {/* Mapa */}
      {gpsOrders.length > 0 ? (
        <div className="card !p-0 overflow-hidden mb-4 border-brand-200" style={{ height: '400px' }}>
          <MapContainer
            center={coords[0]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            />
            <FitBounds coords={coords} />

            {gpsOrders.map((o) => {
              /* Índice en la lista visible para que el número coincida */
              const listIdx = visible.indexOf(o)
              return (
                <Marker
                  key={o.id}
                  position={[o.lat!, o.lng!]}
                  icon={createIcon(listIdx + 1, o.payment_confirmed)}
                >
                  <Popup maxWidth={270}>
                    <div style={{ fontFamily: 'system-ui', minWidth: '210px' }}>
                      {/* Nombre */}
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>
                        #{listIdx + 1} — {o.customer_name}
                      </p>
                      {/* Dirección */}
                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>
                        📍 {o.address}
                      </p>
                      {/* Total + pago */}
                      <p style={{ fontSize: '12px', margin: '0 0 8px' }}>
                        <b>{money(o.total, currency)}</b>
                        {' · '}
                        <span style={{
                          color: o.payment_confirmed ? '#16a34a' : '#dc2626',
                          fontWeight: 700,
                        }}>
                          {o.payment_confirmed ? '✓ Pago verificado' : '⚠ Sin verificar'}
                        </span>
                      </p>
                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`}
                          target="_blank" rel="noreferrer"
                          style={{
                            fontSize: '11px', fontWeight: 700,
                            background: '#d03578', color: 'white',
                            padding: '4px 10px', borderRadius: '999px',
                            textDecoration: 'none',
                          }}
                        >
                          🗺 Navegar
                        </a>
                        <a
                          href={waLink(o.phone, `¡Hola ${o.customer_name}! Voy en camino con tu pedido de Pau's Cookies 🍪🛵`)}
                          target="_blank" rel="noreferrer"
                          style={{
                            fontSize: '11px', fontWeight: 700,
                            background: '#25d366', color: 'white',
                            padding: '4px 10px', borderRadius: '999px',
                            textDecoration: 'none',
                          }}
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      ) : visible.length > 0 ? (
        <div className="card mb-4 text-center text-sm text-stone-500 py-8">
          <p className="text-2xl mb-2">📍</p>
          <p>Ningún pedido de hoy compartió ubicación GPS.</p>
          <p className="text-xs mt-1 text-stone-400">El mapa aparecerá cuando las clientas usen el botón "Compartir mi ubicación" al pedir.</p>
        </div>
      ) : null}

      {visible.length === 0 && (
        <p className="text-sm text-stone-500">
          No hay entregas pendientes para este día{onlyPaid ? ' con pago confirmado' : ''}. 🎉
        </p>
      )}

      {/* Leyenda del mapa */}
      {gpsOrders.length > 0 && (
        <div className="flex gap-4 text-xs text-stone-500 mb-3 px-1">
          <span className="flex items-center gap-1">
            <span style={{ width:14,height:14,borderRadius:'50%',background:'#d03578',display:'inline-block' }} />
            Pago verificado
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width:14,height:14,borderRadius:'50%',background:'#ef4444',display:'inline-block' }} />
            Sin verificar
          </span>
          <span className="ml-auto">{gpsOrders.length}/{visible.length} con GPS</span>
        </div>
      )}

      {/* Lista de entregas */}
      <div className="grid gap-2">
        {visible.map((o, idx) => (
          <div
            key={o.id}
            className={`card !py-3 flex items-center gap-3 ${!o.payment_confirmed ? 'border-red-300 bg-red-50/30' : ''}`}
          >
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {o.customer_name}{' '}
                <span className="font-normal text-stone-400">· {o.phone}</span>
                {o.lat != null && (
                  <span className="text-xs text-green-700 ml-1">📍 GPS</span>
                )}
              </p>
              <p className="text-xs text-stone-500 truncate">{o.address}</p>
              {!o.payment_confirmed && (
                <p className="text-xs text-red-600 font-semibold">
                  ⚠️ Pago no verificado — revisar antes de entregar
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                className="btn btn-outline !py-1 !px-2 !text-xs"
                href={mapsUrl(o)}
                target="_blank" rel="noreferrer"
              >
                Mapa
              </a>
              <a
                className="btn btn-outline !py-1 !px-2 !text-xs"
                href={waLink(o.phone, `¡Hola ${o.customer_name}! Voy en camino con tu pedido de Pau's Cookies 🍪🛵`)}
                target="_blank" rel="noreferrer"
              >
                Aviso
              </a>
              <button className="btn !py-1 !px-2 !text-xs" onClick={() => markDelivered(o)}>
                Entregado ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
