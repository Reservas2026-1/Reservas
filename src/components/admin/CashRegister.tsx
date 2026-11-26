import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  Wallet,
  Smartphone,
  CreditCard,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  FileText,
  TrendingUp,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import { adminService, type CierreCajaResumen } from '@/services/adminService'

interface CashRegisterProps {
  responsableNombre?: string
  usuarioId?: string | null
}

const createEmptyCierre = (fecha: string): CierreCajaResumen => ({
  fecha,
  totalIngresos: 0,
  totalEgresos: 0,
  balanceNeto: 0,
  totalMovimientos: 0,
  desglosePorMetodo: {},
  movimientos: [],
})

export const CashRegister: React.FC<CashRegisterProps> = ({
  responsableNombre = 'Administrador General',
  usuarioId = null,
}) => {
  const { currentPalette, empresaId, studioName, estudioActivo } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)

  const [fechaConsulta, setFechaConsulta] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [resumenCaja, setResumenCaja] = useState<CierreCajaResumen>(() =>
    createEmptyCierre(new Date().toISOString().split('T')[0])
  )
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Formulario de nuevo movimiento
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [metodo, setMetodo] = useState<'efectivo' | 'nequi' | 'bancolombia' | 'wompi'>('efectivo')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const cargarCierre = useCallback(
    async (fecha?: string) => {
      const targetFecha = fecha || fechaConsulta
      setErrorMsg(null)
      try {
        const res = await adminService.getCierreCaja(empresaId, targetFecha)
        if (res.error || !res.data) {
          const msg = res.error || 'No se pudo consultar el cierre de caja'
          setErrorMsg(msg)
          setResumenCaja(createEmptyCierre(targetFecha))
          toast({ variant: 'destructive', title: 'Error en caja', description: msg })
        } else {
          setResumenCaja(res.data)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cargar cierre de caja'
        setErrorMsg(msg)
        setResumenCaja(createEmptyCierre(targetFecha))
        toast({ variant: 'destructive', title: 'Error en caja', description: msg })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [empresaId, fechaConsulta]
  )

  useEffect(() => {
    setLoading(true)
    cargarCierre(fechaConsulta)
  }, [cargarCierre, fechaConsulta])

  const handleManualRefresh = () => {
    setRefreshing(true)
    cargarCierre(fechaConsulta)
  }

  const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)

  const handleAgregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    const valorMonto = Number.parseFloat(monto)
    if (!concepto.trim() || !Number.isFinite(valorMonto) || valorMonto <= 0) {
      toast({
        variant: 'destructive',
        title: 'Datos incompletos',
        description: 'Ingresa un concepto válido y un monto mayor a 0.',
      })
      return
    }

    setSubmitting(true)
    try {
      const fechaMovimiento =
        fechaConsulta === new Date().toISOString().split('T')[0]
          ? new Date().toISOString()
          : `${fechaConsulta}T12:00:00.000Z`

      const res = await adminService.registrarMovimientoCaja({
        empresaId,
        tipo,
        concepto: concepto.trim(),
        monto: valorMonto,
        metodo,
        responsable: responsableNombre,
        usuarioId,
        fecha: fechaMovimiento,
      })

      if (res.error || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error registrando movimiento',
          description: res.error || 'No se pudo guardar en base de datos',
        })
        return
      }

      toast({
        variant: 'success',
        title: tipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado',
        description: `${res.data.concepto} (${formatCOP(res.data.monto)})`,
      })
      setConcepto('')
      setMonto('')
      cargarCierre(fechaConsulta)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminarMovimiento = async (movimientoId: string) => {
    setDeletingId(movimientoId)
    try {
      const res = await adminService.eliminarMovimientoCaja(movimientoId, empresaId)
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: res.error || 'Error al eliminar el movimiento',
        })
        return
      }
      toast({ variant: 'success', title: 'Movimiento eliminado' })
      cargarCierre(fechaConsulta)
    } finally {
      setDeletingId(null)
    }
  }

  const totalEfectivo =
    (resumenCaja.desglosePorMetodo?.['efectivo']?.ingresos || 0) -
    (resumenCaja.desglosePorMetodo?.['efectivo']?.egresos || 0)

  const totalNequiBancolombia =
    (resumenCaja.desglosePorMetodo?.['nequi']?.ingresos || 0) +
    (resumenCaja.desglosePorMetodo?.['bancolombia']?.ingresos || 0) +
    (resumenCaja.desglosePorMetodo?.['transferencia']?.ingresos || 0)

  const totalWompiTarjeta =
    (resumenCaja.desglosePorMetodo?.['wompi']?.ingresos || 0) +
    (resumenCaja.desglosePorMetodo?.['tarjeta']?.ingresos || 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado y Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">Arqueo y Cierre de Caja</h1>
            <Badge variant="outline" className="text-xs font-mono">
              {studioName}
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Liquidación financiera diaria segregada por Efectivo, Nequi/Bancolombia y pasarela Wompi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border rounded-lg p-1.5 bg-card">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              className="text-xs h-7 border-0 p-0 font-mono"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-9 w-9 shrink-0"
            title="Actualizar arqueo"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tarjetas de Resumen Financiero Segregado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Efectivo en Cajón
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
                  {formatCOP(totalEfectivo)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dinero físico neto del día
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nequi / Bancolombia
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {formatCOP(totalNequiBancolombia)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Transferencias bancarias verificadas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Wompi / Tarjetas
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {formatCOP(totalWompiTarjeta)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pasarela en línea
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className={`absolute top-0 left-0 right-0 h-1 ${currentPalette.bgClass}`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Balance Neto del Día
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div
                  className={`text-2xl font-black ${
                    resumenCaja.balanceNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatCOP(resumenCaja.balanceNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    +{formatCOP(resumenCaja.totalIngresos)} / -{formatCOP(resumenCaja.totalEgresos)}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Formulario Nuevo Movimiento + Tabla de Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className={`w-4 h-4 ${currentPalette.textClass}`} />
              Registrar Movimiento
            </CardTitle>
            <CardDescription className="text-xs">
              Ingresos de mostrador o gastos operativos del estudio.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleAgregarMovimiento}>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === 'ingreso' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipo('ingreso')}
                  className={
                    tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''
                  }
                >
                  <ArrowUpRight className="mr-1.5 h-4 w-4" /> Ingreso
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'egreso' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipo('egreso')}
                  className={
                    tipo === 'egreso' ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold' : ''
                  }
                >
                  <ArrowDownRight className="mr-1.5 h-4 w-4" /> Egreso
                </Button>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Concepto / Motivo</label>
                <Input
                  required
                  placeholder="Ej: Toallas limpias, agua, pago de clase..."
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Monto en COP ($)</label>
                <Input
                  type="number"
                  required
                  min={100}
                  step={100}
                  placeholder="Ej: 35000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Canal de Pago</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={metodo}
                  onChange={(e) =>
                    setMetodo(e.target.value as 'efectivo' | 'nequi' | 'bancolombia' | 'wompi')
                  }
                >
                  <option value="efectivo">Efectivo en Recepción</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia Transferencia</option>
                  <option value="wompi">Wompi / Tarjeta</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className={`w-full font-bold shadow-sm ${currentPalette.bgClass} text-white mt-2`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Asiento Contable'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>

        <Card className="lg:col-span-2 border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className={`w-4 h-4 ${currentPalette.textClass}`} />
                Movimientos del Día ({fechaConsulta})
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoría completa de transacciones asentadas en PostgreSQL.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {resumenCaja.movimientos.length} asientos
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : resumenCaja.movimientos.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay movimientos contables registrados en esta fecha.
              </div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {resumenCaja.movimientos.map((m) => {
                  const isIngreso = m.tipo === 'ingreso'
                  const hora = (m.fecha || '').split('T')[1]?.slice(0, 5) || '12:00'

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isIngreso
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {isIngreso ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-foreground truncate">{m.concepto}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span className="font-mono">{hora} hrs</span>
                            <span>•</span>
                            <span className="capitalize font-medium">{m.metodo}</span>
                            <span>•</span>
                            <span>{m.responsable}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`font-black text-sm ${
                            isIngreso ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIngreso ? '+' : '-'} {formatCOP(m.monto)}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === m.id}
                          onClick={() => handleEliminarMovimiento(m.id)}
                          title="Eliminar movimiento"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default CashRegister
