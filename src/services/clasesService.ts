import { supabase } from '../lib/supabase'
import { getColombiaHolidays } from './colombiaHolidays'
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  EstadoClase,
} from '../types/database'

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

export interface ActualizarClaseParams {
  nombre?: string
  titulo?: string
  descripcion?: string | null
  fecha?: string
  horaInicio?: string
  horaFin?: string
  instructorId?: string | null
  capacidad?: number
  estado?: EstadoClase
  esClaseEspecial?: boolean
}

export interface CrearHorarioBaseParams {
  empresaId: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo?: boolean
}

export interface ActualizarHorarioBaseParams {
  diaSemana?: number
  horaInicio?: string
  horaFin?: string
  activo?: boolean
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Servicio para gestión y consulta de Clases / Sesiones de Indoor Cycling y Horarios Base
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
   * Edita horario, instructor, capacidad, título, descripción o estado de una clase existente.
   */
  async actualizarClase(
    claseId: string,
    empresaId: string,
    data: ActualizarClaseParams
  ): Promise<ServiceResponse<Tables<'clases'>>> {
    try {
      if (!claseId?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'claseId y empresaId son obligatorios' }
      }

      if (data.capacidad !== undefined && (!Number.isInteger(data.capacidad) || data.capacidad <= 0)) {
        return { data: null, error: 'La capacidad de la clase debe ser un entero positivo' }
      }

      const tituloNuevo = data.titulo !== undefined ? data.titulo : data.nombre
      if (tituloNuevo !== undefined && !tituloNuevo.trim()) {
        return { data: null, error: 'El título de la clase no puede estar vacío' }
      }

      const updatePayload: TablesUpdate<'clases'> = {
        updated_at: new Date().toISOString(),
      }

      if (tituloNuevo !== undefined) updatePayload.titulo = tituloNuevo.trim()
      if (data.descripcion !== undefined) {
        updatePayload.descripcion = data.descripcion ? data.descripcion.trim() : null
      }
      if (data.fecha !== undefined) updatePayload.fecha = data.fecha
      if (data.horaInicio !== undefined) updatePayload.hora_inicio = data.horaInicio
      if (data.horaFin !== undefined) updatePayload.hora_fin = data.horaFin
      if (data.instructorId !== undefined) updatePayload.instructor_id = data.instructorId
      if (data.capacidad !== undefined) updatePayload.capacidad = data.capacidad
      if (data.estado !== undefined) updatePayload.estado = data.estado
      if (data.esClaseEspecial !== undefined) updatePayload.es_clase_especial = data.esClaseEspecial

      const { data: updated, error } = await supabase
        .from('clases')
        .update(updatePayload)
        .eq('id', claseId)
        .eq('empresa_id', empresaId)
        .select('*')
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!updated) {
        return { data: null, error: 'Clase no encontrada para esta empresa' }
      }

      return { data: updated, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la clase'
      return { data: null, error: message }
    }
  },

  /**
   * Elimina una clase programada. Si tiene reservas activas y `forzarConCancelacion` es true,
   * cancela cada reserva mediante `cancelar_reserva_segura` (reintegrando créditos si aplica)
   * antes de eliminar la clase.
   */
  async eliminarClase(
    claseId: string,
    empresaId: string,
    options?: { forzarConCancelacion?: boolean }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!claseId?.trim() || !empresaId?.trim()) {
        return { success: false, error: 'claseId y empresaId son obligatorios' }
      }

      const { data: reservasActivas, error: resError } = await supabase
        .from('reservas')
        .select('id')
        .eq('clase_id', claseId)
        .eq('empresa_id', empresaId)
        .neq('estado', 'cancelada')

      if (resError) {
        return { success: false, error: resError.message }
      }

      if (reservasActivas && reservasActivas.length > 0) {
        if (!options?.forzarConCancelacion) {
          return {
            success: false,
            error: `No se puede eliminar la clase porque tiene ${reservasActivas.length} reserva(s) activa(s).`,
          }
        }

        for (const reserva of reservasActivas) {
          const { error: cancelErr } = await supabase.rpc('cancelar_reserva_segura', {
            p_reserva_id: reserva.id,
            p_cliente_id: null,
          })
          if (cancelErr) {
            return { success: false, error: cancelErr.message }
          }
        }
      }

      const { data: deleted, error: deleteError } = await supabase
        .from('clases')
        .delete()
        .eq('id', claseId)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      if (!deleted) {
        return { success: false, error: 'Clase no encontrada para esta empresa' }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la clase'
      return { success: false, error: message }
    }
  },

  /**
   * Lista los horarios base recurrentes configurados para una empresa.
   */
  async getHorariosBase(
    empresaId: string,
    soloActivos: boolean = false
  ): Promise<ServiceResponse<Tables<'horarios_base'>[]>> {
    try {
      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es obligatorio' }
      }

      let query = supabase
        .from('horarios_base')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('dia_semana', { ascending: true })
        .order('hora_inicio', { ascending: true })

      if (soloActivos) {
        query = query.eq('activo', true)
      }

      const { data, error } = await query

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar horarios base'
      return { data: null, error: message }
    }
  },

  /**
   * Crea una nueva plantilla de horario base semanal (dia_semana: 0=Lunes .. 6=Domingo).
   */
  async crearHorarioBase(
    params: CrearHorarioBaseParams
  ): Promise<ServiceResponse<Tables<'horarios_base'>>> {
    try {
      const { empresaId, diaSemana, horaInicio, horaFin, activo = true } = params
      if (!empresaId?.trim() || !horaInicio?.trim() || !horaFin?.trim()) {
        return { data: null, error: 'empresaId, horaInicio y horaFin son obligatorios' }
      }

      if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
        return { data: null, error: 'diaSemana debe ser un entero entre 0 (Lunes) y 6 (Domingo)' }
      }

      const payload: TablesInsert<'horarios_base'> = {
        empresa_id: empresaId,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        activo,
      }

      const { data, error } = await supabase
        .from('horarios_base')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear horario base'
      return { data: null, error: message }
    }
  },

  /**
   * Edita un horario base existente (día de la semana, hora inicio/fin o estado activo).
   */
  async actualizarHorarioBase(
    horarioId: string,
    empresaId: string,
    data: ActualizarHorarioBaseParams
  ): Promise<ServiceResponse<Tables<'horarios_base'>>> {
    try {
      if (!horarioId?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'horarioId y empresaId son obligatorios' }
      }

      if (
        data.diaSemana !== undefined &&
        (!Number.isInteger(data.diaSemana) || data.diaSemana < 0 || data.diaSemana > 6)
      ) {
        return { data: null, error: 'diaSemana debe ser un entero entre 0 (Lunes) y 6 (Domingo)' }
      }

      const updatePayload: TablesUpdate<'horarios_base'> = {
        updated_at: new Date().toISOString(),
      }

      if (data.diaSemana !== undefined) updatePayload.dia_semana = data.diaSemana
      if (data.horaInicio !== undefined) updatePayload.hora_inicio = data.horaInicio
      if (data.horaFin !== undefined) updatePayload.hora_fin = data.horaFin
      if (data.activo !== undefined) updatePayload.activo = data.activo

      const { data: updated, error } = await supabase
        .from('horarios_base')
        .update(updatePayload)
        .eq('id', horarioId)
        .eq('empresa_id', empresaId)
        .select('*')
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!updated) {
        return { data: null, error: 'Horario base no encontrado para esta empresa' }
      }

      return { data: updated, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar horario base'
      return { data: null, error: message }
    }
  },

  /**
   * Elimina un horario base de la empresa.
   */
  async eliminarHorarioBase(
    horarioId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!horarioId?.trim() || !empresaId?.trim()) {
        return { success: false, error: 'horarioId y empresaId son obligatorios' }
      }

      const { data, error } = await supabase
        .from('horarios_base')
        .delete()
        .eq('id', horarioId)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'Horario base no encontrado para esta empresa' }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar horario base'
      return { success: false, error: message }
    }
  },

  /**
   * Obtiene la grilla de bicicletas (1 a 15) para una clase determinada, indicando
   * cuáles están disponibles y cuáles están ocupadas para alimentar el mapa interactivo del frontend.
   */
  async getBicicletasParaClase(claseId: string, empresaId: string): Promise<ServiceResponse<BicicletaOcupacion[]>> {
    try {
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

/**
 * Genera programación masiva de clases según el tipo y número de días,
 * omitiendo domingos y festivos en Colombia.
 * Si se provee `horarioBaseId`, consulta el horario base real en Supabase.
 */
export async function generarProgramacionMasiva(params: {
  empresaId: string
  tipo: 'diaria' | 'semanal' | 'quincenal' | 'mensual'
  dias: number
  fechaInicio: string
  horarioBaseId?: string
  horaInicio?: string
  horaFin?: string
  titulo?: string
  instructorId?: string | null
  capacidad?: number
}): Promise<ServiceResponse<string[]>> {
  try {
    const {
      empresaId,
      tipo,
      dias,
      fechaInicio,
      horarioBaseId,
      titulo,
      instructorId = null,
      capacidad = 15,
    } = params

    let horaInicio = params.horaInicio || '07:00'
    let horaFin = params.horaFin || '08:00'

    if (horarioBaseId) {
      const { data: horarioBase, error: horarioError } = await supabase
        .from('horarios_base')
        .select('hora_inicio, hora_fin')
        .eq('id', horarioBaseId)
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (horarioError) {
        return { data: null, error: horarioError.message }
      }
      if (!horarioBase) {
        return { data: null, error: 'El horario base especificado no existe en esta empresa' }
      }
      if (!params.horaInicio) horaInicio = horarioBase.hora_inicio
      if (!params.horaFin) horaFin = horarioBase.hora_fin
    }

    let numDias = dias
    if (!numDias || numDias <= 0) {
      if (tipo === 'diaria') numDias = 4
      else if (tipo === 'semanal') numDias = 7
      else if (tipo === 'quincenal') numDias = 15
      else if (tipo === 'mensual') numDias = 30
      else numDias = 1
    } else if (tipo === 'diaria') {
      numDias = Math.min(Math.max(numDias, 1), 4)
    }

    const holidays = getColombiaHolidays(fechaInicio)
    const startDate = new Date(fechaInicio + 'T00:00:00')
    if (isNaN(startDate.getTime())) {
      return { data: null, error: 'Fecha de inicio inválida' }
    }

    const createdIds: string[] = []

    for (let i = 0; i < numDias; i++) {
      const current = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dayOfWeek = current.getDay() // 0 = Domingo
      if (dayOfWeek === 0) continue

      const year = current.getFullYear()
      const month = String(current.getMonth() + 1).padStart(2, '0')
      const day = String(current.getDate()).padStart(2, '0')
      const fechaStr = `${year}-${month}-${day}`

      if (holidays.includes(fechaStr)) continue

      const payload: TablesInsert<'clases'> = {
        empresa_id: empresaId,
        titulo: titulo?.trim() || `Clase Programada (${tipo})`,
        fecha: fechaStr,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        instructor_id: instructorId,
        capacidad,
        estado: 'programada' as EstadoClase,
      }

      const { data: inserted, error: insertError } = await supabase
        .from('clases')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) {
        return { data: null, error: insertError.message }
      }

      if (inserted && inserted.id) {
        createdIds.push(inserted.id)
      }

      if (horarioBaseId) {
        const { error: planifError } = await supabase
          .from('planificaciones')
          .upsert(
            {
              empresa_id: empresaId,
              horario_base_id: horarioBaseId,
              fecha: fechaStr,
              es_clase_especial: false,
            },
            { onConflict: 'empresa_id,fecha,horario_base_id' }
          )

        if (planifError) {
          return { data: null, error: planifError.message }
        }
      }
    }

    return { data: createdIds, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al generar programación masiva'
    return { data: null, error: message }
  }
}

/**
 * Crea una clase especial con la bandera es_clase_especial: true.
 */
export async function crearClaseEspecial(params: {
  empresaId: string
  fecha: string
  horaInicio: string
  horaFin: string
  instructorId?: string
  titulo?: string
  capacidad?: number
}): Promise<ServiceResponse<string>> {
  try {
    const {
      empresaId,
      fecha,
      horaInicio,
      horaFin,
      instructorId,
      titulo = 'Clase Especial',
      capacidad = 15,
    } = params

    const payload: TablesInsert<'clases'> = {
      empresa_id: empresaId,
      titulo,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      instructor_id: instructorId || null,
      capacidad,
      estado: 'programada' as EstadoClase,
      es_clase_especial: true,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('clases')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) {
      return { data: null, error: insertError.message }
    }

    if (!inserted || !inserted.id) {
      return { data: null, error: 'No se pudo obtener el ID de la clase creada' }
    }

    return { data: inserted.id, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear clase especial'
    return { data: null, error: message }
  }
}
