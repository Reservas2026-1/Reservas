import { supabase } from '../lib/supabase'
import type {
  Tables,
  TablesInsert,
  MetodoPago,
  AprobarPagoYActivarPlanResponse,
} from '../types/database'

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface DashboardMetricas {
  ingresosHoy: number
  ingresosMes: number
  ocupacionPromedio: number
  totalClasesActivas: number
  totalClientesActivos: number
  pagosPendientesCount: number
}

export interface AlumnoInscrito {
  reservaId: string
  clienteId: string | null
  clienteNombre: string
  clienteDocumento: string
  clienteTelefono: string
  clienteEmail: string | null
  bicicletaId: string
  bicicletaNumero: number
  bicicletaCodigo: string
  estado: string
  asistenciaConfirmada: boolean
  tiqueteraId: string | null
  fechaReserva: string
}

export interface ClaseAdminDetalle extends Tables<'clases'> {
  instructor: Tables<'perfiles'> | null
  capacidadTotal: number
  cuposOcupados: number
  cuposDisponibles: number
  porcentajeOcupacion: number
  alumnos: AlumnoInscrito[]
}

export interface CrearClaseParams {
  empresaId: string
  nombre: string
  fecha: string
  horaInicio: string
  horaFin: string
  instructorId?: string | null
  instructorNombre?: string | null
  capacidad?: number
  descripcion?: string | null
}

export interface ClienteConTiqueteraResumen {
  cliente: Tables<'perfiles'>
  tiqueteraActiva: {
    id: string
    planNombre: string
    creditosDisponibles: number
    creditosTotales: number
    fechaVencimiento: string
    estado: string
    diasRestantes: number
  } | null
  totalCreditosDisponibles: number
  totalTiqueteras: number
}

export interface DesgloseMetodoPago {
  metodo: MetodoPago
  ingresos: number
  egresos: number
  neto: number
  cantidadTransacciones: number
}

export interface CierreCajaResumen {
  fecha: string
  totalIngresos: number
  totalEgresos: number
  balanceNeto: number
  totalMovimientos: number
  desglosePorMetodo: Record<string, DesgloseMetodoPago>
  movimientos: Tables<'movimientos_caja'>[]
}

/**
 * Servicio Backend para el Panel Administrativo (Métricas, Control de Clases, Caja y Clientes)
 */
export const adminService = {
  /**
   * Calcula las métricas ejecutivas clave para el dashboard del administrador:
   * ingresos del día, ingresos del mes, ocupación promedio de clases, clientes y clases activas.
   */
  async getDashboardMetricas(empresaId: string): Promise<ServiceResponse<DashboardMetricas>> {
    try {
      const hoy = new Date()
      const fechaHoyStr = hoy.toISOString().split('T')[0]
      const inicioMesStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

      // 1. Ingresos de hoy y del mes desde movimientos_caja
      const { data: movimientos, error: movError } = await supabase
        .from('movimientos_caja')
        .select('tipo, monto, fecha')
        .eq('empresa_id', empresaId)
        .gte('fecha', `${inicioMesStr}T00:00:00`)

      if (movError) {
        return { data: null, error: movError.message }
      }

      let ingresosHoy = 0
      let ingresosMes = 0

      for (const mov of movimientos || []) {
        if (mov.tipo === 'ingreso') {
          const fechaMov = (mov.fecha || '').split('T')[0]
          if (fechaMov === fechaHoyStr) {
            ingresosHoy += Number(mov.monto || 0)
          }
          ingresosMes += Number(mov.monto || 0)
        }
      }

      // 2. Conteo de clientes activos
      const { count: totalClientes, error: clientesError } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('rol', 'cliente')
        .eq('activo', true)

      if (clientesError) {
        return { data: null, error: clientesError.message }
      }

      // 3. Clases activas (programadas o en curso desde hoy en adelante)
      const { data: clasesActivas, error: clasesError } = await supabase
        .from('clases')
        .select('id, capacidad, fecha')
        .eq('empresa_id', empresaId)
        .gte('fecha', fechaHoyStr)
        .in('estado', ['programada', 'en_curso'])

      if (clasesError) {
        return { data: null, error: clasesError.message }
      }

      const totalClasesActivas = clasesActivas ? clasesActivas.length : 0

      // 4. Cálculo de ocupación promedio en el mes actual
      const { data: clasesDelMes, error: clasesMesError } = await supabase
        .from('clases')
        .select('id, capacidad')
        .eq('empresa_id', empresaId)
        .gte('fecha', inicioMesStr)
        .neq('estado', 'cancelada')

      if (clasesMesError) {
        return { data: null, error: clasesMesError.message }
      }

      let ocupacionPromedio = 0

      if (clasesDelMes && clasesDelMes.length > 0) {
        const claseIds = clasesDelMes.map((c) => c.id)
        const capacidadTotalMes = clasesDelMes.reduce((acc, c) => acc + (c.capacidad || 15), 0)

        const { count: reservasMesCount, error: reservasMesError } = await supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .in('clase_id', claseIds)
          .neq('estado', 'cancelada')

        if (!reservasMesError && capacidadTotalMes > 0) {
          const totalReservas = reservasMesCount || 0
          ocupacionPromedio = Math.min(100, Math.round((totalReservas / capacidadTotalMes) * 100))
        }
      }

      // 5. Total de pagos pendientes de validación
      const { count: pagosPendientesCount, error: pagosError } = await supabase
        .from('pagos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('estado', 'pendiente')

      if (pagosError) {
        return { data: null, error: pagosError.message }
      }

      const metricas: DashboardMetricas = {
        ingresosHoy,
        ingresosMes,
        ocupacionPromedio,
        totalClasesActivas,
        totalClientesActivos: totalClientes || 0,
        pagosPendientesCount: pagosPendientesCount || 0,
      }

      return { data: metricas, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener métricas del dashboard'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene la lista de clases para el panel de administración (filtrada por fecha opcional),
   * con detalle de ocupación de las 15 bicis y el desglose de los alumnos inscritos.
   */
  async getClasesAdmin(
    empresaId: string,
    fecha?: string
  ): Promise<ServiceResponse<ClaseAdminDetalle[]>> {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const fechaFiltro = fecha || hoy

      // 1. Obtener clases de la sede
      let query = supabase
        .from('clases')
        .select(`
          *,
          instructor:perfiles!clases_instructor_id_fkey(*)
        `)
        .eq('empresa_id', empresaId)
        .order('hora_inicio', { ascending: true })

      if (fecha) {
        query = query.eq('fecha', fecha)
      } else {
        query = query.gte('fecha', fechaFiltro)
      }

      const { data: clases, error: clasesError } = await query

      if (clasesError) {
        return { data: null, error: clasesError.message }
      }

      if (!clases || clases.length === 0) {
        return { data: [], error: null }
      }

      const claseIds = clases.map((c) => c.id)

      // 2. Obtener todas las reservas activas para estas clases con datos de cliente y bicicleta
      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select(`
          id,
          clase_id,
          bicicleta_id,
          cliente_id,
          cliente_nombre,
          cliente_documento,
          cliente_telefono,
          cliente_email,
          tiquetera_id,
          estado,
          asistencia_confirmada,
          created_at,
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(numero, codigo)
        `)
        .in('clase_id', claseIds)
        .neq('estado', 'cancelada')

      if (reservasError) {
        return { data: null, error: reservasError.message }
      }

      // 3. Cruzar clases con sus alumnos inscritos
      const clasesConAlumnos: ClaseAdminDetalle[] = clases.map((clase) => {
        const reservasClase = (reservas || []).filter((r) => r.clase_id === clase.id)
        const capacidadTotal = clase.capacidad || 15
        const cuposOcupados = reservasClase.length
        const cuposDisponibles = Math.max(0, capacidadTotal - cuposOcupados)
        const porcentajeOcupacion = Math.round((cuposOcupados / capacidadTotal) * 100)

        const alumnos: AlumnoInscrito[] = reservasClase.map((r) => {
          const bici = r.bicicleta as unknown as { numero: number; codigo: string } | null
          return {
            reservaId: r.id,
            clienteId: r.cliente_id,
            clienteNombre: r.cliente_nombre,
            clienteDocumento: r.cliente_documento,
            clienteTelefono: r.cliente_telefono,
            clienteEmail: r.cliente_email,
            bicicletaId: r.bicicleta_id,
            bicicletaNumero: bici?.numero || 0,
            bicicletaCodigo: bici?.codigo || '',
            estado: r.estado,
            asistenciaConfirmada: !!r.asistencia_confirmada,
            tiqueteraId: r.tiquetera_id,
            fechaReserva: r.created_at,
          }
        })

        return {
          ...clase,
          instructor: (clase.instructor as unknown as Tables<'perfiles'>) || null,
          capacidadTotal,
          cuposOcupados,
          cuposDisponibles,
          porcentajeOcupacion,
          alumnos,
        }
      })

      return { data: clasesConAlumnos, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar clases administrativas'
      return { data: null, error: message }
    }
  },

  /**
   * Crea una nueva sesión o clase de indoor cycling en el calendario.
   */
  async crearClase(data: CrearClaseParams): Promise<ServiceResponse<Tables<'clases'>>> {
    try {
      const nuevaClase: TablesInsert<'clases'> = {
        empresa_id: data.empresaId,
        titulo: data.nombre,
        fecha: data.fecha,
        hora_inicio: data.horaInicio,
        hora_fin: data.horaFin,
        instructor_id: data.instructorId || null,
        capacidad: data.capacidad || 15,
        descripcion: data.descripcion || null,
        estado: 'programada',
      }

      const { data: claseCreada, error } = await supabase
        .from('clases')
        .insert(nuevaClase)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: claseCreada, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la clase'
      return { data: null, error: message }
    }
  },

  /**
   * Lista los clientes registrados en la empresa junto con el resumen de sus tiqueteras,
   * créditos disponibles y días de vigencia restantes. Soporta búsqueda por texto.
   */
  async getClientesConTiqueteras(
    empresaId: string,
    busqueda?: string
  ): Promise<ServiceResponse<ClienteConTiqueteraResumen[]>> {
    try {
      // 1. Consultar clientes
      let query = supabase
        .from('perfiles')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('rol', 'cliente')
        .order('nombre_completo', { ascending: true })

      if (busqueda && busqueda.trim().length > 0) {
        const termino = busqueda.trim()
        query = query.or(
          `nombre_completo.ilike.%${termino}%,email.ilike.%${termino}%,documento.ilike.%${termino}%`
        )
      }

      const { data: clientes, error: clientesError } = await query

      if (clientesError) {
        return { data: null, error: clientesError.message }
      }

      if (!clientes || clientes.length === 0) {
        return { data: [], error: null }
      }

      const clienteIds = clientes.map((c) => c.id)
      const hoy = new Date()
      const hoyIsoStr = hoy.toISOString().split('T')[0]

      // 2. Obtener todas las tiqueteras asociadas a estos clientes con sus planes
      const { data: tiqueteras, error: tiqueterasError } = await supabase
        .from('tiqueteras')
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .in('cliente_id', clienteIds)
        .eq('empresa_id', empresaId)
        .order('fecha_vencimiento', { ascending: true })

      if (tiqueterasError) {
        return { data: null, error: tiqueterasError.message }
      }

      // 3. Estructurar el resumen por cada cliente
      const resultados: ClienteConTiqueteraResumen[] = clientes.map((cliente) => {
        const tiqueterasCliente = (tiqueteras || []).filter((t) => t.cliente_id === cliente.id)

        // Buscar tiquetera activa y vigente
        const tiqueteraActivaObj = tiqueterasCliente.find(
          (t) =>
            t.estado === 'activa' &&
            t.creditos_disponibles > 0 &&
            t.fecha_vencimiento >= hoyIsoStr
        )

        let tiqueteraActivaResumen: ClienteConTiqueteraResumen['tiqueteraActiva'] = null

        if (tiqueteraActivaObj) {
          const planData = tiqueteraActivaObj.plan as unknown as Tables<'planes'> | null
          const vencimientoDate = new Date(tiqueteraActivaObj.fecha_vencimiento)
          const diffMs = vencimientoDate.getTime() - hoy.getTime()
          const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

          tiqueteraActivaResumen = {
            id: tiqueteraActivaObj.id,
            planNombre: planData?.nombre || 'Plan Estándar',
            creditosDisponibles: tiqueteraActivaObj.creditos_disponibles,
            creditosTotales: tiqueteraActivaObj.creditos_totales,
            fechaVencimiento: tiqueteraActivaObj.fecha_vencimiento,
            estado: tiqueteraActivaObj.estado,
            diasRestantes,
          }
        }

        const totalCreditosDisponibles = tiqueterasCliente
          .filter((t) => t.estado === 'activa' && t.fecha_vencimiento >= hoyIsoStr)
          .reduce((acc, t) => acc + (t.creditos_disponibles || 0), 0)

        return {
          cliente,
          tiqueteraActiva: tiqueteraActivaResumen,
          totalCreditosDisponibles,
          totalTiqueteras: tiqueterasCliente.length,
        }
      })

      return { data: resultados, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar clientes con tiqueteras'
      return { data: null, error: message }
    }
  },

  /**
   * Asignación directa y manual de un paquete de clases desde el panel administrativo.
   * Utiliza la función RPC 'aprobar_pago_y_activar_plan' para garantizar consistencia
   * contable en movimientos_caja y vigencia exacta en tiqueteras.
   */
  async asignarPlanManual(
    clienteId: string,
    planId: string,
    adminId: string,
    empresaId: string
  ): Promise<{
    success: boolean
    data: AprobarPagoYActivarPlanResponse | null
    error: string | null
    mensaje?: string
  }> {
    try {
      // 1. Obtener la información del plan para determinar precio y créditos
      const { data: plan, error: planError } = await supabase
        .from('planes')
        .select('*')
        .eq('id', planId)
        .eq('empresa_id', empresaId)
        .single()

      if (planError || !plan) {
        return {
          success: false,
          data: null,
          error: 'El plan seleccionado no existe o no pertenece a esta sede',
          mensaje: 'Plan no encontrado',
        }
      }

      // 2. Registrar el pago inicial con origen administrativo en estado 'pendiente'
      const { data: pago, error: pagoError } = await supabase
        .from('pagos')
        .insert({
          empresa_id: empresaId,
          cliente_id: clienteId,
          plan_id: plan.id,
          monto: plan.precio,
          metodo: 'efectivo',
          estado: 'pendiente',
          notas: `Asignación manual de plan '${plan.nombre}' desde panel administrativo.`,
        })
        .select()
        .single()

      if (pagoError || !pago) {
        return {
          success: false,
          data: null,
          error: pagoError?.message || 'No se pudo generar la transacción de pago inicial',
          mensaje: 'Error al registrar el pago administrativo',
        }
      }

      // 3. Ejecutar la función RPC para acreditar la tiquetera y asentar en caja
      const { data: rpcData, error: rpcError } = await supabase.rpc('aprobar_pago_y_activar_plan', {
        p_pago_id: pago.id,
        p_admin_id: adminId,
      })

      if (rpcError) {
        return {
          success: false,
          data: null,
          error: rpcError.message,
          mensaje: 'Error de base de datos al activar el plan para el cliente',
        }
      }

      const response = rpcData as unknown as AprobarPagoYActivarPlanResponse

      if (!response.success) {
        return {
          success: false,
          data: response,
          error: response.error || response.mensaje || 'No se pudo completar la asignación del plan',
          mensaje: response.mensaje,
        }
      }

      return {
        success: true,
        data: response,
        error: null,
        mensaje: `Plan '${plan.nombre}' asignado exitosamente al cliente (${response.creditos_otorgados} créditos).`,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al asignar plan manual'
      return {
        success: false,
        data: null,
        error: message,
        mensaje: message,
      }
    }
  },

  /**
   * Genera el arqueo o cierre de caja financiero del día para una empresa,
   * desglosado por método de pago y balance total de ingresos vs egresos.
   */
  async getCierreCaja(
    empresaId: string,
    fecha?: string
  ): Promise<ServiceResponse<CierreCajaResumen>> {
    try {
      const fechaConsulta = fecha || new Date().toISOString().split('T')[0]
      const inicioDia = `${fechaConsulta}T00:00:00`
      const finDia = `${fechaConsulta}T23:59:59`

      // 1. Consultar todos los movimientos de caja registrados en la fecha
      const { data: movimientos, error: movError } = await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('fecha', inicioDia)
        .lte('fecha', finDia)
        .order('fecha', { ascending: false })

      if (movError) {
        return { data: null, error: movError.message }
      }

      const listaMovimientos = movimientos || []

      // 2. Inicializar desglose por método de pago
      const desglose: Record<string, DesgloseMetodoPago> = {}
      let totalIngresos = 0
      let totalEgresos = 0

      for (const mov of listaMovimientos) {
        const metodo = mov.metodo || 'otro'
        const monto = Number(mov.monto || 0)

        if (!desglose[metodo]) {
          desglose[metodo] = {
            metodo,
            ingresos: 0,
            egresos: 0,
            neto: 0,
            cantidadTransacciones: 0,
          }
        }

        desglose[metodo].cantidadTransacciones += 1

        if (mov.tipo === 'ingreso') {
          desglose[metodo].ingresos += monto
          desglose[metodo].neto += monto
          totalIngresos += monto
        } else if (mov.tipo === 'egreso') {
          desglose[metodo].egresos += monto
          desglose[metodo].neto -= monto
          totalEgresos += monto
        }
      }

      const resumen: CierreCajaResumen = {
        fecha: fechaConsulta,
        totalIngresos,
        totalEgresos,
        balanceNeto: totalIngresos - totalEgresos,
        totalMovimientos: listaMovimientos.length,
        desglosePorMetodo: desglose,
        movimientos: listaMovimientos,
      }

      return { data: resumen, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al calcular el cierre de caja'
      return { data: null, error: message }
    }
  },
}
