import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Complaint } from '../../lib/types'
import { waLink } from '../../lib/format'

export default function ReclamosAdmin() {
  const [list, setList] = useState<Complaint[]>([])
  const [showResolved, setShowResolved] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false })
    setList(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  async function resolve(c: Complaint) {
    await supabase.from('complaints').update({ status: 'atendida', response: resolution }).eq('id', c.id)
    setResolvingId(null)
    setResolution('')
    load()
  }

  function startResolving(id: string) {
    setResolvingId(id)
    setResolution('')
  }

  const visible = list.filter((c) => showResolved || c.status === 'nueva')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-brand-800">Reclamos</h1>
        <label className="text-sm text-stone-600 flex items-center gap-2">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Ver atendidos
        </label>
      </div>
      {visible.length === 0 && <p className="text-sm text-stone-500">Sin reclamos nuevos. 🙌</p>}
      <div className="grid gap-3">
        {visible.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{c.customer_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.status === 'nueva' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                {c.status === 'nueva' ? 'Nuevo' : 'Atendido'}
              </span>
              <span className="text-xs text-stone-400 ml-auto">{new Date(c.created_at).toLocaleDateString('es-VE')}</span>
            </div>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{c.message}</p>
            {c.response && <p className="text-xs text-green-700 mt-2">✓ Resolución: {c.response}</p>}

            {/* Inline resolver */}
            {resolvingId === c.id && (
              <div className="mt-3 border-t border-stone-100 pt-3 grid gap-2">
                <span className="label">¿Cómo se resolvió? (opcional, queda en el historial)</span>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Ej.: Se reembolsó, se envió reposición, etc."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button className="btn flex-1" onClick={() => resolve(c)}>Guardar y marcar atendido</button>
                  <button className="btn-outline btn flex-1" onClick={() => setResolvingId(null)}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {c.phone && (
                <a
                  className="btn btn-outline !py-1 !px-3 !text-xs"
                  href={waLink(c.phone, `¡Hola ${c.customer_name}! Te escribe Pau's Cookies sobre tu mensaje. Queremos resolverlo 💛`)}
                  target="_blank" rel="noreferrer"
                >
                  Responder por WhatsApp
                </a>
              )}
              {c.status === 'nueva' && resolvingId !== c.id && (
                <button className="btn !py-1 !px-3 !text-xs" onClick={() => startResolving(c.id)}>
                  Marcar atendido
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
