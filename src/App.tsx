import { Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import SetupNotice from './components/SetupNotice'
import Catalogo from './pages/public/Catalogo'
import Reclamos from './pages/public/Reclamos'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Pedidos from './pages/admin/Pedidos'
import Productos from './pages/admin/Productos'
import Ingredientes from './pages/admin/Ingredientes'
import Produccion from './pages/admin/Produccion'
import Rutas from './pages/admin/Rutas'
import ReclamosAdmin from './pages/admin/ReclamosAdmin'
import Configuracion from './pages/admin/Configuracion'

export default function App() {
  if (!isConfigured) return <SetupNotice />

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/catalogo" replace />} />
      <Route path="/catalogo" element={<Catalogo />} />
      <Route path="/reclamos" element={<Reclamos />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/pedidos" replace />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="productos" element={<Productos />} />
        <Route path="ingredientes" element={<Ingredientes />} />
        <Route path="produccion" element={<Produccion />} />
        <Route path="rutas" element={<Rutas />} />
        <Route path="reclamos" element={<ReclamosAdmin />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}
