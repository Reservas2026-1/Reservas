import { supabase } from '../lib/supabase'
import { bicicletasService } from './bicicletasService'
import {
  clasesService,
  type ActualizarClaseParams,
  type CrearHorarioBaseParams,
  type ActualizarHorarioBaseParams,
} from './clasesService'
import {
  tiqueterasService,
  type TiqueteraConPlan,
  type CrearPlanParams,
  type ActualizarPlanParams,
  type AsignarTiqueteraManualParams,
  type ActualizarTiqueteraParams,
} from './tiqueterasService'
import type {
  Tables,
  TablesInsert,
  MetodoPago,
  EstadoPago,
  TablesUpdate,
  TipoMovimiento,
  AprobarPagoYActivarPlanResponse,
} from '../types/database'

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface ActualizarClienteParams {
  nombreCompleto?: string
  documento?: string | null
  telefono?: string | null
  email?: string
  avatarUrl?: string | null
  activo?: boolean
}

export interface RegistrarMovimientoCajaParams {
  empresaId: string
  tipo: TipoMovimiento
  concepto: string
  monto: number
  metodo?: MetodoPago
  responsable: string
  usuarioId?: string | null
  reservaId?: string | null
  pagoId?: string | null
  fecha?: string
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

export type PeriodoEstadisticas = 'semana' | 'mes' | 'anio'
export type GranularidadEstadisticas = 'diaria' | 'mensual'

export interface PuntoEstadisticaIngresos {
  fecha: string
  etiqueta: string
  ingresosCobrados: number
  valorUtilizadoPlanes: number
  diferenciaNeta: number
}

export interface EstadisticasIngresosResumen {
  periodo: PeriodoEstadisticas
  granularidad: GranularidadEstadisticas
  fechaInicio: string
  fechaFin: string
  totalIngresosCobrados: number
  totalValorUtilizadoPlanes: number
  series: PuntoEstadisticaIngresos[]
}

export interface PagosFiltros {
  /** Fecha inicial inclusive ('YYYY-MM-DD' o ISO) */
  fechaInicio?: string
  /** Fecha final inclusive ('YYYY-MM-DD' o ISO) */
  fechaFin?: string
  /** Método de pago ('efectivo', 'nequi', 'bancolombia', 'wompi', etc.) */
  metodo?: MetodoPago | 'todos'
  /** Código de referencia de transacción, código QR de reserva, notas o ID de pago */
  codigo?: string
  /** Estado del pago opcional */
  estado?: EstadoPago | 'todos'
}

export interface PagoFiltradoDetallado extends Tables<'pagos'> {
  cliente: Tables<'perfiles'> | null
  plan: Tables<'planes'> | null
  reserva: Tables<'reservas'> | null
}

export type PeriodoDashboard = 'hoy' | '7dias' | '30dias' | '3meses'

export interface KpisDashboardEjecutivo {
  ingresosTotal: number
  ingresosVariacion: number
  reservasTotal: number
  tasaAsistencia: number
  ocupacionPromedio: number
  clientesActivos: number
  tiqueterasVigentes: number
  planesPorVencer: number
}

export interface PuntoGraficaIngresosReservas {
  fecha: string
  label: string
  ingresos: number
  reservas: number
}

export interface FranjaHoraPico {
  hora: string
  reservas: number
  esPico: boolean
}

export interface RendimientoPlanItem {
  planId: string
  nombre: string
  ventas: number
  ingresos: number
  porcentaje: number
}

export interface DesgloseEstadosReservas {
  confirmadas: number
  asistidas: number
  pendientes: number
  canceladas: number
}

export interface TopClienteItem {
  usuarioId: string
  nombre: string
  email: string
  avatarUrl?: string
  asistencias: number
  xpTotal: number
}

export interface MetricasDashboardEjecutivo {
  kpis: KpisDashboardEjecutivo
  graficaIngresosReservas: PuntoGraficaIngresosReservas[]
  horasPico: FranjaHoraPico[]
  rendimientoPlanes: RendimientoPlanItem[]
  desgloseEstados: DesgloseEstadosReservas
  topClientes: TopClienteItem[]
}

const PERIODOS_ESTADISTICAS = new Set<PeriodoEstadisticas>(['semana', 'mes', 'anio'])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLocalMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function toLocalBoundaryIso(dateStr: string, endOfDay: boolean): string {
  if (dateStr.includes('T')) {
    return dateStr
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) {
    return endOfDay ? `${dateStr}T23:59:59.999` : `${dateStr}T00:00:00.000`
  }
  const boundary = new Date(
    y,
    m - 1,
    d,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  )
  return boundary.toISOString()
}

function extraerClaveFecha(
  rawFecha: string | null | undefined,
  granularidad: GranularidadEstadisticas
): string | null {
  if (!rawFecha) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawFecha)) {
    return granularidad === 'mensual' ? rawFecha.slice(0, 7) : rawFecha
  }
  const parsed = new Date(rawFecha)
  if (Number.isNaN(parsed.getTime())) {
    const fallback = rawFecha.split('T')[0]
    return granularidad === 'mensual' ? fallback.slice(0, 7) : fallback
  }
  return granularidad === 'mensual' ? formatLocalMonth(parsed) : formatLocalDate(parsed)
}

async function resolveEmpresaId(explicitEmpresaId?: string): Promise<string | undefined> {
  if (explicitEmpresaId && explicitEmpresaId.trim().length > 0) {
    return explicitEmpresaId.trim()
  }
  try {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return undefined

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', userId)
      .maybeSingle()

    return perfil?.empresa_id || undefined
  } catch {
    return undefined
  }
}

function construirRangoYBuckets(periodo: PeriodoEstadisticas): {
  granularidad: GranularidadEstadisticas
  fechaInicio: string
  fechaFin: string
  buckets: Array<{ fecha: string; etiqueta: string }>
} {
  const ahora = new Date()
  const base = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

  if (periodo === 'anio') {
    const buckets: Array<{ fecha: string; etiqueta: string }> = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      buckets.push({
        fecha: formatLocalMonth(d),
        etiqueta: d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
      })
    }
    const finMes = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    return {
      granularidad: 'mensual',
      fechaInicio: `${buckets[0].fecha}-01`,
      fechaFin: formatLocalDate(finMes),
      buckets,
    }
  }

  const totalDias = periodo === 'semana' ? 7 : 30
  const buckets: Array<{ fecha: string; etiqueta: string }> = []
  for (let i = totalDias - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i)
    buckets.push({
      fecha: formatLocalDate(d),
      etiqueta:
        periodo === 'semana'
          ? d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
          : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
    })
  }

  return {
    granularidad: 'diaria',
    fechaInicio: buckets[0].fecha,
    fechaFin: buckets[buckets.length - 1].fecha,
    buckets,
  }
}

async function getEstadisticasIngresosImpl(
  periodo: PeriodoEstadisticas,
  empresaId?: string
): Promise<ServiceResponse<EstadisticasIngresosResumen>>
async function getEstadisticasIngresosImpl(
  empresaId: string,
  periodo: PeriodoEstadisticas
): Promise<ServiceResponse<EstadisticasIngresosResumen>>
async function getEstadisticasIngresosImpl(
  arg1: PeriodoEstadisticas | string,
  arg2?: PeriodoEstadisticas | string
): Promise<ServiceResponse<EstadisticasIngresosResumen>> {
  try {
    let periodo: PeriodoEstadisticas
    let empresaIdArg: string | undefined

    if (PERIODOS_ESTADISTICAS.has(arg1 as PeriodoEstadisticas)) {
      periodo = arg1 as PeriodoEstadisticas
      empresaIdArg = typeof arg2 === 'string' ? arg2 : undefined
    } else {
      empresaIdArg = arg1
      periodo = arg2 as PeriodoEstadisticas
    }

    if (!PERIODOS_ESTADISTICAS.has(periodo)) {
      return {
        data: null,
        error: "Período inválido. Debe ser 'semana', 'mes' o 'anio'.",
      }
    }

    const empresaId = await resolveEmpresaId(empresaIdArg)
    const { granularidad, fechaInicio, fechaFin, buckets } = construirRangoYBuckets(periodo)
    const inicioIso = toLocalBoundaryIso(fechaInicio, false)
    const finIso = toLocalBoundaryIso(fechaFin, true)

    let movQuery = supabase
      .from('movimientos_caja')
      .select('id, tipo, monto, fecha, pago_id')
      .eq('tipo', 'ingreso')
      .gte('fecha', inicioIso)
      .lte('fecha', finIso)

    let pagosQuery = supabase
      .from('pagos')
      .select('id, monto, fecha_pago, estado')
      .eq('estado', 'aprobado')
      .gte('fecha_pago', inicioIso)
      .lte('fecha_pago', finIso)

    let reservasQuery = supabase
      .from('reservas')
      .select(`
        id,
        fecha_reserva,
        fecha_inicio,
        estado,
        tiquetera_id,
        tiquetera:tiqueteras!reservas_tiquetera_id_fkey(
          id,
          creditos_totales,
          plan:planes!tiqueteras_plan_id_fkey(id, precio, creditos)
        )
      `)
      .not('tiquetera_id', 'is', null)
      .neq('estado', 'cancelada')
      .gte('fecha_reserva', fechaInicio)
      .lte('fecha_reserva', fechaFin)

    if (empresaId) {
      movQuery = movQuery.eq('empresa_id', empresaId)
      pagosQuery = pagosQuery.eq('empresa_id', empresaId)
      reservasQuery = reservasQuery.eq('empresa_id', empresaId)
    }

    const [movRes, pagosRes, reservasRes] = await Promise.all([
      movQuery,
      pagosQuery,
      reservasQuery,
    ])

    if (movRes.error) {
      return { data: null, error: movRes.error.message }
    }
    if (pagosRes.error) {
      return { data: null, error: pagosRes.error.message }
    }
    if (reservasRes.error) {
      return { data: null, error: reservasRes.error.message }
    }

    const acumuladoPorClave = new Map<
      string,
      { ingresosCobrados: number; valorUtilizadoPlanes: number }
    >()
    for (const bucket of buckets) {
      acumuladoPorClave.set(bucket.fecha, {
        ingresosCobrados: 0,
        valorUtilizadoPlanes: 0,
      })
    }

    // 1. Ingresos cobrados: movimientos_caja tipo 'ingreso' + pagos aprobados sin movimiento vinculado
    const pagoIdsEnCaja = new Set<string>()
    for (const mov of movRes.data || []) {
      if (mov.pago_id) {
        pagoIdsEnCaja.add(mov.pago_id)
      }
      const clave = extraerClaveFecha(mov.fecha, granularidad)
      if (!clave) continue
      const bucket = acumuladoPorClave.get(clave)
      if (bucket) {
        bucket.ingresosCobrados += Number(mov.monto || 0)
      }
    }

    for (const pago of pagosRes.data || []) {
      if (pagoIdsEnCaja.has(pago.id)) continue
      const clave = extraerClaveFecha(pago.fecha_pago, granularidad)
      if (!clave) continue
      const bucket = acumuladoPorClave.get(clave)
      if (bucket) {
        bucket.ingresosCobrados += Number(pago.monto || 0)
      }
    }

    // 2. Valor utilizado de planes: valor unitario del crédito consumido por cada reserva activa con tiquetera
    for (const reserva of reservasRes.data || []) {
      const clave = extraerClaveFecha(
        reserva.fecha_reserva || reserva.fecha_inicio,
        granularidad
      )
      if (!clave) continue
      const bucket = acumuladoPorClave.get(clave)
      if (!bucket) continue

      const tiquetera = reserva.tiquetera as unknown as {
        id: string
        creditos_totales: number
        plan: { id: string; precio: number; creditos: number } | null
      } | null

      const precioPlan = Number(tiquetera?.plan?.precio || 0)
      const creditosPlan = Number(
        tiquetera?.creditos_totales || tiquetera?.plan?.creditos || 0
      )

      if (precioPlan > 0 && creditosPlan > 0) {
        bucket.valorUtilizadoPlanes += precioPlan / creditosPlan
      }
    }

    let totalIngresosCobrados = 0
    let totalValorUtilizadoPlanes = 0

    const series: PuntoEstadisticaIngresos[] = buckets.map((b) => {
      const valores = acumuladoPorClave.get(b.fecha)!
      const ingresosCobrados = roundCurrency(valores.ingresosCobrados)
      const valorUtilizadoPlanes = roundCurrency(valores.valorUtilizadoPlanes)
      totalIngresosCobrados += ingresosCobrados
      totalValorUtilizadoPlanes += valorUtilizadoPlanes

      return {
        fecha: b.fecha,
        etiqueta: b.etiqueta,
        ingresosCobrados,
        valorUtilizadoPlanes,
        diferenciaNeta: roundCurrency(ingresosCobrados - valorUtilizadoPlanes),
      }
    })

    return {
      data: {
        periodo,
        granularidad,
        fechaInicio,
        fechaFin,
        totalIngresosCobrados: roundCurrency(totalIngresosCobrados),
        totalValorUtilizadoPlanes: roundCurrency(totalValorUtilizadoPlanes),
        series,
      },
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al calcular estadísticas de ingresos'
    return { data: null, error: message }
  }
}

async function getPagosFiltradosImpl(
  empresaId: string,
  filtros?: PagosFiltros
): Promise<ServiceResponse<PagoFiltradoDetallado[]>>
async function getPagosFiltradosImpl(
  filtros?: PagosFiltros & { empresaId?: string }
): Promise<ServiceResponse<PagoFiltradoDetallado[]>>
async function getPagosFiltradosImpl(
  arg1?: string | (PagosFiltros & { empresaId?: string }),
  arg2?: PagosFiltros
): Promise<ServiceResponse<PagoFiltradoDetallado[]>> {
  try {
    let empresaIdArg: string | undefined
    let filtros: PagosFiltros

    if (typeof arg1 === 'string') {
      empresaIdArg = arg1
      filtros = arg2 || {}
    } else {
      filtros = arg1 || {}
      empresaIdArg = arg1?.empresaId
    }

    const empresaId = await resolveEmpresaId(empresaIdArg)

    let query = supabase
      .from('pagos')
      .select(`
        *,
        cliente:perfiles!pagos_cliente_id_fkey(*),
        plan:planes!pagos_plan_id_fkey(*),
        reserva:reservas!pagos_reserva_id_fkey(*)
      `)
      .order('fecha_pago', { ascending: false })

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    if (filtros.fechaInicio) {
      query = query.gte('fecha_pago', toLocalBoundaryIso(filtros.fechaInicio, false))
    }

    if (filtros.fechaFin) {
      query = query.lte('fecha_pago', toLocalBoundaryIso(filtros.fechaFin, true))
    }

    if (filtros.metodo && filtros.metodo !== 'todos') {
      query = query.eq('metodo', filtros.metodo)
    }

    if (filtros.estado && filtros.estado !== 'todos') {
      query = query.eq('estado', filtros.estado)
    }

    const codigoLimpio = filtros.codigo?.trim()
    if (codigoLimpio) {
      const terminoSeguro = codigoLimpio.replace(/[,()]/g, '')
      if (terminoSeguro.length > 0) {
        let reservasQuery = supabase
          .from('reservas')
          .select('id')
          .ilike('codigo_qr', `%${terminoSeguro}%`)

        if (empresaId) {
          reservasQuery = reservasQuery.eq('empresa_id', empresaId)
        }

        const { data: reservasCoincidentes } = await reservasQuery
        const reservaIds = (reservasCoincidentes || []).map((r) => r.id)

        const orConditions = [
          `referencia_transaccion.ilike.%${terminoSeguro}%`,
          `notas.ilike.%${terminoSeguro}%`,
        ]

        if (UUID_REGEX.test(terminoSeguro)) {
          orConditions.push(`id.eq.${terminoSeguro}`)
        }

        if (reservaIds.length > 0) {
          orConditions.push(`reserva_id.in.(${reservaIds.join(',')})`)
        }

        query = query.or(orConditions.join(','))
      }
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    const pagosMapeados: PagoFiltradoDetallado[] = (data || []).map((item) => ({
      ...item,
      cliente: (item.cliente as unknown as Tables<'perfiles'>) || null,
      plan: (item.plan as unknown as Tables<'planes'>) || null,
      reserva: (item.reserva as unknown as Tables<'reservas'>) || null,
    }))

    return { data: pagosMapeados, error: null }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al consultar pagos filtrados'
    return { data: null, error: message }
  }
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
 * Obtiene las métricas integrales y estructuradas para el Dashboard Administrativo Ejecutivo.
 * @param empresaId ID de la empresa/estudio a consultar
 * @param periodo Ventana de tiempo: 'hoy' | '7dias' | '30dias' | '3meses'
 */
export async function obtenerMetricasDashboardEjecutivo(
  empresaId: string,
  periodo: PeriodoDashboard = '30dias'
): Promise<MetricasDashboardEjecutivo> {
  const defaultRespuesta: MetricasDashboardEjecutivo = {
    kpis: {
      ingresosTotal: 0,
      ingresosVariacion: 0,
      reservasTotal: 0,
      tasaAsistencia: 0,
      ocupacionPromedio: 0,
      clientesActivos: 0,
      tiqueterasVigentes: 0,
      planesPorVencer: 0,
    },
    graficaIngresosReservas: [],
    horasPico: [],
    rendimientoPlanes: [],
    desgloseEstados: {
      confirmadas: 0,
      asistidas: 0,
      pendientes: 0,
      canceladas: 0,
    },
    topClientes: [],
  }

  try {
    const targetEmpresaId = (await resolveEmpresaId(empresaId)) || empresaId
    if (!targetEmpresaId) {
      return defaultRespuesta
    }

    const ahora = new Date()
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const hoyStr = formatLocalDate(hoy)

    let fechaInicioStr: string
    const fechaFinStr = hoyStr
    let inicioIso: string
    const finIso = toLocalBoundaryIso(fechaFinStr, true)

    let anteriorInicioIso: string
    let anteriorFinIso: string

    const buckets: PuntoGraficaIngresosReservas[] = []

    if (periodo === 'hoy') {
      fechaInicioStr = hoyStr
      inicioIso = toLocalBoundaryIso(hoyStr, false)

      const ayer = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1)
      const ayerStr = formatLocalDate(ayer)
      anteriorInicioIso = toLocalBoundaryIso(ayerStr, false)
      anteriorFinIso = toLocalBoundaryIso(ayerStr, true)

      // Franjas de hoy de 06:00 a 22:00
      for (let h = 6; h <= 22; h++) {
        const horaStr = `${String(h).padStart(2, '0')}:00`
        buckets.push({
          fecha: `${hoyStr} ${horaStr}`,
          label: horaStr,
          ingresos: 0,
          reservas: 0,
        })
      }
    } else if (periodo === '7dias') {
      const hace6Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6)
      fechaInicioStr = formatLocalDate(hace6Dias)
      inicioIso = toLocalBoundaryIso(fechaInicioStr, false)

      const hace13Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 13)
      const hace7Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7)
      anteriorInicioIso = toLocalBoundaryIso(formatLocalDate(hace13Dias), false)
      anteriorFinIso = toLocalBoundaryIso(formatLocalDate(hace7Dias), true)

      for (let i = 6; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - i)
        const fStr = formatLocalDate(d)
        const rawLabel = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
        const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
        buckets.push({
          fecha: fStr,
          label,
          ingresos: 0,
          reservas: 0,
        })
      }
    } else if (periodo === '3meses') {
      const hace89Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 89)
      fechaInicioStr = formatLocalDate(hace89Dias)
      inicioIso = toLocalBoundaryIso(fechaInicioStr, false)

      const hace179Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 179)
      const hace90Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 90)
      anteriorInicioIso = toLocalBoundaryIso(formatLocalDate(hace179Dias), false)
      anteriorFinIso = toLocalBoundaryIso(formatLocalDate(hace90Dias), true)

      // 13 intervalos semanales de 7 días
      for (let w = 12; w >= 0; w--) {
        const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (w * 7 + 6))
        const fStr = formatLocalDate(inicioSemana)
        const rawLabel = inicioSemana.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
        buckets.push({
          fecha: fStr,
          label: rawLabel,
          ingresos: 0,
          reservas: 0,
        })
      }
    } else {
      // '30dias' (predeterminado)
      const hace29Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 29)
      fechaInicioStr = formatLocalDate(hace29Dias)
      inicioIso = toLocalBoundaryIso(fechaInicioStr, false)

      const hace59Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 59)
      const hace30Dias = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 30)
      anteriorInicioIso = toLocalBoundaryIso(formatLocalDate(hace59Dias), false)
      anteriorFinIso = toLocalBoundaryIso(formatLocalDate(hace30Dias), true)

      for (let i = 29; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - i)
        const fStr = formatLocalDate(d)
        const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
        buckets.push({
          fecha: fStr,
          label,
          ingresos: 0,
          reservas: 0,
        })
      }
    }

    // Consultas concurrentes a Supabase
    const [
      pagosPeriodoRes,
      pagosAnteriorRes,
      reservasPeriodoRes,
      clasesPeriodoRes,
      tiqueterasActivasRes,
      planesRes,
      perfilesClientesRes,
    ] = await Promise.all([
      // 1. Pagos aprobados en el período actual
      supabase
        .from('pagos')
        .select('id, monto, fecha_pago, plan_id, tiquetera_id')
        .eq('empresa_id', targetEmpresaId)
        .eq('estado', 'aprobado')
        .gte('fecha_pago', inicioIso)
        .lte('fecha_pago', finIso),

      // 2. Pagos aprobados en el período anterior (para cálculo de ingresosVariacion)
      supabase
        .from('pagos')
        .select('monto')
        .eq('empresa_id', targetEmpresaId)
        .eq('estado', 'aprobado')
        .gte('fecha_pago', anteriorInicioIso)
        .lte('fecha_pago', anteriorFinIso),

      // 3. Reservas en el período actual
      supabase
        .from('reservas')
        .select(`
          id,
          clase_id,
          bicicleta_id,
          cliente_id,
          cliente_nombre,
          cliente_email,
          fecha_reserva,
          fecha_inicio,
          fecha_fin,
          estado,
          total,
          asistencia_confirmada
        `)
        .eq('empresa_id', targetEmpresaId)
        .gte('fecha_reserva', fechaInicioStr)
        .lte('fecha_reserva', fechaFinStr),

      // 4. Clases en el período actual (para cálculo de ocupación)
      supabase
        .from('clases')
        .select('id, capacidad, fecha, estado')
        .eq('empresa_id', targetEmpresaId)
        .gte('fecha', fechaInicioStr)
        .lte('fecha', fechaFinStr)
        .neq('estado', 'cancelada'),

      // 5. Tiqueteras activas de la empresa
      supabase
        .from('tiqueteras')
        .select('id, cliente_id, plan_id, creditos_disponibles, creditos_totales, fecha_vencimiento, estado')
        .eq('empresa_id', targetEmpresaId)
        .eq('estado', 'activa'),

      // 6. Planes configurados del estudio
      supabase
        .from('planes')
        .select('id, nombre, precio, creditos')
        .eq('empresa_id', targetEmpresaId),

      // 7. Perfiles de clientes del estudio
      supabase
        .from('perfiles')
        .select('id')
        .eq('empresa_id', targetEmpresaId)
        .eq('rol', 'cliente')
        .eq('activo', true),
    ])

    const pagosPeriodo = pagosPeriodoRes.data || []
    const pagosAnterior = pagosAnteriorRes.data || []
    const reservas = reservasPeriodoRes.data || []
    const clasesPeriodo = clasesPeriodoRes.data || []
    const tiqueterasActivas = tiqueterasActivasRes.data || []
    const planes = planesRes.data || []
    const perfilesClientes = perfilesClientesRes.data || []

    // 1. Distribución en gráfica temporal (ingresos y reservas)
    for (const pago of pagosPeriodo) {
      const monto = Number(pago.monto || 0)
      if (periodo === 'hoy') {
        let horaStr = ''
        if (pago.fecha_pago) {
          const match = pago.fecha_pago.match(/T(\d{2}):/)
          if (match) horaStr = `${match[1]}:00`
        }
        const b = buckets.find((item) => item.label === horaStr)
        if (b) {
          b.ingresos += monto
        } else if (buckets.length > 0) {
          buckets[0].ingresos += monto
        }
      } else if (periodo === '3meses') {
        const pDate = new Date(pago.fecha_pago).getTime()
        for (let i = buckets.length - 1; i >= 0; i--) {
          const bDate = new Date(buckets[i].fecha).getTime()
          if (pDate >= bDate) {
            buckets[i].ingresos += monto
            break
          }
        }
      } else {
        const f = pago.fecha_pago ? pago.fecha_pago.split('T')[0] : ''
        const b = buckets.find((item) => item.fecha === f)
        if (b) b.ingresos += monto
      }
    }

    for (const res of reservas) {
      if (periodo === 'hoy') {
        let horaStr = ''
        if (res.fecha_inicio) {
          const match = res.fecha_inicio.match(/T(\d{2}):/)
          if (match) horaStr = `${match[1]}:00`
        }
        const b = buckets.find((item) => item.label === horaStr)
        if (b) {
          b.reservas += 1
        } else if (buckets.length > 0) {
          buckets[0].reservas += 1
        }
      } else if (periodo === '3meses') {
        const rawDate = res.fecha_reserva || (res.fecha_inicio ? res.fecha_inicio.split('T')[0] : '')
        const rDate = new Date(rawDate).getTime()
        for (let i = buckets.length - 1; i >= 0; i--) {
          const bDate = new Date(buckets[i].fecha).getTime()
          if (rDate >= bDate) {
            buckets[i].reservas += 1
            break
          }
        }
      } else {
        const f = res.fecha_reserva || (res.fecha_inicio ? res.fecha_inicio.split('T')[0] : '')
        const b = buckets.find((item) => item.fecha === f)
        if (b) b.reservas += 1
      }
    }

    for (const b of buckets) {
      b.ingresos = roundCurrency(b.ingresos)
    }

    // 2. Desglose de estados de reservas
    const desgloseEstados: DesgloseEstadosReservas = {
      confirmadas: 0,
      asistidas: 0,
      pendientes: 0,
      canceladas: 0,
    }

    for (const r of reservas) {
      if (r.asistencia_confirmada || (r.estado as string) === 'completada' || r.estado === 'finalizada') {
        desgloseEstados.asistidas += 1
      } else if (r.estado === 'confirmada' || r.estado === 'en_curso') {
        desgloseEstados.confirmadas += 1
      } else if (r.estado === 'pendiente') {
        desgloseEstados.pendientes += 1
      } else if (r.estado === 'cancelada') {
        desgloseEstados.canceladas += 1
      }
    }

    // 3. KPIs del Dashboard
    const ingresosTotal = roundCurrency(pagosPeriodo.reduce((sum, p) => sum + Number(p.monto || 0), 0))
    const ingresosAnterior = roundCurrency(pagosAnterior.reduce((sum, p) => sum + Number(p.monto || 0), 0))

    let ingresosVariacion = 0
    if (ingresosAnterior === 0) {
      ingresosVariacion = ingresosTotal > 0 ? 100 : 0
    } else {
      ingresosVariacion = Math.round(((ingresosTotal - ingresosAnterior) / ingresosAnterior) * 1000) / 10
    }

    const reservasTotal = reservas.length

    const totalProgramadas = reservas.filter((r) => r.estado !== 'cancelada').length
    const tasaAsistencia = totalProgramadas > 0
      ? Math.min(100, Math.round((desgloseEstados.asistidas / totalProgramadas) * 1000) / 10)
      : 0

    const capacidadTotal = clasesPeriodo.reduce((sum, c) => sum + (c.capacidad || 15), 0)
    const cuposOcupados = reservas.filter((r) => r.estado !== 'cancelada').length
    const ocupacionPromedio = capacidadTotal > 0
      ? Math.min(100, Math.round((cuposOcupados / capacidadTotal) * 1000) / 10)
      : 0

    const clientesActivosSet = new Set<string>()
    for (const r of reservas) {
      if (r.cliente_id) clientesActivosSet.add(r.cliente_id)
    }
    for (const t of tiqueterasActivas) {
      if (t.cliente_id) clientesActivosSet.add(t.cliente_id)
    }
    const clientesActivos = Math.max(clientesActivosSet.size, perfilesClientes.length)

    const tiqueterasVigentes = tiqueterasActivas.length

    const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const planesPorVencer = tiqueterasActivas.filter((t) => {
      const creditos = Number(t.creditos_disponibles || 0)
      const vencePronto = t.fecha_vencimiento && t.fecha_vencimiento <= en7Dias
      return creditos <= 2 || vencePronto
    }).length

    const kpis: KpisDashboardEjecutivo = {
      ingresosTotal,
      ingresosVariacion,
      reservasTotal,
      tasaAsistencia,
      ocupacionPromedio,
      clientesActivos,
      tiqueterasVigentes,
      planesPorVencer,
    }

    // 4. Franjas Horas Pico
    const franjasHorariasBase = [
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00',
    ]
    const conteoHoras = new Map<string, number>()
    for (const h of franjasHorariasBase) {
      conteoHoras.set(h, 0)
    }

    for (const r of reservas) {
      let hora = ''
      if (r.fecha_inicio) {
        const match = r.fecha_inicio.match(/T(\d{2}):/)
        if (match) hora = `${match[1]}:00`
      }
      if (hora && conteoHoras.has(hora)) {
        conteoHoras.set(hora, (conteoHoras.get(hora) || 0) + 1)
      } else if (hora) {
        conteoHoras.set(hora, (conteoHoras.get(hora) || 0) + 1)
      }
    }

    const maxReservasHora = Math.max(...Array.from(conteoHoras.values()), 0)
    const horasPico: FranjaHoraPico[] = Array.from(conteoHoras.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hora, cant]) => ({
        hora,
        reservas: cant,
        esPico: maxReservasHora > 0 && cant >= Math.max(1, Math.round(maxReservasHora * 0.75)),
      }))

    // 5. Rendimiento de Planes
    const planesMap = new Map<string, { id: string; nombre: string; precio: number; creditos: number }>()
    for (const p of planes) {
      planesMap.set(p.id, p)
    }

    const statsPlanes = new Map<string, { ventas: number; ingresos: number; nombre: string }>()
    for (const p of planes) {
      statsPlanes.set(p.id, {
        ventas: 0,
        ingresos: 0,
        nombre: p.nombre,
      })
    }

    const tiqueteraPlanMap = new Map<string, string>()
    for (const t of tiqueterasActivas) {
      if (t.plan_id) tiqueteraPlanMap.set(t.id, t.plan_id)
    }

    let totalIngresosPlanes = 0
    for (const pago of pagosPeriodo) {
      const planId = pago.plan_id || (pago.tiquetera_id ? tiqueteraPlanMap.get(pago.tiquetera_id) : null)
      const monto = Number(pago.monto || 0)

      if (planId && statsPlanes.has(planId)) {
        const item = statsPlanes.get(planId)!
        item.ventas += 1
        item.ingresos += monto
        totalIngresosPlanes += monto
      } else if (planId) {
        statsPlanes.set(planId, {
          ventas: 1,
          ingresos: monto,
          nombre: planesMap.get(planId)?.nombre || 'Plan Especial',
        })
        totalIngresosPlanes += monto
      }
    }

    const divisorPlanes = totalIngresosPlanes > 0 ? totalIngresosPlanes : ingresosTotal
    const rendimientoPlanes: RendimientoPlanItem[] = Array.from(statsPlanes.entries())
      .map(([planId, data]) => ({
        planId,
        nombre: data.nombre,
        ventas: data.ventas,
        ingresos: roundCurrency(data.ingresos),
        porcentaje: divisorPlanes > 0
          ? Math.round((data.ingresos / divisorPlanes) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos || b.ventas - a.ventas)

    // 6. Top Clientes (5 con más asistencias/reservas en el período)
    const clientesStatsMap = new Map<string, { asistencias: number; total: number; nombre: string; email: string }>()

    for (const r of reservas) {
      const cid = r.cliente_id
      if (!cid) continue
      const prev = clientesStatsMap.get(cid) || {
        asistencias: 0,
        total: 0,
        nombre: r.cliente_nombre || '',
        email: r.cliente_email || '',
      }
      prev.total += 1
      if (r.asistencia_confirmada || (r.estado as string) === 'completada' || r.estado === 'finalizada') {
        prev.asistencias += 1
      }
      clientesStatsMap.set(cid, prev)
    }

    const topEntries = Array.from(clientesStatsMap.entries())
      .sort((a, b) => b[1].asistencias - a[1].asistencias || b[1].total - a[1].total)
      .slice(0, 5)

    let topClientes: TopClienteItem[] = []

    if (topEntries.length > 0) {
      const topIds = topEntries.map(([id]) => id)

      const [perfilesTopRes, gamifTopRes] = await Promise.all([
        supabase
          .from('perfiles')
          .select('id, nombre_completo, email, avatar_url')
          .in('id', topIds),
        supabase
          .from('metricas_gamificacion')
          .select('usuario_id, puntos_acumulados')
          .in('usuario_id', topIds),
      ])

      const perfilesMap = new Map((perfilesTopRes.data || []).map((p) => [p.id, p]))
      const xpMap = new Map<string, number>()
      for (const g of gamifTopRes.data || []) {
        const prevXp = xpMap.get(g.usuario_id) || 0
        xpMap.set(g.usuario_id, Math.max(prevXp, Number(g.puntos_acumulados || 0)))
      }

      topClientes = topEntries.map(([id, stats]) => {
        const perf = perfilesMap.get(id)
        return {
          usuarioId: id,
          nombre: perf?.nombre_completo || stats.nombre || 'Cliente',
          email: perf?.email || stats.email || '',
          avatarUrl: perf?.avatar_url || undefined,
          asistencias: stats.asistencias,
          xpTotal: xpMap.get(id) || 0,
        }
      })
    }

    return {
      kpis,
      graficaIngresosReservas: buckets,
      horasPico,
      rendimientoPlanes,
      desgloseEstados,
      topClientes,
    }
  } catch (err) {
    console.warn('[adminService] Error al obtener métricas del dashboard ejecutivo:', err)
    return defaultRespuesta
  }
}

/**
 * Servicio Backend para el Panel Administrativo (Métricas, Control de Clases, Caja y Clientes)
 */
export const adminService = {
  /**
   * Obtiene las métricas consolidadas del Dashboard Administrativo Ejecutivo.
   */
  obtenerMetricasDashboardEjecutivo,

  /**
   * Obtiene series temporales (diarias o mensuales) de ingresos para gráficos administrativos,
   * separando "Ingresos cobrados" (pagos aprobados / ingresos en caja) y
   * "Valor utilizado de planes" (equivalente monetario de créditos consumidos en reservas).
   */
  getEstadisticasIngresos: getEstadisticasIngresosImpl,

  /**
   * Consulta el historial de pagos con filtros opcionales por rango de fechas,
   * método de pago, código (referencia de transacción, QR de reserva o ID) y estado.
   */
  getPagosFiltrados: getPagosFiltradosImpl,
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

      const capacidadObjetivo = claseCreada.capacidad || data.capacidad || 15
      const bicisRes = await bicicletasService.sincronizarCapacidadSala(data.empresaId, capacidadObjetivo)
      if (!bicisRes.success && bicisRes.error) {
        console.warn('No se pudieron sincronizar las bicicletas al crear la clase:', bicisRes.error)
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
  /**
   * Edita los datos de perfil de un cliente perteneciente a la empresa.
   */
  async actualizarCliente(
    clienteId: string,
    empresaId: string,
    data: ActualizarClienteParams
  ): Promise<ServiceResponse<Tables<'perfiles'>>> {
    try {
      if (!clienteId?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'clienteId y empresaId son obligatorios' }
      }

      if (data.nombreCompleto !== undefined && !data.nombreCompleto.trim()) {
        return { data: null, error: 'El nombre completo del cliente no puede estar vacío' }
      }

      const updatePayload: TablesUpdate<'perfiles'> = {
        updated_at: new Date().toISOString(),
      }

      if (data.nombreCompleto !== undefined) {
        updatePayload.nombre_completo = data.nombreCompleto.trim()
      }
      if (data.documento !== undefined) {
        updatePayload.documento = data.documento ? data.documento.trim() : null
      }
      if (data.telefono !== undefined) {
        updatePayload.telefono = data.telefono ? data.telefono.trim() : null
      }
      if (data.email !== undefined) {
        updatePayload.email = data.email.trim().toLowerCase()
      }
      if (data.avatarUrl !== undefined) {
        updatePayload.avatar_url = data.avatarUrl ? data.avatarUrl.trim() : null
      }
      if (data.activo !== undefined) {
        updatePayload.activo = data.activo
      }

      const { data: updated, error } = await supabase
        .from('perfiles')
        .update(updatePayload)
        .eq('id', clienteId)
        .eq('empresa_id', empresaId)
        .eq('rol', 'cliente')
        .select('*')
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!updated) {
        return { data: null, error: 'Cliente no encontrado en esta empresa' }
      }

      return { data: updated, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar datos del cliente'
      return { data: null, error: message }
    }
  },

  /**
   * Lista todas las tiqueteras de un cliente dentro de la empresa para gestión administrativa.
   */
  async getTiqueterasCliente(
    clienteId: string,
    empresaId: string
  ): Promise<ServiceResponse<TiqueteraConPlan[]>> {
    return tiqueterasService.getTiqueterasPorEmpresa(empresaId, clienteId)
  },

  /**
   * Asigna manualmente una tiquetera a un cliente (con créditos y vigencia configurables).
   */
  async asignarTiqueteraManual(
    params: AsignarTiqueteraManualParams
  ): Promise<ServiceResponse<TiqueteraConPlan>> {
    return tiqueterasService.asignarTiqueteraManual(params)
  },

  /**
   * Edita créditos, vigencia, plan o estado de una tiquetera asignada.
   */
  async actualizarTiquetera(
    tiqueteraId: string,
    empresaId: string,
    data: ActualizarTiqueteraParams
  ): Promise<ServiceResponse<TiqueteraConPlan>> {
    return tiqueterasService.actualizarTiquetera(tiqueteraId, empresaId, data)
  },

  /**
   * Elimina una tiquetera de un cliente en la empresa.
   */
  async eliminarTiquetera(
    tiqueteraId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    return tiqueterasService.eliminarTiquetera(tiqueteraId, empresaId)
  },

  /**
   * Lista todos los planes (activos e inactivos) de la empresa.
   */
  async getTodosLosPlanes(empresaId: string): Promise<ServiceResponse<Tables<'planes'>[]>> {
    return tiqueterasService.getTodosLosPlanes(empresaId)
  },

  /**
   * Crea un nuevo plan o paquete de créditos para la empresa.
   */
  async crearPlan(params: CrearPlanParams): Promise<ServiceResponse<Tables<'planes'>>> {
    return tiqueterasService.crearPlan(params)
  },

  /**
   * Edita precio, créditos, vigencia o descripción de un plan existente.
   */
  async actualizarPlan(
    planId: string,
    empresaId: string,
    data: ActualizarPlanParams
  ): Promise<ServiceResponse<Tables<'planes'>>> {
    return tiqueterasService.actualizarPlan(planId, empresaId, data)
  },

  /**
   * Activa o desactiva un plan en el catálogo de la empresa.
   */
  async cambiarEstadoPlan(
    planId: string,
    empresaId: string,
    activo: boolean
  ): Promise<ServiceResponse<Tables<'planes'>>> {
    return tiqueterasService.cambiarEstadoPlan(planId, empresaId, activo)
  },

  /**
   * Elimina un plan de la empresa.
   */
  async eliminarPlan(
    planId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    return tiqueterasService.eliminarPlan(planId, empresaId)
  },

  /**
   * Edita horario, instructor, capacidad o estado de una clase existente.
   */
  async actualizarClase(
    claseId: string,
    empresaId: string,
    data: ActualizarClaseParams
  ): Promise<ServiceResponse<Tables<'clases'>>> {
    return clasesService.actualizarClase(claseId, empresaId, data)
  },

  /**
   * Elimina una clase programada.
   */
  async eliminarClase(
    claseId: string,
    empresaId: string,
    options?: { forzarConCancelacion?: boolean }
  ): Promise<{ success: boolean; error: string | null }> {
    return clasesService.eliminarClase(claseId, empresaId, options)
  },

  /**
   * Lista horarios base de la empresa.
   */
  async getHorariosBase(
    empresaId: string,
    soloActivos?: boolean
  ): Promise<ServiceResponse<Tables<'horarios_base'>[]>> {
    return clasesService.getHorariosBase(empresaId, soloActivos)
  },

  /**
   * Crea un horario base semanal.
   */
  async crearHorarioBase(
    params: CrearHorarioBaseParams
  ): Promise<ServiceResponse<Tables<'horarios_base'>>> {
    return clasesService.crearHorarioBase(params)
  },

  /**
   * Actualiza un horario base semanal.
   */
  async actualizarHorarioBase(
    horarioId: string,
    empresaId: string,
    data: ActualizarHorarioBaseParams
  ): Promise<ServiceResponse<Tables<'horarios_base'>>> {
    return clasesService.actualizarHorarioBase(horarioId, empresaId, data)
  },

  /**
   * Elimina un horario base semanal.
   */
  async eliminarHorarioBase(
    horarioId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    return clasesService.eliminarHorarioBase(horarioId, empresaId)
  },

  /**
   * Registra un movimiento manual de caja (ingreso o egreso) con su concepto/motivo.
   */
  async registrarMovimientoCaja(
    params: RegistrarMovimientoCajaParams
  ): Promise<ServiceResponse<Tables<'movimientos_caja'>>> {
    try {
      const {
        empresaId,
        tipo,
        concepto,
        monto,
        metodo = 'efectivo',
        responsable,
        usuarioId = null,
        reservaId = null,
        pagoId = null,
        fecha,
      } = params

      if (!empresaId?.trim()) {
        return { data: null, error: 'El identificador de empresa es obligatorio' }
      }

      if (tipo !== 'ingreso' && tipo !== 'egreso') {
        return { data: null, error: "El tipo de movimiento debe ser 'ingreso' o 'egreso'" }
      }

      if (!concepto?.trim()) {
        return { data: null, error: 'El motivo o concepto del movimiento es obligatorio' }
      }

      if (!Number.isFinite(monto) || monto <= 0) {
        return { data: null, error: 'El monto del movimiento debe ser mayor a 0' }
      }

      if (!responsable?.trim()) {
        return { data: null, error: 'El responsable del movimiento es obligatorio' }
      }

      const payload: TablesInsert<'movimientos_caja'> = {
        empresa_id: empresaId,
        usuario_id: usuarioId,
        tipo,
        concepto: concepto.trim(),
        monto,
        metodo,
        reserva_id: reservaId,
        pago_id: pagoId,
        responsable: responsable.trim(),
        fecha: fecha || new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('movimientos_caja')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar movimiento de caja'
      return { data: null, error: message }
    }
  },

  /**
   * Elimina un movimiento de caja de la empresa.
   */
  async eliminarMovimientoCaja(
    movimientoId: string,
    empresaId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!movimientoId?.trim() || !empresaId?.trim()) {
        return { success: false, error: 'movimientoId y empresaId son obligatorios' }
      }

      const { data, error } = await supabase
        .from('movimientos_caja')
        .delete()
        .eq('id', movimientoId)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'Movimiento de caja no encontrado para esta empresa' }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar movimiento de caja'
      return { success: false, error: message }
    }
  },

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
