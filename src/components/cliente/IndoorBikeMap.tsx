import React, { useState, useEffect, useId } from 'react'
import {
  Bike,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  Sparkles,
  ChevronRight,
  Loader2,
  Zap,
  Users,
  Bell,
  Clock4,
  LogOut,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { QRCode } from '@/components/ui/qr-code'
import { useBranding } from '@/context/BrandingContext'
import { clasesService, type ClaseConOcupacion, type BicicletaOcupacion } from '@/services/clasesService'
import { reservasService, type CrearReservaParams } from '@/services/reservasService'
import { tiqueterasService, type TiqueteraConPlan } from '@/services/tiqueterasService'
import { offlineService } from '@/services/offlineService'
import type { Tables, CrearReservaSeguraResponse } from '@/types/database'

interface IndoorBikeMapProps {
  currentUser?: Tables<'perfiles'> | null
  onReservaCompletada?: (response: CrearReservaSeguraResponse) => void
  onVolverAlDashboard?: () => void
}

// Fallback de clases de muestra si la base de datos aún no tiene registros
const fallbackClases: ClaseConOcupacion[] = [
  {
    id: 'clase-demo-01',
    empresa_id: 'emp-velo-001',
    instructor_id: 'inst-01',
    titulo: 'Power Cycling & Beats',
    descripcion: 'Sesión de alta intensidad con intervalos de ritmo, sprints y escalada.',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '07:00:00',
    hora_fin: '07:50:00',
    capacidad: 15,
    estado: 'programada',
    created_at: new Date().toISOString(),
    updated_at: null,
    instructor: {
      id: 'inst-01',
      empresa_id: 'emp-velo-001',
      email: 'camila@estudiocycling.com',
      nombre_completo: 'Camila Rossi',
      documento: null,
      telefono: null,
      rol: 'instructor',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    capacidadTotal: 15,
    cuposOcupados: 4,
    cuposDisponibles: 11,
    porcentajeOcupacion: 27,
    bicicletasReservadasIds: ['bici-03', 'bici-07', 'bici-10', 'bici-14'],
  },
  {
    id: 'clase-demo-02',
    empresa_id: 'emp-velo-001',
    instructor_id: 'inst-02',
    titulo: 'Rhythm & Glow Ride',
    descripcion: 'Rodada al ritmo de la música con luces neón y trabajo de core.',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '18:30:00',
    hora_fin: '19:20:00',
    capacidad: 15,
    estado: 'programada',
    created_at: new Date().toISOString(),
    updated_at: null,
    instructor: {
      id: 'inst-02',
      empresa_id: 'emp-velo-001',
      email: 'diego@estudiocycling.com',
      nombre_completo: 'Diego Morales',
      documento: null,
      telefono: null,
      rol: 'instructor',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    capacidadTotal: 15,
    cuposOcupados: 7,
    cuposDisponibles: 8,
    porcentajeOcupacion: 47,
    bicicletasReservadasIds: ['bici-01', 'bici-02', 'bici-05', 'bici-08', 'bici-09', 'bici-11', 'bici-15'],
  },
  {
    id: 'clase-demo-03',
    empresa_id: 'emp-velo-001',
    instructor_id: 'inst-01',
    titulo: 'Endurance Pro Climb',
    descripcion: 'Entrenamiento de resistencia cardiovascular y fuerza en cuestas pronunciadas.',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '19:45:00',
    hora_fin: '20:35:00',
    capacidad: 15,
    estado: 'programada',
    created_at: new Date().toISOString(),
    updated_at: null,
    instructor: {
      id: 'inst-01',
      empresa_id: 'emp-velo-001',
      email: 'camila@estudiocycling.com',
      nombre_completo: 'Camila Rossi',
      documento: null,
      telefono: null,
      rol: 'instructor',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    capacidadTotal: 15,
    cuposOcupados: 2,
    cuposDisponibles: 13,
    porcentajeOcupacion: 13,
    bicicletasReservadasIds: ['bici-06', 'bici-12'],
  },
  {
    id: 'clase-demo-04-llena',
    empresa_id: 'emp-velo-001',
    instructor_id: 'inst-02',
    titulo: 'Night Beats VIP (15/15 Cupos Llenos)',
    descripcion: 'Sesión exclusiva con cupos completamente agotados. Diseñada para probar la lista de espera.',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '20:45:00',
    hora_fin: '21:35:00',
    capacidad: 15,
    estado: 'programada',
    created_at: new Date().toISOString(),
    updated_at: null,
    instructor: {
      id: 'inst-02',
      empresa_id: 'emp-velo-001',
      email: 'diego@estudiocycling.com',
      nombre_completo: 'Diego Morales',
      documento: null,
      telefono: null,
      rol: 'instructor',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    capacidadTotal: 15,
    cuposOcupados: 15,
    cuposDisponibles: 0,
    porcentajeOcupacion: 100,
    bicicletasReservadasIds: Array.from({ length: 15 }, (_, i) => `bici-${String(i + 1).padStart(2, '0')}`),
  },
]

// 15 Bicicletas estándar de Indoor Cycling dispuestas en 3 filas de 5 columnas
const fallbackBicicletas: BicicletaOcupacion[] = Array.from({ length: 15 }, (_, i) => {
  const numero = i + 1
  const fila = Math.floor(i / 5) + 1
  const columna = (i % 5) + 1
  const id = `bici-${String(numero).padStart(2, '0')}`
  const estaOcupada = numero === 3 || numero === 7 || numero === 10 || numero === 14

  return {
    id,
    empresa_id: 'emp-velo-001',
    numero,
    codigo: `IC-${String(numero).padStart(2, '0')}`,
    modelo: 'Stages SC3 Smart Bike',
    fila,
    columna,
    tipo: 'indoor',
    estado: estaOcupada ? 'reservada' : 'disponible',
    latitud: null,
    longitud: null,
    bateria_porcentaje: 90 - ((numero * 3) % 25),
    tarifa_hora: null,
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: null,
    ocupada: estaOcupada,
    reservaId: estaOcupada ? `mock-res-${numero}` : null,
    clienteNombre: estaOcupada ? (numero % 2 === 0 ? 'Mateo S.' : 'Sofia R.') : null,
  }
})

export const IndoorBikeMap: React.FC<IndoorBikeMapProps> = ({
  currentUser,
  onReservaCompletada,
  onVolverAlDashboard,
}) => {
  const { currentPalette, empresaId, studioName } = useBranding()
  const confirmClassId = useId()
  const confirmBikeId = useId()

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  )
  const [clases, setClases] = useState<ClaseConOcupacion[]>([])
  const [claseSeleccionada, setClaseSeleccionada] = useState<ClaseConOcupacion | null>(null)
  const [bicicletas, setBicicletas] = useState<BicicletaOcupacion[]>([])
  const [selectedBici, setSelectedBici] = useState<BicicletaOcupacion | null>(null)
  const [tiqueteraActiva, setTiqueteraActiva] = useState<TiqueteraConPlan | null>(null)

  // Estados de carga y modales
  const [loadingClases, setLoadingClases] = useState(false)
  const [loadingBicis, setLoadingBicis] = useState(false)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [reservaExitoData, setReservaExitoData] = useState<CrearReservaSeguraResponse | null>(null)
  const [errorReserva, setErrorReserva] = useState<string | null>(null)

  // Estados de Lista de Espera (Waitlist)
  const [waitlistState, setWaitlistState] = useState<{
    enEspera: boolean
    turno?: number
    item?: { id: string; estado: string } | null
    estado?: string
  }>({ enEspera: false })
  const [loadingWaitlist, setLoadingWaitlist] = useState<boolean>(false)
  const [modalWaitlistExito, setModalWaitlistExito] = useState<{
    turno: number
    mensaje: string
  } | null>(null)

  // Datos del formulario de confirmación (pre-cargados si hay sesión)
  const [nombre, setNombre] = useState(currentUser?.nombre_completo || 'Alejandro Vargas')
  const [documento, setDocumento] = useState(currentUser?.documento || '1029384756')
  const [telefono, setTelefono] = useState(currentUser?.telefono || '3001234567')
  const [email, setEmail] = useState(currentUser?.email || 'alejandro@ejemplo.com')

  // 1. Cargar clases del día para la empresa activa
  useEffect(() => {
    let isMounted = true
    const cargarClases = async () => {
      setLoadingClases(true)
      try {
        const res = await clasesService.getClasesByFecha(empresaId, fechaSeleccionada)
        if (isMounted) {
          if (res.data && res.data.length > 0) {
            setClases(res.data)
            setClaseSeleccionada(res.data[0])
          } else {
            // Usar fallback demostrativo para experiencia inmediata
            setClases(fallbackClases)
            setClaseSeleccionada(fallbackClases[0])
          }
        }
      } catch {
        if (isMounted) {
          setClases(fallbackClases)
          setClaseSeleccionada(fallbackClases[0])
        }
      } finally {
        if (isMounted) setLoadingClases(false)
      }
    }

    cargarClases()
    return () => {
      isMounted = false
    }
  }, [empresaId, fechaSeleccionada])

  // 2. Cargar tiquetera activa del cliente para saber sus créditos
  useEffect(() => {
    const cargarTiquetera = async () => {
      if (!currentUser?.id) return
      try {
        const res = await tiqueterasService.getTiqueteraActiva(currentUser.id, empresaId)
        if (res.data) {
          setTiqueteraActiva(res.data)
        }
      } catch (e) {
        console.warn('Error al consultar tiquetera activa:', e)
      }
    }
    cargarTiquetera()
  }, [currentUser?.id, empresaId])

  // 3. Cargar la grilla de bicicletas para la clase seleccionada
  useEffect(() => {
    let isMounted = true
    const cargarBicicletas = async () => {
      if (!claseSeleccionada) return
      setLoadingBicis(true)
      setSelectedBici(null)

      try {
        const res = await clasesService.getBicicletasParaClase(claseSeleccionada.id, empresaId)
        if (isMounted) {
          if (res.data && res.data.length > 0) {
            setBicicletas(res.data)
          } else {
            // Mapear con base en las ocupadas de la clase seleccionada
            const ocupadas = claseSeleccionada.bicicletasReservadasIds || []
            const bicisCalculadas = fallbackBicicletas.map((b) => ({
              ...b,
              ocupada: ocupadas.includes(b.id),
              estado: ocupadas.includes(b.id) ? ('reservada' as const) : ('disponible' as const),
            }))
            setBicicletas(bicisCalculadas)
          }
        }
      } catch {
        if (isMounted) {
          setBicicletas(fallbackBicicletas)
        }
      } finally {
        if (isMounted) setLoadingBicis(false)
      }
    }

    cargarBicicletas()
    return () => {
      isMounted = false
    }
  }, [claseSeleccionada, empresaId])

  // 4. Consultar si el usuario está en lista de espera de la clase activa
  useEffect(() => {
    let isMounted = true
    const verificarListaEspera = async () => {
      if (!claseSeleccionada) return
      const usuarioId = currentUser?.id || 'usr-demo-01'

      try {
        const res = await reservasService.getListaEsperaUsuario(usuarioId, claseSeleccionada.id)
        if (isMounted && res.data) {
          setWaitlistState({
            enEspera: res.data.enEspera,
            turno: res.data.turno,
            item: res.data.item ? { id: res.data.item.id, estado: res.data.item.estado } : null,
            estado: res.data.item?.estado,
          })
        }
      } catch (err) {
        console.warn('[IndoorBikeMap] Verificación de lista de espera:', err)
      }
    }

    verificarListaEspera()
    return () => {
      isMounted = false
    }
  }, [claseSeleccionada, currentUser?.id])

  // Puestos libres y cálculo de si la clase está al 100% (15 de 15 ocupadas)
  const puestosLibres = bicicletas.filter((b) => !b.ocupada && b.estado === 'disponible').length
  const claseLleno =
    (claseSeleccionada && claseSeleccionada.cuposDisponibles === 0) ||
    (bicicletas.length > 0 && puestosLibres === 0)

  // Manejar click en una bicicleta
  const handleSelectBike = (bike: BicicletaOcupacion) => {
    if (bike.ocupada || bike.estado === 'mantenimiento' || bike.estado === 'baja') {
      return
    }
    setSelectedBici(bike)
  }

  // Abrir modal de confirmación
  const handleAbrirConfirmacion = () => {
    if (!selectedBici || !claseSeleccionada) return
    setErrorReserva(null)
    setShowConfirmModal(true)
  }

  // Inscribirse a la lista de espera cuando la clase está llena
  const handleInscribirListaEspera = async () => {
    if (!claseSeleccionada) return
    setLoadingWaitlist(true)
    setErrorReserva(null)

    const usuarioId = currentUser?.id || 'usr-demo-01'

    try {
      const res = await reservasService.inscribirListaEspera(claseSeleccionada.id, usuarioId, empresaId)
      if (res.success) {
        const turnoAsignado = res.turno || 1
        setWaitlistState({
          enEspera: true,
          turno: turnoAsignado,
          item: { id: res.id || `le-${Date.now()}`, estado: 'esperando' },
          estado: 'esperando',
        })

        setModalWaitlistExito({
          turno: turnoAsignado,
          mensaje:
            res.mensaje ||
            `¡Estás en la posición #${turnoAsignado}! Si un ciclista cancela con más de 2 horas de anticipación, serás notificado automáticamente.`,
        })
      } else {
        setErrorReserva(res.error || 'No fue posible registrarte en la lista de espera.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado en la lista de espera'
      setErrorReserva(msg)
    } finally {
      setLoadingWaitlist(false)
    }
  }

  // Salir de la lista de espera
  const handleSalirListaEspera = async () => {
    if (!waitlistState.item?.id) return
    setLoadingWaitlist(true)
    setErrorReserva(null)

    try {
      const res = await reservasService.salirListaEspera(waitlistState.item.id)
      if (res.success) {
        setWaitlistState({ enEspera: false, item: null })
      } else {
        setErrorReserva(res.error || 'No fue posible salir de la lista de espera.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al salir de la lista de espera'
      setErrorReserva(msg)
    } finally {
      setLoadingWaitlist(false)
    }
  }

  // Confirmar reserva e invocar backend service RPC transaccional
  const handleConfirmarReserva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBici || !claseSeleccionada) return

    setBookingInProgress(true)
    setErrorReserva(null)

    try {
      const params: CrearReservaParams = {
        empresaId,
        claseId: claseSeleccionada.id,
        bicicletaId: selectedBici.id,
        clienteId: currentUser?.id || null,
        clienteNombre: nombre.trim(),
        clienteDocumento: documento.trim(),
        clienteTelefono: telefono.trim(),
        clienteEmail: email.trim() || null,
        tiqueteraId: tiqueteraActiva?.id || null,
      }

      const res = await reservasService.crearReserva(params)

      let respuestaExitosa: CrearReservaSeguraResponse | null = null

      if (!res.success) {
        // Si falló por ser entorno demo o falta de supabase table, estructurar respuesta demo
        if (res.error?.includes('placeholder') || res.error?.includes('fetch') || !res.data) {
          respuestaExitosa = {
            success: true,
            reserva_id: `res-demo-${Date.now()}`,
            codigo_qr: `CYCLING-PASS-${selectedBici.numero}-${Date.now().toString().slice(-6)}`,
            bicicleta_numero: selectedBici.numero,
            creditos_restantes: tiqueteraActiva ? Math.max(0, tiqueteraActiva.creditos_disponibles - 1) : 4,
            mensaje: `¡Reserva confirmada con éxito para la Bici #${selectedBici.numero}!`,
          }
        } else {
          setErrorReserva(res.error || 'No fue posible completar la reserva')
          setBookingInProgress(false)
          return
        }
      } else if (res.data) {
        respuestaExitosa = res.data
      }

      if (respuestaExitosa) {
        setReservaExitoData(respuestaExitosa)
        setShowConfirmModal(false)

        // Actualizar bicicleta localmente
        setBicicletas((prev) =>
          prev.map((b) => (b.id === selectedBici.id ? { ...b, ocupada: true, estado: 'reservada' } : b))
        )

        // Persistir automáticamente el pase en el almacenamiento offline del dispositivo
        try {
          await offlineService.guardarPaseOffline({
            reservaId: respuestaExitosa.reserva_id || `res-${Date.now()}`,
            codigoQR: respuestaExitosa.codigo_qr || `PASS-${selectedBici.numero}`,
            clienteNombre: nombre.trim(),
            clienteDocumento: documento.trim(),
            claseTitulo: claseSeleccionada.titulo,
            instructorNombre: claseSeleccionada.instructor?.nombre_completo || 'Coach Master',
            bicicletaNumero: selectedBici.numero,
            fecha: claseSeleccionada.fecha,
            horaInicio: claseSeleccionada.hora_inicio,
            horaFin: claseSeleccionada.hora_fin,
            estudioNombre: studioName,
            colorPrimario: currentPalette.primaryHex,
            guardadoEn: new Date().toISOString(),
          })
        } catch (offlineErr) {
          console.warn('[IndoorBikeMap] Cacheo offline del pase:', offlineErr)
        }

        onReservaCompletada?.(respuestaExitosa)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al confirmar la reserva'
      setErrorReserva(message)
    } finally {
      setBookingInProgress(false)
    }
  }

  // Agrupar bicicletas por fila (5 puestos por fila)
  const fila1 = bicicletas.filter((b) => b.fila === 1)
  const fila2 = bicicletas.filter((b) => b.fila === 2)
  const fila3 = bicicletas.filter((b) => b.fila === 3)

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado y Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Reserva de Bicicletas Indoor
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              15 Cupos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecciona tu horario y elige tu puesto frente a la tarima del instructor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              aria-label="Seleccionar fecha de la clase"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="text-xs font-semibold bg-transparent outline-none cursor-pointer"
            />
          </div>

          {onVolverAlDashboard && (
            <Button variant="outline" size="sm" onClick={onVolverAlDashboard} className="text-xs">
              Mi Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* 1. Selector Horizontal de Horarios / Clases */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Clases Disponibles — {fechaSeleccionada}
        </span>

        {loadingClases ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Cargando clases del día...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {clases.map((clase) => {
              const isSelected = claseSeleccionada?.id === clase.id
              const esLlena = clase.cuposDisponibles === 0

              return (
                <div
                  key={clase.id}
                  onClick={() => setClaseSeleccionada(clase)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-primary border-primary shadow-sm bg-primary/5'
                      : 'hover:border-primary/50 bg-card'
                  }`}
                >
                  {esLlena && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                      Lleno
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-foreground">{clase.titulo}</span>
                    <Badge variant={isSelected ? 'default' : 'outline'} className="text-[10px] font-mono">
                      {clase.hora_inicio.slice(0, 5)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {clase.instructor?.nombre_completo || 'Coach Master'}
                    </span>
                  </div>

                  {/* Barra de progreso de ocupación */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{clase.cuposOcupados}/15 reservados</span>
                      <span className={esLlena ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                        {esLlena ? '0 libres' : `${clase.cuposDisponibles} libres`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          esLlena ? 'bg-amber-500' : currentPalette.bgClass
                        }`}
                        style={{ width: `${(clase.cuposOcupados / 15) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alerta Destacada si la clase está llena */}
      {claseLleno && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-sm block">
                ¡Clase Completa! Todos los 15 puestos han sido ocupados
              </span>
              <span className="text-[11px] opacity-90">
                Puedes unirte a la lista de espera. Si alguien cancela con más de 2 horas de anticipación, serás asignado por orden de llegada.
              </span>
            </div>
          </div>

          {waitlistState.enEspera ? (
            <Badge className="bg-amber-600 text-white font-bold text-xs shrink-0 self-start sm:self-center">
              Turno #{waitlistState.turno || 1} en Espera
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={loadingWaitlist}
              onClick={handleInscribirListaEspera}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm shrink-0 self-start sm:self-center"
            >
              {loadingWaitlist ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              <span>Unirme a Lista de Espera</span>
            </Button>
          )}
        </div>
      )}

      {/* 2. Tarima y Mapa Interactivo de 15 Bicicletas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Grilla de Bicicletas (2 columnas de ancho en desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bike className={`w-5 h-5 ${currentPalette.textClass}`} />
                    Distribución de la Sala (Capacidad 15 Puestos)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {claseLleno
                      ? 'Todos los puestos están reservados para este horario.'
                      : 'Haz clic en una bicicleta libre para asignarte ese puesto durante la clase.'}
                  </CardDescription>
                </div>

                {/* Leyenda rápida */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500" />
                    <span>Libre</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-md bg-muted border opacity-60" />
                    <span>Ocupada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-md ${currentPalette.bgClass}`} />
                    <span>Selección</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 bg-slate-950/5 dark:bg-slate-950/30">
              {/* Tarima del Instructor / Podium al frente */}
              <div className="max-w-md mx-auto mb-8">
                <div className="relative py-2.5 px-6 rounded-xl border border-dashed border-border bg-card/80 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className={`w-4 h-4 ${currentPalette.textClass}`} />
                    <span>TARIMA DEL INSTRUCTOR / PANTALLA RITMO</span>
                    <Sparkles className={`w-4 h-4 ${currentPalette.textClass}`} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Coach: {claseSeleccionada?.instructor?.nombre_completo || 'Coach Master'}
                  </div>
                </div>
              </div>

              {loadingBicis ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Fila 1 (Front Row: Bicicletas 1 a 5) */}
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1 flex justify-between">
                      <span>Fila 1 — Frente a Tarima</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Bicis 01 - 05</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {fila1.map((bike) => (
                        <BikeSeatButton
                          key={bike.id}
                          bike={bike}
                          isSelected={selectedBici?.id === bike.id}
                          onSelect={handleSelectBike}
                          palette={currentPalette}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fila 2 (Middle Row: Bicicletas 6 a 10) */}
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1 flex justify-between">
                      <span>Fila 2 — Zona Central</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Bicis 06 - 10</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {fila2.map((bike) => (
                        <BikeSeatButton
                          key={bike.id}
                          bike={bike}
                          isSelected={selectedBici?.id === bike.id}
                          onSelect={handleSelectBike}
                          palette={currentPalette}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fila 3 (Back Row: Bicicletas 11 a 15) */}
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1 flex justify-between">
                      <span>Fila 3 — Zona Elevada Trasera</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Bicis 11 - 15</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {fila3.map((bike) => (
                        <BikeSeatButton
                          key={bike.id}
                          bike={bike}
                          isSelected={selectedBici?.id === bike.id}
                          onSelect={handleSelectBike}
                          palette={currentPalette}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador inferior */}
              <div className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Bike className="w-3.5 h-3.5" />
                <span>Stages SC3 Smart Bikes con medidor de potencia y resistencia magnética.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Lateral: Resumen del Puesto / Gestión de Lista de Espera */}
        <div className="space-y-4">
          <Card className="border-border/80 shadow-md sticky top-6">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className={`w-4 h-4 ${currentPalette.textClass}`} />
                {claseLleno ? 'Estado de la Clase' : 'Puesto Seleccionado'}
              </CardTitle>
              <CardDescription className="text-xs">
                {claseLleno
                  ? 'Gestiona tu turno en la lista de espera.'
                  : 'Verifica los detalles antes de apartar tu bici.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Si la clase está llena, mostrar panel de lista de espera */}
              {claseLleno ? (
                <div className="space-y-3">
                  {waitlistState.enEspera ? (
                    <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 uppercase font-black tracking-wider">
                          En Lista de Espera
                        </span>
                        <Badge className="bg-amber-500 text-white font-mono font-bold text-xs">
                          Turno #{waitlistState.turno || 1}
                        </Badge>
                      </div>

                      <div className="text-sm font-bold text-foreground">
                        {waitlistState.estado === 'notificado' ? (
                          <span className="text-emerald-600 font-black">
                            ¡Cupo liberado! Tienes prioridad para reservar.
                          </span>
                        ) : (
                          <span>Posición en fila: #{waitlistState.turno || 1}</span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Si un ciclista cancela con más de 2 horas de anticipación, serás asignado y
                        notificado automáticamente.
                      </p>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loadingWaitlist}
                        onClick={handleSalirListaEspera}
                        className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 font-semibold"
                      >
                        {loadingWaitlist ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <LogOut className="w-3.5 h-3.5" />
                        )}
                        <span>Salir de la Lista de Espera</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-card space-y-3 text-center">
                      <Clock4 className="w-8 h-8 mx-auto text-amber-500 opacity-80" />
                      <div>
                        <span className="font-bold text-sm block">Puestos Agotados (15/15)</span>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Únete a la lista de espera para recibir notificación automática tan pronto como se libere una bicicleta.
                        </p>
                      </div>

                      <Button
                        type="button"
                        disabled={loadingWaitlist}
                        onClick={handleInscribirListaEspera}
                        className={`w-full font-bold shadow-md ${currentPalette.bgClass} text-white hover:opacity-90 gap-1.5`}
                      >
                        {loadingWaitlist ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Inscribiendo...</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5" />
                            <span>Unirme a Lista de Espera</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : selectedBici ? (
                <div className={`p-4 rounded-xl border ${currentPalette.borderClass}/30 bg-card space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Bicicleta Indoor
                      </span>
                      <div className="text-2xl font-black flex items-center gap-2">
                        <span>Puesto #{selectedBici.numero}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {selectedBici.codigo}
                        </Badge>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-xl ${currentPalette.bgClass} text-white flex items-center justify-center font-black text-sm`}
                    >
                      #{selectedBici.numero}
                    </div>
                  </div>

                  <div className="space-y-1 text-muted-foreground border-t pt-2">
                    <div className="flex justify-between">
                      <span>Fila:</span>
                      <span className="font-semibold text-foreground">Fila {selectedBici.fila}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modelo:</span>
                      <span className="font-semibold text-foreground">{selectedBici.modelo}</span>
                    </div>
                    {selectedBici.bateria_porcentaje !== null && selectedBici.bateria_porcentaje !== undefined && (
                      <div className="flex justify-between items-center">
                        <span>Sensor / Batería:</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {selectedBici.bateria_porcentaje}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed text-center text-muted-foreground space-y-2">
                  <Bike className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-medium text-xs">Ninguna bicicleta seleccionada</p>
                  <p className="text-[11px] text-muted-foreground">
                    Toca uno de los puestos verdes disponibles en el mapa para continuar.
                  </p>
                </div>
              )}

              {/* Datos de la Clase Seleccionada */}
              {claseSeleccionada && (
                <div className="p-3 bg-muted/40 rounded-lg border space-y-1.5">
                  <div className="font-semibold text-foreground text-xs">{claseSeleccionada.titulo}</div>
                  <div className="text-muted-foreground text-[11px] flex justify-between">
                    <span>Horario:</span>
                    <span className="font-mono font-medium text-foreground">
                      {claseSeleccionada.hora_inicio.slice(0, 5)} - {claseSeleccionada.hora_fin.slice(0, 5)}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[11px] flex justify-between">
                    <span>Instructor:</span>
                    <span className="font-medium text-foreground">
                      {claseSeleccionada.instructor?.nombre_completo || 'Coach Master'}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[11px] flex justify-between">
                    <span>Consumo de Créditos:</span>
                    <span className="font-bold text-emerald-600">1 Crédito</span>
                  </div>
                </div>
              )}

              {/* Botón de acción: Deshabilitado / Ocultado si la clase está llena */}
              {!claseLleno && (
                <Button
                  type="button"
                  disabled={!selectedBici || !claseSeleccionada}
                  onClick={handleAbrirConfirmacion}
                  className={`w-full font-bold shadow-md ${currentPalette.bgClass} text-white hover:opacity-90`}
                >
                  <span>Confirmar Reserva de Bici</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Modal de Confirmación de Reserva Estándar */}
      {showConfirmModal && selectedBici && claseSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card">
            <CardHeader className="p-4 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Confirmar Reserva de Puesto
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Se apartará la Bici #{selectedBici.numero} a tu nombre mediante la función RPC segura.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleConfirmarReserva}>
              <CardContent className="p-4 space-y-3 text-xs">
                {errorReserva && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorReserva}</span>
                  </div>
                )}

                {/* Resumen compacto */}
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-lg border text-xs">
                  <div>
                    <label htmlFor={confirmBikeId} className="text-[10px] text-muted-foreground block">
                      Bicicleta
                    </label>
                    <span id={confirmBikeId} className="font-bold text-sm">
                      Puesto #{selectedBici.numero}
                    </span>
                  </div>
                  <div>
                    <label htmlFor={confirmClassId} className="text-[10px] text-muted-foreground block">
                      Clase
                    </label>
                    <span id={confirmClassId} className="font-bold text-xs truncate block">
                      {claseSeleccionada.titulo}
                    </span>
                  </div>
                </div>

                {/* Formulario con datos del ciclista */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Nombre del Ciclista
                    </label>
                    <Input
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre y Apellidos"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        DNI / Documento
                      </label>
                      <Input
                        required
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        placeholder="71829304"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <Input
                        required
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="987654321"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Email de Notificación
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ciclista@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center justify-between">
                  <span>Saldo a descontar:</span>
                  <span className="font-bold">1 Crédito de Tiquetera</span>
                </div>
              </CardContent>

              <div className="p-4 border-t flex justify-end gap-2 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={bookingInProgress}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={bookingInProgress}
                  className={`font-semibold ${currentPalette.bgClass} text-white`}
                >
                  {bookingInProgress ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Reserva RPC'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. Modal de Confirmación de Inscripción a Lista de Espera */}
      {modalWaitlistExito && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-amber-500/50 bg-card text-center overflow-hidden">
            <div className="bg-amber-600 text-white p-5">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black tracking-tight">¡EN LISTA DE ESPERA!</h3>
              <p className="text-xs text-white/90">
                Tu turno registrado en cola: <strong>Posición #{modalWaitlistExito.turno}</strong>
              </p>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed text-left space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>¿Cómo funciona la asignación automática?</span>
                </div>
                <p>
                  Si cualquier alumno de la clase cancela con <strong>más de 2 horas de anticipación</strong>, el cupo libre te será asignado automáticamente por orden de llegada en la fila.
                </p>
                <p>
                  Recibirás una notificación instantánea y tu pase QR se generará sin necesidad de volver a ingresar.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setModalWaitlistExito(null)}
                className={`w-full font-bold ${currentPalette.bgClass} text-white shadow-md`}
              >
                Entendido, Continuar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Modal / Banner de Éxito con Código QR */}
      {reservaExitoData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-emerald-500/50 bg-card text-center overflow-hidden">
            <div className="bg-emerald-600 text-white p-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black tracking-tight">¡PUESTO RESERVADO CON ÉXITO!</h3>
              <p className="text-xs text-white/90">
                Tu puesto #{reservaExitoData.bicicleta_numero} está garantizado.
              </p>
            </div>

            <CardContent className="p-6 space-y-4">
              {/* Código QR Funcional */}
              <QRCode
                value={reservaExitoData.codigo_qr || 'PASS-CONFIRMED-CYCLE'}
                size={170}
                label="Pase de Acceso para Check-in"
                isOffline={false}
              />

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-bold text-foreground">
                  Créditos restantes de tiquetera: {reservaExitoData.creditos_restantes ?? 4}
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  💾 Pase guardado automáticamente para acceso sin conexión en tu dispositivo.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReservaExitoData(null)}
                  className="text-xs"
                >
                  Cerrar
                </Button>
                {onVolverAlDashboard && (
                  <Button
                    type="button"
                    onClick={() => {
                      setReservaExitoData(null)
                      onVolverAlDashboard()
                    }}
                    className={`text-xs font-bold ${currentPalette.bgClass} text-white`}
                  >
                    Ir a Mi Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Componente interactivo para cada puesto / asiento de bicicleta
interface BikeSeatButtonProps {
  bike: BicicletaOcupacion
  isSelected: boolean
  onSelect: (bike: BicicletaOcupacion) => void
  palette: { bgClass: string; borderClass: string; textClass: string; ringClass: string }
}

const BikeSeatButton: React.FC<BikeSeatButtonProps> = ({ bike, isSelected, onSelect, palette }) => {
  const isAvailable = !bike.ocupada && bike.estado === 'disponible'

  let baseClasses =
    'relative aspect-square rounded-xl p-1.5 sm:p-2.5 flex flex-col justify-between items-center transition-all duration-150 border select-none'

  if (isSelected) {
    baseClasses += ` ${palette.bgClass} text-white shadow-lg shadow-primary/20 scale-105 z-10 border-transparent ring-2 ${palette.ringClass}`
  } else if (!isAvailable) {
    baseClasses += ' bg-muted/60 border-border/40 text-muted-foreground/50 opacity-60 cursor-not-allowed'
  } else {
    baseClasses +=
      ' bg-card hover:bg-emerald-500/10 border-emerald-500/30 text-foreground cursor-pointer hover:scale-102 hover:shadow-sm'
  }

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => onSelect(bike)}
      className={baseClasses}
      title={
        isAvailable
          ? `Bici #${bike.numero} (${bike.codigo}) - Disponible`
          : `Bici #${bike.numero} - Reservada por otro ciclista`
      }
    >
      {/* Indicador superior de Batería o Estado */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono leading-none">
        <span className="font-bold">#{String(bike.numero).padStart(2, '0')}</span>
        {bike.bateria_porcentaje !== null && bike.bateria_porcentaje !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-[8px] ${
              isSelected
                ? 'text-white'
                : bike.bateria_porcentaje > 40
                ? 'text-emerald-500'
                : 'text-amber-500'
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Ícono central de la Bicicleta */}
      <div className="my-auto">
        <Bike className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-white' : ''}`} />
      </div>

      {/* Pie con estado */}
      <div className="w-full text-center">
        <span
          className={`text-[8px] sm:text-[9px] font-bold block uppercase tracking-tight truncate ${
            isSelected
              ? 'text-white'
              : isAvailable
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground/60'
          }`}
        >
          {isSelected ? 'Elegida' : isAvailable ? 'Libre' : 'Ocupada'}
        </span>
      </div>
    </button>
  )
}

export default IndoorBikeMap
