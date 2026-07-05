import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient = isConfigured
  ? createClient(url!, anonKey!)
  : (new Proxy({}, {
      get() {
        throw new Error('Supabase no está configurado. Crea el archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
      },
    }) as SupabaseClient)
