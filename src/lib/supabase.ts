import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Advertencia: Las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están configuradas en el entorno actual. Se usarán valores placeholder para inicialización.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
