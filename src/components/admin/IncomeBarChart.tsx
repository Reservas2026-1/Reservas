import React, { useState, useEffect, useCallback } from 'react'
import { BarChart3, Loader2, RefreshCw, AlertCircle, TrendingUp, Ticket } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import {
  adminService,
  type PeriodoEstadisticas,
  type EstadisticasIngresosResumen,
  type PuntoEstadisticaIngresos,
} from '@/services/adminService'

interface IncomeBarChartProps {
  empresaId?: string
  refreshTrigger?: number
}

const PERIOD_TABS: Array<{ id: PeriodoEstadisticas; label: string }> = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Año' },
]

export const IncomeBarChart: React.FC<IncomeBarChartProps> = ({
  empresaId: propEmpresaId,
  refreshTrigger = 0,
}) => {
  const { empresaId: ctxEmpresaId, currentPalette } = useBranding()
  const activeEmpresaId = propEmpresaId || ctxEmpresaId

  const [periodo, setPeriodo] = useState<PeriodoEstadisticas>('semana')
  const [estadisticas, setEstadisticas] = useState<EstadisticasIngresosResumen | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<PuntoEstadisticaIngresos | null>(null)

  const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)

  const cargarEstadisticas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminService.getEstadisticasIngresos(activeEmpresaId, periodo)
      if (res.error || !res.data) {
        const msg = res.error || 'No se pudieron obtener las estadísticas de ingresos'
        setError(msg)
        setEstadisticas(null)
        toast({
          variant: 'destructive',
          title: 'Error en gráfico de ingresos',
          description: msg,
        })
      } else {
        setEstadisticas(res.data)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión al cargar gráfico'
      setError(msg)
      setEstadisticas(null)
      toast({
        variant: 'destructive',
        title: 'Error en gráfico de ingresos',
        description: msg,
      })
    } finally {
      setLoading(false)
    }
  }, [activeEmpresaId, periodo])

  useEffect(() => {
    cargarEstadisticas()
  }, [cargarEstadisticas, refreshTrigger])

  const series = estadisticas?.series || []
  const maxValor = Math.max(
    1,
    ...series.map((s) => Math.max(s.ingresosCobrados, s.valorUtilizadoPlanes))
  )

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="p-5 pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className={`w-4 h-4 ${currentPalette.textClass}`} />
            <span>Análisis de Ingresos y Consumo de Planes</span>
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Comparativa entre ingresos reales cobrados y valor equivalente de créditos consumidos.
          </CardDescription>
        </div>

        {/* Pestañas Semana / Mes / Año */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border self-start sm:self-auto">
          {PERIOD_TABS.map((tab) => {
            const active = periodo === tab.id
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'ghost'}
                onClick={() => setPeriodo(tab.id)}
                className={`h-7 px-3 text-xs font-bold transition-all ${
                  active ? `${currentPalette.bgClass} text-white shadow-xs` : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Resumen superior del período */}
        {estadisticas && !loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Ingresos Cobrados
                </p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatCOP(estadisticas.totalIngresosCobrados)}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Valor Utilizado Planes
                </p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {formatCOP(estadisticas.totalValorUtilizadoPlanes)}
                </p>
              </div>
              <Ticket className="w-5 h-5 text-blue-500" />
            </div>

            <div className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Rango ({estadisticas.granularidad})
                </p>
                <p className="text-xs font-mono font-bold text-foreground mt-1">
                  {estadisticas.fechaInicio} → {estadisticas.fechaFin}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">
                {periodo === 'anio' ? 'Año' : periodo}
              </Badge>
            </div>
          </div>
        )}

        {/* Leyenda y detalle interactivo */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-xs ${currentPalette.bgClass}`} />
              <span className="font-medium text-muted-foreground">Ingresos Cobrados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-500/80" />
              <span className="font-medium text-muted-foreground">Valor Utilizado Planes</span>
            </div>
          </div>

          {hoveredItem && (
            <div className="text-[11px] font-mono bg-muted px-2.5 py-1 rounded-md border flex flex-wrap items-center gap-3">
              <span className="font-bold text-foreground">{hoveredItem.etiqueta}:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Cobrado: {formatCOP(hoveredItem.ingresosCobrados)}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                Planes: {formatCOP(hoveredItem.valorUtilizadoPlanes)}
              </span>
            </div>
          )}
        </div>

        {/* Cuerpo del gráfico */}
        {loading ? (
          <div className="h-56 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Calculando series de ingresos...</span>
          </div>
        ) : error ? (
          <div className="h-56 flex flex-col items-center justify-center gap-3 text-center p-4 border rounded-xl bg-destructive/5 border-destructive/20">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <p className="text-xs text-destructive font-medium">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={cargarEstadisticas} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </Button>
          </div>
        ) : series.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground border rounded-xl bg-muted/20">
            <BarChart3 className="w-7 h-7 opacity-40" />
            <span>No existen movimientos registrados para este período.</span>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div
              className={`h-56 flex items-end gap-2 pt-6 px-2 border-b border-l border-border/70 ${
                periodo === 'mes' ? 'min-w-[820px]' : 'min-w-[460px]'
              }`}
            >
              {series.map((punto) => {
                const hIngresos = Math.round((punto.ingresosCobrados / maxValor) * 100)
                const hPlanes = Math.round((punto.valorUtilizadoPlanes / maxValor) * 100)
                const isHovered = hoveredItem?.fecha === punto.fecha

                return (
                  <div
                    key={punto.fecha}
                    onMouseEnter={() => setHoveredItem(punto)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onFocus={() => setHoveredItem(punto)}
                    tabIndex={0}
                    className={`flex-1 flex flex-col items-center justify-end h-full gap-1.5 group cursor-pointer rounded-t-md px-0.5 transition-colors outline-none ${
                      isHovered ? 'bg-muted/40' : ''
                    }`}
                    title={`${punto.etiqueta} — Cobrado: ${formatCOP(
                      punto.ingresosCobrados
                    )} | Planes: ${formatCOP(punto.valorUtilizadoPlanes)}`}
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-40">
                      <div
                        className={`w-1/2 max-w-[18px] rounded-t-sm transition-all duration-300 ${currentPalette.bgClass} ${
                          isHovered ? 'opacity-100 scale-y-105' : 'opacity-90'
                        }`}
                        style={{
                          height: `${punto.ingresosCobrados > 0 ? Math.max(4, hIngresos) : 2}%`,
                        }}
                      />
                      <div
                        className={`w-1/2 max-w-[18px] rounded-t-sm bg-blue-500/80 transition-all duration-300 ${
                          isHovered ? 'opacity-100 scale-y-105' : 'opacity-80'
                        }`}
                        style={{
                          height: `${punto.valorUtilizadoPlanes > 0 ? Math.max(4, hPlanes) : 2}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-full pb-1">
                      {punto.etiqueta}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default IncomeBarChart
