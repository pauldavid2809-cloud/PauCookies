import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) { setError('Correo o contraseña incorrectos.'); return }
    navigate('/admin/pedidos')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="card max-w-sm w-full grid gap-3 text-center">
        <div className="text-4xl">🍪</div>
        <h1 className="text-xl font-bold text-brand-800">Pau's Cookies</h1>
        <p className="text-sm text-stone-500 -mt-2">Panel de administración</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-2">{error}</div>}
        <input className="input" type="email" placeholder="Correo" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
