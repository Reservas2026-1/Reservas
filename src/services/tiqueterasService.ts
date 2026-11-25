import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, MetodoPago } from '../types/database'

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
        monto,
        metodo,
        referenciaTransaccion,
        comprobanteUrl,
      } = params

      const pagoInsert: TablesInsert<'pagos'> = {
        empresa_id: empresaId,
        cliente_id: clienteId,
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
