import React, { useState, useEffect, useCallback } from 'react'
import {
  Bike,
  Calendar,
  CalendarCheck,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Palette,
  ArrowLeftRight,
  Banknote,
  Package,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import { IncomeBarChart } from '@/components/admin/IncomeBarChart'
import {
  adminService,
  type DashboardMetricas,
  type ClaseAdminDetalle,
} from '@/services/adminService'
import { clasesService } from '@/services/clasesService'
import { tiqueterasService } from '@/services/tiqueterasService'

interface AdminDashboardProps {
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
}

interface ExtendedDashboardStats {
  totalReservasMes: number
  pagosVerificadosTotal: number
  pagosVerificadosCount: number
  pagosTransferenciaTotal: number
  pagosTransferenciaCount: number
  pagosEfectivoTotal: number
  pagosEfectivoCount: number
  planesActivosCount: number
  tiqueterasActivasCount: number
  ingresosPlanesTotal: number
}

const emptyMetricas: DashboardMetricas = {
  ingresosHoy: 0,
  ingresosMes: 0,
  ocupacionPromedio: 0,
  totalClasesActivas: 0,
  totalClientesActivos: 0,
  pagosPendientesCount: 0,
}

const emptyExtendedStats: ExtendedDashboardStats = {
  totalReservasMes: 0,
  pagosVerificadosTotal: 0,
  pagosVerificadosCount: 0,
  pagosTransferenciaTotal: 0,
  pagosTransferenciaCount: 0,
  pagosEfectivoTotal: 0,
  pagosEfectivoCount: 0,
  planesActivosCount: 0,
  tiqueterasActivasCount: 0,
  ingresosPlanesTotal: 0,
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const { currentPalette, empresaId, studioName } = useBranding()

  const [metricas, setMetricas] = useState<DashboardMetricas>(emptyMetricas)
  const [extendedStats, setExtendedStats] = useState<ExtendedDashboardStats>(emptyExtendedStats)
  const [clases, setClases] = useState<ClaseAdminDetalle[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState<number>(0)

  const cargarDatos = useCallback(async () => {
    setErrorMsg(null)
    try {
      const now = new Date()
      const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const finMesDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const finMes = `${finMesDate.getFullYear()}-${String(finMesDate.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(finMesDate.getDate()).padStart(2, '0')}`

      const [metRes, clasesRes, clasesMesRes, pagosAprobadosRes, planesRes, tiqueterasRes] =
        await Promise.all([
          adminService.getDashboardMetricas(empresaId),
          adminService.getClasesAdmin(empresaId),
          clasesService.getClasesByRangoFechas(empresaId, inicioMes, finMes),
          adminService.getPagosFiltrados(empresaId, { estado: 'aprobado' }),
          adminService.getTodosLosPlanes(empresaId),
          tiqueterasService.getTiqueterasPorEmpresa(empresaId),
        ])

      const errors = [
        metRes.error,
        clasesRes.error,
        clasesMesRes.error,
        pagosAprobadosRes.error,
        planesRes.error,
        tiqueterasRes.error,
      ].filter(Boolean)

      if (errors.length > 0) {
        const message = errors[0] || 'Error parcial al consultar métricas administrativas'
        setErrorMsg(message)
        toast({
          variant: 'destructive',
          title: 'Error cargando métricas',
          description: message,
        })
      }

      if (metRes.data) {
        setMetricas(metRes.data)
      }

      if (clasesRes.data) {
        setClases(clasesRes.data)
      }

      const totalReservasMes = (clasesMesRes.data || []).reduce(
        (acc, c) => acc + (c.cuposOcupados || 0),
        0
      )

      const pagosAprobados = pagosAprobadosRes.data || []
      let pagosVerificadosTotal = 0
      let pagosTransferenciaTotal = 0
      let pagosTransferenciaCount = 0
      let pagosEfectivoTotal = 0
      let pagosEfectivoCount = 0
      let ingresosPlanesTotal = 0

      for (const p of pagosAprobados) {
        const monto = Number(p.monto || 0)
        pagosVerificadosTotal += monto

        if (p.metodo === 'efectivo') {
          pagosEfectivoTotal += monto
          pagosEfectivoCount += 1
        } else {
          pagosTransferenciaTotal += monto
          pagosTransferenciaCount += 1
        }

        if (p.plan_id) {
          ingresosPlanesTotal += monto
        }
      }

      const planesActivosCount = (planesRes.data || []).filter((pl) => pl.activo).length
      const tiqueterasActivasCount = (tiqueterasRes.data || []).filter(
        (t) => t.estado === 'activa' && t.creditos_disponibles > 0
      ).length

      setExtendedStats({
        totalReservasMes,
        pagosVerificadosTotal,
        pagosVerificadosCount: pagosAprobados.length,
        pagosTransferenciaTotal,
        pagosTransferenciaCount,
        pagosEfectivoTotal,
        pagosEfectivoCount,
        planesActivosCount,
        tiqueterasActivasCount,
        ingresosPlanesTotal,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al cargar dashboard'
      setErrorMsg(msg)
      toast({
        variant: 'destructive',
        title: 'Error de conexión',
        description: msg,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [empresaId])

  useEffect(() => {
    setLoading(true)
    cargarDatos()
  }, [cargarDatos])

  const handleManualRefresh = () => {
    setRefreshing(true)
    setRefreshTick((t) => t + 1)
    cargarDatos()
  }

  const formatCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado del Dashboard Ejecutivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">Panel de Control General</h1>
            <Badge variant="secondary" className="text-xs font-mono">
              {studioName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoreo en tiempo real de reservas, clientes, ocupación de sala, pagos verificados y planes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-xs gap-1.5 h-8 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar Métricas</span>
          </Button>

          <Badge variant="outline" className="text-xs py-1 px-2.5 font-mono">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </Badge>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleManualRefresh} className="h-7 text-xs">
            Reintentar
          </Button>
        </div>
      )}

      {/* 8 KPIs Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Reservas */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className={`absolute top-0 left-0 right-0 h-1 ${currentPalette.bgClass}`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reservas (Mes)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {extendedStats.totalReservasMes}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cupos reservados en sesiones del mes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 2: Clientes */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Clientes
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {metricas.totalClientesActivos}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ciclistas activos registrados
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Clases programadas */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Clases Programadas
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {metricas.totalClasesActivas}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sesiones activas desde hoy
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: % Ocupación del mes */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              % Ocupación del Mes
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {metricas.ocupacionPromedio}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Promedio mensual sobre capacidad</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 5: Pagos verificados total */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pagos Verificados Total
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCOP(extendedStats.pagosVerificadosTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {extendedStats.pagosVerificadosCount} aprobados • Hoy:{' '}
                    <strong>{formatCOP(metricas.ingresosHoy)}</strong>
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 6: Transferencia */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Transferencia
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {formatCOP(extendedStats.pagosTransferenciaTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {extendedStats.pagosTransferenciaCount} pagos (Nequi / Bancolombia / Wompi)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 7: Efectivo */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Efectivo
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
                  {formatCOP(extendedStats.pagosEfectivoTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {extendedStats.pagosEfectivoCount} pagos verificados en recepción
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 8: Planes */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Planes
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {extendedStats.planesActivosCount} activos
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {extendedStats.tiqueterasActivasCount} tiqueteras vigentes •{' '}
                  <strong>{formatCOP(extendedStats.ingresosPlanesTotal)}</strong>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico interactivo de barras con pestañas Semana / Mes / Año */}
      <IncomeBarChart empresaId={empresaId} refreshTrigger={refreshTick} />

      {/* Grid Central: Clases Programadas & Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 border-b">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className={`w-4 h-4 ${currentPalette.textClass}`} />
                Clases y Ocupación de las 15 Bicicletas
              </CardTitle>
              <CardDescription className="text-xs">
                Sesiones programadas vigentes y disponibilidad de cupos en vivo.
              </CardDescription>
            </div>
            {onNavigateTab && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onNavigateTab('admin-calendario')}
                className="text-xs font-semibold gap-1 h-8"
              >
                <span>Ver Calendario</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : clases.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Calendar className="w-8 h-8 mx-auto opacity-30" />
                <p>No hay clases activas programadas desde hoy en la base de datos.</p>
                {onNavigateTab && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateTab('admin-calendario')}
                    className="text-xs"
                  >
                    Ir a Horarios y Clases
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y text-sm">
                {clases.slice(0, 8).map((clase) => {
                  const ocupados = clase.cuposOcupados || 0
                  const capacidad = clase.capacidadTotal || 15
                  const pct = Math.min(100, Math.round((ocupados / capacidad) * 100))
                  const isFull = ocupados >= capacidad

                  return (
                    <div
                      key={clase.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                          <span>{clase.titulo}</span>
                          <Badge
                            variant={
                              clase.estado === 'en_curso'
                                ? 'default'
                                : isFull
                                ? 'destructive'
                                : 'success'
                            }
                            className="capitalize text-[10px]"
                          >
                            {isFull ? `Sold Out (${capacidad}/${capacidad})` : clase.estado}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span className="font-mono">{clase.fecha}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {clase.hora_inicio?.slice(0, 5)} - {clase.hora_fin?.slice(0, 5)} hrs
                          </span>
                          <span>•</span>
                          <span>Capacidad: {capacidad} Puestos</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right">
                        <div className="space-y-1 min-w-[110px]">
                          <div className="text-xs font-bold text-foreground">
                            {ocupados} / {capacidad} bicis ({pct}%)
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFull ? 'bg-rose-500' : currentPalette.bgClass
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {onNavigateTab && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateTab('admin-calendario')}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Detalle
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha: Acciones Operativas Rápidas */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${currentPalette.textClass}`} />
              Módulos de Administración
            </CardTitle>
            <CardDescription className="text-xs">
              Accesos directos a las operaciones del estudio.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {onNavigateTab && (
              <>
                <Button
                  type="button"
                  onClick={() => onNavigateTab('admin-calendario')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Horarios, Clases y Escáner QR</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => onNavigateTab('admin-pagos')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  <div className="flex justify-between items-center w-full">
                    <span>Validación de Pagos</span>
                    {metricas.pagosPendientesCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                        {metricas.pagosPendientesCount}
                      </Badge>
                    )}
                  </div>
                </Button>

                <Button
                  type="button"
                  onClick={() => onNavigateTab('admin-planes')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Package className="w-4 h-4 text-amber-500" />
                  <span>Gestión de Planes y Paquetes</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => onNavigateTab('admin-caja')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Arqueo y Cierre de Caja Diario</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => onNavigateTab('admin-clientes')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>Clientes y Tiqueteras</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => onNavigateTab('admin-branding')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Palette className="w-4 h-4 text-primary" />
                  <span>Personalizar Marca Blanca</span>
                </Button>
              </>
            )}

            <div className="p-3 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground space-y-1 mt-4">
              <div className="font-bold text-foreground">Regla de Bloqueo Concurrente:</div>
              <p>
                Cada reserva ejecuta una transacción SQL con bloqueo en PostgreSQL, garantizando 0 sobre-reservas en la flota de 15 bicis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default AdminDashboard
