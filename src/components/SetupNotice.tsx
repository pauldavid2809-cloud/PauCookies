export default function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-lg w-full">
        <div className="text-4xl mb-3">🍪</div>
        <h1 className="text-xl font-bold text-brand-800 mb-2">Pau's Cookies — falta conectar Supabase</h1>
        <p className="text-sm text-stone-600 mb-4">
          La app está lista, pero necesita la base de datos. Sigue estos pasos:
        </p>
        <ol className="list-decimal list-inside text-sm text-stone-700 space-y-2">
          <li>Crea un proyecto gratis en <span className="font-semibold">supabase.com</span>.</li>
          <li>En <span className="font-semibold">SQL Editor</span>, pega y ejecuta el contenido de <code className="bg-stone-100 px-1 rounded">supabase/schema.sql</code>.</li>
          <li>En <span className="font-semibold">Authentication → Users</span>, crea el usuario (correo y contraseña) con el que entrará tu mamá.</li>
          <li>Copia <code className="bg-stone-100 px-1 rounded">.env.example</code> a <code className="bg-stone-100 px-1 rounded">.env</code> y pega la URL y la anon key del proyecto (Settings → API).</li>
          <li>Reinicia el servidor (<code className="bg-stone-100 px-1 rounded">npm run dev</code>).</li>
        </ol>
      </div>
    </div>
  )
}
