# 🍪 Pau's Cookies

Sistema de gestión para repostería por encargo: catálogo con pedidos online, calculadora de costos por receta, hoja de producción, rutas de entrega y buzón de reclamos.

## Puesta en marcha

1. **Crea un proyecto en [supabase.com](https://supabase.com)** (gratis).
2. **Base de datos:** en el panel de Supabase → SQL Editor → pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo (Run).
3. **Usuario de mamá:** Authentication → Users → *Add user* → correo y contraseña (con ese entrará a `/admin`).
4. **Credenciales:** copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Settings → API del proyecto).
5. **Arranca:**
   ```bash
   npm install
   npm run dev
   ```

## Rutas

| Ruta | Quién la usa |
|---|---|
| `/catalogo` | Clientas: ver productos, armar pedido, datos de pago del anticipo |
| `/reclamos` | Clientas: quejas y sugerencias |
| `/admin` | Mamá: pedidos, producción, rutas, productos, ingredientes, reclamos, configuración |

## Cómo se calculan los costos

- Cada **ingrediente** se registra con el empaque que compra (ej. 1000 g de harina a X Bs) → costo por gramo.
- Cada **producto** tiene una receta (ingredientes por tanda) y cuántas unidades salen por tanda → costo por unidad.
- El precio sugerido = costo × margen (configurable, por defecto ×2).

## Publicar en internet (cuando esté listo)

El proyecto es un sitio estático: se puede desplegar gratis en Vercel o Netlify (`npm run build` genera `dist/`). Configura las mismas variables de entorno en el hosting.
