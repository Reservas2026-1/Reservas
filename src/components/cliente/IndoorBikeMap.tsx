import React, { useState, useEffect, useId, useMemo } from 'react'
import {
  Bike,
  Calendar,
  CalendarDays,
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
  Sun,
  Moon,
  Minus,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QRCode } from '@/components/ui/qr-code'
import { useBranding } from '@/context/BrandingContext'
import { toast } from '@/components/ui/use-toast'
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

type TurnoFiltro = 'todas' | 'manana' | 'noche'

interface DiaSemanaInfo {
  fecha: string
  diaNombre: string
  diaCorto: string
  etiquetaFecha: string
}

interface BloqueHorarioSemanal {
  id: string
  fecha: string
  diaNombre: string
  diaCorto: string
  etiquetaFecha: string
  turno: 'manana' | 'noche'
  horaInicio: string
  horaFin: string
  titulo: string
  instructorNombre: string
  cuposDisponibles: number
  cuposOcupados: number
  capacidadTotal: number
  claseRef?: ClaseConOcupacion
}

const DIAS_SEMANA_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDateIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getSemanaDeFecha(fechaIso: string): DiaSemanaInfo[] {
  const parsed = new Date(`${fechaIso}T12:00:00`)
  const baseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const dayOfWeek = baseDate.getDay() // 0 = domingo, 1 = lunes ... 6 = sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() + diffToMonday)

  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    const fecha = formatDateIso(d)
    return {
      fecha,
      diaNombre: DIAS_SEMANA_NOMBRES[idx],
      diaCorto: DIAS_SEMANA_CORTOS[idx],
      etiquetaFecha: `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()]}`,
    }
  })
}

function esTurnoManana(horaInicio: string): boolean {
  const hora = Number.parseInt(horaInicio.slice(0, 2), 10)
  return Number.isNaN(hora) ? true : hora < 12
}

export const IndoorBikeMap: React.FC<IndoorBikeMapProps> = ({
  currentUser,
  onReservaCompletada,
  onVolverAlDashboard,
}) => {
  const { currentPalette, empresaId, studioName } = useBranding()
  const confirmClassId = useId()
  const confirmBikeId = useId()
  const cantidadReservasId = useId()

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  )
  const [clases, setClases] = useState<ClaseConOcupacion[]>([])
  const [claseSeleccionada, setClaseSeleccionada] = useState<ClaseConOcupacion | null>(null)
  const [bicicletas, setBicicletas] = useState<BicicletaOcupacion[]>([])
  const [selectedBici, setSelectedBici] = useState<BicicletaOcupacion | null>(null)
  const [tiqueteraActiva, setTiqueteraActiva] = useState<TiqueteraConPlan | null>(null)

  // Planificación semanal, cantidad de reservas (1..7) y filtro rápido Mañana/Noche
  const [cantidadReservas, setCantidadReservas] = useState<number>(1)
  const [filtroTurno, setFiltroTurno] = useState<TurnoFiltro>('todas')
  const [clasesSemana, setClasesSemana] = useState<ClaseConOcupacion[]>([])
  const [loadingSemana, setLoadingSemana] = useState<boolean>(false)
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [slotLimitWarning, setSlotLimitWarning] = useState<string | null>(null)

  // Estados de carga y modales
  const [loadingClases, setLoadingClases] = useState(false)
  const [loadingBicis, setLoadingBicis] = useState(false)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [reservaExitoData, setReservaExitoData] = useState<CrearReservaSeguraResponse | null>(null)
  const [reservasConfirmadasCount, setReservasConfirmadasCount] = useState<number>(1)
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

  // Días Lunes a Domingo de la semana de `fechaSeleccionada`
  const semanaDias = useMemo(() => getSemanaDeFecha(fechaSeleccionada), [fechaSeleccionada])
  const lunesSemana = semanaDias[0]?.fecha || fechaSeleccionada
  const domingoSemana = semanaDias[6]?.fecha || fechaSeleccionada

  // 1. Cargar clases del día para la empresa activa
  useEffect(() => {
    let isMounted = true
    const cargarClases = async () => {
      setLoadingClases(true)
      try {
        const res = await clasesService.getClasesByFecha(empresaId, fechaSeleccionada)
        if (isMounted) {
          if (res.error) {
            toast({
              variant: 'destructive',
              title: 'Error cargando sesiones',
              description: res.error,
            })
            setClases([])
            setClaseSeleccionada(null)
          } else {
            const lista = res.data || []
            setClases(lista)
            setClaseSeleccionada(lista.length > 0 ? lista[0] : null)
          }
        }
      } catch (err) {
        if (isMounted) {
          toast({
            variant: 'destructive',
            title: 'Error de conexión',
            description: err instanceof Error ? err.message : 'No se pudieron consultar las clases',
          })
          setClases([])
          setClaseSeleccionada(null)
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

  // 1b. Cargar clases de toda la semana (Lunes a Domingo) para la grilla semanal
  useEffect(() => {
    let isMounted = true
    const cargarSemana = async () => {
      setLoadingSemana(true)
      try {
        const res = await clasesService.getClasesByRangoFechas(empresaId, lunesSemana, domingoSemana)
        if (isMounted) {
          if (res.error) {
            toast({
              variant: 'destructive',
              title: 'Error cargando grilla semanal',
              description: res.error,
            })
            setClasesSemana([])
          } else {
            setClasesSemana(res.data || [])
          }
        }
      } catch {
        if (isMounted) {
          setClasesSemana([])
        }
      } finally {
        if (isMounted) setLoadingSemana(false)
      }
    }

    cargarSemana()
    return () => {
      isMounted = false
    }
  }, [empresaId, lunesSemana, domingoSemana])

  // Construir grilla semanal Lunes a Domingo con franjas de Mañana y Noche reales
  const bloquesSemanales = useMemo<BloqueHorarioSemanal[]>(() => {
    const lista: BloqueHorarioSemanal[] = []

    semanaDias.forEach((dia) => {
      const clasesDia = clasesSemana.filter((c) => c.fecha === dia.fecha)
      const clasesManana = clasesDia.filter((c) => esTurnoManana(c.hora_inicio))
      const clasesNoche = clasesDia.filter((c) => !esTurnoManana(c.hora_inicio))

      clasesManana.forEach((clase) => {
        lista.push({
          id: `slot-${dia.fecha}-am-${clase.id}`,
          fecha: dia.fecha,
          diaNombre: dia.diaNombre,
          diaCorto: dia.diaCorto,
          etiquetaFecha: dia.etiquetaFecha,
          turno: 'manana',
          horaInicio: clase.hora_inicio.slice(0, 5),
          horaFin: clase.hora_fin.slice(0, 5),
          titulo: clase.titulo,
          instructorNombre: clase.instructor?.nombre_completo || 'Coach del Estudio',
          cuposDisponibles: clase.cuposDisponibles,
          cuposOcupados: clase.cuposOcupados,
          capacidadTotal: clase.capacidadTotal,
          claseRef: clase,
        })
      })

      clasesNoche.forEach((clase) => {
        lista.push({
          id: `slot-${dia.fecha}-pm-${clase.id}`,
          fecha: dia.fecha,
          diaNombre: dia.diaNombre,
          diaCorto: dia.diaCorto,
          etiquetaFecha: dia.etiquetaFecha,
          turno: 'noche',
          horaInicio: clase.hora_inicio.slice(0, 5),
          horaFin: clase.hora_fin.slice(0, 5),
          titulo: clase.titulo,
          instructorNombre: clase.instructor?.nombre_completo || 'Coach del Estudio',
          cuposDisponibles: clase.cuposDisponibles,
          cuposOcupados: clase.cuposOcupados,
          capacidadTotal: clase.capacidadTotal,
          claseRef: clase,
        })
      })
    })

    return lista
  }, [semanaDias, clasesSemana])

  const selectedBloques = useMemo(
    () =>
      selectedSlotIds
        .map((id) => bloquesSemanales.find((b) => b.id === id))
        .filter((b): b is BloqueHorarioSemanal => Boolean(b)),
    [selectedSlotIds, bloquesSemanales]
  )

  const clasesFiltradas = useMemo(() => {
    if (filtroTurno === 'todas') return clases
    return clases.filter((c) =>
      filtroTurno === 'manana' ? esTurnoManana(c.hora_inicio) : !esTurnoManana(c.hora_inicio)
    )
  }, [clases, filtroTurno])

  // Mantener claseSeleccionada sincronizada al cambiar el filtro rápido
  const handleChangeFiltroTurno = (nuevoFiltro: TurnoFiltro) => {
    setFiltroTurno(nuevoFiltro)
    const filtradas =
      nuevoFiltro === 'todas'
        ? clases
        : clases.filter((c) =>
            nuevoFiltro === 'manana' ? esTurnoManana(c.hora_inicio) : !esTurnoManana(c.hora_inicio)
          )
    if (filtradas.length > 0 && (!claseSeleccionada || !filtradas.some((c) => c.id === claseSeleccionada.id))) {
      setClaseSeleccionada(filtradas[0])
    }
  }

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
      if (!claseSeleccionada) {
        if (isMounted) setBicicletas([])
        return
      }
      setLoadingBicis(true)
      setSelectedBici(null)

      try {
        const res = await clasesService.getBicicletasParaClase(claseSeleccionada.id, empresaId)
        if (isMounted) {
          if (res.error) {
            toast({
              variant: 'destructive',
              title: 'Error cargando bicicletas',
              description: res.error,
            })
            setBicicletas([])
          } else {
            setBicicletas(res.data || [])
          }
        }
      } catch (err) {
        if (isMounted) {
          toast({
            variant: 'destructive',
            title: 'Error de conexión',
            description: err instanceof Error ? err.message : 'No se pudieron consultar las bicicletas',
          })
          setBicicletas([])
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

  // Manejar cambio en "Cantidad de reservas" (1 a 7)
  const handleChangeCantidadReservas = (nextRaw: number) => {
    const clamped = Math.min(7, Math.max(1, Number.isNaN(nextRaw) ? 1 : Math.round(nextRaw)))
    setCantidadReservas(clamped)
    setSlotLimitWarning(null)
    setSelectedSlotIds((prev) => (prev.length > clamped ? prev.slice(0, clamped) : prev))
  }

  // Manejar click en un bloque de la grilla semanal (seleccionar / deseleccionar)
  const handleToggleBloqueSemanal = (bloque: BloqueHorarioSemanal) => {
    if (bloque.cuposDisponibles === 0) return

    const yaSeleccionado = selectedSlotIds.includes(bloque.id)

    if (yaSeleccionado) {
      setSelectedSlotIds((prev) => prev.filter((id) => id !== bloque.id))
      setSlotLimitWarning(null)
      return
    }

    if (cantidadReservas === 1) {
      setSelectedSlotIds([bloque.id])
      setSlotLimitWarning(null)
    } else if (selectedSlotIds.length < cantidadReservas) {
      setSelectedSlotIds((prev) => [...prev, bloque.id])
      setSlotLimitWarning(null)
    } else {
      setSlotLimitWarning(
        `Ya seleccionaste ${cantidadReservas} bloques. Haz clic en un bloque marcado para deseleccionarlo o aumenta la cantidad.`
      )
      return
    }

    // Sincronizar la vista del día y la clase activa con el bloque recién elegido
    if (bloque.fecha !== fechaSeleccionada) {
      setFechaSeleccionada(bloque.fecha)
    }
    if (bloque.claseRef) {
      setClaseSeleccionada(bloque.claseRef)
    }
  }

  const handleLimpiarSeleccionSemanal = () => {
    setSelectedSlotIds([])
    setSlotLimitWarning(null)
  }

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

    const bloquesAConfirmar =
      selectedBloques.length > 0
        ? selectedBloques
        : [
            {
              id: claseSeleccionada.id,
              fecha: claseSeleccionada.fecha,
              diaNombre: '',
              diaCorto: '',
              etiquetaFecha: '',
              turno: esTurnoManana(claseSeleccionada.hora_inicio) ? ('manana' as const) : ('noche' as const),
              horaInicio: claseSeleccionada.hora_inicio.slice(0, 5),
              horaFin: claseSeleccionada.hora_fin.slice(0, 5),
              titulo: claseSeleccionada.titulo,
              instructorNombre: claseSeleccionada.instructor?.nombre_completo || 'Coach Master',
              cuposDisponibles: claseSeleccionada.cuposDisponibles,
              cuposOcupados: claseSeleccionada.cuposOcupados,
              capacidadTotal: claseSeleccionada.capacidadTotal,
              claseRef: claseSeleccionada,
            },
          ]

    try {
      let respuestaExitosa: CrearReservaSeguraResponse | null = null

      for (const bloque of bloquesAConfirmar) {
        const claseTarget = bloque.claseRef || claseSeleccionada
        const params: CrearReservaParams = {
          empresaId,
          claseId: claseTarget.id,
          bicicletaId: selectedBici.id,
          clienteId: currentUser?.id || null,
          clienteNombre: nombre.trim(),
          clienteDocumento: documento.trim(),
          clienteTelefono: telefono.trim(),
          clienteEmail: email.trim() || null,
          tiqueteraId: tiqueteraActiva?.id || null,
        }

        const res = await reservasService.crearReserva(params)

        if (!res.success || !res.data) {
          const msg = res.error || 'No fue posible completar la reserva en la base de datos'
          setErrorReserva(msg)
          toast({
            variant: 'destructive',
            title: 'Error en reserva',
            description: msg,
          })
          setBookingInProgress(false)
          return
        }

        respuestaExitosa = res.data
      }

      if (respuestaExitosa) {
        setReservasConfirmadasCount(bloquesAConfirmar.length)
        setReservaExitoData(respuestaExitosa)
        setShowConfirmModal(false)

        toast({
          variant: 'success',
          title: '¡Reserva confirmada!',
          description: `Bicicleta #${selectedBici.numero} apartada correctamente.`,
        })

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

  const mostrarManana = filtroTurno === 'todas' || filtroTurno === 'manana'
  const mostrarNoche = filtroTurno === 'todas' || filtroTurno === 'noche'

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
            Elige la cantidad de reservas semanales, filtra por turno Mañana o Noche y aparta tu bicicleta.
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

      {/* 0. Planificador Semanal: Cantidad de reservas (1-7), Filtro Mañana/Noche y Grilla Lunes-Domingo */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-card space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className={`w-5 h-5 ${currentPalette.textClass}`} />
                Planificador Semanal de Horarios (Lunes a Domingo)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Selecciona entre 1 y 7 bloques en la semana del {semanaDias[0]?.etiquetaFecha} al{' '}
                {semanaDias[6]?.etiquetaFecha}. Haz clic para seleccionar o deseleccionar.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {/* Selector numérico: Cantidad de reservas (1 a 7) */}
              <div className="space-y-1.5">
                <Label htmlFor={cantidadReservasId} className="text-xs font-semibold text-muted-foreground">
                  Cantidad de reservas
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleChangeCantidadReservas(cantidadReservas - 1)}
                    disabled={cantidadReservas <= 1}
                    aria-label="Disminuir cantidad de reservas"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    id={cantidadReservasId}
                    type="number"
                    min={1}
                    max={7}
                    value={cantidadReservas}
                    onChange={(e) => handleChangeCantidadReservas(Number(e.target.value))}
                    className="h-8 w-16 text-center font-bold text-sm px-1"
                    aria-label="Cantidad de reservas"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleChangeCantidadReservas(cantidadReservas + 1)}
                    disabled={cantidadReservas >= 7}
                    aria-label="Aumentar cantidad de reservas"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Badge variant="outline" className="text-[11px] font-mono ml-1">
                    {cantidadReservas} / 7 máx.
                  </Badge>
                </div>
              </div>

              {/* Filtro rápido con botones Mañana (Azul) y Noche (Púrpura) */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Filtro rápido de franja
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={filtroTurno === 'todas' ? 'default' : 'outline'}
                    onClick={() => handleChangeFiltroTurno('todas')}
                    className="h-8 text-xs font-semibold"
                  >
                    Todas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleChangeFiltroTurno(filtroTurno === 'manana' ? 'todas' : 'manana')}
                    aria-pressed={filtroTurno === 'manana'}
                    className={`h-8 text-xs font-bold gap-1.5 transition-all ${
                      filtroTurno === 'manana'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
                        : 'border-blue-300 bg-blue-50/70 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Mañana</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleChangeFiltroTurno(filtroTurno === 'noche' ? 'todas' : 'noche')}
                    aria-pressed={filtroTurno === 'noche'}
                    className={`h-8 text-xs font-bold gap-1.5 transition-all ${
                      filtroTurno === 'noche'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm'
                        : 'border-purple-300 bg-purple-50/70 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Noche</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de progreso visual que refleja la cantidad seleccionada */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                Bloques elegidos: {selectedSlotIds.length} de {cantidadReservas}
              </span>
              <div className="flex items-center gap-1" aria-label="Indicador de reservas seleccionadas">
                {Array.from({ length: cantidadReservas }, (_, idx) => {
                  const filled = idx < selectedSlotIds.length
                  return (
                    <span
                      key={idx}
                      className={`h-2.5 w-6 rounded-full transition-all ${
                        filled ? currentPalette.bgClass : 'bg-muted border border-border'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {selectedSlotIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLimpiarSeleccionSemanal}
                className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar selección</span>
              </Button>
            )}
          </div>

          {slotLimitWarning && (
            <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{slotLimitWarning}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {loadingSemana ? (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-8">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Cargando grilla semanal de horarios...</span>
            </div>
          ) : (
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[780px] space-y-3">
                {/* Encabezado días Lunes a Domingo */}
                <div className="grid grid-cols-8 gap-2 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center">
                    Franja
                  </div>
                  {semanaDias.map((dia) => {
                    const esDiaActivo = dia.fecha === fechaSeleccionada
                    return (
                      <div
                        key={dia.fecha}
                        className={`rounded-lg py-1.5 px-2 border text-xs ${
                          esDiaActivo
                            ? 'bg-primary/10 border-primary/40 text-foreground font-bold'
                            : 'bg-muted/40 border-border/60 text-muted-foreground'
                        }`}
                      >
                        <div className="font-bold">{dia.diaNombre}</div>
                        <div className="text-[10px] font-mono">{dia.etiquetaFecha}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Fila Franja Mañana (Azul) */}
                {mostrarManana && (
                  <div className="grid grid-cols-8 gap-2 items-stretch">
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 p-2 flex flex-col items-center justify-center text-center gap-1">
                      <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Mañana</span>
                      <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-mono">AM</span>
                    </div>

                    {semanaDias.map((dia) => {
                      const bloquesDia = bloquesSemanales.filter(
                        (b) => b.fecha === dia.fecha && b.turno === 'manana'
                      )
                      return (
                        <div key={`${dia.fecha}-am`} className="space-y-1.5">
                          {bloquesDia.map((bloque) => {
                            const orderIdx = selectedSlotIds.indexOf(bloque.id)
                            const isSelected = orderIdx !== -1
                            const sinCupos = bloque.cuposDisponibles === 0

                            return (
                              <button
                                key={bloque.id}
                                type="button"
                                disabled={sinCupos}
                                onClick={() => handleToggleBloqueSemanal(bloque)}
                                aria-pressed={isSelected}
                                className={`w-full h-full min-h-[82px] rounded-xl border p-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                                  sinCupos
                                    ? 'bg-muted/50 border-border/50 opacity-55 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400 shadow-md'
                                    : 'bg-blue-50/40 hover:bg-blue-100/70 border-blue-200 text-foreground dark:bg-blue-950/20 dark:hover:bg-blue-900/40 dark:border-blue-900'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-[10px] font-mono font-bold ${
                                      isSelected ? 'text-blue-100' : 'text-blue-700 dark:text-blue-300'
                                    }`}
                                  >
                                    {bloque.horaInicio}
                                  </span>
                                  {isSelected ? (
                                    <Badge className="bg-white text-blue-700 text-[9px] px-1.5 py-0 font-black">
                                      #{orderIdx + 1} ×
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      {sinCupos ? 'Lleno' : `${bloque.cuposDisponibles} lib.`}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-bold leading-tight line-clamp-2 my-1">
                                  {bloque.titulo}
                                </div>
                                <div
                                  className={`text-[9px] truncate ${
                                    isSelected ? 'text-blue-100' : 'text-muted-foreground'
                                  }`}
                                >
                                  {isSelected ? 'Clic para deseleccionar' : bloque.instructorNombre}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Fila Franja Noche (Púrpura) */}
                {mostrarNoche && (
                  <div className="grid grid-cols-8 gap-2 items-stretch">
                    <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/30 p-2 flex flex-col items-center justify-center text-center gap-1">
                      <Moon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Noche</span>
                      <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-mono">PM</span>
                    </div>

                    {semanaDias.map((dia) => {
                      const bloquesDia = bloquesSemanales.filter(
                        (b) => b.fecha === dia.fecha && b.turno === 'noche'
                      )
                      return (
                        <div key={`${dia.fecha}-pm`} className="space-y-1.5">
                          {bloquesDia.map((bloque) => {
                            const orderIdx = selectedSlotIds.indexOf(bloque.id)
                            const isSelected = orderIdx !== -1
                            const sinCupos = bloque.cuposDisponibles === 0

                            return (
                              <button
                                key={bloque.id}
                                type="button"
                                disabled={sinCupos}
                                onClick={() => handleToggleBloqueSemanal(bloque)}
                                aria-pressed={isSelected}
                                className={`w-full h-full min-h-[82px] rounded-xl border p-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                                  sinCupos
                                    ? 'bg-muted/50 border-border/50 opacity-55 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-400 shadow-md'
                                    : 'bg-purple-50/40 hover:bg-purple-100/70 border-purple-200 text-foreground dark:bg-purple-950/20 dark:hover:bg-purple-900/40 dark:border-purple-900'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-[10px] font-mono font-bold ${
                                      isSelected ? 'text-purple-100' : 'text-purple-700 dark:text-purple-300'
                                    }`}
                                  >
                                    {bloque.horaInicio}
                                  </span>
                                  {isSelected ? (
                                    <Badge className="bg-white text-purple-700 text-[9px] px-1.5 py-0 font-black">
                                      #{orderIdx + 1} ×
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      {sinCupos ? 'Lleno' : `${bloque.cuposDisponibles} lib.`}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-bold leading-tight line-clamp-2 my-1">
                                  {bloque.titulo}
                                </div>
                                <div
                                  className={`text-[9px] truncate ${
                                    isSelected ? 'text-purple-100' : 'text-muted-foreground'
                                  }`}
                                >
                                  {isSelected ? 'Clic para deseleccionar' : bloque.instructorNombre}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Selector Horizontal de Horarios / Clases del día */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Clases Disponibles — {fechaSeleccionada}
          </span>
          {filtroTurno !== 'todas' && (
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                filtroTurno === 'manana'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
              }`}
            >
              Filtro activo: {filtroTurno === 'manana' ? 'Mañana' : 'Noche'}
            </Badge>
          )}
        </div>

        {loadingClases ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Cargando clases del día...</span>
          </div>
        ) : clasesFiltradas.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-xs text-muted-foreground text-center">
            No hay clases programadas en la franja seleccionada para este día.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {clasesFiltradas.map((clase) => {
              const isSelected = claseSeleccionada?.id === clase.id
              const esLlena = clase.cuposDisponibles === 0
              const esAM = esTurnoManana(clase.hora_inicio)

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

                  <div className="flex items-center justify-between mb-1.5 gap-1">
                    <span className="font-bold text-sm text-foreground truncate">{clase.titulo}</span>
                    <Badge
                      variant={isSelected ? 'default' : 'outline'}
                      className={`text-[10px] font-mono shrink-0 ${
                        !isSelected
                          ? esAM
                            ? 'border-blue-400/50 text-blue-700 dark:text-blue-300'
                            : 'border-purple-400/50 text-purple-700 dark:text-purple-300'
                          : ''
                      }`}
                    >
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

              {/* Bloques Semanales Seleccionados */}
              {selectedBloques.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">
                      Bloques Semanales ({selectedBloques.length}/{cantidadReservas})
                    </span>
                    <button
                      type="button"
                      onClick={handleLimpiarSeleccionSemanal}
                      className="text-[10px] text-muted-foreground hover:text-destructive font-semibold"
                    >
                      Quitar todos
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBloques.map((b) => (
                      <Badge
                        key={b.id}
                        variant="outline"
                        className={`text-[10px] gap-1 pr-1 ${
                          b.turno === 'manana'
                            ? 'border-blue-400/50 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                            : 'border-purple-400/50 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        <span>
                          {b.diaCorto} {b.horaInicio}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleBloqueSemanal(b)}
                          aria-label={`Deseleccionar ${b.diaNombre} ${b.horaInicio}`}
                          className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
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
                    <span className="font-bold text-emerald-600">
                      {selectedBloques.length > 1
                        ? `${selectedBloques.length} Créditos`
                        : '1 Crédito'}
                    </span>
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
                  <span>
                    {selectedBloques.length > 1
                      ? `Confirmar ${selectedBloques.length} Reservas`
                      : 'Confirmar Reserva de Bici'}
                  </span>
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
                      {selectedBloques.length > 1 ? 'Reservas semanales' : 'Clase'}
                    </label>
                    <span id={confirmClassId} className="font-bold text-xs truncate block">
                      {selectedBloques.length > 1
                        ? `${selectedBloques.length} horarios seleccionados`
                        : claseSeleccionada.titulo}
                    </span>
                  </div>
                </div>

                {selectedBloques.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBloques.map((b) => (
                      <Badge
                        key={b.id}
                        variant="outline"
                        className={`text-[10px] ${
                          b.turno === 'manana'
                            ? 'border-blue-400/50 text-blue-700 dark:text-blue-300'
                            : 'border-purple-400/50 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {b.diaCorto} {b.etiquetaFecha} • {b.horaInicio}
                      </Badge>
                    ))}
                  </div>
                )}

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
                  <span className="font-bold">
                    {selectedBloques.length > 1
                      ? `${selectedBloques.length} Créditos de Tiquetera`
                      : '1 Crédito de Tiquetera'}
                  </span>
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
              <h3 className="text-lg font-black tracking-tight">
                {reservasConfirmadasCount > 1
                  ? `¡${reservasConfirmadasCount} RESERVAS CONFIRMADAS!`
                  : '¡PUESTO RESERVADO CON ÉXITO!'}
              </h3>
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
