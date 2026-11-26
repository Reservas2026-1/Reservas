import { supabase } from '../lib/supabase'
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  MetodoPago,
  EstadoTiquetera,
} from '../types/database'

export interface TiqueteraConPlan extends Tables<'tiqueteras'> {
  plan: Tables<'planes'> | null
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface SolicitudCompraPlanParams {
  empresaId: string
  clienteId: string
  planId: string
  monto: number
  metodo: MetodoPago
  referenciaTransaccion?: string
  comprobanteUrl?: string
}

export interface CrearPlanParams {
  empresaId: string
  nombre: string
  descripcion?: string | null
  precio: number
  creditos: number
  diasVigencia: number
  duracionHoras?: number | null
  activo?: boolean
}

export interface ActualizarPlanParams {
  nombre?: string
  descripcion?: string | null
  precio?: number
  creditos?: number
  diasVigencia?: number
  duracionHoras?: number | null
  activo?: boolean
}

export interface AsignarTiqueteraManualParams {
  empresaId: string
  clienteId: string
  planId?: string | null
  creditosTotales?: number
  creditosDisponibles?: number
  diasVigencia?: number
  fechaVencimiento?: string
  estado?: EstadoTiquetera
}

export interface ActualizarTiqueteraParams {
  planId?: string | null
  creditosTotales?: number
  creditosDisponibles?: number
  fechaVencimiento?: string
  estado?: EstadoTiquetera
}

function calcularFechaVencimientoDesdeDias(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString()
}

/**
 * Servicio para Gestión de Planes, Tiqueteras y Paquetes de Créditos
 */
export const tiqueterasService = {
  /**
   * Obtiene la tiquetera activa y vigente de un cliente con saldo de créditos disponible (> 0).
   * Prioriza la tiquetera más próxima a vencer para un consumo eficiente.
   */
  async getTiqueteraActiva(clienteId: string, empresaId: string): Promise<ServiceResponse<TiqueteraConPlan | null>> {
    try {
      const hoy = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tiqueteras')
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .eq('estado', 'activa')
        .gt('creditos_disponibles', 0)
        .gte('fecha_vencimiento', hoy)
        .order('fecha_vencimiento', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: null }
      }

      const tiquetera: TiqueteraConPlan = {
        ...data,
        plan: (data.plan as unknown as Tables<'planes'>) || null,
      }

      return { data: tiquetera, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar tiquetera activa'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene el total de créditos acumulados disponibles sumando todas las tiqueteras activas del cliente.
   */
  async getTotalCreditosDisponibles(clienteId: string, empresaId: string): Promise<ServiceResponse<number>> {
    try {
      const hoy = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tiqueteras')
        .select('creditos_disponibles')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .eq('estado', 'activa')
        .gt('creditos_disponibles', 0)
        .gte('fecha_vencimiento', hoy)

      if (error) {
        return { data: null, error: error.message }
      }

      const total = (data || []).reduce((acc, t) => acc + (t.creditos_disponibles || 0), 0)
      return { data: total, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al calcular total de créditos'
      return { data: null, error: message }
    }
  },

  /**
   * Listar todas las tiqueteras del cliente (activas, agotadas o vencidas) para su historial.
   */
  async getHistorialTiqueteras(clienteId: string, empresaId?: string): Promise<ServiceResponse<TiqueteraConPlan[]>> {
    try {
      let query = supabase
        .from('tiqueteras')
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .eq('cliente_id', clienteId)

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      query = query.order('fecha_adquisicion', { ascending: false })

      const { data, error } = await query

      if (error) {
        return { data: null, error: error.message }
      }

      const tiqueteras: TiqueteraConPlan[] = (data || []).map((item) => ({
        ...item,
        plan: (item.plan as unknown as Tables<'planes'>) || null,
      }))

      return { data: tiqueteras, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener historial de tiqueteras'
      return { data: null, error: message }
    }
  },

  /**
   * Lista las tiqueteras de una empresa (opcionalmente filtradas por cliente) para gestión administrativa.
   */
  async getTiqueterasPorEmpresa(
    empresaId: string,
    clienteId?: string
  ): Promise<ServiceResponse<TiqueteraConPlan[]>> {
    try {
      let query = supabase
        .from('tiqueteras')
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })

      if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      }

      const { data, error } = await query

      if (error) {
        return { data: null, error: error.message }
      }

      const tiqueteras: TiqueteraConPlan[] = (data || []).map((item) => ({
        ...item,
        plan: (item.plan as unknown as Tables<'planes'>) || null,
      }))

      return { data: tiqueteras, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar tiqueteras de la empresa'
      return { data: null, error: message }
    }
  },

  /**
   * Asigna manualmente una tiquetera a un cliente con créditos y vigencia configurables
   * (con o sin plan asociado).
   */
  async asignarTiqueteraManual(
    params: AsignarTiqueteraManualParams
  ): Promise<ServiceResponse<TiqueteraConPlan>> {
    try {
      const { empresaId, clienteId, planId = null } = params
      if (!empresaId?.trim() || !clienteId?.trim()) {
        return { data: null, error: 'empresaId y clienteId son obligatorios' }
      }

      let creditosPlan: number | undefined
      let vigenciaPlan: number | undefined

      if (planId) {
        const { data: plan, error: planError } = await supabase
          .from('planes')
          .select('id, creditos, dias_vigencia')
          .eq('id', planId)
          .eq('empresa_id', empresaId)
          .maybeSingle()

        if (planError) {
          return { data: null, error: planError.message }
        }
        if (!plan) {
          return { data: null, error: 'El plan seleccionado no existe en esta empresa' }
        }
        creditosPlan = plan.creditos
        vigenciaPlan = plan.dias_vigencia
      }

      const creditosTotales = params.creditosTotales ?? creditosPlan ?? 0
      if (!Number.isInteger(creditosTotales) || creditosTotales <= 0) {
        return { data: null, error: 'Los créditos totales deben ser un entero positivo' }
      }

      const creditosDisponibles = params.creditosDisponibles ?? creditosTotales
      if (!Number.isInteger(creditosDisponibles) || creditosDisponibles < 0) {
        return { data: null, error: 'Los créditos disponibles deben ser un entero mayor o igual a 0' }
      }

      const diasVigencia = params.diasVigencia ?? vigenciaPlan ?? 30
      if (!params.fechaVencimiento && (!Number.isFinite(diasVigencia) || diasVigencia <= 0)) {
        return { data: null, error: 'Los días de vigencia deben ser mayores a 0' }
      }

      const fechaVencimiento =
        params.fechaVencimiento || calcularFechaVencimientoDesdeDias(diasVigencia)

      const estado: EstadoTiquetera =
        params.estado || (creditosDisponibles === 0 ? 'agotada' : 'activa')

      const insertPayload: TablesInsert<'tiqueteras'> = {
        empresa_id: empresaId,
        cliente_id: clienteId,
        plan_id: planId,
        creditos_totales: creditosTotales,
        creditos_disponibles: creditosDisponibles,
        fecha_adquisicion: new Date().toISOString(),
        fecha_vencimiento: fechaVencimiento,
        estado,
      }

      const { data, error } = await supabase
        .from('tiqueteras')
        .insert(insertPayload)
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          ...data,
          plan: (data.plan as unknown as Tables<'planes'>) || null,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar tiquetera manual'
      return { data: null, error: message }
    }
  },

  /**
   * Edita créditos, fecha de vencimiento, plan o estado de una tiquetera existente.
   */
  async actualizarTiquetera(
    tiqueteraId: string,
    empresaId: string,
    data: ActualizarTiqueteraParams
  ): Promise<ServiceResponse<TiqueteraConPlan>> {
    try {
      if (!tiqueteraId?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'tiqueteraId y empresaId son obligatorios' }
      }

      if (
        data.creditosTotales !== undefined &&
        (!Number.isInteger(data.creditosTotales) || data.creditosTotales <= 0)
      ) {
        return { data: null, error: 'Los créditos totales deben ser un entero positivo' }
      }

      if (
        data.creditosDisponibles !== undefined &&
        (!Number.isInteger(data.creditosDisponibles) || data.creditosDisponibles < 0)
      ) {
        return { data: null, error: 'Los créditos disponibles no pueden ser negativos' }
      }

      const updatePayload: TablesUpdate<'tiqueteras'> = {
        updated_at: new Date().toISOString(),
      }

      if (data.planId !== undefined) updatePayload.plan_id = data.planId
      if (data.creditosTotales !== undefined) updatePayload.creditos_totales = data.creditosTotales
      if (data.creditosDisponibles !== undefined) {
        updatePayload.creditos_disponibles = data.creditosDisponibles
        if (data.estado === undefined && data.creditosDisponibles === 0) {
          updatePayload.estado = 'agotada'
        }
      }
      if (data.fechaVencimiento !== undefined) updatePayload.fecha_vencimiento = data.fechaVencimiento
      if (data.estado !== undefined) updatePayload.estado = data.estado

      const { data: updated, error } = await supabase
        .from('tiqueteras')
        .update(updatePayload)
        .eq('id', tiqueteraId)
        .eq('empresa_id', empresaId)
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!updated) {
        return { data: null, error: 'Tiquetera no encontrada para esta empresa' }
      }

      return {
        data: {
          ...updated,
          plan: (updated.plan as unknown as Tables<'planes'>) || null,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la tiquetera'
      return { data: null, error: message }
    }
  },

  /**
   * Elimina una tiquetera de una empresa.
   */
  async eliminarTiquetera(
    tiqueteraId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!tiqueteraId?.trim() || !empresaId?.trim()) {
        return { success: false, error: 'tiqueteraId y empresaId son obligatorios' }
      }

      const { data, error } = await supabase
        .from('tiqueteras')
        .delete()
        .eq('id', tiqueteraId)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'Tiquetera no encontrada para esta empresa' }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la tiquetera'
      return { success: false, error: message }
    }
  },

  /**
   * Lista los planes y paquetes de créditos activos de la empresa disponibles para compra.
   */
  async getPlanesDisponibles(empresaId: string): Promise<ServiceResponse<Tables<'planes'>[]>> {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .order('precio', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar planes disponibles'
      return { data: null, error: message }
    }
  },

  /**
   * Lista todos los planes de una empresa (activos e inactivos) para administración.
   */
  async getTodosLosPlanes(empresaId: string): Promise<ServiceResponse<Tables<'planes'>[]>> {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('activo', { ascending: false })
        .order('precio', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar el catálogo de planes'
      return { data: null, error: message }
    }
  },

  /**
   * Crea un nuevo plan / paquete de clases para la empresa.
   */
  async crearPlan(params: CrearPlanParams): Promise<ServiceResponse<Tables<'planes'>>> {
    try {
      const nombre = params.nombre?.trim()
      if (!params.empresaId?.trim() || !nombre) {
        return { data: null, error: 'El ID de empresa y el nombre del plan son obligatorios' }
      }

      if (!Number.isFinite(params.precio) || params.precio < 0) {
        return { data: null, error: 'El precio del plan debe ser mayor o igual a 0' }
      }

      if (!Number.isInteger(params.creditos) || params.creditos <= 0) {
        return { data: null, error: 'La cantidad de clases/créditos debe ser un entero positivo' }
      }

      if (!Number.isInteger(params.diasVigencia) || params.diasVigencia <= 0) {
        return { data: null, error: 'Los días de vigencia deben ser un entero positivo' }
      }

      const payload: TablesInsert<'planes'> = {
        empresa_id: params.empresaId,
        nombre,
        descripcion: params.descripcion?.trim() || null,
        precio: params.precio,
        creditos: params.creditos,
        dias_vigencia: params.diasVigencia,
        duracion_horas: params.duracionHoras ?? 1,
        activo: params.activo ?? true,
      }

      const { data, error } = await supabase
        .from('planes')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear el plan'
      return { data: null, error: message }
    }
  },

  /**
   * Edita los datos de un plan existente (nombre, descripción, precio, clases/créditos, vigencia o estado).
   */
  async actualizarPlan(
    planId: string,
    empresaId: string,
    data: ActualizarPlanParams
  ): Promise<ServiceResponse<Tables<'planes'>>> {
    try {
      if (!planId?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'planId y empresaId son obligatorios' }
      }

      if (data.nombre !== undefined && !data.nombre.trim()) {
        return { data: null, error: 'El nombre del plan no puede estar vacío' }
      }

      if (data.precio !== undefined && (!Number.isFinite(data.precio) || data.precio < 0)) {
        return { data: null, error: 'El precio del plan debe ser mayor o igual a 0' }
      }

      if (data.creditos !== undefined && (!Number.isInteger(data.creditos) || data.creditos <= 0)) {
        return { data: null, error: 'La cantidad de clases/créditos debe ser un entero positivo' }
      }

      if (
        data.diasVigencia !== undefined &&
        (!Number.isInteger(data.diasVigencia) || data.diasVigencia <= 0)
      ) {
        return { data: null, error: 'Los días de vigencia deben ser un entero positivo' }
      }

      const updatePayload: TablesUpdate<'planes'> = {
        updated_at: new Date().toISOString(),
      }

      if (data.nombre !== undefined) updatePayload.nombre = data.nombre.trim()
      if (data.descripcion !== undefined) {
        updatePayload.descripcion = data.descripcion ? data.descripcion.trim() : null
      }
      if (data.precio !== undefined) updatePayload.precio = data.precio
      if (data.creditos !== undefined) updatePayload.creditos = data.creditos
      if (data.diasVigencia !== undefined) updatePayload.dias_vigencia = data.diasVigencia
      if (data.duracionHoras !== undefined) updatePayload.duracion_horas = data.duracionHoras
      if (data.activo !== undefined) updatePayload.activo = data.activo

      const { data: updated, error } = await supabase
        .from('planes')
        .update(updatePayload)
        .eq('id', planId)
        .eq('empresa_id', empresaId)
        .select('*')
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!updated) {
        return { data: null, error: 'Plan no encontrado para esta empresa' }
      }

      return { data: updated, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el plan'
      return { data: null, error: message }
    }
  },

  /**
   * Activa o desactiva un plan en el catálogo de la empresa.
   */
  async cambiarEstadoPlan(
    planId: string,
    empresaId: string,
    activo: boolean
  ): Promise<ServiceResponse<Tables<'planes'>>> {
    return this.actualizarPlan(planId, empresaId, { activo })
  },

  /**
   * Elimina un plan del catálogo de la empresa.
   */
  async eliminarPlan(
    planId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!planId?.trim() || !empresaId?.trim()) {
        return { success: false, error: 'planId y empresaId son obligatorios' }
      }

      const { data, error } = await supabase
        .from('planes')
        .delete()
        .eq('id', planId)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'Plan no encontrado para esta empresa' }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el plan'
      return { success: false, error: message }
    }
  },

  /**
   * Registra una solicitud de compra de plan con comprobante de pago
   * (Nequi, Bancolombia, transferencia) pendiente de validación por el administrador.
   */
  async registrarCompraConComprobante(
    params: SolicitudCompraPlanParams
  ): Promise<ServiceResponse<Tables<'pagos'>>> {
    try {
      const {
        empresaId,
        clienteId,
        planId,
        monto,
        metodo,
        referenciaTransaccion,
        comprobanteUrl,
      } = params

      const pagoInsert: TablesInsert<'pagos'> = {
        empresa_id: empresaId,
        cliente_id: clienteId,
        plan_id: planId || null,
        monto,
        metodo,
        estado: 'pendiente',
        referencia_transaccion: referenciaTransaccion || null,
        comprobante_url: comprobanteUrl || null,
      }

      const { data, error } = await supabase
        .from('pagos')
        .insert(pagoInsert)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar la solicitud de compra'
      return { data: null, error: message }
    }
  },
}
