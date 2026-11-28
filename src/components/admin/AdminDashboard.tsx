import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Package,
  AlertTriangle,
  Flame,
  Award,
  Zap,
  Clock,
  Bike,
  LayoutGrid,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import {
  adminService,
  type PeriodoDashboard,
  type MetricasDashboardEjecutivo,
  type PuntoGraficaIngresosReservas,
} from '@/services/adminService'
import type { Tables } from '@/types/database'

export interface AdminDashboardProps {
  onNavigateTab?: (
    tab:
      | 'admin-calendario'
      | 'admin-pagos'
      | 'admin-caja'
      | 'admin-clientes'
      | 'admin-branding'
      | 'admin-planes'
      | 'admin-reservas'
  ) => void
  currentUser?: Tables<'perfiles'> | null
}

const PERIODOS_CONFIG: { id: PeriodoDashboard; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7dias', label: 'Últimos 7 días' },
  { id: '30dias', label: 'Últimos 30 días' },
  { id: '3meses', label: 'Últimos 3 meses' },
]

const PALETA_DONA = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
]

function formatCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function formatFechaEspanol(date: Date = new Date()): string {
  const formatted = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  currentUser,
}) => {
  const { currentPalette, empresaId, studioName, estudioActivo, customPrimaryHex } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)
  const colorPrimarioHex = customPrimaryHex || estudioActivo?.color_primario || '#dc2626'

  const [periodo, setPeriodo] = useState<PeriodoDashboard>('30dias')
  const [metricas, setMetricas] = useState<MetricasDashboardEjecutivo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [hoveredChartPoint, setHoveredChartPoint] = useState<PuntoGraficaIngresosReservas | null>(
    null
  )

  const nombreUsuario = currentUser?.nombre_completo?.split(' ')[0] || 'Administrador'

  const cargarMetricas = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const data = await adminService.obtenerMetricasDashboardEjecutivo(empresaId, periodo)
        setMetricas(data)
      } catch (err) {
        console.error('Error cargando métricas ejecutivas:', err)
        toast({
          variant: 'destructive',
          title: 'Error al actualizar métricas',
          description: 'No se pudieron sincronizar las estadísticas ejecutivas.',
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [empresaId, periodo]
  )

  useEffect(() => {
    void cargarMetricas()
  }, [cargarMetricas])

  const handleRefreshManual = () => {
    setRefreshing(true)
    void cargarMetricas(true)
  }

  // Cálculos auxiliares para Gráfica 1 (Ingresos y Reservas)
  const maxIngresoPunto = useMemo(() => {
    if (!metricas?.graficaIngresosReservas?.length) return 1
    return Math.max(1, ...metricas.graficaIngresosReservas.map((p) => p.ingresos))
  }, [metricas?.graficaIngresosReservas])

  const maxReservasPunto = useMemo(() => {
    if (!metricas?.graficaIngresosReservas?.length) return 1
    return Math.max(1, ...metricas.graficaIngresosReservas.map((p) => p.reservas))
  }, [metricas?.graficaIngresosReservas])

  // Cálculos auxiliares para Gráfica 2 (Horas Pico)
  const maxReservasHora = useMemo(() => {
    if (!metricas?.horasPico?.length) return 1
    return Math.max(1, ...metricas.horasPico.map((h) => h.reservas))
  }, [metricas?.horasPico])

  // Cálculos auxiliares para Gráfica 3 (Donut SVG de Planes)
  const totalIngresosPlanes = useMemo(() => {
    if (!metricas?.rendimientoPlanes?.length) return 0
    return metricas.rendimientoPlanes.reduce((acc, p) => acc + p.ingresos, 0)
  }, [metricas?.rendimientoPlanes])

  const totalVentasPlanes = useMemo(() => {
    if (!metricas?.rendimientoPlanes?.length) return 0
    return metricas.rendimientoPlanes.reduce((acc, p) => acc + p.ventas, 0)
  }, [metricas?.rendimientoPlanes])

  // Donut SVG Slices
  const donutSlices = useMemo(() => {
    if (!metricas?.rendimientoPlanes?.length) return []
    const radio = 50
    const circunferencia = 2 * Math.PI * radio
    let acumuladoPct = 0

    return metricas.rendimientoPlanes.map((plan, idx) => {
      const pct = (plan.porcentaje || 0) / 100
      const strokeDasharray = `${pct * circunferencia} ${circunferencia}`
      const strokeDashoffset = -acumuladoPct * circunferencia
      acumuladoPct += pct
      const color = PALETA_DONA[idx % PALETA_DONA.length]

      return {
        ...plan,
        color,
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [metricas?.rendimientoPlanes])

  // Cálculos para Gráfica 4 (Desglose de Estados)
  const totalEstados = useMemo(() => {
    if (!metricas?.desgloseEstados) return 0
    const { confirmadas, asistidas, pendientes, canceladas } = metricas.desgloseEstados
    return confirmadas + asistidas + pendientes + canceladas
  }, [metricas?.desgloseEstados])

  const kpis = metricas?.kpis || {
    ingresosTotal: 0,
    ingresosVariacion: 0,
    reservasTotal: 0,
    tasaAsistencia: 0,
    ocupacionPromedio: 0,
    clientesActivos: 0,
    tiqueterasVigentes: 0,
    planesPorVencer: 0,
  }

  const esEstudioNuevo =
    kpis.ingresosTotal === 0 &&
    kpis.reservasTotal === 0 &&
    kpis.clientesActivos === 0 &&
    !loading

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* =========================================================================
          1. ENCABEZADO EJECUTIVO Y SELECTOR GLOBAL DE PERÍODO
      ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Hola, {nombreUsuario} 👋
            </h1>
            <Badge
              variant="secondary"
              className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20"
            >
              {studioName}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>{formatFechaEspanol()}</span>
            <span>•</span>
            <span>Rendimiento ejecutivo y control operativo en tiempo real.</span>
          </p>
        </div>

        {/* Controles de Período y Refresco */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border/70 shadow-2xs">
            {PERIODOS_CONFIG.map((p) => {
              const isSelected = periodo === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodo(p.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? `${currentPalette.bgClass} text-white shadow-xs`
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshManual}
            disabled={refreshing || loading}
            className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-xl border-border/80 shadow-2xs cursor-pointer"
            title="Sincronizar métricas"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin text-primary' : ''}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. FILA DE 4 TARJETAS KPI CON TENDENCIAS
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingresos Recaudados */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ingresos Recaudados
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {formatCOP(kpis.ingresosTotal)}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold px-1.5 py-0 h-4.5 gap-1 ${
                      kpis.ingresosVariacion >= 0
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {kpis.ingresosVariacion >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {kpis.ingresosVariacion >= 0 ? '+' : ''}
                      {kpis.ingresosVariacion}%
                    </span>
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">vs período anterior</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 2: Reservas y Tasa de Asistencia */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reservas & Asistencia
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {kpis.reservasTotal} <span className="text-xs font-semibold text-muted-foreground">reservas</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-blue-500" />
                      Asistencia efectiva:
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {kpis.tasaAsistencia}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, kpis.tasaAsistencia)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Ocupación de Capacidad */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ocupación de Capacidad
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              {verticalConfig.showBicycleMap ? (
                <Bike className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {kpis.ocupacionPromedio}%
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-1.5 py-0 h-4.5 ${
                      kpis.ocupacionPromedio >= 75
                        ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                        : kpis.ocupacionPromedio >= 40
                        ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                        : 'border-blue-500/30 text-blue-600 bg-blue-500/10'
                    }`}
                  >
                    {kpis.ocupacionPromedio >= 75
                      ? 'Alta Demanda'
                      : kpis.ocupacionPromedio >= 40
                      ? 'Ocupación Media'
                      : 'Capacidad Disponible'}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground truncate">
                    aforo por sesión
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: Clientes Activos y Renovaciones */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Clientes & Renovaciones
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {kpis.clientesActivos}{' '}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {verticalConfig.clientePlural.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] flex-wrap">
                  <span className="text-muted-foreground">
                    {kpis.tiqueterasVigentes} tiqueteras vigentes
                  </span>
                  {kpis.planesPorVencer > 0 ? (
                    <Badge
                      variant="destructive"
                      className="text-[10px] font-bold px-1.5 py-0 h-4.5 gap-1 animate-pulse"
                      title="Planes con 2 créditos o menos restantes"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>{kpis.planesPorVencer} por vencer</span>
                    </Badge>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      Saldos al día
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
          3. SECCIÓN DE 4 GRÁFICAS VISUALES INTERACTIVAS
      ========================================================================= */}

      {/* ESTADO VACÍO ELEGANTE SI NO HAY MOVIMIENTOS */}
      {esEstudioNuevo ? (
        <Card className="border-dashed border-2 border-border/80 bg-muted/20 p-8 sm:p-12 text-center rounded-2xl">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-foreground">
                ¡Tu estudio {studioName} está listo para despegar!
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Aún no registras reservas ni pagos en este período. Configura tus horarios base,
                agrega planes y comparte el link público de tu estudio para recibir a tus primeros alumnos.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {onNavigateTab && (
                <>
                  <Button
                    type="button"
                    onClick={() => onNavigateTab('admin-reservas')}
                    className="font-bold text-xs gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Programar Clases</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onNavigateTab('admin-planes')}
                    className="font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Configurar Planes</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* FILA SUPERIOR DE GRÁFICAS: 1 (Ingresos & Reservas en el Tiempo) + 2 (Horarios de Demanda) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GRÁFICA 1: Evolución cronológica de Ingresos y Reservas (7 cols) */}
            <Card className="lg:col-span-7 border-border/80 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Evolución de Ingresos y Volumen de Reservas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparativa cronológica de pagos recibidos vs asistencia en el período seleccionado.
                  </CardDescription>
                </div>

                {/* Leyenda interactiva */}
                <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                    <span className="text-muted-foreground text-[11px]">Ingresos ($)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground text-[11px]">Reservas</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-4 flex-1 flex flex-col justify-between">
                {/* Visualizador de punto hovered */}
                <div className="h-6 mb-2 flex items-center justify-between text-xs">
                  {hoveredChartPoint ? (
                    <div className="flex items-center gap-3 animate-in fade-in">
                      <span className="font-bold text-foreground">
                        {hoveredChartPoint.label}:
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCOP(hoveredChartPoint.ingresos)}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {hoveredChartPoint.reservas} {verticalConfig.sesionPlural.toLowerCase()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      Pasa el cursor por las barras para ver detalles por fecha
                    </span>
                  )}
                </div>

                {/* Área de Gráfica SVG Reactiva */}
                <div className="relative h-56 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-border/60">
                  {metricas?.graficaIngresosReservas?.map((punto, idx) => {
                    const alturaIngresoPct = Math.max(
                      6,
                      Math.round((punto.ingresos / maxIngresoPunto) * 100)
                    )
                    const alturaReservaPct = Math.max(
                      8,
                      Math.round((punto.reservas / maxReservasPunto) * 100)
                    )
                    const isHovered = hoveredChartPoint?.fecha === punto.fecha

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredChartPoint(punto)}
                        onMouseLeave={() => setHoveredChartPoint(null)}
                        className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                      >
                        {/* Indicador de reserva (Punto flotante azul) */}
                        {punto.reservas > 0 && (
                          <div
                            className="absolute z-20 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-background transition-transform group-hover:scale-150"
                            style={{ bottom: `${alturaReservaPct}%` }}
                            title={`${punto.reservas} reservas`}
                          />
                        )}

                        {/* Barra de ingresos con gradiente */}
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                            isHovered
                              ? 'bg-emerald-500 brightness-110 shadow-md shadow-emerald-500/20'
                              : 'bg-emerald-500/80 hover:bg-emerald-500'
                          }`}
                          style={{ height: `${alturaIngresoPct}%` }}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Eje X Etiquetas */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 font-mono">
                  {metricas?.graficaIngresosReservas
                    ?.filter((_, i) => i % Math.ceil((metricas.graficaIngresosReservas.length || 1) / 7) === 0)
                    .map((p, i) => (
                      <span key={i} className="truncate max-w-[60px]">
                        {p.label}
                      </span>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* GRÁFICA 2: Horarios de Mayor Demanda / Horas Pico (5 cols) */}
            <Card className="lg:col-span-5 border-border/80 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Horarios de Mayor Demanda
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Distribución de cupos reservados por franja horaria.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[11px] font-bold text-red-500">Horas Pico</span>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-4 flex-1 flex flex-col justify-between">
                {metricas?.horasPico?.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <Clock className="w-8 h-8 opacity-20 mb-2" />
                    <span>Sin registros de asistencia en los horarios</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-48 w-full flex items-end gap-1.5 sm:gap-2 border-b border-border/60 pb-1">
                      {metricas?.horasPico?.map((franja, idx) => {
                        const alturaPct = Math.max(
                          8,
                          Math.round((franja.reservas / maxReservasHora) * 100)
                        )
                        return (
                          <div
                            key={idx}
                            className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                            title={`${franja.hora} - ${franja.reservas} reservas${
                              franja.esPico ? ' (Hora Pico)' : ''
                            }`}
                          >
                            {franja.esPico && (
                              <div className="mb-1 text-red-500 animate-bounce">
                                <Flame className="w-3 h-3 fill-red-500" />
                              </div>
                            )}

                            <div
                              className={`w-full max-w-[24px] rounded-t-md transition-all duration-300 ${
                                franja.esPico
                                  ? `${currentPalette.bgClass} shadow-md`
                                  : 'bg-muted hover:bg-muted-foreground/30'
                              }`}
                              style={{
                                height: `${alturaPct}%`,
                                backgroundColor: franja.esPico ? colorPrimarioHex : undefined,
                              }}
                            />
                            <span className="text-[9px] text-muted-foreground mt-1 font-mono">
                              {franja.hora.slice(0, 2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Franja mañana (06:00 - 11:00)</span>
                      <span>Franja tarde (17:00 - 21:00)</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FILA INFERIOR DE GRÁFICAS: 3 (Rendimiento por Plan Donut) + 4 (Estados & Top Clientes) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GRÁFICA 3: Rendimiento por Plan / Servicio (5 cols) */}
            <Card className="lg:col-span-5 border-border/80 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    Ventas por Plan / Tiquetera
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Contribución porcentual de cada plan a los ingresos ({formatCOP(totalIngresosPlanes)} recaudados).
                  </CardDescription>
                </div>
                {onNavigateTab && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab('admin-planes')}
                    className="h-8 text-xs font-semibold gap-1 text-primary cursor-pointer"
                  >
                    <span>Planes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-4 flex-1">
                {donutSlices.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <Package className="w-8 h-8 opacity-20 mb-2" />
                    <span>No hay ventas de planes en este período</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Donut SVG con Centro Informativo */}
                    <div className="relative w-40 h-40 shrink-0">
                      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                        {donutSlices.map((slice, idx) => (
                          <circle
                            key={idx}
                            cx="70"
                            cy="70"
                            r="50"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="20"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            className="transition-all duration-500 hover:opacity-80"
                          />
                        ))}
                      </svg>
                      {/* Centro del Anillo */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                          Total Ventas
                        </span>
                        <span className="text-base font-black text-foreground">
                          {totalVentasPlanes}
                        </span>
                      </div>
                    </div>

                    {/* Leyenda de Planes */}
                    <div className="flex-1 w-full space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {donutSlices.map((plan, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: plan.color }}
                            />
                            <span className="font-semibold text-foreground truncate max-w-[130px]" title={plan.nombre}>
                              {plan.nombre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-right shrink-0">
                            <Badge variant="outline" className="text-[10px] py-0 h-4 font-bold">
                              {plan.porcentaje}%
                            </Badge>
                            <span className="font-bold text-foreground text-xs">
                              {formatCOP(plan.ingresos)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GRÁFICA 4: Desglose de Estados & Top 5 Clientes (7 cols) */}
            <Card className="lg:col-span-7 border-border/80 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Estado de Reservas & Top {verticalConfig.clientePlural}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cumplimiento de reservas y clientes más activos con más asistencias del período.
                  </CardDescription>
                </div>
                {onNavigateTab && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab('admin-clientes')}
                    className="h-8 text-xs font-semibold gap-1 text-primary cursor-pointer"
                  >
                    <span>Ver Todos</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-4 space-y-5 flex-1">
                {/* A. Micro Barras de Estados de Reserva */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Desglose Operativo ({totalEstados} reservas)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                      {kpis.tasaAsistencia}% validadas
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Confirmadas */}
                    <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-left">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block uppercase">
                        Confirmadas
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {metricas?.desgloseEstados.confirmadas || 0}
                      </span>
                    </div>

                    {/* Asistidas */}
                    <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-left">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">
                        Asistidas (QR)
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {metricas?.desgloseEstados.asistidas || 0}
                      </span>
                    </div>

                    {/* Pendientes */}
                    <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-left">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">
                        Pendientes
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {metricas?.desgloseEstados.pendientes || 0}
                      </span>
                    </div>

                    {/* Canceladas */}
                    <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-left">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block uppercase">
                        Canceladas
                      </span>
                      <span className="text-lg font-black text-foreground">
                        {metricas?.desgloseEstados.canceladas || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* B. Ranking Top 5 Clientes */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Ranking de Asistencias del Período</span>
                    <span className="text-amber-500 flex items-center gap-1 font-semibold">
                      <Zap className="w-3 h-3" /> Gamificación XP
                    </span>
                  </div>

                  {metricas?.topClientes?.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No hay clientes con asistencias validadas en este período.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {metricas?.topClientes?.slice(0, 5).map((cliente, idx) => (
                        <div
                          key={cliente.usuarioId || idx}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Posición Medalla */}
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                                  : idx === 1
                                  ? 'bg-slate-300 dark:bg-slate-700 text-foreground'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {idx + 1}
                            </span>

                            {/* Avatar */}
                            {cliente.avatarUrl ? (
                              <img
                                src={cliente.avatarUrl}
                                alt={cliente.nombre}
                                className="w-7 h-7 rounded-full object-cover shrink-0 border"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                                {cliente.nombre.charAt(0)}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                                {cliente.nombre}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">
                                {cliente.email}
                              </p>
                            </div>
                          </div>

                          {/* Asistencias y XP */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0"
                            >
                              {cliente.asistencias} asistencias
                            </Badge>
                            {cliente.xpTotal > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold px-2 py-0.5 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono"
                              >
                                {cliente.xpTotal} XP
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
