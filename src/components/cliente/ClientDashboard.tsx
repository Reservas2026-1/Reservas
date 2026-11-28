import React, { useState, useEffect, useCallback } from 'react'
import {
  Home,
  Bike,
  Calendar,
  Trophy,
  TrendingUp,
  User,
  Building2,
  Bell,
  Flame,
  Heart,
  Award,
  Zap,
  Crown,
  Clock,
  Lock,
  CheckCircle2,
  X,
  ChevronRight,
  Sparkles,
  QrCode as QrIcon,
  RotateCw,
  Medal,
  WifiOff,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QRCode } from '@/components/ui/qr-code'
import { useBranding } from '@/context/BrandingContext'
import { toast } from '@/components/ui/use-toast'
import {
  reservasService,
  type ProximaReservaDetallada,
} from '@/services/reservasService'
import { tiqueterasService, type TiqueteraConPlan } from '@/services/tiqueterasService'
import { offlineService, type ReservaPaseOffline } from '@/services/offlineService'
import {
  gamificacionService,
  calcularNivelUsuario,
  type PremioPlanPodio,
  type RankingPlanItem,
  type InsigniaUsuario,
  type HistorialAsistenciaItem,
  type ProgresoGamificacionUsuario,
} from '@/services/gamificacionService'
import { ClientProfileView } from './ClientProfileView'
import type { Tables } from '@/types/database'

// Carga diferida de IndoorBikeMap para optimizar el bundle móvil
const IndoorBikeMapLazy = React.lazy(() =>
  import('./IndoorBikeMap').then((m) => ({ default: m.IndoorBikeMap }))
)

export interface ClientDashboardProps {
  currentUser?: Tables<'perfiles'> | null
  onNavigateToBooking: () => void
  onNavigateToPlanes?: () => void
  onNavigateToDirectory?: () => void
  onSignOut: () => void
}

type TabKey = 'inicio' | 'clases' | 'retos' | 'progreso' | 'perfil'

interface NotificacionItem {
  id: string
  titulo: string
  descripcion: string
  tipo: 'clase' | 'plan' | 'xp' | 'general'
  leida: boolean
}

interface ReglaXPUI {
  id: string
  criterio: string
  puntos_xp: number
  descripcion?: string | null
}

const NOMBRES_NIVELES = ['Inicio', 'Constancia', 'Potencia', 'Élite', 'Leyenda', 'Máster']

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  currentUser: initialUser,
  onNavigateToBooking,
  onNavigateToPlanes,
  onNavigateToDirectory,
  onSignOut,
}) => {
  const { currentPalette, empresaId, studioName, estudioActivo, verticalConfig, isSingleTenant } = useBranding()

  // Estado del usuario activo
  const [currentUser, setCurrentUser] = useState<Tables<'perfiles'> | null>(initialUser || null)
  useEffect(() => {
    if (initialUser) setCurrentUser(initialUser)
  }, [initialUser])

  // Pestaña activa de la barra móvil
  const [activeTab, setActiveTab] = useState<TabKey>('inicio')

  // Datos de tiquetera y créditos
  const [creditosDisponibles, setCreditosDisponibles] = useState<number>(0)
  const [tiqueteraActiva, setTiqueteraActiva] = useState<TiqueteraConPlan | null>(null)

  // Próxima reserva
  const [proximaReserva, setProximaReserva] = useState<ProximaReservaDetallada | null>(null)

  // Gamificación y Métricas
  const [progresoGami, setProgresoGami] = useState<ProgresoGamificacionUsuario | null>(null)
  const [rankingPlan, setRankingPlan] = useState<RankingPlanItem[]>([])
  const [miPosicionRanking, setMiPosicionRanking] = useState<number>(0)
  const [premiosPodio, setPremiosPodio] = useState<PremioPlanPodio[]>([])
  const [reglasXp, setReglasXp] = useState<ReglaXPUI[]>([])
  const [insignias, setInsignias] = useState<InsigniaUsuario[]>([])
  const [historialAsistencias, setHistorialAsistencias] = useState<HistorialAsistenciaItem[]>([])

  // Modales y UI
  const [showQrModal, setShowQrModal] = useState<boolean>(false)
  const [showNotifications, setShowNotifications] = useState<boolean>(false)
  const [notifications, setNotifications] = useState<NotificacionItem[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Soporte Offline
  const [offlinePass, setOfflinePass] = useState<ReservaPaseOffline | null>(null)

  const clienteId = currentUser?.id || ''

  // Cargar datos unificados del cliente
  const cargarTodosLosDatos = useCallback(async () => {
    if (!clienteId || !empresaId) {
      return
    }

    try {
      // 1. Cargar tiquetera y créditos
      const [tiqRes, credTotalRes] = await Promise.all([
        tiqueterasService.getTiqueteraActiva(clienteId, empresaId),
        tiqueterasService.getTotalCreditosDisponibles(clienteId, empresaId),
      ])

      const tiq = tiqRes.data || null
      setTiqueteraActiva(tiq)
      setCreditosDisponibles(credTotalRes.data ?? 0)

      const planId = tiq?.plan_id || undefined

      // 2. Cargar Próxima Reserva y Gamificación en paralelo
      const [
        proxRes,
        progresoRes,
        rankingRes,
        premiosRes,
        insigniasRes,
        historialRes,
        reglasRes,
      ] = await Promise.all([
        reservasService.obtenerProximaReservaUsuario(clienteId, empresaId),
        gamificacionService.obtenerProgresoGamificacion(clienteId, empresaId),
        gamificacionService.obtenerRankingPorPlan(empresaId, planId, clienteId),
        gamificacionService.obtenerPremiosPlan(empresaId, planId),
        gamificacionService.obtenerInsigniasUsuario(clienteId, empresaId),
        gamificacionService.obtenerHistorialAsistencias(clienteId, empresaId),
        gamificacionService.obtenerReglasXP(empresaId),
      ])

      // Actualizar estados
      if (proxRes.data) {
        setProximaReserva(proxRes.data)
      } else {
        setProximaReserva(null)
      }

      if (progresoRes.data) {
        setProgresoGami(progresoRes.data)
      }

      if (rankingRes.data || rankingRes.ranking) {
        setRankingPlan(rankingRes.ranking || rankingRes.data || [])
        setMiPosicionRanking(rankingRes.miPosicion || 0)
      }

      if (premiosRes) {
        const premiosArr = Array.isArray(premiosRes) ? premiosRes : (premiosRes as { data?: PremioPlanPodio[] }).data || []
        setPremiosPodio(premiosArr)
      }

      if (insigniasRes) {
        const insigniasArr = Array.isArray(insigniasRes) ? insigniasRes : (insigniasRes as { data?: InsigniaUsuario[] }).data || []
        setInsignias(insigniasArr)
      }

      if (historialRes) {
        const histArr = Array.isArray(historialRes) ? historialRes : (historialRes as { data?: HistorialAsistenciaItem[] }).data || []
        setHistorialAsistencias(histArr)
      }

      if (reglasRes.data) {
        setReglasXp(reglasRes.data)
      }

      // Preparar notificaciones contextuales
      const notifs: NotificacionItem[] = []
      if (proxRes.data) {
        notifs.push({
          id: 'notif-proxima',
          titulo: 'Próxima clase programada',
          descripcion: `${proxRes.data.clase_titulo} hoy/próximamente a las ${proxRes.data.hora_inicio}. Puesto #${proxRes.data.bicicleta_numero || 'Asignado'}.`,
          tipo: 'clase',
          leida: false,
        })
      }

      if (tiq?.fecha_vencimiento) {
        const diffDias = Math.ceil(
          (new Date(tiq.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        if (diffDias >= 0 && diffDias <= 7) {
          notifs.push({
            id: 'notif-vigencia',
            titulo: 'Vencimiento de tu Plan',
            descripcion: `Tu plan "${tiq.plan?.nombre || 'Activo'}" vence en ${diffDias} ${diffDias === 1 ? 'día' : 'días'}. ¡Aprovecha tus créditos!`,
            tipo: 'plan',
            leida: false,
          })
        }
      }

      if (credTotalRes.data !== null && credTotalRes.data <= 1) {
        notifs.push({
          id: 'notif-creditos',
          titulo: 'Créditos casi agotados',
          descripcion: `Solo te queda ${credTotalRes.data} crédito. Recarga tu tiquetera para no perder tu puesto preferido.`,
          tipo: 'plan',
          leida: false,
        })
      }

      setNotifications(notifs)
      setUnreadNotificationsCount(notifs.length)

      // Soporte Offline: Cachear próxima reserva
      if (proxRes.data) {
        try {
          const passPayload: ReservaPaseOffline = {
            reservaId: proxRes.data.id,
            codigoQR: currentUser?.codigo_qr || proxRes.data.codigo_qr || clienteId,
            clienteNombre: currentUser?.nombre_completo || 'Alumno',
            clienteDocumento: currentUser?.documento || null,
            claseTitulo: proxRes.data.clase_titulo,
            instructorNombre: proxRes.data.instructor_nombre || 'Instructor',
            bicicletaNumero: proxRes.data.bicicleta_numero || 0,
            fecha: proxRes.data.fecha,
            horaInicio: proxRes.data.hora_inicio,
            horaFin: proxRes.data.hora_fin,
            estudioNombre: studioName,
            colorPrimario: currentPalette.primaryHex,
            guardadoEn: new Date().toISOString(),
          }
          await offlineService.guardarPaseOffline(passPayload)
          setOfflinePass(passPayload)
        } catch (e) {
          console.warn('[ClientDashboard] Error cacheando pase offline:', e)
        }
      }
    } catch (err) {
      console.warn('[ClientDashboard] Error cargando datos unificados:', err)
    } finally {
      setRefreshing(false)
    }
  }, [clienteId, empresaId, studioName, currentPalette.primaryHex, currentUser?.codigo_qr, currentUser?.nombre_completo, currentUser?.documento])

  useEffect(() => {
    cargarTodosLosDatos()
  }, [cargarTodosLosDatos])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await cargarTodosLosDatos()
    toast({
      title: 'Datos sincronizados',
      description: 'Tu progreso, ranking y estado de reservas se han actualizado.',
    })
  }

  // Cálculos de Gamificación
  const puntosAcumulados = progresoGami?.puntos_acumulados ?? 0
  const infoNivel = calcularNivelUsuario(puntosAcumulados)
  const nombreNivel = NOMBRES_NIVELES[Math.min(infoNivel.nivel - 1, NOMBRES_NIVELES.length - 1)] || 'Potencia'

  // Métricas de salud / ejercicio
  const totalClasesCompletadas = historialAsistencias.length || progresoGami?.dias_cumplidos || 0
  const caloriasQuemadas = totalClasesCompletadas > 0 ? totalClasesCompletadas * 385 : 385
  const fcPromedio = 142 // Ritmo cardíaco promedio adaptado
  const diasCumplidos = progresoGami?.dias_cumplidos || totalClasesCompletadas
  const diasProgramados = progresoGami?.dias_programados || (tiqueteraActiva?.plan?.creditos ? tiqueteraActiva.plan.creditos : 12)
  const porcentajePlan = diasProgramados > 0 ? Math.min(100, Math.round((diasCumplidos / diasProgramados) * 100)) : 0
  const rachaSemanas = Math.max(1, Math.floor(diasCumplidos / 3))

  // Nombre de pila para saludo
  const primerNombre = (currentUser?.nombre_completo || 'Alejandro').trim().split(' ')[0]

  // Avatar e iniciales
  const avatarIniciales = (currentUser?.nombre_completo || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  // Icono para la pestaña Clases según vertical
  const ClasesTabIcon = verticalConfig.showBicycleMap ? Bike : Calendar

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-12 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 sm:pt-6 space-y-6">
        {/* ============================================================ */}
        {/* 1. Cabecera Móvil e Identidad Dinámica de Marca Blanca       */}
        {/* ============================================================ */}
        <header className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          {/* Logo y Nombre del Estudio Activo */}
          <div className="flex items-center gap-2.5 min-w-0">
            {estudioActivo?.logo_url ? (
              <img
                src={estudioActivo.logo_url}
                alt={estudioActivo.nombre}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white/5 border border-border/80 shadow-xs p-1"
              />
            ) : (
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-white shadow-xs ${currentPalette.bgClass}`}
              >
                {estudioActivo?.nombre ? estudioActivo.nombre.charAt(0).toUpperCase() : 'R'}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  {estudioActivo?.nombre || studioName || 'Reserly Studio'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">
                Hola, {primerNombre} 👋
              </h1>
            </div>
          </div>

          {/* Acciones de Cabecera: Cambiar Estudio y Notificaciones */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isSingleTenant && onNavigateToDirectory && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToDirectory}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs gap-1 font-semibold border-border/80 hover:bg-muted"
                title="Cambiar de estudio o sede"
              >
                <Building2 className={`w-3.5 h-3.5 ${currentPalette.textClass}`} />
                <span className="hidden sm:inline">Cambiar Estudio</span>
              </Button>
            )}

            {/* Campana de Notificaciones con Badge */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowNotifications((prev) => !prev)
                  setUnreadNotificationsCount(0)
                }}
                className="h-8 w-8 sm:h-9 sm:w-9 relative rounded-full border-border/80"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4 text-foreground" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-xs">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Button>

              {/* Popover de Notificaciones */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-card border border-border shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b mb-3">
                    <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Bell className={`w-4 h-4 ${currentPalette.textClass}`} />
                      Notificaciones
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No tienes alertas pendientes por el momento.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                              {n.titulo}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Ahora</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {n.descripcion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 mt-2 border-t flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNotifications([])
                        setShowNotifications(false)
                      }}
                      className="text-xs h-7 px-2"
                    >
                      Limpiar todas
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Refrescar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
              title="Sincronizar datos"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Notificación de Pase Offline si existe respaldo local */}
        {offlinePass && !proximaReserva && (
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Pase sin conexión disponible para <strong>{offlinePass.claseTitulo}</strong> ({offlinePass.fecha})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQrModal(true)}
              className="h-7 text-[11px] font-bold border-amber-500/40"
            >
              Ver Pase
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 1: INICIO (Perfil Gamificado y Progreso)             */}
        {/* ============================================================ */}
        {activeTab === 'inicio' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 1.1 Tarjeta Superior de Nivel y XP */}
            <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-muted/30 shadow-md">
              <div
                className={`absolute top-0 right-0 w-44 h-44 rounded-full bg-gradient-to-bl ${currentPalette.fromClass} ${currentPalette.toClass} opacity-10 blur-2xl pointer-events-none`}
              />

              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                  {/* Avatar con anillo de progreso rojo */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-background overflow-hidden flex items-center justify-center bg-muted ring-3 ${currentPalette.ringClass} shadow-md`}
                      >
                        {currentUser?.avatar_url ? (
                          <img
                            src={currentUser.avatar_url}
                            alt={currentUser.nombre_completo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center ${currentPalette.bgClass} text-white font-black text-xl`}
                          >
                            {avatarIniciales || <User className="w-8 h-8" />}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-xs ring-2 ring-background">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="text-center sm:text-left">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                        <Bike className="w-3.5 h-3.5" />
                        {verticalConfig.clienteSingular} {estudioActivo?.nombre || studioName}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                        Nivel {infoNivel.nivel} · {nombreNivel}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {rankingPlan.length > 0 && miPosicionRanking > 0
                          ? `Posición #${miPosicionRanking} en la Liga del Plan`
                          : 'Compite en la Liga de tu Plan'}
                      </span>
                    </div>
                  </div>

                  {/* Píldora de XP acumulados */}
                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                    <div
                      className={`px-3.5 py-1.5 rounded-full text-white text-xs sm:text-sm font-black shadow-xs flex items-center gap-1.5 ${currentPalette.bgClass}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{puntosAcumulados.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progreso al siguiente nivel */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Avance a Nivel {infoNivel.nivel + 1}
                    </span>
                    <span className="font-mono font-medium">
                      {`${infoNivel.puntosEnNivel} / 300 XP para el siguiente nivel`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${currentPalette.bgClass}`}
                      style={{ width: `${Math.max(5, infoNivel.porcentajeNivel)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1.2 Fila de 3 Mini-Tarjetas de Métricas */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              {/* Tarjeta 1: Calorías */}
              <Card className="border-border/60 bg-card/80 p-3 sm:p-4 text-center shadow-xs">
                <div className="mx-auto w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-xl font-black text-foreground tracking-tight">
                  {caloriasQuemadas}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  kcal Quemadas
                </div>
              </Card>

              {/* Tarjeta 2: FC Promedio */}
              <Card className="border-border/60 bg-card/80 p-3 sm:p-4 text-center shadow-xs">
                <div className="mx-auto w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1.5">
                  <Heart className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-xl font-black text-foreground tracking-tight">
                  {fcPromedio} <span className="text-xs font-normal">BPM</span>
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  FC Promedio
                </div>
              </Card>

              {/* Tarjeta 3: Clases / Días */}
              <Card className="border-border/60 bg-card/80 p-3 sm:p-4 text-center shadow-xs">
                <div className={`mx-auto w-8 h-8 rounded-full bg-primary/10 ${currentPalette.textClass} flex items-center justify-center mb-1.5`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-xl font-black text-foreground tracking-tight">
                  {diasCumplidos} / {diasProgramados}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Clases Prog.
                </div>
              </Card>
            </div>

            {/* 1.3 Tarjeta Dividida de Cumplimiento del Plan y Racha */}
            <Card className="border-border/60 overflow-hidden shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                {/* Mitad Izquierda: Donut Progress Ring SVG */}
                <div className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-muted/40"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={`${currentPalette.textClass} transition-all duration-700 ease-out`}
                        strokeDasharray={`${porcentajePlan}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-black text-foreground">
                        {porcentajePlan}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Cumplimiento de Plan
                    </span>
                    <h4 className="text-sm font-black text-foreground mt-0.5">
                      {tiqueteraActiva?.plan?.nombre || 'Plan Personal'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cumplidos: <span className="font-bold text-foreground">{diasCumplidos}</span> de{' '}
                      <span className="font-bold text-foreground">{diasProgramados}</span> clases
                    </p>
                  </div>
                </div>

                {/* Mitad Derecha: Racha de Constancia */}
                <div className="p-4 sm:p-5 flex items-center gap-4 bg-muted/10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <Flame className="w-7 h-7 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Racha de Constancia
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{rachaSemanas} {rachaSemanas === 1 ? 'semana' : 'semanas'} activas</span>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      ¡Mantén el ritmo! Cada asistencia consecutiva suma bonos de XP.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 1.4 Próxima Reserva y Pase QR */}
            <Card className="border-border/60 overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${currentPalette.textClass}`} />
                    <span>Tu Próxima Reserva</span>
                  </CardTitle>
                  {proximaReserva && (
                    <Badge variant="outline" className={`text-xs font-bold border-primary/30 ${currentPalette.textClass}`}>
                      Confirmada
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {proximaReserva ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-foreground">
                            {proximaReserva.clase_titulo}
                          </span>
                          <Badge variant="secondary" className="text-[11px] font-bold">
                            {verticalConfig.recursoSingular} #{proximaReserva.bicicleta_numero || '1'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-y-1 gap-x-3">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {proximaReserva.hora_inicio} - {proximaReserva.hora_fin}
                          </span>
                          <span>•</span>
                          <span>Fecha: {proximaReserva.fecha}</span>
                          <span>•</span>
                          <span>Instructor: {proximaReserva.instructor_nombre || 'Instructor Pro'}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => setShowQrModal(true)}
                        className={`h-9 px-4 font-bold text-xs gap-1.5 ${currentPalette.bgClass} text-white shadow-xs hover:opacity-95`}
                      >
                        <QrIcon className="w-4 h-4" />
                        <span>Mostrar mi Pase QR</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <Bike className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">No tienes clases próximas agendadas</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Elige tu horario y aparta tu bicicleta favorita ahora mismo
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setActiveTab('clases')
                        onNavigateToBooking()
                      }}
                      className={`font-bold text-xs gap-1.5 ${currentPalette.bgClass} text-white`}
                    >
                      <span>Reservar ahora</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 2: CLASES (Mapa Interactivo IndoorBikeMap)            */}
        {/* ============================================================ */}
        {activeTab === 'clases' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Horarios y Reserva de {verticalConfig.recursoPlural}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Selecciona tu sesión e interactúa directamente sobre el mapa de la sala
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={cargarTodosLosDatos}
                className="h-8 text-xs gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Actualizar</span>
              </Button>
            </div>

            {/* Mapa de Bicicletas Incrustado */}
            <div className="rounded-2xl border bg-card p-2 sm:p-4 shadow-sm">
              <React.Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center p-12 space-y-3">
                    <RotateCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Cargando mapa interactivo...
                    </span>
                  </div>
                }
              >
                <IndoorBikeMapLazy
                  currentUser={currentUser}
                  onReservaCompletada={() => {
                    cargarTodosLosDatos()
                    toast({
                      title: '¡Reserva confirmada!',
                      description: 'Tu cupo ha sido reservado y los XP se han actualizado.',
                    })
                  }}
                  onVolverAlDashboard={() => setActiveTab('inicio')}
                  onCambiarEstudio={!isSingleTenant ? onNavigateToDirectory : undefined}
                />
              </React.Suspense>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 3: RETOS (Liga del Plan Activo, Podio y Desafíos)    */}
        {/* ============================================================ */}
        {activeTab === 'retos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Encabezado */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-xs font-bold border-primary/30 ${currentPalette.textClass}`}>
                  Temporada en Curso
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Compite con alumnos de tu mismo plan
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <span>Liga de tu Plan Activo</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Suma XP por asistencia puntual, completa tus semanas y sube al podio por premios mensuales
              </p>
            </div>

            {/* 3.1 Podio de Premios Vigentes (1°, 2° y 3°) */}
            <Card className="border-border/60 overflow-hidden shadow-sm bg-gradient-to-b from-card to-muted/20">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Premios del Podio Mensual</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Los 3 alumnos con más XP al finalizar el ciclo reclaman estos beneficios en recepción
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {premiosPodio.map((premio) => {
                    const esPrimero = premio.puesto === 1
                    const esSegundo = premio.puesto === 2

                    return (
                      <div
                        key={premio.id || premio.puesto}
                        className={`rounded-2xl p-4 border text-center transition-all relative ${
                          esPrimero
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                            : esSegundo
                            ? 'bg-slate-500/10 border-slate-400/40'
                            : 'bg-orange-500/10 border-orange-500/30'
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {esPrimero ? '🥇' : esSegundo ? '🥈' : '🥉'}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider block text-muted-foreground">
                          {premio.puesto}° Puesto
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground mt-1 leading-snug">
                          {premio.premio}
                        </h4>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 3.2 Tabla / Lista de Clasificación */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Ranking de Alumnos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {rankingPlan.length} participantes activos en esta categoría
                    </CardDescription>
                  </div>
                  {miPosicionRanking > 0 && (
                    <Badge variant="secondary" className="font-bold text-xs">
                      Tu Puesto: #{miPosicionRanking}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {rankingPlan.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Cargando participantes de la liga...
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {rankingPlan.slice(0, 10).map((alumno) => {
                      const esYo = alumno.es_usuario_actual || alumno.usuario_id === currentUser?.id

                      return (
                        <div
                          key={alumno.usuario_id}
                          className={`flex items-center justify-between p-3 sm:p-4 gap-3 transition-colors ${
                            esYo
                              ? 'bg-primary/10 font-bold border-l-4 border-l-primary'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Posición / Medalla */}
                            <div className="w-7 text-center font-black text-sm shrink-0">
                              {alumno.medalla ? (
                                <span className="text-lg">{alumno.medalla}</span>
                              ) : (
                                <span className="text-muted-foreground">#{alumno.posicion}</span>
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border">
                              {alumno.avatar_url ? (
                                <img
                                  src={alumno.avatar_url}
                                  alt={alumno.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{alumno.nombre.charAt(0).toUpperCase()}</span>
                              )}
                            </div>

                            {/* Nombre y Nivel */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                  {alumno.nombre}
                                </span>
                                {esYo && (
                                  <Badge variant="default" className="text-[9px] h-4 px-1.5 font-bold">
                                    Tú
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground block">
                                Nivel {alumno.nivel} · {alumno.dias_cumplidos} clases cumplidas
                              </span>
                            </div>
                          </div>

                          {/* XP y Barra */}
                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-black font-mono text-foreground block">
                              {alumno.puntos_xp.toLocaleString()} XP
                            </span>
                            <div className="w-16 sm:w-20 h-1.5 bg-muted rounded-full overflow-hidden mt-1 ml-auto">
                              <div
                                className={`h-full ${currentPalette.bgClass}`}
                                style={{ width: `${Math.min(100, alumno.porcentaje)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3.3 Desafíos y Reglas de Puntos Activas */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Cómo Ganar Más XP</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Reglas de puntuación vigentes configuradas por {estudioActivo?.nombre || studioName}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(reglasXp.length > 0
                    ? reglasXp
                    : [
                        {
                          id: 'r-1',
                          criterio: 'Asistencia a Clase',
                          puntos_xp: 100,
                          descripcion: 'Por cada clase completada con validación de ingreso',
                        },
                        {
                          id: 'r-2',
                          criterio: 'Puntualidad Extrema',
                          puntos_xp: 30,
                          descripcion: 'Llega 10 minutos antes del inicio de la sesión',
                        },
                        {
                          id: 'r-3',
                          criterio: 'Plan Cumplido 100%',
                          puntos_xp: 200,
                          descripcion: 'Completa todas las sesiones de tu tiquetera en vigencia',
                        },
                        {
                          id: 'r-4',
                          criterio: 'Racha Semanal',
                          puntos_xp: 75,
                          descripcion: 'Asiste de forma constante al menos 3 veces por semana',
                        },
                      ]
                  ).map((regla) => (
                    <div
                      key={regla.id}
                      className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {regla.criterio}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {regla.descripcion || 'Puntos automáticos al cumplir el objetivo'}
                        </p>
                      </div>
                      <Badge className={`font-mono font-black text-xs shrink-0 ${currentPalette.bgClass} text-white`}>
                        +{regla.puntos_xp} XP
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 4: PROGRESO (Historial e Insignias)                  */}
        {/* ============================================================ */}
        {activeTab === 'progreso' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Tu Progreso y Logros
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Insignias desbloqueadas y registro histórico de tus sesiones
              </p>
            </div>

            {/* 4.1 Medallero de 5 Insignias */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-500" />
                  <span>Medallero de Insignias</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {insignias.filter((i) => i.desbloqueada).length} de {insignias.length || 5} insignias obtenidas
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {insignias.map((ins) => {
                    const desbloqueada = ins.desbloqueada

                    // Icono dinámico según insignia
                    const renderIcon = () => {
                      if (ins.id === 'primera-pedalada') return <Bike className="w-6 h-6" />
                      if (ins.id === 'a-tiempo') return <Clock className="w-6 h-6" />
                      if (ins.id === 'constancia') return <Flame className="w-6 h-6" />
                      if (ins.id === 'energia') return <Zap className="w-6 h-6" />
                      if (ins.id === 'referente') return <Crown className="w-6 h-6" />
                      return <Award className="w-6 h-6" />
                    }

                    return (
                      <div
                        key={ins.id}
                        className={`rounded-2xl p-3 sm:p-4 border text-center flex flex-col items-center justify-between transition-all relative ${
                          desbloqueada
                            ? 'bg-gradient-to-b from-amber-500/15 via-card to-card border-amber-500/40 shadow-xs'
                            : 'bg-muted/30 border-dashed border-border opacity-60'
                        }`}
                      >
                        {/* Estado icono */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-xs transition-transform ${
                            desbloqueada
                              ? 'bg-amber-500 text-white scale-105'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {desbloqueada ? renderIcon() : <Lock className="w-5 h-5" />}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-foreground leading-tight">
                            {ins.titulo}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {ins.descripcion}
                          </p>
                        </div>

                        <div className="mt-2.5">
                          {desbloqueada ? (
                            <Badge variant="outline" className="text-[9px] font-bold text-amber-600 dark:text-amber-400 border-amber-500/40">
                              Desbloqueada
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              Bloqueada
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 4.2 Historial Cronológico de Asistencias */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${currentPalette.textClass}`} />
                  <span>Historial de Asistencias</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Detalle de tus sesiones asistidas y puntos XP sumados
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                {historialAsistencias.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Aún no registras asistencias confirmadas en este estudio.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {historialAsistencias.map((h) => (
                      <div
                        key={h.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-foreground block">
                              {h.clase_titulo}
                            </span>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span>{h.fecha}</span>
                              <span>•</span>
                              <span>{h.hora_inicio}</span>
                              <span>•</span>
                              <span>{verticalConfig.recursoSingular} #{h.bicicleta_numero || '1'}</span>
                              <span>•</span>
                              <span>{h.instructor_nombre}</span>
                            </div>
                          </div>
                        </div>

                        <Badge className="font-mono font-black text-xs bg-emerald-600 text-white shrink-0">
                          +{h.puntos_xp} XP
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 5: PERFIL (ClientProfileView)                        */}
        {/* ============================================================ */}
        {activeTab === 'perfil' && (
          <div className="animate-in fade-in duration-200">
            <ClientProfileView
              currentUser={currentUser}
              onUserUpdated={(updated) => setCurrentUser(updated)}
              tiqueteraActiva={tiqueteraActiva}
              creditosDisponibles={creditosDisponibles}
              onNavigateToPlanes={onNavigateToPlanes}
              onNavigateToDirectory={!isSingleTenant ? onNavigateToDirectory : undefined}
              onSignOut={onSignOut}
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. Barra de Navegación Inferior Móvil (Bottom Tab Bar)       */}
      {/* ============================================================ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border flex justify-around items-center py-2 px-1 pb-safe shadow-lg"
        aria-label="Navegación Móvil"
      >
        {/* 1. Inicio */}
        <button
          onClick={() => setActiveTab('inicio')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
            activeTab === 'inicio'
              ? `${currentPalette.textClass} font-bold scale-105`
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Inicio</span>
        </button>

        {/* 2. Clases */}
        <button
          onClick={() => setActiveTab('clases')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
            activeTab === 'clases'
              ? `${currentPalette.textClass} font-bold scale-105`
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClasesTabIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{verticalConfig.sesionPlural}</span>
        </button>

        {/* 3. Retos */}
        <button
          onClick={() => setActiveTab('retos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
            activeTab === 'retos'
              ? `${currentPalette.textClass} font-bold scale-105`
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Retos</span>
        </button>

        {/* 4. Progreso */}
        <button
          onClick={() => setActiveTab('progreso')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
            activeTab === 'progreso'
              ? `${currentPalette.textClass} font-bold scale-105`
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Progreso</span>
        </button>

        {/* 5. Perfil */}
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
            activeTab === 'perfil'
              ? `${currentPalette.textClass} font-bold scale-105`
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Perfil</span>
        </button>
      </nav>

      {/* ============================================================ */}
      {/* Modal Pase QR de Reserva Activa                             */}
      {/* ============================================================ */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <QrIcon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black tracking-tight mb-1">
              Pase de Acceso a Clase
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {proximaReserva?.clase_titulo || offlinePass?.claseTitulo || 'Reserva Activa'}
            </p>

            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md mb-4">
              <QRCode
                value={
                  proximaReserva?.codigo_qr ||
                  offlinePass?.codigoQR ||
                  currentUser?.codigo_qr ||
                  currentUser?.id ||
                  'RESERLY-QR-DEFAULT'
                }
                size={200}
                showValue={false}
                showActions={false}
              />
            </div>

            <div className="bg-slate-100 rounded-xl p-3 w-full text-xs text-slate-700 space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">{verticalConfig.recursoSingular}:</span>
                <span className="font-bold">
                  #{proximaReserva?.bicicleta_numero || offlinePass?.bicicletaNumero || '1'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horario:</span>
                <span className="font-bold">
                  {proximaReserva?.hora_inicio || offlinePass?.horaInicio || '07:00'} -{' '}
                  {proximaReserva?.hora_fin || offlinePass?.horaFin || '08:00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alumno:</span>
                <span className="font-bold">{currentUser?.nombre_completo || offlinePass?.clienteNombre || 'Alumno'}</span>
              </div>
            </div>

            <Button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
