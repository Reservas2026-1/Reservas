import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export interface CrearBicicletaParams {
  empresaId: string
  numero: number
  modelo?: string
  fila?: number
  columna?: number
  estado?: 'disponible' | 'mantenimiento'
  activo?: boolean
}

export interface CrearBicicletasEnLoteParams {
  empresaId: string
  cantidad: number
  modelo?: string
  filaInicio?: number
}

export interface ObtenerBicicletasOptions {
  soloActivas?: boolean
}

export interface MetricasBicicletas {
  total: number
  activas: number
  mantenimiento: number
  inactivas: number
}

export interface SincronizarCapacidadResponse {
  success: boolean
  totalActivas: number
  error: string | null
}

export interface EliminarBicicletaResponse {
  success: boolean
  mensaje?: string
  error: string | null
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Servicio Backend para la gestión de Bicicletas / Recursos de Sala (Indoor Cycling).
 * Aislamiento multi-tenant por empresa_id y sincronización dinámica de capacidad.
 */
export const bicicletasService = {
  /**
   * CREATE: Inserta una bicicleta individual con código generado IC-XX.
   */
  async crearBicicleta(
    params: CrearBicicletaParams
  ): Promise<ServiceResponse<Tables<'bicicletas'>>> {
    try {
      const cleanEmpresaId = params.empresaId?.trim()
      if (!cleanEmpresaId) {
        return { data: null, error: 'empresaId es obligatorio' }
      }

      if (!Number.isInteger(params.numero) || params.numero <= 0) {
        return { data: null, error: 'El número de la bicicleta debe ser un entero positivo mayor a 0' }
      }

      // Validar si ya existe el número para esta empresa
      const { data: existente, error: checkError } = await supabase
        .from('bicicletas')
        .select('id')
        .eq('empresa_id', cleanEmpresaId)
        .eq('numero', params.numero)
        .maybeSingle()

      if (checkError) {
        return { data: null, error: checkError.message }
      }

      if (existente) {
        return {
          data: null,
          error: `Ya existe una bicicleta con el número ${params.numero} en esta sede.`,
        }
      }

      const codigo = `IC-${String(params.numero).padStart(2, '0')}`
      const fila = params.fila !== undefined ? params.fila : Math.ceil(params.numero / 5)
      const columna = params.columna !== undefined ? params.columna : ((params.numero - 1) % 5) + 1
      const modelo = params.modelo?.trim() || 'Estándar Magnetic'
      const estado = params.estado || 'disponible'
      const activo = params.activo !== undefined ? params.activo : true

      const payload: TablesInsert<'bicicletas'> = {
        empresa_id: cleanEmpresaId,
        numero: params.numero,
        codigo,
        modelo,
        fila,
        columna,
        tipo: 'indoor',
        estado,
        activo,
      }

      const { data, error } = await supabase
        .from('bicicletas')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al crear la bicicleta'
      return { data: null, error: message }
    }
  },

  /**
   * CREATE EN LOTE: Genera e inserta consecutivamente un bloque de bicicletas.
   */
  async crearBicicletasEnLote(
    params: CrearBicicletasEnLoteParams
  ): Promise<{ data: Tables<'bicicletas'>[] | null; error: string | null; creadas: number }> {
    try {
      const cleanEmpresaId = params.empresaId?.trim()
      if (!cleanEmpresaId) {
        return { data: null, error: 'empresaId es obligatorio', creadas: 0 }
      }

      if (!Number.isInteger(params.cantidad) || params.cantidad <= 0) {
        return { data: null, error: 'La cantidad debe ser un entero positivo', creadas: 0 }
      }

      // Obtener números ya ocupados en la empresa
      const { data: existentes, error: fetchError } = await supabase
        .from('bicicletas')
        .select('numero')
        .eq('empresa_id', cleanEmpresaId)

      if (fetchError) {
        return { data: null, error: fetchError.message, creadas: 0 }
      }

      const ocupados = new Set((existentes || []).map((b) => b.numero))
      const lote: TablesInsert<'bicicletas'>[] = []
      let candidato = 1

      while (lote.length < params.cantidad) {
        if (!ocupados.has(candidato)) {
          const fila =
            params.filaInicio !== undefined
              ? Math.floor(lote.length / 5) + params.filaInicio
              : Math.ceil(candidato / 5)
          const columna = ((candidato - 1) % 5) + 1

          lote.push({
            empresa_id: cleanEmpresaId,
            numero: candidato,
            codigo: `IC-${String(candidato).padStart(2, '0')}`,
            modelo: params.modelo?.trim() || 'Estándar Magnetic',
            fila,
            columna,
            tipo: 'indoor',
            estado: 'disponible',
            activo: true,
          })
          ocupados.add(candidato)
        }
        candidato++
      }

      const { data, error: insertError } = await supabase
        .from('bicicletas')
        .insert(lote)
        .select('*')

      if (insertError) {
        return { data: null, error: insertError.message, creadas: 0 }
      }

      return {
        data: data || [],
        error: null,
        creadas: data ? data.length : 0,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear lote de bicicletas'
      return { data: null, error: message, creadas: 0 }
    }
  },

  /**
   * READ: Obtiene las bicicletas de la empresa, con opción de filtrar solo las activas.
   */
  async obtenerBicicletas(
    empresaId: string,
    options?: ObtenerBicicletasOptions
  ): Promise<{ data: Tables<'bicicletas'>[]; error: string | null }> {
    try {
      const cleanEmpresaId = empresaId?.trim()
      if (!cleanEmpresaId) {
        return { data: [], error: 'empresaId es obligatorio' }
      }

      let query = supabase
        .from('bicicletas')
        .select('*')
        .eq('empresa_id', cleanEmpresaId)

      if (options?.soloActivas) {
        query = query.eq('activo', true)
      }

      const { data, error } = await query.order('numero', { ascending: true })

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener bicicletas'
      return { data: [], error: message }
    }
  },

  /**
   * READ: Métricas de conteo de bicicletas (total, activas, mantenimiento, inactivas).
   */
  async obtenerMetricasBicicletas(
    empresaId: string
  ): Promise<{ data: MetricasBicicletas | null; error: string | null }> {
    try {
      const cleanEmpresaId = empresaId?.trim()
      if (!cleanEmpresaId) {
        return { data: null, error: 'empresaId es obligatorio' }
      }

      const { data, error } = await supabase
        .from('bicicletas')
        .select('id, numero, estado, activo')
        .eq('empresa_id', cleanEmpresaId)

      if (error) {
        return { data: null, error: error.message }
      }

      const lista = data || []
      const total = lista.length
      const activas = lista.filter(
        (b) => b.activo && b.estado !== 'mantenimiento' && b.estado !== 'baja'
      ).length
      const mantenimiento = lista.filter((b) => b.estado === 'mantenimiento').length
      const inactivas = lista.filter((b) => !b.activo || b.estado === 'baja').length

      return {
        data: {
          total,
          activas,
          mantenimiento,
          inactivas,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al calcular métricas de bicicletas'
      return { data: null, error: message }
    }
  },

  /**
   * UPDATE: Actualiza campos de una bicicleta asegurando validación de número y sede.
   */
  async actualizarBicicleta(
    id: string,
    empresaId: string,
    updates: Partial<TablesUpdate<'bicicletas'>>
  ): Promise<ServiceResponse<Tables<'bicicletas'>>> {
    try {
      const cleanId = id?.trim()
      const cleanEmpresaId = empresaId?.trim()

      if (!cleanId || !cleanEmpresaId) {
        return { data: null, error: 'id y empresaId son obligatorios' }
      }

      // Validar si el número está cambiando y no colisiona con otra bicicleta
      if (updates.numero !== undefined) {
        if (!Number.isInteger(updates.numero) || updates.numero <= 0) {
          return { data: null, error: 'El número de bicicleta debe ser un entero positivo' }
        }

        const { data: conflicto, error: conflictErr } = await supabase
          .from('bicicletas')
          .select('id')
          .eq('empresa_id', cleanEmpresaId)
          .eq('numero', updates.numero)
          .neq('id', cleanId)
          .maybeSingle()

        if (conflictErr) {
          return { data: null, error: conflictErr.message }
        }

        if (conflicto) {
          return {
            data: null,
            error: `Ya existe otra bicicleta con el número ${updates.numero} en esta sede.`,
          }
        }
      }

      const updatePayload: TablesUpdate<'bicicletas'> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Si cambia el número y no se especificó código nuevo, auto-sincronizar código
      if (updates.numero !== undefined && !updates.codigo) {
        updatePayload.codigo = `IC-${String(updates.numero).padStart(2, '0')}`
      }

      const { data, error } = await supabase
        .from('bicicletas')
        .update(updatePayload)
        .eq('id', cleanId)
        .eq('empresa_id', cleanEmpresaId)
        .select('*')
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Bicicleta no encontrada en esta sede' }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la bicicleta'
      return { data: null, error: message }
    }
  },

  /**
   * UPDATE / SYNC: Sincroniza la capacidad de la sala.
   * Si la capacidad N es mayor al total existente, inserta las faltantes del 1 al N.
   * Para las existentes: activa las de número <= N y desactiva las de número > N.
   */
  async sincronizarCapacidadSala(
    empresaId: string,
    nuevaCapacidad: number
  ): Promise<SincronizarCapacidadResponse> {
    try {
      const cleanEmpresaId = empresaId?.trim()
      if (!cleanEmpresaId) {
        return { success: false, totalActivas: 0, error: 'empresaId es obligatorio' }
      }

      const targetCapacidad = Math.floor(nuevaCapacidad)
      if (!Number.isFinite(nuevaCapacidad) || targetCapacidad <= 0) {
        return {
          success: false,
          totalActivas: 0,
          error: 'La capacidad debe ser un número entero mayor a 0',
        }
      }

      // 1. Consultar todas las bicicletas existentes
      const { data: existentes, error: fetchErr } = await supabase
        .from('bicicletas')
        .select('id, numero, activo')
        .eq('empresa_id', cleanEmpresaId)
        .order('numero', { ascending: true })

      if (fetchErr) {
        return { success: false, totalActivas: 0, error: fetchErr.message }
      }

      const listaExistente = existentes || []
      const mapaExistentes = new Map(listaExistente.map((b) => [b.numero, b]))

      // 2. Insertar faltantes del 1 al N
      const faltantes: TablesInsert<'bicicletas'>[] = []
      for (let i = 1; i <= targetCapacidad; i++) {
        if (!mapaExistentes.has(i)) {
          faltantes.push({
            empresa_id: cleanEmpresaId,
            numero: i,
            codigo: `IC-${String(i).padStart(2, '0')}`,
            modelo: 'Estándar Magnetic',
            fila: Math.ceil(i / 5),
            columna: ((i - 1) % 5) + 1,
            tipo: 'indoor',
            estado: 'disponible',
            activo: true,
          })
        }
      }

      if (faltantes.length > 0) {
        const { error: insertErr } = await supabase.from('bicicletas').insert(faltantes)
        if (insertErr && insertErr.code !== '23505') {
          console.warn('Aviso al insertar bicicletas faltantes en sincronización:', insertErr.message)
        }
      }

      // 3. Asegurar activo = true para números <= N que estén inactivas
      const idsParaActivar = listaExistente
        .filter((b) => b.numero <= targetCapacidad && !b.activo)
        .map((b) => b.id)

      if (idsParaActivar.length > 0) {
        const { error: actErr } = await supabase
          .from('bicicletas')
          .update({ activo: true, updated_at: new Date().toISOString() })
          .in('id', idsParaActivar)

        if (actErr) {
          console.warn('Aviso al activar bicicletas dentro del rango:', actErr.message)
        }
      }

      // 4. Marcar activo = false para números > N que estén activas
      const idsParaDesactivar = listaExistente
        .filter((b) => b.numero > targetCapacidad && b.activo)
        .map((b) => b.id)

      if (idsParaDesactivar.length > 0) {
        const { error: deactErr } = await supabase
          .from('bicicletas')
          .update({ activo: false, updated_at: new Date().toISOString() })
          .in('id', idsParaDesactivar)

        if (deactErr) {
          console.warn('Aviso al desactivar bicicletas fuera de rango:', deactErr.message)
        }
      }

      // 5. Conteo exacto final de activas
      const { count, error: countErr } = await supabase
        .from('bicicletas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', cleanEmpresaId)
        .eq('activo', true)

      const totalActivas = countErr || count === null ? targetCapacidad : count

      return {
        success: true,
        totalActivas,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar capacidad'
      return { success: false, totalActivas: 0, error: message }
    }
  },

  /**
   * DELETE: Elimina una bicicleta si no tiene reservas activas futuras.
   * Si tiene historial de reservas pasadas y restricción de FK, la desactiva de forma segura.
   */
  async eliminarBicicleta(
    id: string,
    empresaId: string
  ): Promise<EliminarBicicletaResponse> {
    try {
      const cleanId = id?.trim()
      const cleanEmpresaId = empresaId?.trim()

      if (!cleanId || !cleanEmpresaId) {
        return { success: false, error: 'id y empresaId son obligatorios' }
      }

      const hoy = new Date().toISOString().split('T')[0]

      // 1. Verificar si tiene reservas activas futuras
      const { data: reservasFuturas, error: resError } = await supabase
        .from('reservas')
        .select('id, fecha_reserva, estado')
        .eq('empresa_id', cleanEmpresaId)
        .eq('bicicleta_id', cleanId)
        .gte('fecha_reserva', hoy)
        .neq('estado', 'cancelada')

      if (resError) {
        console.warn('Aviso al verificar reservas futuras de la bicicleta:', resError.message)
      }

      if (reservasFuturas && reservasFuturas.length > 0) {
        return {
          success: false,
          error:
            'No se puede eliminar la bicicleta porque tiene reservas activas asignadas. Puedes desactivarla cambiando su estado a Inactiva.',
        }
      }

      // 2. Intentar eliminación física
      const { error: deleteError } = await supabase
        .from('bicicletas')
        .delete()
        .eq('id', cleanId)
        .eq('empresa_id', cleanEmpresaId)

      if (deleteError) {
        // Si hay restricción de integridad referencial por reservas históricas finalizadas (FK 23503)
        if (deleteError.code === '23503' || deleteError.message.toLowerCase().includes('foreign key')) {
          const { error: updateError } = await supabase
            .from('bicicletas')
            .update({
              activo: false,
              estado: 'baja',
              updated_at: new Date().toISOString(),
            })
            .eq('id', cleanId)
            .eq('empresa_id', cleanEmpresaId)

          if (updateError) {
            return {
              success: false,
              error: `No se pudo desactivar la bicicleta con historial: ${updateError.message}`,
            }
          }

          return {
            success: true,
            mensaje:
              'La bicicleta tiene historial de reservas pasadas, por lo que fue desactivada del sistema en lugar de eliminarse por completo para preservar los reportes históricos.',
            error: null,
          }
        }

        return { success: false, error: deleteError.message }
      }

      return {
        success: true,
        mensaje: 'Bicicleta eliminada con éxito',
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la bicicleta'
      return { success: false, error: message }
    }
  },
}
