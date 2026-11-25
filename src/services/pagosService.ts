import { supabase } from '../lib/supabase'
import type {
  Tables,
  TablesInsert,
  MetodoPago,
  AprobarPagoYActivarPlanResponse,
} from '../types/database'

export interface RegistrarPagoParams {
  empresaId: string
  clienteId: string
  planId: string
  monto: number
  metodo: MetodoPago
  comprobanteUrl?: string | null
  referencia?: string | null
  reservaId?: string | null
}

export interface PagoPendienteDetallado extends Tables<'pagos'> {
  cliente: Tables<'perfiles'> | null
  plan: Tables<'planes'> | null
  reserva: Tables<'reservas'> | null
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface SubirComprobanteResponse {
  success: boolean
  url: string | null
  path: string | null
  error: string | null
}

/**
 * Servicio para Gestión de Pagos, Comprobantes en Supabase Storage y Activación de Planes
 */
export const pagosService = {
  /**
   * Obtiene el catálogo de planes activos de una empresa con sus precios,
   * créditos incluidos y días de vigencia.
   */
  async getPlanesEmpresa(empresaId: string): Promise<ServiceResponse<Tables<'planes'>[]>> {
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
      const message = err instanceof Error ? err.message : 'Error al consultar planes de la empresa'
      return { data: null, error: message }
    }
  },

  /**
   * Sube la imagen o PDF del comprobante de transferencia (Nequi / Bancolombia)
   * al bucket privado 'comprobantes' en Supabase Storage y genera la URL accesible.
   */
  async subirComprobante(
    file: File,
    empresaId: string,
    userId: string
  ): Promise<SubirComprobanteResponse> {
    try {
      const extension = file.name.split('.').pop() || 'jpg'
      const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${empresaId}/${userId}/${Date.now()}_${nombreLimpio}`

      // 1. Cargar archivo al bucket 'comprobantes'
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || `image/${extension}`,
        })

      if (uploadError) {
        return {
          success: false,
          url: null,
          path: null,
          error: uploadError.message,
        }
      }

      // 2. Generar Signed URL con vigencia de 1 año (31536000 segundos) para visualización administrativa
      const { data: signedData, error: signedError } = await supabase.storage
        .from('comprobantes')
        .createSignedUrl(filePath, 31536000)

      if (signedError || !signedData?.signedUrl) {
        // Fallback a URL pública si las políticas de bucket lo permiten
        const { data: publicData } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(filePath)

        return {
          success: true,
          url: publicData?.publicUrl || null,
          path: filePath,
          error: null,
        }
      }

      return {
        success: true,
        url: signedData.signedUrl,
        path: filePath,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al subir el comprobante'
      return {
        success: false,
        url: null,
        path: null,
        error: message,
      }
    }
  },

  /**
   * Registra una nueva transacción de pago en estado 'pendiente' vinculada a un plan,
   * adjuntando la URL del comprobante o referencia de transacción.
   */
  async registrarPago(
    data: RegistrarPagoParams
  ): Promise<ServiceResponse<Tables<'pagos'>>> {
    try {
      const nuevoPago: TablesInsert<'pagos'> = {
        empresa_id: data.empresaId,
        cliente_id: data.clienteId,
        plan_id: data.planId,
        monto: data.monto,
        metodo: data.metodo,
        estado: 'pendiente',
        comprobante_url: data.comprobanteUrl || null,
        referencia_transaccion: data.referencia || null,
        reserva_id: data.reservaId || null,
        fecha_pago: new Date().toISOString(),
      }

      const { data: pagoCreado, error } = await supabase
        .from('pagos')
        .insert(nuevoPago)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: pagoCreado, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar el pago'
      return { data: null, error: message }
    }
  },

  /**
   * Invoca la función RPC transaccional 'aprobar_pago_y_activar_plan'.
   * Acredita atómicamente la tiquetera con sus clases, confirma la reserva vinculada
   * y asienta el ingreso en movimientos_caja con auditoría completa.
   */
  async aprobarPago(
    pagoId: string,
    adminId: string
  ): Promise<{
    success: boolean
    data: AprobarPagoYActivarPlanResponse | null
    error: string | null
    mensaje?: string
  }> {
    try {
      const { data, error } = await supabase.rpc('aprobar_pago_y_activar_plan', {
        p_pago_id: pagoId,
        p_admin_id: adminId,
      })

      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
          mensaje: 'Error de base de datos al aprobar el pago',
        }
      }

      const response = data as unknown as AprobarPagoYActivarPlanResponse

      if (!response.success) {
        return {
          success: false,
          data: response,
          error: response.error || response.mensaje || 'No se pudo aprobar el pago',
          mensaje: response.mensaje || response.error || 'Aprobación rechazada',
        }
      }

      return {
        success: true,
        data: response,
        error: null,
        mensaje: response.mensaje,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al aprobar el pago'
      return {
        success: false,
        data: null,
        error: message,
        mensaje: message,
      }
    }
  },

  /**
   * Rechaza un pago pendiente con motivo explicativo (ej. comprobante ilegible, monto no coincide).
   */
  async rechazarPago(
    pagoId: string,
    adminId: string,
    motivo?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('pagos')
        .update({
          estado: 'rechazado',
          validado_por: adminId,
          notas: motivo || 'Pago rechazado por el administrador tras revisión del comprobante.',
        })
        .eq('id', pagoId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al rechazar el pago'
      return { success: false, error: message }
    }
  },

  /**
   * Lista todos los pagos en estado 'pendiente' de una empresa para la bandeja de validación
   * del administrador, con detalles del cliente, plan y comprobante.
   */
  async getPagosPendientes(empresaId: string): Promise<ServiceResponse<PagoPendienteDetallado[]>> {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          cliente:perfiles!pagos_cliente_id_fkey(*),
          plan:planes!pagos_plan_id_fkey(*),
          reserva:reservas!pagos_reserva_id_fkey(*)
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      const pagosMapeados: PagoPendienteDetallado[] = (data || []).map((item) => ({
        ...item,
        cliente: (item.cliente as unknown as Tables<'perfiles'>) || null,
        plan: (item.plan as unknown as Tables<'planes'>) || null,
        reserva: (item.reserva as unknown as Tables<'reservas'>) || null,
      }))

      return { data: pagosMapeados, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar pagos pendientes'
      return { data: null, error: message }
    }
  },
}
