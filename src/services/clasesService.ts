import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export interface BicicletaOcupacion extends Tables<'bicicletas'> {
  ocupada: boolean
  reservaId?: string | null
  clienteNombre?: string | null
}

export interface ClaseConOcupacion extends Tables<'clases'> {
  instructor: Tables<'perfiles'> | null
  capacidadTotal: number
  cuposOcupados: number
  cuposDisponibles: number
  porcentajeOcupacion: number
  bicicletasReservadasIds: string[]
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Servicio para gestión y consulta de Clases / Sesiones de Indoor Cycling
 */
export const clasesService = {
  /**
   * Obtiene todas las clases de una empresa para una fecha determinada (formato 'YYYY-MM-DD'),
   * calculando la ocupación en tiempo real para cada una.
   */
  async getClasesByFecha(empresaId: string, fecha: string): Promise<ServiceResponse<ClaseConOcupacion[]>> {
    try {
      // 1. Obtener las clases programadas o en curso de la fecha
      const { data: clases, error: clasesError } = await supabase
        .from('clases')
        .select(`
          *,
          instructor:perfiles!clases_instructor_id_fkey(*)
        `)
        .eq('empresa_id', empresaId)
        .eq('fecha', fecha)
        .in('estado', ['programada', 'en_curso'])
        .order('hora_inicio', { ascending: true })

      if (clasesError) {
        return { data: null, error: clasesError.message }
      }

      if (!clases || clases.length === 0) {
        return { data: [], error: null }
      }

      const claseIds = clases.map((c) => c.id)

      // 2. Obtener todas las reservas activas asociadas a estas clases
      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select('id, clase_id, bicicleta_id, estado')
        .in('clase_id', claseIds)
        .neq('estado', 'cancelada')

      if (reservasError) {
        return { data: null, error: reservasError.message }
      }

      // 3. Mapear ocupación por cada clase
      const clasesConOcupacion: ClaseConOcupacion[] = clases.map((clase) => {
        const reservasClase = (reservas || []).filter((r) => r.clase_id === clase.id)
        const bicisOcupadas = reservasClase.map((r) => r.bicicleta_id)
        const cuposOcupados = bicisOcupadas.length
        const capacidadTotal = clase.capacidad || 15
        const cuposDisponibles = Math.max(0, capacidadTotal - cuposOcupados)
        const porcentajeOcupacion = Math.round((cuposOcupados / capacidadTotal) * 100)

        // Supabase select with join returns instructor as object or null
        const instructorData = (clase.instructor as unknown as Tables<'perfiles'>) || null

        return {
          ...clase,
          instructor: instructorData,
          capacidadTotal,
          cuposOcupados,
          cuposDisponibles,
          porcentajeOcupacion,
          bicicletasReservadasIds: bicisOcupadas,
        }
      })

      return { data: clasesConOcupacion, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al consultar clases por fecha'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene clases en un rango de fechas (por ejemplo, para vista semanal o mensual del calendario).
   */
  async getClasesByRangoFechas(
    empresaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<ServiceResponse<ClaseConOcupacion[]>> {
    try {
      const { data: clases, error: clasesError } = await supabase
        .from('clases')
        .select(`
          *,
          instructor:perfiles!clases_instructor_id_fkey(*)
        `)
        .eq('empresa_id', empresaId)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .neq('estado', 'cancelada')
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })

      if (clasesError) {
        return { data: null, error: clasesError.message }
      }

      if (!clases || clases.length === 0) {
        return { data: [], error: null }
      }

      const claseIds = clases.map((c) => c.id)

      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select('id, clase_id, bicicleta_id, estado')
        .in('clase_id', claseIds)
        .neq('estado', 'cancelada')

      if (reservasError) {
        return { data: null, error: reservasError.message }
      }

      const clasesConOcupacion: ClaseConOcupacion[] = clases.map((clase) => {
        const reservasClase = (reservas || []).filter((r) => r.clase_id === clase.id)
        const bicisOcupadas = reservasClase.map((r) => r.bicicleta_id)
        const cuposOcupados = bicisOcupadas.length
        const capacidadTotal = clase.capacidad || 15
        const cuposDisponibles = Math.max(0, capacidadTotal - cuposOcupados)
        const porcentajeOcupacion = Math.round((cuposOcupados / capacidadTotal) * 100)
        const instructorData = (clase.instructor as unknown as Tables<'perfiles'>) || null

        return {
          ...clase,
          instructor: instructorData,
          capacidadTotal,
          cuposOcupados,
          cuposDisponibles,
          porcentajeOcupacion,
          bicicletasReservadasIds: bicisOcupadas,
        }
      })

      return { data: clasesConOcupacion, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar clases por rango'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene una clase por su ID junto con su estado de ocupación.
   */
  async getClaseById(claseId: string, empresaId: string): Promise<ServiceResponse<ClaseConOcupacion | null>> {
    try {
      const { data: clase, error: claseError } = await supabase
        .from('clases')
        .select(`
          *,
          instructor:perfiles!clases_instructor_id_fkey(*)
        `)
        .eq('id', claseId)
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (claseError) {
        return { data: null, error: claseError.message }
      }

      if (!clase) {
        return { data: null, error: 'Clase no encontrada' }
      }

      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select('id, clase_id, bicicleta_id, estado')
        .eq('clase_id', claseId)
        .neq('estado', 'cancelada')

      if (reservasError) {
        return { data: null, error: reservasError.message }
      }

      const bicisOcupadas = (reservas || []).map((r) => r.bicicleta_id)
      const cuposOcupados = bicisOcupadas.length
      const capacidadTotal = clase.capacidad || 15
      const cuposDisponibles = Math.max(0, capacidadTotal - cuposOcupados)
      const porcentajeOcupacion = Math.round((cuposOcupados / capacidadTotal) * 100)
      const instructorData = (clase.instructor as unknown as Tables<'perfiles'>) || null

      return {
        data: {
          ...clase,
          instructor: instructorData,
          capacidadTotal,
          cuposOcupados,
          cuposDisponibles,
          porcentajeOcupacion,
          bicicletasReservadasIds: bicisOcupadas,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar la clase'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene la grilla de bicicletas (1 a 15) para una clase determinada, indicando
   * cuáles están disponibles y cuáles están ocupadas para alimentar el mapa interactivo del frontend.
   */
  async getBicicletasParaClase(claseId: string, empresaId: string): Promise<ServiceResponse<BicicletaOcupacion[]>> {
    try {
      // 1. Obtener todas las bicicletas activas de la empresa (generalmente 15 ordenadas por número)
      const { data: bicicletas, error: bicisError } = await supabase
        .from('bicicletas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .order('numero', { ascending: true })

      if (bicisError) {
        return { data: null, error: bicisError.message }
      }

      if (!bicicletas) {
        return { data: [], error: null }
      }

      // 2. Obtener reservas activas para esta clase
      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select('id, bicicleta_id, cliente_nombre, estado')
        .eq('clase_id', claseId)
        .neq('estado', 'cancelada')

      if (reservasError) {
        return { data: null, error: reservasError.message }
      }

      const reservaPorBici = new Map<string, { id: string; clienteNombre: string }>()
      for (const res of reservas || []) {
        reservaPorBici.set(res.bicicleta_id, { id: res.id, clienteNombre: res.cliente_nombre })
      }

      // 3. Cruzar datos para retornar grilla con estado
      const resultado: BicicletaOcupacion[] = bicicletas.map((bici) => {
        const resInfo = reservaPorBici.get(bici.id)
        const estaOcupada = !!resInfo || bici.estado === 'mantenimiento' || bici.estado === 'baja'

        return {
          ...bici,
          ocupada: estaOcupada,
          reservaId: resInfo ? resInfo.id : null,
          clienteNombre: resInfo ? resInfo.clienteNombre : null,
        }
      })

      return { data: resultado, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar mapa de bicicletas de la clase'
      return { data: null, error: message }
    }
  },
}
