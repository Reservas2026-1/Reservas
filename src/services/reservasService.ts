import { supabase } from '../lib/supabase'
import type {
  Tables,
  CrearReservaSeguraResponse,
  CancelarReservaSeguraResponse,
  EstadoReserva,
  InscribirListaEsperaResponse,
} from '../types/database'

export interface CrearReservaParams {
  empresaId: string
  claseId: string
  bicicletaId: string
  clienteId?: string | null
  clienteNombre: string
  clienteDocumento: string
  clienteTelefono: string
  clienteEmail?: string | null
  tiqueteraId?: string | null
}

export interface ReservaDetallada extends Tables<'reservas'> {
  clase: Tables<'clases'> | null
  bicicleta: Tables<'bicicletas'> | null
  tiquetera: Tables<'tiqueteras'> | null
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface AsistenciaQRResponse {
  success: boolean
  reserva: ReservaDetallada | null
  mensaje: string
  error: string | null
}

export interface InscribirListaEsperaResult {
  success: boolean
  id?: string
  turno?: number
  mensaje?: string
  error: string | null
}

export interface EstadoListaEsperaUsuario {
  enEspera: boolean
  item: Tables<'lista_espera'> | null
  turno?: number
}

export interface AlumnoEnEspera extends Tables<'lista_espera'> {
  turno: number
  usuario: Tables<'perfiles'> | null
}

export interface DeduccionTiqueteraItem {
  tiqueteraId: string
  cantidad: number
  estadoAnterior: Tables<'tiqueteras'>['estado']
}

export interface DeducirCreditosResponse {
  success: boolean
  deducciones: DeduccionTiqueteraItem[]
  creditosRestantes: number
  error: string | null
}

export interface ReembolsarCreditosResponse {
  success: boolean
  creditosReembolsados: number
  nuevoSaldo: number | null
  error: string | null
}

export interface TiquetesServiceContract {
  deducirCreditos(userId: string, monto: number): Promise<DeducirCreditosResponse>
  reembolsarCreditos(
    userId: string,
    monto: number,
    tiqueteraId?: string | null,
    deduccionesPrevias?: DeduccionTiqueteraItem[]
  ): Promise<ReembolsarCreditosResponse>
}

export interface CrearReservasLoteData {
  userId: string
  claseIds: string[]
  asignacionAutomatica: boolean
  totalReservadas: number
  creditosDeducidos: number
  creditosRestantes: number
}

export interface CrearReservasLoteResponse {
  success: boolean
  data: CrearReservasLoteData | null
  error: string | null
}

export interface CancelarReservaRapidaResponse {
  success: boolean
  reservaId: string
  eliminada: boolean
  creditosReembolsados: number
  nuevoSaldo: number | null
  mensaje: string
  error: string | null
}

/**
 * Servicio local de gestión de créditos sobre la tabla `tiqueteras` (tickets/planes)
 * con control de concurrencia optimista y soporte de reversión compensatoria.
 */
export const tiquetesService: TiquetesServiceContract = {
  /**
   * Deduce `monto` créditos de las tiqueteras activas y vigentes del usuario,
   * priorizando las próximas a vencer.
   */
  async deducirCreditos(userId: string, monto: number): Promise<DeducirCreditosResponse> {
    const deduccionesAplicadas: DeduccionTiqueteraItem[] = []

    try {
      if (!userId || !userId.trim()) {
        return {
          success: false,
          deducciones: [],
          creditosRestantes: 0,
          error: 'El identificador de usuario es obligatorio para deducir créditos',
        }
      }

      if (!Number.isInteger(monto) || monto <= 0) {
        return {
          success: false,
          deducciones: [],
          creditosRestantes: 0,
          error: 'El monto de créditos a deducir debe ser un número entero positivo',
        }
      }

      const hoy = new Date().toISOString().split('T')[0]

      const { data: tiqueteras, error: fetchError } = await supabase
        .from('tiqueteras')
        .select('*')
        .eq('cliente_id', userId)
        .eq('estado', 'activa')
        .gt('creditos_disponibles', 0)
        .gte('fecha_vencimiento', hoy)
        .order('fecha_vencimiento', { ascending: true })

      if (fetchError) {
        return {
          success: false,
          deducciones: [],
          creditosRestantes: 0,
          error: fetchError.message,
        }
      }

      const tiqueterasDisponibles = tiqueteras || []
      const totalDisponible = tiqueterasDisponibles.reduce(
        (acc, t) => acc + (t.creditos_disponibles || 0),
        0
      )

      if (totalDisponible < monto) {
        return {
          success: false,
          deducciones: [],
          creditosRestantes: totalDisponible,
          error: `Saldo insuficiente de créditos: tienes ${totalDisponible} disponible(s) y se requieren ${monto}.`,
        }
      }

      let restantePorDeducir = monto

      for (const tiquetera of tiqueterasDisponibles) {
        if (restantePorDeducir <= 0) break

        const disponibles = tiquetera.creditos_disponibles || 0
        if (disponibles <= 0) continue

        const aDescontar = Math.min(disponibles, restantePorDeducir)
        const nuevoSaldo = disponibles - aDescontar
        const nuevoEstado: Tables<'tiqueteras'>['estado'] =
          nuevoSaldo === 0 ? 'agotada' : 'activa'

        const { data: updatedRow, error: updateError } = await supabase
          .from('tiqueteras')
          .update({
            creditos_disponibles: nuevoSaldo,
            estado: nuevoEstado,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tiquetera.id)
          .eq('creditos_disponibles', disponibles)
          .select('id')
          .maybeSingle()

        if (updateError || !updatedRow) {
          if (deduccionesAplicadas.length > 0) {
            await tiquetesService.reembolsarCreditos(userId, 0, null, deduccionesAplicadas)
          }

          return {
            success: false,
            deducciones: [],
            creditosRestantes: totalDisponible,
            error:
              updateError?.message ||
              'Conflicto de concurrencia al deducir créditos de la tiquetera. Intenta nuevamente.',
          }
        }

        deduccionesAplicadas.push({
          tiqueteraId: tiquetera.id,
          cantidad: aDescontar,
          estadoAnterior: tiquetera.estado,
        })

        restantePorDeducir -= aDescontar
      }

      return {
        success: true,
        deducciones: deduccionesAplicadas,
        creditosRestantes: totalDisponible - monto,
        error: null,
      }
    } catch (err) {
      if (deduccionesAplicadas.length > 0) {
        await tiquetesService.reembolsarCreditos(userId, 0, null, deduccionesAplicadas)
      }
      const message = err instanceof Error ? err.message : 'Error inesperado al deducir créditos'
      return {
        success: false,
        deducciones: [],
        creditosRestantes: 0,
        error: message,
      }
    }
  },

  /**
   * Reembolsa créditos al usuario, revirtiendo deducciones específicas (rollback)
   * o reintegrando a la tiquetera vinculada/más reciente del usuario.
   */
  async reembolsarCreditos(
    userId: string,
    monto: number,
    tiqueteraId: string | null = null,
    deduccionesPrevias?: DeduccionTiqueteraItem[]
  ): Promise<ReembolsarCreditosResponse> {
    try {
      if (deduccionesPrevias && deduccionesPrevias.length > 0) {
        let totalRevertido = 0
        let ultimoSaldo: number | null = null

        for (const item of deduccionesPrevias) {
          const { data: actual, error: fetchErr } = await supabase
            .from('tiqueteras')
            .select('id, creditos_disponibles')
            .eq('id', item.tiqueteraId)
            .maybeSingle()

          if (fetchErr || !actual) {
            return {
              success: false,
              creditosReembolsados: totalRevertido,
              nuevoSaldo: ultimoSaldo,
              error: fetchErr?.message || 'No se encontró la tiquetera para revertir créditos',
            }
          }

          const saldoRestaurado = (actual.creditos_disponibles || 0) + item.cantidad
          const { error: restoreErr } = await supabase
            .from('tiqueteras')
            .update({
              creditos_disponibles: saldoRestaurado,
              estado: item.estadoAnterior,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.tiqueteraId)
            .eq('creditos_disponibles', actual.creditos_disponibles)

          if (restoreErr) {
            return {
              success: false,
              creditosReembolsados: totalRevertido,
              nuevoSaldo: ultimoSaldo,
              error: restoreErr.message,
            }
          }

          totalRevertido += item.cantidad
          ultimoSaldo = saldoRestaurado
        }

        return {
          success: true,
          creditosReembolsados: totalRevertido,
          nuevoSaldo: ultimoSaldo,
          error: null,
        }
      }

      if (!userId || !userId.trim() || !Number.isInteger(monto) || monto <= 0) {
        return {
          success: false,
          creditosReembolsados: 0,
          nuevoSaldo: null,
          error: 'Parámetros inválidos para reembolsar créditos',
        }
      }

      let tiqueteraObjetivo: Tables<'tiqueteras'> | null = null

      if (tiqueteraId) {
        const { data, error } = await supabase
          .from('tiqueteras')
          .select('*')
          .eq('id', tiqueteraId)
          .eq('cliente_id', userId)
          .maybeSingle()

        if (error) {
          return {
            success: false,
            creditosReembolsados: 0,
            nuevoSaldo: null,
            error: error.message,
          }
        }
        tiqueteraObjetivo = data
      } else {
        const { data, error } = await supabase
          .from('tiqueteras')
          .select('*')
          .eq('cliente_id', userId)
          .in('estado', ['activa', 'agotada'])
          .order('fecha_vencimiento', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          return {
            success: false,
            creditosReembolsados: 0,
            nuevoSaldo: null,
            error: error.message,
          }
        }
        tiqueteraObjetivo = data
      }

      if (!tiqueteraObjetivo) {
        return {
          success: false,
          creditosReembolsados: 0,
          nuevoSaldo: null,
          error: 'No se encontró una tiquetera elegible para reembolsar los créditos',
        }
      }

      const saldoActual = tiqueteraObjetivo.creditos_disponibles || 0
      const nuevoSaldo = saldoActual + monto
      const nuevoEstado: Tables<'tiqueteras'>['estado'] =
        tiqueteraObjetivo.estado === 'agotada' ? 'activa' : tiqueteraObjetivo.estado

      const { data: updated, error: updateError } = await supabase
        .from('tiqueteras')
        .update({
          creditos_disponibles: nuevoSaldo,
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tiqueteraObjetivo.id)
        .eq('creditos_disponibles', saldoActual)
        .select('id')
        .maybeSingle()

      if (updateError || !updated) {
        return {
          success: false,
          creditosReembolsados: 0,
          nuevoSaldo: null,
          error:
            updateError?.message ||
            'Conflicto de concurrencia al reembolsar créditos en la tiquetera',
        }
      }

      return {
        success: true,
        creditosReembolsados: monto,
        nuevoSaldo,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al reembolsar créditos'
      return {
        success: false,
        creditosReembolsados: 0,
        nuevoSaldo: null,
        error: message,
      }
    }
  },
}

/**
 * Crea múltiples reservas semanales en lote invocando la RPC transaccional
 * `public.crear_reservas_lote` y gestionando de forma atómica la deducción
 * de créditos mediante `tiquetesService.deducirCreditos(userId, monto)`.
 * Si la RPC falla, revierte automáticamente los créditos deducidos.
 */
export async function crearReservasLote(
  userId: string,
  claseIds: string[],
  asignacionAutomatica: boolean = false
): Promise<CrearReservasLoteResponse> {
  if (!userId || !userId.trim()) {
    return {
      success: false,
      data: null,
      error: 'El ID de usuario es obligatorio para crear reservas en lote',
    }
  }

  if (!Array.isArray(claseIds) || claseIds.length === 0) {
    return {
      success: false,
      data: null,
      error: 'Debe seleccionar al menos una clase para realizar la reserva múltiple',
    }
  }

  const idsNormalizados = Array.from(
    new Set(claseIds.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean))
  )

  if (idsNormalizados.length === 0 || idsNormalizados.length !== claseIds.length) {
    return {
      success: false,
      data: null,
      error: 'La lista de clases contiene identificadores inválidos o duplicados',
    }
  }

  const montoCreditos = idsNormalizados.length
  let deduccionesAplicadas: DeduccionTiqueteraItem[] = []

  try {
    // 1. Deducir créditos del usuario en la tabla de tiqueteras/planes
    const deduccion = await tiquetesService.deducirCreditos(userId, montoCreditos)

    if (!deduccion.success) {
      return {
        success: false,
        data: null,
        error: deduccion.error || 'No fue posible deducir los créditos requeridos',
      }
    }

    deduccionesAplicadas = deduccion.deducciones

    // 2. Llamar a la RPC transaccional `public.crear_reservas_lote` en Supabase
    const rpcCall = supabase.rpc as unknown as (
      fn: string,
      args: {
        p_class_ids: string[]
        p_usuario_id: string
        p_asignar_automatica: boolean
      }
    ) => Promise<{ data: unknown; error: { message: string } | null }>

    const { error: rpcError } = await rpcCall('crear_reservas_lote', {
      p_class_ids: idsNormalizados,
      p_usuario_id: userId,
      p_asignar_automatica: asignacionAutomatica,
    })

    if (rpcError) {
      // Rollback compensatorio: restaurar créditos deducidos ante fallo de la RPC
      await tiquetesService.reembolsarCreditos(userId, montoCreditos, null, deduccionesAplicadas)
      return {
        success: false,
        data: null,
        error: rpcError.message || 'Error al procesar el lote de reservas en base de datos',
      }
    }

    return {
      success: true,
      data: {
        userId,
        claseIds: idsNormalizados,
        asignacionAutomatica,
        totalReservadas: idsNormalizados.length,
        creditosDeducidos: montoCreditos,
        creditosRestantes: deduccion.creditosRestantes,
      },
      error: null,
    }
  } catch (err) {
    if (deduccionesAplicadas.length > 0) {
      await tiquetesService.reembolsarCreditos(userId, montoCreditos, null, deduccionesAplicadas)
    }
    const message =
      err instanceof Error ? err.message : 'Error inesperado al crear las reservas en lote'
    return {
      success: false,
      data: null,
      error: message,
    }
  }
}

/**
 * Cancela rápidamente una reserva eliminándola (o ejecutando la RPC transaccional
 * `cancelar_reserva_segura` como respaldo si RLS restringe el borrado directo)
 * y reembolsando los créditos correspondientes al usuario de forma atómica.
 */
export async function cancelarReservaRapida(
  reservaId: string,
  userId: string
): Promise<CancelarReservaRapidaResponse> {
  if (!reservaId || !reservaId.trim() || !userId || !userId.trim()) {
    return {
      success: false,
      reservaId: reservaId || '',
      eliminada: false,
      creditosReembolsados: 0,
      nuevoSaldo: null,
      mensaje: 'Parámetros inválidos',
      error: 'Tanto reservaId como userId son obligatorios',
    }
  }

  try {
    // 1. Verificar existencia, titularidad y estado actual de la reserva
    const { data: reserva, error: fetchError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (fetchError) {
      return {
        success: false,
        reservaId,
        eliminada: false,
        creditosReembolsados: 0,
        nuevoSaldo: null,
        mensaje: 'Error al consultar la reserva',
        error: fetchError.message,
      }
    }

    if (!reserva) {
      return {
        success: false,
        reservaId,
        eliminada: false,
        creditosReembolsados: 0,
        nuevoSaldo: null,
        mensaje: 'Reserva no encontrada',
        error: 'La reserva especificada no existe',
      }
    }

    if (reserva.cliente_id && reserva.cliente_id !== userId) {
      return {
        success: false,
        reservaId,
        eliminada: false,
        creditosReembolsados: 0,
        nuevoSaldo: null,
        mensaje: 'Permiso denegado',
        error: 'No tienes permisos para cancelar esta reserva',
      }
    }

    if (reserva.estado === 'finalizada' || reserva.estado === 'cancelada') {
      return {
        success: false,
        reservaId,
        eliminada: false,
        creditosReembolsados: 0,
        nuevoSaldo: null,
        mensaje: 'La reserva no puede ser cancelada',
        error: `No es posible cancelar una reserva en estado '${reserva.estado}'`,
      }
    }

    // 2. Intentar eliminar la reserva directamente validando el propietario
    const { data: reservaEliminada, error: deleteError } = await supabase
      .from('reservas')
      .delete()
      .eq('id', reservaId)
      .eq('cliente_id', userId)
      .select()
      .maybeSingle()

    if (!deleteError && reservaEliminada) {
      // 3. Reembolsar los créditos correspondientes
      const reembolso = await tiquetesService.reembolsarCreditos(
        userId,
        1,
        reservaEliminada.tiquetera_id
      )

      if (!reembolso.success) {
        // Compensación atómica: restaurar la reserva eliminada si falla el reembolso
        await supabase.from('reservas').insert(reservaEliminada)

        return {
          success: false,
          reservaId,
          eliminada: false,
          creditosReembolsados: 0,
          nuevoSaldo: null,
          mensaje: 'No se pudo completar el reembolso de créditos',
          error:
            reembolso.error ||
            'Error al reembolsar créditos; se revirtió la eliminación de la reserva',
        }
      }

      return {
        success: true,
        reservaId,
        eliminada: true,
        creditosReembolsados: reembolso.creditosReembolsados,
        nuevoSaldo: reembolso.nuevoSaldo,
        mensaje: 'Reserva eliminada y crédito reembolsado exitosamente',
        error: null,
      }
    }

    // Respaldo atómico vía RPC transaccional si las políticas RLS restringen DELETE directo
    const { data: rpcData, error: rpcError } = await supabase.rpc('cancelar_reserva_segura', {
      p_reserva_id: reservaId,
      p_cliente_id: userId,
    })

    if (rpcError) {
      return {
        success: false,
        reservaId,
        eliminada: false,
        creditosReembolsados: 0,
        nuevoSaldo: null,
        mensaje: 'Error al cancelar la reserva',
        error: deleteError?.message || rpcError.message,
      }
    }

    const rpcResponse = rpcData as unknown as CancelarReservaSeguraResponse
    if (!rpcResponse.success) {
      return {
        success: false,
        reservaId,
        eliminada: false,
        creditosReembolsados: 0,
        nuevoSaldo: rpcResponse.nuevo_saldo ?? null,
        mensaje: rpcResponse.mensaje || 'No se pudo cancelar la reserva',
        error: rpcResponse.error || rpcResponse.mensaje || 'Cancelación rechazada',
      }
    }

    let creditosReembolsados = rpcResponse.creditos_reintegrados ? 1 : 0
    let nuevoSaldo: number | null = rpcResponse.nuevo_saldo ?? null

    if (!rpcResponse.creditos_reintegrados) {
      const reembolso = await tiquetesService.reembolsarCreditos(userId, 1, reserva.tiquetera_id)
      if (reembolso.success) {
        creditosReembolsados = reembolso.creditosReembolsados
        nuevoSaldo = reembolso.nuevoSaldo
      }
    }

    return {
      success: true,
      reservaId,
      eliminada: false,
      creditosReembolsados,
      nuevoSaldo,
      mensaje: rpcResponse.mensaje || 'Reserva cancelada y crédito reembolsado exitosamente',
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error inesperado al cancelar la reserva rápida'
    return {
      success: false,
      reservaId,
      eliminada: false,
      creditosReembolsados: 0,
      nuevoSaldo: null,
      mensaje: 'Error al cancelar la reserva',
      error: message,
    }
  }
}

/**
 * Servicio para Creación, Consulta y Cancelación de Reservas
 */
export const reservasService = {
  /**
   * Invoca la función RPC transaccional 'crear_reserva_segura' en PostgreSQL.
   * Cuenta con bloqueo concurrente (FOR UPDATE) y descuento automático de créditos de tiquetera.
   */
  async crearReserva(params: CrearReservaParams): Promise<{
    success: boolean
    data: CrearReservaSeguraResponse | null
    error: string | null
  }> {
    try {
      const {
        empresaId,
        claseId,
        bicicletaId,
        clienteId = null,
        clienteNombre,
        clienteDocumento,
        clienteTelefono,
        clienteEmail = null,
        tiqueteraId = null,
      } = params

      // Invocación a función RPC tipada en Supabase
      const { data, error } = await supabase.rpc('crear_reserva_segura', {
        p_empresa_id: empresaId,
        p_clase_id: claseId,
        p_bicicleta_id: bicicletaId,
        p_cliente_id: clienteId,
        p_cliente_nombre: clienteNombre,
        p_cliente_documento: clienteDocumento,
        p_cliente_telefono: clienteTelefono,
        p_cliente_email: clienteEmail,
        p_tiquetera_id: tiqueteraId,
      })

      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
        }
      }

      // La función RPC retorna un JSONB con la forma CrearReservaSeguraResponse
      const response = data as unknown as CrearReservaSeguraResponse

      if (!response.success) {
        return {
          success: false,
          data: response,
          error: response.error || 'No se pudo completar la reserva',
        }
      }

      return {
        success: true,
        data: response,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al crear la reserva'
      return {
        success: false,
        data: null,
        error: message,
      }
    }
  },

  /**
   * Crea múltiples reservas semanales en lote con deducción atómica de créditos.
   */
  crearReservasLote,

  /**
   * Cancela rápidamente una reserva eliminándola y reembolsando los créditos correspondientes.
   */
  cancelarReservaRapida,

  /**
   * Consulta las reservas de un cliente determinado (próximas o históricas)
   * incluyendo los detalles de la clase y de la bicicleta asignada.
   */
  async getReservasCliente(
    clienteId: string,
    options?: {
      soloProximas?: boolean
      limite?: number
      empresaId?: string
    }
  ): Promise<ServiceResponse<ReservaDetallada[]>> {
    try {
      let query = supabase
        .from('reservas')
        .select(`
          *,
          clase:clases!reservas_clase_id_fkey(*),
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(*),
          tiquetera:tiqueteras!reservas_tiquetera_id_fkey(*)
        `)
        .eq('cliente_id', clienteId)

      if (options?.empresaId) {
        query = query.eq('empresa_id', options.empresaId)
      }

      if (options?.soloProximas) {
        // Reservas a partir de hoy que no hayan sido canceladas ni finalizadas
        const ahoraIso = new Date().toISOString()
        query = query
          .gte('fecha_fin', ahoraIso)
          .neq('estado', 'cancelada')
          .order('fecha_inicio', { ascending: true })
      } else {
        // Historial completo ordenado por fecha de inicio descendente
        query = query.order('fecha_inicio', { ascending: false })
      }

      if (options?.limite) {
        query = query.limit(options.limite)
      }

      const { data, error } = await query

      if (error) {
        return { data: null, error: error.message }
      }

      const reservasMapeadas: ReservaDetallada[] = (data || []).map((item) => ({
        ...item,
        clase: (item.clase as unknown as Tables<'clases'>) || null,
        bicicleta: (item.bicicleta as unknown as Tables<'bicicletas'>) || null,
        tiquetera: (item.tiquetera as unknown as Tables<'tiqueteras'>) || null,
      }))

      return { data: reservasMapeadas, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar las reservas del cliente'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene el detalle de una reserva específica por su ID.
   */
  async getReservaById(reservaId: string): Promise<ServiceResponse<ReservaDetallada | null>> {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          clase:clases!reservas_clase_id_fkey(*),
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(*),
          tiquetera:tiqueteras!reservas_tiquetera_id_fkey(*)
        `)
        .eq('id', reservaId)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Reserva no encontrada' }
      }

      const reserva: ReservaDetallada = {
        ...data,
        clase: (data.clase as unknown as Tables<'clases'>) || null,
        bicicleta: (data.bicicleta as unknown as Tables<'bicicletas'>) || null,
        tiquetera: (data.tiquetera as unknown as Tables<'tiqueteras'>) || null,
      }

      return { data: reserva, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener detalle de la reserva'
      return { data: null, error: message }
    }
  },

  /**
   * Cancela una reserva existente mediante la función RPC transaccional 'cancelar_reserva_segura'.
   * Aplica bloqueo concurrente FOR UPDATE y valida la regla de anticipación (> 2h)
   * para el reintegro automático del crédito a la tiquetera.
   */
  async cancelarReserva(
    reservaId: string,
    clienteId?: string | null
  ): Promise<{
    success: boolean
    data: CancelarReservaSeguraResponse | null
    error: string | null
    mensaje?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('cancelar_reserva_segura', {
        p_reserva_id: reservaId,
        p_cliente_id: clienteId || null,
      })

      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
          mensaje: 'Error de base de datos al cancelar la reserva',
        }
      }

      const response = data as unknown as CancelarReservaSeguraResponse

      if (!response.success) {
        return {
          success: false,
          data: response,
          error: response.error || response.mensaje || 'No se pudo cancelar la reserva',
          mensaje: response.mensaje || response.error || 'Cancelación rechazada',
        }
      }

      return {
        success: true,
        data: response,
        error: null,
        mensaje: response.mensaje,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cancelar la reserva'
      return {
        success: false,
        data: null,
        error: message,
        mensaje: message,
      }
    }
  },

  /**
   * Busca y valida un código QR en recepción del gimnasio.
   */
  async validarCodigoQR(codigoQr: string, empresaId: string): Promise<ServiceResponse<ReservaDetallada>> {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          clase:clases!reservas_clase_id_fkey(*),
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(*),
          tiquetera:tiqueteras!reservas_tiquetera_id_fkey(*)
        `)
        .eq('codigo_qr', codigoQr.trim())
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Código QR no válido o no pertenece a esta empresa' }
      }

      const reserva: ReservaDetallada = {
        ...data,
        clase: (data.clase as unknown as Tables<'clases'>) || null,
        bicicleta: (data.bicicleta as unknown as Tables<'bicicletas'>) || null,
        tiquetera: (data.tiquetera as unknown as Tables<'tiqueteras'>) || null,
      }

      return { data: reserva, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar el código QR'
      return { data: null, error: message }
    }
  },

  /**
   * Valida y registra la asistencia de un cliente mediante el escáner de código QR.
   * Verifica que la reserva pertenezca a la empresa y opcionalmente a la clase actual.
   * Actualiza 'asistencia_confirmada = true' y 'estado = finalizada' (asistencia completada).
   */
  async registrarAsistenciaQR(
    codigoQr: string,
    empresaId: string,
    claseId?: string
  ): Promise<AsistenciaQRResponse> {
    try {
      const codigoLimpio = codigoQr.trim()

      if (!codigoLimpio) {
        return {
          success: false,
          reserva: null,
          mensaje: 'Código QR no proporcionado',
          error: 'Código QR vacío',
        }
      }

      // 1. Buscar la reserva con sus relaciones
      const { data, error: selectError } = await supabase
        .from('reservas')
        .select(`
          *,
          clase:clases!reservas_clase_id_fkey(*),
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(*),
          tiquetera:tiqueteras!reservas_tiquetera_id_fkey(*)
        `)
        .eq('codigo_qr', codigoLimpio)
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (selectError) {
        return {
          success: false,
          reserva: null,
          mensaje: 'Error al consultar la reserva',
          error: selectError.message,
        }
      }

      if (!data) {
        return {
          success: false,
          reserva: null,
          mensaje: 'Código QR no encontrado o no pertenece a esta sede',
          error: 'Reserva inexistente',
        }
      }

      // 2. Validar que no esté cancelada
      if (data.estado === 'cancelada') {
        return {
          success: false,
          reserva: null,
          mensaje: 'Esta reserva fue cancelada previamente y no es válida para ingreso',
          error: 'Reserva cancelada',
        }
      }

      // 3. Si se especificó una clase, verificar que coincida
      if (claseId && data.clase_id !== claseId) {
        return {
          success: false,
          reserva: null,
          mensaje: 'El código QR corresponde a una clase diferente a la seleccionada',
          error: 'Clase no coincide',
        }
      }

      // 4. Si ya fue confirmada, informar
      if (data.asistencia_confirmada) {
        const reservaDetallada: ReservaDetallada = {
          ...data,
          clase: (data.clase as unknown as Tables<'clases'>) || null,
          bicicleta: (data.bicicleta as unknown as Tables<'bicicletas'>) || null,
          tiquetera: (data.tiquetera as unknown as Tables<'tiqueteras'>) || null,
        }

        return {
          success: true,
          reserva: reservaDetallada,
          mensaje: `Asistencia ya registrada previamente para ${data.cliente_nombre} (Bicicleta #${reservaDetallada.bicicleta?.numero || 'N/A'})`,
          error: null,
        }
      }

      // 5. Actualizar la reserva: marcar asistencia confirmada y estado 'finalizada'
      const { data: updatedReserva, error: updateError } = await supabase
        .from('reservas')
        .update({
          asistencia_confirmada: true,
          estado: 'finalizada' as EstadoReserva,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .select(`
          *,
          clase:clases!reservas_clase_id_fkey(*),
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(*),
          tiquetera:tiqueteras!reservas_tiquetera_id_fkey(*)
        `)
        .single()

      if (updateError) {
        return {
          success: false,
          reserva: null,
          mensaje: 'No se pudo actualizar el estado de asistencia',
          error: updateError.message,
        }
      }

      const reservaActualizada: ReservaDetallada = {
        ...updatedReserva,
        clase: (updatedReserva.clase as unknown as Tables<'clases'>) || null,
        bicicleta: (updatedReserva.bicicleta as unknown as Tables<'bicicletas'>) || null,
        tiquetera: (updatedReserva.tiquetera as unknown as Tables<'tiqueteras'>) || null,
      }

      return {
        success: true,
        reserva: reservaActualizada,
        mensaje: `¡Bienvenido(a) ${reservaActualizada.cliente_nombre}! Asistencia confirmada en Bicicleta #${reservaActualizada.bicicleta?.numero || 'N/A'}.`,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al validar código QR'
      return {
        success: false,
        reserva: null,
        mensaje: 'Error de conexión o validación QR',
        error: message,
      }
    }
  },

  /**
   * Confirma la asistencia de un cliente en recepción (Check-in).
   */
  async marcarAsistencia(reservaId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('reservas')
        .update({
          asistencia_confirmada: true,
          estado: 'en_curso' as EstadoReserva,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservaId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar la asistencia'
      return { success: false, error: message }
    }
  },

  /**
   * Inscribe a un cliente en la lista de espera para una clase que tiene sus cupos agotados.
   * Invoca la función RPC 'inscribir_lista_espera' de forma atómica para evitar carreras.
   */
  async inscribirListaEspera(
    claseId: string,
    usuarioId: string,
    empresaId: string
  ): Promise<InscribirListaEsperaResult> {
    try {
      // 1. Invocar RPC segura en Supabase
      const { data, error } = await supabase.rpc('inscribir_lista_espera', {
        p_clase_id: claseId,
        p_usuario_id: usuarioId,
      })

      if (error) {
        // Fallback transaccional directo si la RPC no estuviese compilada
        const { data: insertData, error: insertError } = await supabase
          .from('lista_espera')
          .insert({
            empresa_id: empresaId,
            clase_id: claseId,
            usuario_id: usuarioId,
            estado: 'esperando',
          })
          .select('id')
          .single()

        if (insertError) {
          return {
            success: false,
            error: insertError.message,
          }
        }

        // Calcular turno
        const { count } = await supabase
          .from('lista_espera')
          .select('*', { count: 'exact', head: true })
          .eq('clase_id', claseId)
          .in('estado', ['esperando', 'notificado'])

        return {
          success: true,
          id: insertData.id,
          turno: count || 1,
          mensaje: `Inscrito exitosamente en la lista de espera (Posición #${count || 1}).`,
          error: null,
        }
      }

      const res = data as unknown as InscribirListaEsperaResponse
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'No fue posible registrarse en la lista de espera',
          mensaje: res.mensaje,
        }
      }

      return {
        success: true,
        id: res.id,
        turno: res.turno,
        mensaje: res.mensaje || `Inscrito exitosamente en la lista de espera (Posición #${res.turno || 1}).`,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al inscribirse en lista de espera'
      return {
        success: false,
        error: message,
      }
    }
  },

  /**
   * Cancela la inscripción del usuario en la lista de espera de una clase.
   */
  async salirListaEspera(listaEsperaId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('lista_espera')
        .delete()
        .eq('id', listaEsperaId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al salir de la lista de espera'
      return { success: false, error: message }
    }
  },

  /**
   * Consulta si el usuario está actualmente en lista de espera para una clase
   * y calcula su turno o posición actual en la fila.
   */
  async getListaEsperaUsuario(
    usuarioId: string,
    claseId: string
  ): Promise<ServiceResponse<EstadoListaEsperaUsuario>> {
    try {
      const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .eq('clase_id', claseId)
        .eq('usuario_id', usuarioId)
        .in('estado', ['esperando', 'notificado'])
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return {
          data: {
            enEspera: false,
            item: null,
          },
          error: null,
        }
      }

      // Calcular la posición (turno) del usuario entre los que están esperando
      const { count } = await supabase
        .from('lista_espera')
        .select('*', { count: 'exact', head: true })
        .eq('clase_id', claseId)
        .in('estado', ['esperando', 'notificado'])
        .lte('created_at', data.created_at)

      return {
        data: {
          enEspera: true,
          item: data,
          turno: count || 1,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar lista de espera'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene la lista de espera ordenada para una clase específica (para instructores y administradores).
   */
  async getListaEsperaClase(claseId: string): Promise<ServiceResponse<AlumnoEnEspera[]>> {
    try {
      const { data, error } = await supabase
        .from('lista_espera')
        .select(`
          *,
          usuario:perfiles!lista_espera_usuario_id_fkey(*)
        `)
        .eq('clase_id', claseId)
        .in('estado', ['esperando', 'notificado'])
        .order('created_at', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      const listaFormateada: AlumnoEnEspera[] = (data || []).map((item, idx) => ({
        ...item,
        turno: idx + 1,
        usuario: (item.usuario as unknown as Tables<'perfiles'>) || null,
      }))

      return { data: listaFormateada, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar la lista de espera de la clase'
      return { data: null, error: message }
    }
  },
}
