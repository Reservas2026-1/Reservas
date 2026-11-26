import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface MetricasUsuario {
  puntos_acumulados: number
  potencia_promedio_watts: number
  ranking_clase: number
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

interface MetricasGamificacionRow extends MetricasUsuario {
  usuario_id: string
  created_at: string
  updated_at: string
}

interface MetricasDatabase {
  public: {
    Tables: {
      metricas_gamificacion: {
        Row: MetricasGamificacionRow
        Insert: Partial<MetricasGamificacionRow> & { usuario_id: string }
        Update: Partial<MetricasGamificacionRow>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

const metricasClient = supabase as unknown as SupabaseClient<MetricasDatabase>

/**
 * Consulta las métricas de gamificación de un usuario en la tabla `metricas_gamificacion`.
 *
 * @param userId Identificador UUID del usuario.
 * @returns Objeto estándar `{ data, error }` con `MetricasUsuario` o `null` si no existen métricas.
 */
export async function obtenerMetricasUsuario(
  userId: string
): Promise<ServiceResponse<MetricasUsuario>> {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return {
      data: null,
      error: 'El parámetro userId debe ser una cadena no vacía.',
    }
  }

  try {
    const { data, error } = await metricasClient
      .from('metricas_gamificacion')
      .select('puntos_acumulados, potencia_promedio_watts, ranking_clase')
      .eq('usuario_id', userId.trim())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<MetricasUsuario>()

    if (error) {
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: null }
    }

    return {
      data: {
        puntos_acumulados: Number(data.puntos_acumulados ?? 0),
        potencia_promedio_watts: Number(data.potencia_promedio_watts ?? 0),
        ranking_clase: Number(data.ranking_clase ?? 0),
      },
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al consultar las métricas del usuario'
    return { data: null, error: message }
  }
}

export const metricasService = {
  obtenerMetricasUsuario,
}
