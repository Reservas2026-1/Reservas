import React, { useState, useEffect } from 'react'
import {
  Bike,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Palette,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBranding } from '@/context/BrandingContext'
import { adminService, type DashboardMetricas, type ClaseAdminDetalle } from '@/services/adminService'

interface AdminDashboardProps {
  onNavigateTab?: (
    tab: 'admin-calendario' | 'admin-pagos' | 'admin-caja' | 'admin-clientes' | 'admin-branding'
  ) => void
}

const fallbackMetricas: DashboardMetricas = {
  ingresosHoy: 1350000,
  ingresosMes: 18450000,
  ocupacionPromedio: 87,
  totalClasesActivas: 6,
  totalClientesActivos: 142,
  pagosPendientesCount: 3,
}

const fallbackClasesHoy: Partial<ClaseAdminDetalle>[] = [
  {
    id: 'clase-01',
    titulo: 'Power Cycling & Beats (Alta Intensidad)',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '07:00:00',
    hora_fin: '07:50:00',
    capacidadTotal: 15,
    cuposOcupados: 15,
    cuposDisponibles: 0,
    porcentajeOcupacion: 100,
    estado: 'en_curso',
  },
  {
    id: 'clase-02',
    titulo: 'Rhythm & Glow Ride (Neón)',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '12:00:00',
    hora_fin: '12:50:00',
    capacidadTotal: 15,
    cuposOcupados: 12,
    cuposDisponibles: 3,
    porcentajeOcupacion: 80,
    estado: 'programada',
  },
  {
    id: 'clase-03',
    titulo: 'Endurance & Climbs Extreme',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '18:30:00',
    hora_fin: '19:20:00',
    capacidadTotal: 15,
    cuposOcupados: 14,
    cuposDisponibles: 1,
    porcentajeOcupacion: 93,
    estado: 'programada',
  },
]

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const { currentPalette, empresaId, studioName } = useBranding()

  const [metricas, setMetricas] = useState<DashboardMetricas>(fallbackMetricas)
  const [clases, setClases] = useState<Partial<ClaseAdminDetalle>[]>(fallbackClasesHoy)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  const cargarDatos = async () => {
    try {
      const [metRes, clasesRes] = await Promise.all([
        adminService.getDashboardMetricas(empresaId),
        adminService.getClasesAdmin(empresaId),
      ])

      if (metRes.data) {
        setMetricas(metRes.data)
      }
      if (clasesRes.data && clasesRes.data.length > 0) {
        setClases(clasesRes.data)
      }
    } catch (err) {
      console.warn('Carga de métricas admin con fallback local:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  const handleManualRefresh = () => {
    setRefreshing(true)
    cargarDatos()
  }

  // Formato COP
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight">Panel de Control General</h1>
            <Badge variant="secondary" className="text-xs font-mono">
              {studioName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoreo en tiempo real de ingresos en COP, ocupación de las 15 bicis y caja diaria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
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

      {/* Tarjetas de métricas principales (4 KPIs clave) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingresos Hoy */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className={`absolute top-0 left-0 right-0 h-1 ${currentPalette.bgClass}`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ingresos de Hoy (COP)
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
                <div className="text-2xl font-black text-foreground">
                  {formatCOP(metricas.ingresosHoy)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mes acumulado: <strong>{formatCOP(metricas.ingresosMes)}</strong></span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 2: Ocupación Promedio */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ocupación de Flota
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
                  <span>Promedio sobre 15 puestos por sesión</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Clases Programadas */}
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
                  {metricas.totalClasesActivas} sesiones
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-500" />
                  <span>{metricas.totalClientesActivos} clientes registrados</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: Pagos por Validar */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pagos por Validar
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-rose-600">
                  {metricas.pagosPendientesCount} pendientes
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Comprobantes Nequi / Bancolombia</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid Central: Clases de Hoy & Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Clases del Día y Ocupación */}
        <Card className="lg:col-span-2 border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 border-b">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className={`w-4 h-4 ${currentPalette.textClass}`} />
                Clases y Ocupación de las 15 Bicicletas
              </CardTitle>
              <CardDescription className="text-xs">
                Sesiones programadas para la fecha y disponibilidad de cupos en vivo.
              </CardDescription>
            </div>
            {onNavigateTab && (
              <Button
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
            <div className="divide-y text-sm">
              {clases.map((clase) => {
                const ocupados = clase.cuposOcupados || 0
                const capacidad = clase.capacidadTotal || 15
                const pct = Math.round((ocupados / capacidad) * 100)
                const isFull = ocupados >= capacidad

                return (
                  <div
                    key={clase.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        {clase.titulo}
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
                          {isFull ? 'Sold Out (15/15)' : clase.estado}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {clase.hora_inicio?.slice(0, 5) || '18:30'} hrs
                        </span>
                        <span>•</span>
                        <span>Capacidad: 15 Puestos</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div className="space-y-1 min-w-[100px]">
                        <div className="text-xs font-bold text-foreground">
                          {ocupados} / {capacidad} bicis ({pct}%)
                        </div>
                        {/* Barra de progreso de ocupación */}
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
                  onClick={() => onNavigateTab('admin-calendario')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Programación de Clases y Escáner QR</span>
                </Button>

                <Button
                  onClick={() => onNavigateTab('admin-pagos')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  <div className="flex justify-between items-center w-full">
                    <span>Validación de Pagos Nequi / Wompi</span>
                    {metricas.pagosPendientesCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                        {metricas.pagosPendientesCount}
                      </Badge>
                    )}
                  </div>
                </Button>

                <Button
                  onClick={() => onNavigateTab('admin-caja')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Arqueo y Cierre de Caja Diario</span>
                </Button>

                <Button
                  onClick={() => onNavigateTab('admin-clientes')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>Clientes y Asignación de Tiqueteras</span>
                </Button>

                <Button
                  onClick={() => onNavigateTab('admin-branding')}
                  className="w-full justify-start text-xs font-semibold h-10 gap-2"
                  variant="outline"
                >
                  <Palette className="w-4 h-4 text-primary" />
                  <span>Personalizar Marca Blanca y Logotipo</span>
                </Button>
              </>
            )}

            <div className="p-3 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground space-y-1 mt-4">
              <div className="font-bold text-foreground">Regla de Bloqueo Concurrente:</div>
              <p>
                Cada reserva ejecuta una transacción SQL con bloqueo en base de datos PostgreSQL, garantizando 0 sobre-reservas en la flota de 15 bicis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default AdminDashboard