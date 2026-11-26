import React, { useState, useEffect } from 'react'
import {
  Bike,
  Ticket,
  Calendar,
  Clock,
  QrCode as QrIcon,
  LogOut,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  Flame,
  Award,
  Trophy,
  Building2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QRCode } from '@/components/ui/qr-code'
import { useBranding } from '@/context/BrandingContext'
import { toast } from '@/components/ui/use-toast'
import { authService } from '@/services/authService'
import { reservasService, type ReservaDetallada } from '@/services/reservasService'
import { tiqueterasService, type TiqueteraConPlan } from '@/services/tiqueterasService'
import { offlineService, type ReservaPaseOffline } from '@/services/offlineService'
import { obtenerMetricasUsuario } from '@/services/metricasService'
import type { Tables } from '@/types/database'

interface ClientDashboardProps {
  currentUser?: Tables<'perfiles'> | null
  onNavigateToBooking: () => void
  onNavigateToPlanes?: () => void
  onNavigateToDirectory?: () => void
  onSignOut: () => void
}

interface MetricasGamificacionUI {
  puntos_acumulados: number
  ranking_clase: number
  potencia_promedio_watts?: number
}

function extraerMetricasGamificacion(raw: unknown): MetricasGamificacionUI | null {
  if (!raw || typeof raw !== 'object') return null

  const candidate =
    'data' in raw && raw.data && typeof raw.data === 'object'
      ? raw.data
      : raw

  const item = Array.isArray(candidate) ? candidate[0] : candidate
  if (!item || typeof item !== 'object') return null

  const record = item as Record<string, unknown>
  if (typeof record.puntos_acumulados !== 'number' && typeof record.ranking_clase !== 'number') {
    return null
  }

  return {
    puntos_acumulados: typeof record.puntos_acumulados === 'number' ? record.puntos_acumulados : 0,
    ranking_clase: typeof record.ranking_clase === 'number' ? record.ranking_clase : 0,
    potencia_promedio_watts:
      typeof record.potencia_promedio_watts === 'number' ? record.potencia_promedio_watts : undefined,
  }
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  currentUser,
  onNavigateToBooking,
  onNavigateToPlanes,
  onNavigateToDirectory,
  onSignOut,
}) => {
  const { currentPalette, empresaId, studioName } = useBranding()

  // Estados de datos
  const [creditosDisponibles, setCreditosDisponibles] = useState<number>(0)
  const [tiqueteraActiva, setTiqueteraActiva] = useState<TiqueteraConPlan | null>(null)
  const [reservas, setReservas] = useState<ReservaDetallada[]>([])
  const [metricasGamificacion, setMetricasGamificacion] = useState<MetricasGamificacionUI | null>(null)
  const [loadingMetricas, setLoadingMetricas] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [selectedQrPass, setSelectedQrPass] = useState<ReservaDetallada | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Estado para soporte Offline
  const [offlinePass, setOfflinePass] = useState<ReservaPaseOffline | null>(null)
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false)

  // Estado para el modal de cancelación
  const [reservaParaCancelar, setReservaParaCancelar] = useState<ReservaDetallada | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState<boolean>(false)

  const clienteId = currentUser?.id || ''

  // Cargar datos consumiendo tiqueterasService, reservasService y metricasService
  useEffect(() => {
    let isMounted = true

    const cargarDatos = async () => {
      setLoading(true)
      setLoadingMetricas(true)
      try {
        try {
          const cachedPass = await offlineService.getPaseOffline()
          if (isMounted && cachedPass) {
            setOfflinePass(cachedPass)
          }
        } catch (e) {
          console.warn('[ClientDashboard] Consulta pase offline local:', e)
        }

        if (!clienteId) {
          if (isMounted) {
            setReservas([])
            setCreditosDisponibles(0)
            setTiqueteraActiva(null)
            setMetricasGamificacion(null)
            setLoading(false)
            setLoadingMetricas(false)
          }
          return
        }

        const metricasPromise = Promise.resolve(obtenerMetricasUsuario(clienteId)).catch((err: unknown) => {
          console.warn('[ClientDashboard] Error obteniendo métricas de gamificación:', err)
          return null
        })

        const [tiqRes, credTotalRes, reservasRes] = await Promise.all([
          tiqueterasService.getTiqueteraActiva(clienteId, empresaId),
          tiqueterasService.getTotalCreditosDisponibles(clienteId, empresaId),
          reservasService.getReservasCliente(clienteId, { empresaId }),
        ])
        const metricasRes: unknown = await metricasPromise

        if (isMounted) {
          const metricasParsed = extraerMetricasGamificacion(metricasRes)
          setMetricasGamificacion(metricasParsed)
          setLoadingMetricas(false)

          setTiqueteraActiva(tiqRes.data || null)
          setCreditosDisponibles(credTotalRes.data ?? 0)

          if (reservasRes.error) {
            toast({
              variant: 'destructive',
              title: 'Error cargando tus reservas',
              description: reservasRes.error,
            })
          }

          const listaFinal: ReservaDetallada[] = reservasRes.data || []
          setReservas(listaFinal)

          const proxima = listaFinal.find((r) => r.estado === 'confirmada' && !r.asistencia_confirmada)
          if (proxima) {
            try {
              const passPayload: ReservaPaseOffline = {
                reservaId: proxima.id,
                codigoQR: proxima.codigo_qr || `PASS-${proxima.id}`,
                clienteNombre: proxima.cliente_nombre || currentUser?.nombre_completo || 'Ciclista',
                clienteDocumento: proxima.cliente_documento || currentUser?.documento,
                claseTitulo: proxima.clase?.titulo || 'Sesión Indoor',
                instructorNombre: proxima.clase?.instructor_id || 'Coach',
                bicicletaNumero: proxima.bicicleta?.numero || 1,
                fecha: proxima.clase?.fecha || new Date().toISOString().split('T')[0],
                horaInicio: proxima.clase?.hora_inicio || '07:00:00',
                horaFin: proxima.clase?.hora_fin || '07:45:00',
                estudioNombre: studioName,
                colorPrimario: currentPalette.primaryHex,
                guardadoEn: new Date().toISOString(),
              }
              await offlineService.guardarPaseOffline(passPayload)
              setOfflinePass(passPayload)
            } catch (offlineErr) {
              console.warn('[ClientDashboard] Error auto-guardando pase offline:', offlineErr)
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cargar tus datos'
        if (isMounted) {
          setFeedbackMessage({ type: 'error', text: msg })
          toast({ variant: 'destructive', title: 'Error', description: msg })
          setReservas([])
          setCreditosDisponibles(0)
          setMetricasGamificacion(null)
          setLoadingMetricas(false)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setLoadingMetricas(false)
        }
      }
    }

    cargarDatos()
    return () => {
      isMounted = false
    }
  }, [clienteId, empresaId, currentUser, currentPalette.primaryHex, studioName])

  // Confirmar y procesar cancelación mediante reservasService.cancelarReserva
  const procesarCancelacionConfirmada = async () => {
    if (!reservaParaCancelar) return

    setCancellingLoading(true)
    setFeedbackMessage(null)

    try {
      const res = await reservasService.cancelarReserva(reservaParaCancelar.id, clienteId)
      if (res.success && res.data) {
        const { creditos_reintegrados, nuevo_saldo, mensaje } = res.data

        setReservas((prev) =>
          prev.map((r) => (r.id === reservaParaCancelar.id ? { ...r, estado: 'cancelada' } : r))
        )

        if (nuevo_saldo !== undefined && nuevo_saldo !== null) {
          setCreditosDisponibles(nuevo_saldo)
        } else if (creditos_reintegrados) {
          setCreditosDisponibles((prev) => prev + 1)
        }

        const textoFinal = `${mensaje || 'Reserva cancelada exitosamente.'} ${
          creditos_reintegrados
            ? `Se reintegró 1 crédito a tu tiquetera. Saldo actual: ${
                nuevo_saldo ?? creditosDisponibles + 1
              } créditos.`
            : 'Por realizarse con menos de 2 horas de antelación, el crédito no fue reintegrado.'
        }`

        setFeedbackMessage({
          type: creditos_reintegrados ? 'success' : 'info',
          text: textoFinal,
        })
        toast({
          variant: creditos_reintegrados ? 'success' : 'default',
          title: 'Reserva cancelada',
          description: textoFinal,
        })
      } else {
        const errMsg = res.error || res.mensaje || 'No se pudo cancelar la reserva.'
        setFeedbackMessage({ type: 'error', text: errMsg })
        toast({
          variant: 'destructive',
          title: 'No se pudo cancelar',
          description: errMsg,
        })
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Ocurrió un error al procesar la cancelación.'
      setFeedbackMessage({ type: 'error', text: errMsg })
      toast({ variant: 'destructive', title: 'Error', description: errMsg })
    } finally {
      setCancellingLoading(false)
      setReservaParaCancelar(null)
    }
  }

  // Cerrar sesión
  const handleSignOut = async () => {
    try {
      await authService.signOut()
    } finally {
      onSignOut()
    }
  }

  // Próxima reserva activa
  const proximaReserva = reservas.find((r) => r.estado === 'confirmada' || r.estado === 'en_curso')

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Barra Superior del Cliente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hola, {currentUser?.nombre_completo || 'Alejandro'} 👋
            </h1>
            <Badge variant="secondary" className="text-xs">
              Ciclista Activo
            </Badge>
            <Badge variant="outline" className="text-xs gap-1 font-semibold">
              <Building2 className={`w-3.5 h-3.5 ${currentPalette.textClass}`} />
              <span>{studioName}</span>
            </Badge>
            <Badge
              variant="outline"
              className="text-xs font-bold gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {loadingMetricas ? (
                <span>Cargando ranking...</span>
              ) : (
                <span>
                  {(metricasGamificacion?.puntos_acumulados ?? 0).toLocaleString('es-CO')} pts • Ranking #
                  {metricasGamificacion?.ranking_clase && metricasGamificacion.ranking_clase > 0
                    ? metricasGamificacion.ranking_clase
                    : '--'}
                </span>
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Consulta tus créditos, accede a tu pase QR de entrada y reserva tus bicicletas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {offlinePass && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowOfflineModal(true)}
              className="text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 shadow-xs"
              title="Ver pase offline guardado en la memoria del dispositivo"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <QrIcon className="w-3.5 h-3.5" />
              <span>Ver Pase Offline</span>
            </Button>
          )}

          {onNavigateToDirectory && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateToDirectory}
              className="font-bold gap-1.5 text-xs h-9"
              title="Explorar directorio y cambiar de estudio"
            >
              <Building2 className="w-4 h-4" />
              <span>Cambiar de Estudio</span>
            </Button>
          )}

          {onNavigateToPlanes && (
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateToPlanes}
              className="font-bold gap-1.5 text-xs h-9 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Ticket className="w-4 h-4" />
              <span>Comprar Clases</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onNavigateToBooking}
            className={`font-bold shadow-md ${currentPalette.bgClass} text-white gap-2`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Reservar Bici (15 Puestos)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </div>

      {/* Mensajes de feedback */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas Informativas Principales (3 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tarjeta 1: Saldo de Tiquetera y Créditos */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden bg-card">
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentPalette.bgClass}`} />
          <CardHeader className="p-5 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tiquetera & Saldo
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">{creditosDisponibles}</span>
              <span className="text-sm font-semibold text-muted-foreground">
                {creditosDisponibles === 1 ? 'crédito disponible' : 'créditos disponibles'}
              </span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 border-t pt-2.5">
              <div className="flex justify-between">
                <span>Plan Actual:</span>
                <span className="font-semibold text-foreground">
                  {tiqueteraActiva?.plan?.nombre || 'Sin tiquetera activa'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vencimiento:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {tiqueteraActiva?.fecha_vencimiento
                    ? tiqueteraActiva.fecha_vencimiento.split('T')[0]
                    : '—'}
                </span>
              </div>
            </div>

            {onNavigateToPlanes && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onNavigateToPlanes}
                className="w-full text-xs font-semibold gap-1.5 h-8 mt-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Recargar / Comprar Más Clases</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta 2: Próxima Clase y Pase QR Rápido */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden bg-card">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
          <CardHeader className="p-5 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Próxima Sesión Agendada
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Bike className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {proximaReserva ? (
              <>
                <div>
                  <div className="text-base font-bold text-foreground truncate">
                    {proximaReserva.clase?.titulo || 'Power Cycling & Beats'}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {proximaReserva.clase?.hora_inicio.slice(0, 5) || '18:30'} — Puesto #{proximaReserva.bicicleta?.numero || 4}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {proximaReserva.codigo_qr?.slice(0, 16) || 'PASS-ACTIVE'}
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedQrPass(proximaReserva)}
                      className="h-7 text-xs gap-1 font-semibold"
                    >
                      <QrIcon className="w-3.5 h-3.5" />
                      <span>Ver Pase QR</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Guardado en dispositivo (acceso sin conexión)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-2 text-center text-xs text-muted-foreground space-y-2">
                <p>No tienes reservas activas en este momento.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToBooking}
                  className="text-xs h-7"
                >
                  Elegir Horario
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta 3: Métricas y Racha de Ciclista */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden bg-card">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
          <CardHeader className="p-5 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Rendimiento & Gamificación
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-500">
                {(metricasGamificacion?.puntos_acumulados ?? 0).toLocaleString('es-CO')}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">puntos acumulados</span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 border-t pt-2.5">
              <div className="flex justify-between items-center">
                <span>Ranking de clase:</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />{' '}
                  {metricasGamificacion?.ranking_clase && metricasGamificacion.ranking_clase > 0
                    ? `Puesto #${metricasGamificacion.ranking_clase}`
                    : 'Sin ranking aún'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total de reservas:</span>
                <span className="font-semibold text-foreground">{reservas.length} sesiones</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial y Lista de Reservas del Ciclista */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Mis Reservas de Bicicletas
            </CardTitle>
            <CardDescription className="text-xs">
              Historial de clases reservadas, códigos QR y estado de asistencia.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              Total: {reservas.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reservas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs space-y-3">
              <Bike className="w-10 h-10 mx-auto opacity-30" />
              <p>Aún no tienes ninguna reserva agendada.</p>
              <Button
                type="button"
                onClick={onNavigateToBooking}
                size="sm"
                className={`font-semibold ${currentPalette.bgClass} text-white`}
              >
                Reservar Mi Primera Clase
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reservas.map((res) => {
                const isConfirmed = res.estado === 'confirmada'
                const isCancelled = res.estado === 'cancelada'
                const isFinished = res.estado === 'finalizada'

                return (
                  <div
                    key={res.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    {/* Info de la clase y bicicleta */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          isCancelled
                            ? 'bg-muted text-muted-foreground'
                            : `${currentPalette.bgClass} text-white`
                        }`}
                      >
                        #{res.bicicleta?.numero || '?'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {res.clase?.titulo || 'Clase Indoor Cycling'}
                          </span>
                          <Badge
                            variant={
                              isConfirmed
                                ? 'success'
                                : isFinished
                                ? 'secondary'
                                : isCancelled
                                ? 'destructive'
                                : 'warning'
                            }
                            className="capitalize text-[10px]"
                          >
                            {res.estado}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {res.clase?.hora_inicio.slice(0, 5) || '18:30'} hrs
                          </span>
                          <span>Bicicleta: {res.bicicleta?.codigo || 'IC-04'}</span>
                          <span>Puesto: Fila {res.bicicleta?.fila || 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {res.codigo_qr && !isCancelled && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQrPass(res)}
                          className="h-8 text-xs gap-1.5 font-semibold"
                        >
                          <QrIcon className="w-3.5 h-3.5" />
                          <span>Pase QR</span>
                        </Button>
                      )}

                      {isConfirmed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReservaParaCancelar(res)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
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

      {/* Modal Confirmación de Cancelación con Regla de Negocio */}
      {reservaParaCancelar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  ¿Cancelar esta Reserva?
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setReservaParaCancelar(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Revisa los detalles antes de confirmar la cancelación.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Detalle de la reserva a cancelar */}
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
                <div className="font-bold text-sm text-foreground">
                  {reservaParaCancelar.clase?.titulo || 'Clase Indoor Cycling'}
                </div>
                <div className="text-muted-foreground flex items-center gap-3">
                  <span>Puesto: Bicicleta #{reservaParaCancelar.bicicleta?.numero || '?'}</span>
                  <span>•</span>
                  <span>Hora: {reservaParaCancelar.clase?.hora_inicio.slice(0, 5) || '18:30'} hrs</span>
                </div>
              </div>

              {/* Explicación de la regla de negocio */}
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Regla de Cancelación de Clases
                </div>
                <p className="text-[11px] leading-relaxed">
                  Las cancelaciones con <strong>más de 2 horas de anticipación</strong> reintegran tu clase automáticamente a tu tiquetera. Si cancelas con <strong>menos de 2 horas</strong>, tu crédito no podrá ser devuelto.
                </p>
              </div>
            </CardContent>

            <div className="p-5 pt-0 flex items-center justify-end gap-2 border-t mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cancellingLoading}
                onClick={() => setReservaParaCancelar(null)}
                className="text-xs"
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={cancellingLoading}
                onClick={procesarCancelacionConfirmada}
                className="text-xs gap-1.5 font-bold"
              >
                {cancellingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Sí, Cancelar Reserva</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Visor de Pase QR de Acceso */}
      {selectedQrPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border-border bg-card text-center overflow-hidden">
            <CardHeader className="p-4 border-b bg-card">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrIcon className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Pase Digital de Acceso
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedQrPass(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Muestra este código al ingresar a la clase para el check-in.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                <QRCode
                  value={selectedQrPass.codigo_qr || `PASS-${selectedQrPass.id}`}
                  size={180}
                  label="Acceso Indoor Cycling"
                  isOffline={true}
                  offlineSavedAt={offlinePass?.guardadoEn}
                />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-bold text-sm text-foreground">
                  Puesto #{selectedQrPass.bicicleta?.numero} — {selectedQrPass.clase?.titulo}
                </div>
                <div>Horario: {selectedQrPass.clase?.hora_inicio.slice(0, 5)} hrs</div>
                <div className="text-[11px] text-muted-foreground">
                  Ciclista: {selectedQrPass.cliente_nombre}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setSelectedQrPass(null)}
                className={`w-full font-bold ${currentPalette.bgClass} text-white`}
              >
                Cerrar Pase
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Exclusivo: Pase Guardado en el Dispositivo (Modo Offline) */}
      {showOfflineModal && offlinePass && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border-emerald-500/50 bg-card text-center overflow-hidden">
            <CardHeader className="p-4 border-b bg-card">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <QrIcon className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Pase de Acceso Local
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Válido para check-in aún si te encuentras sin internet o cobertura móvil.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <QRCode
                value={offlinePass.codigoQR}
                size={180}
                label={offlinePass.estudioNombre}
                isOffline={true}
                offlineSavedAt={offlinePass.guardadoEn}
              />

              <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-3 rounded-xl border text-left">
                <div className="font-bold text-sm text-foreground">
                  Puesto #{offlinePass.bicicletaNumero} — {offlinePass.claseTitulo}
                </div>
                <div>
                  Horario: {offlinePass.horaInicio.slice(0, 5)} - {offlinePass.horaFin.slice(0, 5)} hrs
                </div>
                <div>Fecha: {offlinePass.fecha}</div>
                <div className="text-[11px] text-muted-foreground pt-1 border-t">
                  Ciclista: {offlinePass.clienteNombre}{' '}
                  {offlinePass.clienteDocumento ? `(DNI: ${offlinePass.clienteDocumento})` : ''}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                className={`w-full font-bold ${currentPalette.bgClass} text-white shadow-md`}
              >
                Cerrar Pase Offline
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default ClientDashboard
