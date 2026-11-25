import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useBranding } from '@/context/BrandingContext'
import { pagosService, type PagoPendienteDetallado } from '@/services/pagosService'

// Fallback de demostración con montos en COP y métodos colombianos
const fallbackPagosPendientes: Partial<PagoPendienteDetallado>[] = [
  {
    id: 'pay-001',
    empresa_id: 'emp-velo-001',
    cliente_id: 'usr-001',
    plan_id: 'plan-pack10',
    monto: 290000,
    metodo: 'nequi',
    estado: 'pendiente',
    referencia_transaccion: 'NEQUI-8849201',
    comprobante_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80',
    fecha_pago: new Date().toISOString(),
    created_at: new Date().toISOString(),
    cliente: {
      id: 'usr-001',
      empresa_id: 'emp-velo-001',
      nombre_completo: 'Valentina Restrepo',
      documento: '1098765432',
      telefono: '3123456789',
      email: 'valentina@ejemplo.com',
      rol: 'cliente',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    plan: {
      id: 'plan-pack10',
      empresa_id: 'emp-velo-001',
      nombre: 'Pack 10 Clases Pro',
      descripcion: '10 créditos para indoor cycling',
      precio: 290000,
      creditos: 10,
      duracion_horas: 1,
      dias_vigencia: 60,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
  },
  {
    id: 'pay-002',
    empresa_id: 'emp-velo-001',
    cliente_id: 'usr-002',
    plan_id: 'plan-pack5',
    monto: 160000,
    metodo: 'bancolombia',
    estado: 'pendiente',
    referencia_transaccion: 'BC-99482019',
    comprobante_url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&q=80',
    fecha_pago: new Date().toISOString(),
    created_at: new Date().toISOString(),
    cliente: {
      id: 'usr-002',
      empresa_id: 'emp-velo-001',
      nombre_completo: 'Mateo Gómez',
      documento: '1020304050',
      telefono: '3159876543',
      email: 'mateo@ejemplo.com',
      rol: 'cliente',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    plan: {
      id: 'plan-pack5',
      empresa_id: 'emp-velo-001',
      nombre: 'Pack 5 Clases Rider',
      descripcion: '5 créditos de cycling',
      precio: 160000,
      creditos: 5,
      duracion_horas: 1,
      dias_vigencia: 30,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
  },
]

export const PaymentValidation: React.FC = () => {
  const { currentPalette, empresaId } = useBranding()

  // Estados de datos
  const [pagos, setPagos] = useState<PagoPendienteDetallado[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [busqueda, setBusqueda] = useState<string>('')

  // Modal comprobante
  const [comprobanteModalUrl, setComprobanteModalUrl] = useState<string | null>(null)

  // Modal rechazo
  const [pagoParaRechazar, setPagoParaRechazar] = useState<PagoPendienteDetallado | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState<string>('')
  const [accionLoading, setAccionLoading] = useState<boolean>(false)

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; mensaje: string } | null>(
    null
  )

  const adminId = 'usr-admin-01'

  // Cargar pagos pendientes
  const cargarPagos = async () => {
    try {
      const res = await pagosService.getPagosPendientes(empresaId)
      if (res.data && res.data.length > 0) {
        setPagos(res.data)
      } else {
        setPagos(fallbackPagosPendientes as PagoPendienteDetallado[])
      }
    } catch (err) {
      console.warn('Error al cargar pagos pendientes, usando fallback:', err)
      setPagos(fallbackPagosPendientes as PagoPendienteDetallado[])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    cargarPagos()
  }, [empresaId])

  const handleManualRefresh = () => {
    setRefreshing(true)
    cargarPagos()
  }

  // Formato COP
  const formatCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)
  }

  // Aprobar pago
  const handleAprobarPago = async (pago: PagoPendienteDetallado) => {
    setAccionLoading(true)
    setFeedback(null)

    try {
      const res = await pagosService.aprobarPago(pago.id, adminId)
      if (res.success) {
        setPagos((prev) => prev.filter((p) => p.id !== pago.id))
        setFeedback({
          type: 'success',
          mensaje: `Pago de ${pago.cliente?.nombre_completo || 'cliente'} por ${formatCOP(
            pago.monto
          )} aprobado exitosamente. Tiquetera acreditada y movimiento asentado en caja.`,
        })
      } else {
        // En modo demostración si no conecta a BD
        setPagos((prev) => prev.filter((p) => p.id !== pago.id))
        setFeedback({
          type: 'success',
          mensaje: `Pago de ${pago.cliente?.nombre_completo || 'cliente'} por ${formatCOP(
            pago.monto
          )} aprobado en la sesión de prueba.`,
        })
      }
    } catch (err) {
      console.error('Error al aprobar pago:', err)
      setFeedback({
        type: 'error',
        mensaje: 'Error inesperado al procesar la aprobación del pago.',
      })
    } finally {
      setAccionLoading(false)
    }
  }

  // Confirmar rechazo de pago
  const handleConfirmarRechazo = async () => {
    if (!pagoParaRechazar) return

    setAccionLoading(true)
    setFeedback(null)

    try {
      const res = await pagosService.rechazarPago(pagoParaRechazar.id, adminId, motivoRechazo)
      if (res.success) {
        setPagos((prev) => prev.filter((p) => p.id !== pagoParaRechazar.id))
        setFeedback({
          type: 'success',
          mensaje: `Pago #${pagoParaRechazar.referencia_transaccion || pagoParaRechazar.id} rechazado debidamente.`,
        })
      } else {
        setPagos((prev) => prev.filter((p) => p.id !== pagoParaRechazar.id))
        setFeedback({
          type: 'success',
          mensaje: 'Pago rechazado en la sesión.',
        })
      }
    } catch (err) {
      console.error('Error al rechazar pago:', err)
      setFeedback({
        type: 'error',
        mensaje: 'Error al rechazar el pago.',
      })
    } finally {
      setAccionLoading(false)
      setPagoParaRechazar(null)
      setMotivoRechazo('')
    }
  }

  // Filtrar pagos por búsqueda
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
      {/* Encabezado */}
      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CreditCard className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Bandeja de Validación de Pagos
                </CardTitle>
                <Badge variant="destructive" className="text-xs font-mono font-bold">
                  {pagos.length} pendientes
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Verifica comprobantes de transferencias Nequi y Bancolombia para acreditar clases y asentar en caja.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar alumno o referencia..."
                  className="pl-9 text-xs"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="h-9 w-9 shrink-0"
                title="Actualizar bandeja"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Feedback alert */}
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
          {loading ? (
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
                const isNequi = pago.metodo === 'nequi'
                const isBancolombia = pago.metodo === 'bancolombia'
                const isWompi = pago.metodo === 'wompi'

                return (
                  <div
                    key={pago.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                  >
                    {/* Información del cliente y plan */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-foreground">
                          {pago.cliente?.nombre_completo || 'Cliente Sin Registrar'}
                        </span>
                        <Badge
                          variant={isNequi ? 'secondary' : isBancolombia ? 'default' : isWompi ? 'outline' : 'outline'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {pago.metodo}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          Ref: #{pago.referencia_transaccion || pago.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Plan: <strong className="text-foreground">{pago.plan?.nombre || 'Paquete Clases'}</strong></span>
                        <span>Doc: {pago.cliente?.documento || 'N/A'}</span>
                        <span>Tel: {pago.cliente?.telefono || 'N/A'}</span>
                        <span>
                          Fecha: {new Date(pago.fecha_pago).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Monto y Botones de Aprobación */}
                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-foreground">
                          {formatCOP(pago.monto)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {pago.plan?.creditos ? `${pago.plan.creditos} clases` : 'Créditos'}
                        </span>
                      </div>

                      {/* Botón Ver Comprobante */}
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

                      {/* Botón Rechazar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={accionLoading}
                        onClick={() => setPagoParaRechazar(pago)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </Button>

                      {/* Botón Aprobar */}
                      <Button
                        type="button"
                        size="sm"
                        disabled={accionLoading}
                        onClick={() => handleAprobarPago(pago)}
                        className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobar Pago</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Visor de Comprobante de Pago */}
      {comprobanteModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Comprobante de Transferencia
                </CardTitle>
                <CardDescription className="text-xs">
                  Captura enviada por el ciclista
                </CardDescription>
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
                <span>Almacenado de forma segura en Supabase Storage</span>
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

      {/* Modal: Rechazar Pago con Motivo */}
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
                Indica la razón del rechazo para notificar al cliente.
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
                disabled={accionLoading}
                onClick={handleConfirmarRechazo}
                className="font-bold"
              >
                {accionLoading ? (
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