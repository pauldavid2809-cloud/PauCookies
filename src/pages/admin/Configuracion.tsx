import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Settings } from '../../lib/types'

export default function Configuracion() {
  const [s, setS] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const catalogUrl = `${window.location.origin}/catalogo`

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => setS(data))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!s) return
    await supabase.from('settings').update({
      business_name: s.business_name,
      currency: s.currency,
      margin_multiplier: s.margin_multiplier,
      payment_info: s.payment_info,
      whatsapp: s.whatsapp,
      delivery_zones: s.delivery_zones,
      advance_percent: s.advance_percent,
    }).eq('id', 1)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!s) return <p className="text-stone-500">Cargando…</p>

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-brand-800 mb-4">Configuración</h1>

      <div className="card mb-4 bg-brand-100/50">
        <p className="label !mb-1">Link del catálogo (compártelo en Instagram/WhatsApp)</p>
        <div className="flex gap-2">
          <input className="input" readOnly value={catalogUrl} onFocus={(e) => e.target.select()} />
          <button className="btn btn-outline shrink-0" type="button" onClick={() => navigator.clipboard.writeText(catalogUrl)}>Copiar</button>
        </div>
      </div>

      <form onSubmit={save} className="card grid gap-3">
        <div><span className="label">Nombre del negocio</span>
          <input className="input" value={s.business_name} onChange={(e) => setS({ ...s, business_name: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><span className="label">Moneda</span>
            <select className="input" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })}>
              <option value="Bs">Bolívares (Bs)</option>
              <option value="$">Dólares ($)</option>
            </select></div>
          <div><span className="label">Anticipo (%)</span>
            <input className="input" type="number" min={0} max={100} value={s.advance_percent} onChange={(e) => setS({ ...s, advance_percent: Number(e.target.value) })} /></div>
          <div><span className="label">Margen sugerido (×)</span>
            <input className="input" type="number" min={1} step="0.1" value={s.margin_multiplier} onChange={(e) => setS({ ...s, margin_multiplier: Number(e.target.value) })} /></div>
        </div>
        <div><span className="label">WhatsApp del negocio (con código de país, ej. 58412…)</span>
          <input className="input" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></div>
        <div><span className="label">Datos de pago (se muestran a la clienta al pedir)</span>
          <textarea className="input" rows={4} placeholder={'Pago móvil: 0412-1234567\nBanco: …\nCédula: …'} value={s.payment_info} onChange={(e) => setS({ ...s, payment_info: e.target.value })} /></div>
        <div><span className="label">Zonas de entrega (separadas por coma)</span>
          <input className="input" value={s.delivery_zones} onChange={(e) => setS({ ...s, delivery_zones: e.target.value })} /></div>
        <button className="btn">{saved ? 'Guardado ✓' : 'Guardar'}</button>
      </form>
    </div>
  )
}
