import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Filter,
  History,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import { pagosService, type PagoPendienteDetallado } from '@/services/pagosService'
import {
  adminService,
  type PagoFiltradoDetallado,
  type PagosFiltros,
} from '@/services/adminService'
import type { EstadoPago, MetodoPago } from '@/types/database'

interface PaymentValidationProps {
  adminId?: string
}

export const PaymentValidation: React.FC<PaymentValidationProps> = ({
  adminId = 'usr-admin-01',
}) => {
  const { currentPalette, empresaId } = useBranding()

  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')

  // Pendientes
  const [pagos, setPagos] = useState<PagoPendienteDetallado[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [busqueda, setBusqueda] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Historial filtrado
  const [historial, setHistorial] = useState<PagoFiltradoDetallado[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState<boolean>(false)
  const [filtros, setFiltros] = useState<PagosFiltros>({
    fechaInicio: '',
    fechaFin: '',
    metodo: 'todos',
    estado: 'todos',
    codigo: '',
  })

  // Modales
  const [comprobanteModalUrl, setComprobanteModalUrl] = useState<string | null>(null)
  const [pagoParaRechazar, setPagoParaRechazar] = useState<PagoPendienteDetallado | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState<string>('')
  const [procesandoId, setProcesandoId] = useState<string | null>(null)

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; mensaje: string } | null>(
    null
  )

  const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)

  const cargarPagosPendientes = useCallback(async () => {
    setErrorMsg(null)
    try {
      const res = await pagosService.getPagosPendientes(empresaId)
      if (res.error) {
        setErrorMsg(res.error)
        toast({
          variant: 'destructive',
          title: 'Error cargando pagos pendientes',
          description: res.error,
        })
        setPagos([])
      } else {
        setPagos(res.data || [])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al consultar pagos'
      setErrorMsg(msg)
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [empresaId])

  const cargarHistorialFiltrado = useCallback(async () => {
    setLoadingHistorial(true)
    setErrorMsg(null)
    try {
      const res = await adminService.getPagosFiltrados(empresaId, filtros)
      if (res.error) {
        setErrorMsg(res.error)
        toast({
          variant: 'destructive',
          title: 'Error cargando historial de pagos',
          description: res.error,
        })
        setHistorial([])
      } else {
        setHistorial(res.data || [])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al consultar historial'
      setErrorMsg(msg)
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoadingHistorial(false)
    }
  }, [empresaId, filtros])

  useEffect(() => {
    setLoading(true)
    cargarPagosPendientes()
  }, [cargarPagosPendientes])

  useEffect(() => {
    if (tab === 'historial') {
      cargarHistorialFiltrado()
    }
  }, [tab, cargarHistorialFiltrado])

  const handleManualRefresh = () => {
    setRefreshing(true)
    if (tab === 'pendientes') {
      cargarPagosPendientes()
    } else {
      cargarHistorialFiltrado().finally(() => setRefreshing(false))
    }
  }

  const handleAprobarPago = async (pago: PagoPendienteDetallado) => {
    setProcesandoId(pago.id)
    setFeedback(null)

    try {
      const res = await pagosService.aprobarPago(pago.id, adminId)
      if (res.success) {
        setPagos((prev) => prev.filter((p) => p.id !== pago.id))
        const msg =
          res.mensaje ||
          `Pago de ${pago.cliente?.nombre_completo || 'cliente'} por ${formatCOP(
            pago.monto
          )} aprobado. Tiquetera acreditada y movimiento asentado en caja.`
        setFeedback({ type: 'success', mensaje: msg })
        toast({ variant: 'success', title: 'Pago aprobado', description: msg })
      } else {
        const msg = res.error || res.mensaje || 'No se pudo aprobar el pago.'
        setFeedback({ type: 'error', mensaje: msg })
        toast({ variant: 'destructive', title: 'Error al aprobar pago', description: msg })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al aprobar el pago.'
      setFeedback({ type: 'error', mensaje: msg })
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setProcesandoId(null)
    }
  }

  const handleConfirmarRechazo = async () => {
    if (!pagoParaRechazar) return

    setProcesandoId(pagoParaRechazar.id)
    setFeedback(null)

    try {
      const res = await pagosService.rechazarPago(pagoParaRechazar.id, adminId, motivoRechazo)
      if (res.success) {
        setPagos((prev) => prev.filter((p) => p.id !== pagoParaRechazar.id))
        const msg = `Pago #${
          pagoParaRechazar.referencia_transaccion || pagoParaRechazar.id
        } rechazado debidamente.`
        setFeedback({ type: 'success', mensaje: msg })
        toast({ variant: 'success', title: 'Pago rechazado', description: msg })
        setPagoParaRechazar(null)
        setMotivoRechazo('')
      } else {
        const msg = res.error || 'No se pudo rechazar el pago.'
        setFeedback({ type: 'error', mensaje: msg })
        toast({ variant: 'destructive', title: 'Error al rechazar', description: msg })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar el pago.'
      setFeedback({ type: 'error', mensaje: msg })
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setProcesandoId(null)
    }
  }

  const pagosFiltrados = pagos.filter((p) => {
    const texto = busqueda.toLowerCase()
    return (
      (p.cliente?.nombre_completo || '').toLowerCase().includes(texto) ||
      (p.referencia_transaccion || '').toLowerCase().includes(texto) ||
      (p.plan?.nombre || '').toLowerCase().includes(texto) ||
      (p.metodo || '').toLowerCase().includes(texto)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CreditCard className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Validación y Auditoría de Pagos
                </CardTitle>
                <Badge variant="destructive" className="text-xs font-mono font-bold">
                  {pagos.length} pendientes
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Verifica comprobantes Nequi/Bancolombia para acreditar clases o consulta el historial completo.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
                <Button
                  type="button"
                  size="sm"
                  variant={tab === 'pendientes' ? 'default' : 'ghost'}
                  onClick={() => setTab('pendientes')}
                  className={`h-7 text-xs font-bold ${
                    tab === 'pendientes' ? `${currentPalette.bgClass} text-white` : ''
                  }`}
                >
                  Pendientes ({pagos.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tab === 'historial' ? 'default' : 'ghost'}
                  onClick={() => setTab('historial')}
                  className={`h-7 text-xs font-bold gap-1 ${
                    tab === 'historial' ? `${currentPalette.bgClass} text-white` : ''
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial</span>
                </Button>
              </div>

              {tab === 'pendientes' && (
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar alumno o referencia..."
                    className="pl-9 text-xs h-9"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="h-9 w-9 shrink-0"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {errorMsg && (
          <div className="px-6 pb-3">
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {feedback && (
          <div className="px-6 pb-2">
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{feedback.mensaje}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="font-bold text-xs hover:underline"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <CardContent>
          {tab === 'pendientes' ? (
            loading ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/50" />
                <p className="font-semibold text-foreground">
                  ¡Bandeja al día! No hay pagos pendientes de validación.
                </p>
                <p className="text-[11px]">
                  Todos los comprobantes y transferencias han sido auditados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pagosFiltrados.map((pago) => {
                  const isProcesando = procesandoId === pago.id
                  return (
                    <div
                      key={pago.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-foreground">
                            {pago.cliente?.nombre_completo || 'Cliente Sin Registrar'}
                          </span>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                            {pago.metodo}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">
                            Ref: #{pago.referencia_transaccion || pago.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Plan:{' '}
                            <strong className="text-foreground">
                              {pago.plan?.nombre || 'Paquete Clases'}
                            </strong>
                          </span>
                          <span>Doc: {pago.cliente?.documento || 'N/A'}</span>
                          <span>Tel: {pago.cliente?.telefono || 'N/A'}</span>
                          <span>
                            Fecha:{' '}
                            {new Date(pago.fecha_pago).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 flex-wrap">
                        <div className="text-right mr-1">
                          <div className="text-base font-black text-foreground">
                            {formatCOP(pago.monto)}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {pago.plan?.creditos ? `${pago.plan.creditos} clases` : 'Créditos'}
                          </span>
                        </div>

                        {pago.comprobante_url ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setComprobanteModalUrl(pago.comprobante_url || null)}
                            className="h-8 text-xs gap-1 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Comprobante</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic px-2">
                            Sin archivo
                          </span>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isProcesando}
                          onClick={() => setPagoParaRechazar(pago)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isProcesando}
                          onClick={() => handleAprobarPago(pago)}
                          className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          {isProcesando ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Aprobar Pago</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {/* Filtros del historial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 p-3 rounded-xl border bg-muted/20 text-xs">
                <Input
                  type="date"
                  value={filtros.fechaInicio || ''}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                  title="Fecha inicio"
                  className="h-8 text-xs"
                />
                <Input
                  type="date"
                  value={filtros.fechaFin || ''}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                  title="Fecha fin"
                  className="h-8 text-xs"
                />
                <select
                  value={filtros.metodo || 'todos'}
                  onChange={(e) =>
                    setFiltros({ ...filtros, metodo: e.target.value as MetodoPago | 'todos' })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="todos">Todos los métodos</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="wompi">Wompi</option>
                </select>
                <select
                  value={filtros.estado || 'todos'}
                  onChange={(e) =>
                    setFiltros({ ...filtros, estado: e.target.value as EstadoPago | 'todos' })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="rechazado">Rechazado</option>
                  <option value="reembolsado">Reembolsado</option>
                </select>
                <Input
                  placeholder="Código / Ref / QR..."
                  value={filtros.codigo || ''}
                  onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={cargarHistorialFiltrado}
                  disabled={loadingHistorial}
                  className={`h-8 text-xs font-bold gap-1 ${currentPalette.bgClass} text-white`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtrar</span>
                </Button>
              </div>

              {loadingHistorial ? (
                <div className="h-44 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : historial.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No hay pagos que coincidan con los filtros seleccionados.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {historial.map((p) => (
                    <div
                      key={p.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">
                            {p.cliente?.nombre_completo || 'Cliente'}
                          </span>
                          <Badge
                            variant={
                              p.estado === 'aprobado'
                                ? 'success'
                                : p.estado === 'rechazado'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-[10px] capitalize"
                          >
                            {p.estado}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {p.metodo}
                          </Badge>
                          {p.referencia_transaccion && (
                            <span className="font-mono text-muted-foreground">
                              #{p.referencia_transaccion}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.plan?.nombre || 'Sin plan'} •{' '}
                          {new Date(p.fecha_pago).toLocaleString('es-CO')}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {p.comprobante_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setComprobanteModalUrl(p.comprobante_url || null)}
                            className="h-7 text-[11px] gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </Button>
                        )}
                        <span className="font-black text-sm text-foreground">
                          {formatCOP(p.monto)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Visor de Comprobante */}
      {comprobanteModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Comprobante de Transferencia
                </CardTitle>
                <CardDescription className="text-xs">Captura enviada por el ciclista</CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setComprobanteModalUrl(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </CardHeader>

            <CardContent className="p-4 text-center">
              <div className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/20 p-2 flex items-center justify-center">
                <img
                  src={comprobanteModalUrl}
                  alt="Comprobante Bancario"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Almacenado en Supabase Storage</span>
                <a
                  href={comprobanteModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Abrir tamaño original</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>

            <div className="p-4 pt-0 border-t flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComprobanteModalUrl(null)}
              >
                Cerrar Visor
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Rechazar Pago */}
      {pagoParaRechazar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  Rechazar Pago de {pagoParaRechazar.cliente?.nombre_completo || 'Cliente'}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setPagoParaRechazar(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Indica la razón del rechazo para registrar en auditoría.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <div className="font-bold text-foreground">
                  Monto: {formatCOP(pagoParaRechazar.monto)} ({pagoParaRechazar.metodo})
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Referencia: #{pagoParaRechazar.referencia_transaccion || pagoParaRechazar.id}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Motivo del Rechazo</label>
                <Input
                  autoFocus
                  placeholder="Ej: Comprobante ilegible o el valor transferido no coincide"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="text-xs"
                />
              </div>
            </CardContent>

            <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPagoParaRechazar(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={procesandoId === pagoParaRechazar.id}
                onClick={handleConfirmarRechazo}
                className="font-bold"
              >
                {procesandoId === pagoParaRechazar.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  'Confirmar Rechazo'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
export default PaymentValidation
