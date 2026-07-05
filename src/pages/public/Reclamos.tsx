import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Reclamos() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error: err } = await supabase.from('complaints').insert({
      customer_name: form.name,
      phone: form.phone,
      message: form.message,
    })
    if (err) { setError('No se pudo enviar. Intenta de nuevo.'); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full">
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-2">💌</div>
            <h1 className="text-lg font-bold text-brand-800">¡Gracias por contarnos!</h1>
            <p className="text-sm text-stone-600 mt-1 mb-4">Leemos cada mensaje y te contactaremos para resolverlo.</p>
            <Link to="/catalogo" className="btn w-full">Volver al catálogo</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <h1 className="text-lg font-bold text-brand-800">Reclamos y sugerencias</h1>
            <p className="text-sm text-stone-600">¿Algo no salió como esperabas? Cuéntanos y lo resolvemos.</p>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-2">{error}</div>}
            <div><span className="label">Tu nombre</span>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><span className="label">Teléfono (opcional)</span>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><span className="label">¿Qué pasó?</span>
              <textarea className="input" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <button className="btn" type="submit">Enviar</button>
            <Link to="/catalogo" className="text-xs text-center text-brand-600 underline">Volver al catálogo</Link>
          </form>
        )}
      </div>
    </div>
  )
}
