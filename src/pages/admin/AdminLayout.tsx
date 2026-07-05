import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

const LINKS = [
  { to: '/admin/pedidos', label: '📋 Pedidos' },
  { to: '/admin/produccion', label: '🥣 Producción' },
  { to: '/admin/rutas', label: '🛵 Rutas' },
  { to: '/admin/productos', label: '🍪 Productos' },
  { to: '/admin/ingredientes', label: '🧈 Ingredientes' },
  { to: '/admin/reclamos', label: '💬 Reclamos' },
  { to: '/admin/configuracion', label: '⚙️ Configuración' },
]

export default function AdminLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === null) navigate('/admin/login')
  }, [session, navigate])

  if (session === undefined) return <div className="min-h-screen flex items-center justify-center text-stone-500">Cargando…</div>
  if (session === null) return null

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Pau's Cookies" className="w-9 h-9 object-contain" />
            <span className="font-bold text-brand-800 text-sm">Pau's Cookies</span>
          </div>
          <button className="text-xs text-stone-500 underline" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${isActive ? 'bg-brand-600 text-white font-semibold' : 'text-stone-600 hover:bg-brand-100'}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
