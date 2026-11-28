import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Bike,
  PlusCircle,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Repeat,
  AlertCircle,
  LayoutGrid,
  Camera,
  CameraOff,
  SwitchCamera,
  Search,
  Keyboard,
  Award,
  Zap,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Users,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import { HybridHourSelector } from '@/components/admin/HybridHourSelector'
import {
  adminService,
  type ClaseAdminDetalle,
  type CrearClaseParams,
} from '@/services/adminService'
import {
  clasesService,
  type ClaseConOcupacion,
  type BicicletaOcupacion,
} from '@/services/clasesService'
import { reservasService, type AsistenciaQRResponse } from '@/services/reservasService'
import { authService, type AlumnoBusqueda } from '@/services/authService'
import { bicicletasService } from '@/services/bicicletasService'
import type { EstadoClase, Tables } from '@/types/database'

// Constantes de Fecha y Etiquetas en Español
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_SEMANA_COMPLETOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

// Utilidades seguras de manipulación de fechas (sin desfasaje horario UTC)
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISODate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

function formatFechaLegible(str: string): string {
  try {
    const date = parseISODate(str)
    const dayName = DIAS_SEMANA_COMPLETOS[(date.getDay() + 6) % 7]
    const dayNum = date.getDate()
    const monthName = MESES[date.getMonth()]
    const year = date.getFullYear()
    return `${dayName}, ${dayNum} de ${monthName} de ${year}`
  } catch {
    return str
  }
}

function formatHora12(horaStr?: string | null): string {
  if (!horaStr) return ''
  const parts = horaStr.split(':')
  const h = Number.parseInt(parts[0], 10)
  const m = parts[1] || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`
}

export const CalendarView: React.FC = () => {
  const { currentPalette, empresaId, studioName, estudioActivo } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)
  const sesionMasculina = ['Turno', 'WOD'].includes(verticalConfig.sesionSingular)
  const capacidadDefault = estudioActivo?.capacidad_sala || 15

  // Pestañas principales
  const [vistaTab, setVistaTab] = useState<'calendario' | 'horarios_base'>('calendario')
  const [tipoVista, setTipoVista] = useState<'mes' | 'semana'>('mes')

  // Fecha de referencia del calendario y fecha seleccionada para el panel lateral
  const hoyStr = useMemo(() => toISODate(new Date()), [])
  const [fechaReferencia, setFechaReferencia] = useState<Date>(new Date())
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyStr)

  // Datos del rango (Mes / Semana) y Datos detallados del Día seleccionado
  const [clasesRango, setClasesRango] = useState<ClaseConOcupacion[]>([])
  const [loadingRango, setLoadingRango] = useState<boolean>(false)

  const [clasesDia, setClasesDia] = useState<ClaseAdminDetalle[]>([])
  const [loadingDia, setLoadingDia] = useState<boolean>(true)
  const [errorClases, setErrorClases] = useState<string | null>(null)

  // Filtros rápidos del panel lateral del día
  const [filtroDia, setFiltroDia] = useState<'todas' | 'confirmadas' | 'pendientes'>('todas')

  // Modal / Drawer de Mapa de Puestos
  const [modalMapaPuestosOpen, setModalMapaPuestosOpen] = useState<boolean>(false)
  const [claseActiva, setClaseActiva] = useState<ClaseAdminDetalle | null>(null)

  // Drawer Lateral Deslizante: Nueva Reserva Administrativa (2 Pasos)
  const [drawerReservaOpen, setDrawerReservaOpen] = useState<boolean>(false)
  const [pasoReserva, setPasoReserva] = useState<1 | 2>(1)
  const [reservaClaseId, setReservaClaseId] = useState<string>('')
  const [reservaPuestoNumero, setReservaPuestoNumero] = useState<number | null>(null)
  const [reservaModoPuesto, setReservaModoPuesto] = useState<'auto' | 'manual'>('auto')
  const [asientosClaseReserva, setAsientosClaseReserva] = useState<BicicletaOcupacion[]>([])
  const [loadingAsientos, setLoadingAsientos] = useState<boolean>(false)

  const [reservaClienteNombre, setReservaClienteNombre] = useState<string>('')
  const [reservaClienteEmail, setReservaClienteEmail] = useState<string>('')
  const [reservaClienteTelefono, setReservaClienteTelefono] = useState<string>('')
  const [reservaMetodoPago, setReservaMetodoPago] = useState<string>('efectivo')
  const [guardandoReserva, setGuardandoReserva] = useState<boolean>(false)

  // Modal Crear / Editar Clase
  const [modalClaseOpen, setModalClaseOpen] = useState<boolean>(false)
  const [editingClase, setEditingClase] = useState<ClaseAdminDetalle | null>(null)
  const [guardandoClase, setGuardandoClase] = useState<boolean>(false)
  const [formDataClase, setFormDataClase] = useState({
    nombre: '',
    fecha: fechaSeleccionada,
    horaInicio: '07:00',
    horaFin: '07:45',
    descripcion: 'Sesión de alta intensidad y ritmo musical.',
    capacidad: 15,
    estado: 'programada' as EstadoClase,
  })

  // Modal Eliminar Clase
  const [claseParaEliminar, setClaseParaEliminar] = useState<ClaseAdminDetalle | null>(null)
  const [forzarCancelacion, setForzarCancelacion] = useState<boolean>(false)
  const [eliminandoClase, setEliminandoClase] = useState<boolean>(false)

  // Horarios Base CRUD
  const [horariosBase, setHorariosBase] = useState<Tables<'horarios_base'>[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState<boolean>(false)
  const [modalHorarioOpen, setModalHorarioOpen] = useState<boolean>(false)
  const [editingHorario, setEditingHorario] = useState<Tables<'horarios_base'> | null>(null)
  const [guardandoHorario, setGuardandoHorario] = useState<boolean>(false)
  const [eliminandoHorarioId, setEliminandoHorarioId] = useState<string | null>(null)
  const [formHorario, setFormHorario] = useState({
    diaSemana: 0,
    horaInicio: '06:00',
    horaFin: '06:45',
    activo: true,
  })

  // Escáner QR y Asistencia Manual
  const [modalEscanerQR, setModalEscanerQR] = useState<boolean>(false)
  const [modoAsistencia, setModoAsistencia] = useState<'camara' | 'pistola' | 'buscador'>('pistola')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [camaraActiva, setCamaraActiva] = useState<boolean>(false)
  const [camaraError, setCamaraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Buscador rápido de alumnos (Respaldo)
  const [busquedaQuery, setBusquedaQuery] = useState<string>('')
  const [alumnosBuscados, setAlumnosBuscados] = useState<AlumnoBusqueda[]>([])
  const [buscandoAlumnos, setBuscandoAlumnos] = useState<boolean>(false)

  const [codigoQrInput, setCodigoQrInput] = useState<string>('')
  const [validandoQR, setValidandoQR] = useState<boolean>(false)
  const [resultadoAsistencia, setResultadoAsistencia] = useState<AsistenciaQRResponse | null>(null)
  const [marcandoReservaId, setMarcandoReservaId] = useState<string | null>(null)

  // Bicicletas Activas de la sala (inventario dinámico)
  const [bicicletasActivas, setBicicletasActivas] = useState<Tables<'bicicletas'>[]>([])

  const cargarBicicletas = useCallback(async () => {
    if (!empresaId) return
    try {
      const res = await bicicletasService.obtenerBicicletas(empresaId, { soloActivas: true })
      if (res.data) {
        setBicicletasActivas(res.data)
      }
    } catch (err) {
      console.warn('Error al cargar bicicletas en CalendarView:', err)
    }
  }, [empresaId])

  useEffect(() => {
    cargarBicicletas()
  }, [cargarBicicletas])

  // ==========================================
  // CÁLCULOS DEL CALENDARIO (MES / SEMANA)
  // ==========================================

  // Días de la vista mensual (cuadrícula de 7 columnas Lunes a Domingo)
  const diasMes = useMemo(() => {
    const year = fechaReferencia.getFullYear()
    const month = fechaReferencia.getMonth()

    const primerDia = new Date(year, month, 1, 12, 0, 0)
    const diaSemanaPrimerDia = (primerDia.getDay() + 6) % 7 // 0 = Lunes, 6 = Domingo
    const diasEnMes = new Date(year, month + 1, 0, 12, 0, 0).getDate()
    const diasEnMesAnterior = new Date(year, month, 0, 12, 0, 0).getDate()

    const lista: {
      fechaStr: string
      diaNumero: number
      esMesActual: boolean
      esHoy: boolean
      esSeleccionado: boolean
    }[] = []

    // Días del mes anterior para rellenar la primera semana
    for (let i = diaSemanaPrimerDia - 1; i >= 0; i--) {
      const d = diasEnMesAnterior - i
      const prevDate = new Date(year, month - 1, d, 12, 0, 0)
      const fStr = toISODate(prevDate)
      lista.push({
        fechaStr: fStr,
        diaNumero: d,
        esMesActual: false,
        esHoy: fStr === hoyStr,
        esSeleccionado: fStr === fechaSeleccionada,
      })
    }

    // Días del mes actual
    for (let d = 1; d <= diasEnMes; d++) {
      const curDate = new Date(year, month, d, 12, 0, 0)
      const fStr = toISODate(curDate)
      lista.push({
        fechaStr: fStr,
        diaNumero: d,
        esMesActual: true,
        esHoy: fStr === hoyStr,
        esSeleccionado: fStr === fechaSeleccionada,
      })
    }

    // Días del siguiente mes para completar múltiplo de 7 (35 o 42 celdas)
    const totalCeldas = lista.length <= 35 ? 35 : 42
    const faltantes = totalCeldas - lista.length
    for (let d = 1; d <= faltantes; d++) {
      const nextDate = new Date(year, month + 1, d, 12, 0, 0)
      const fStr = toISODate(nextDate)
      lista.push({
        fechaStr: fStr,
        diaNumero: d,
        esMesActual: false,
        esHoy: fStr === hoyStr,
        esSeleccionado: fStr === fechaSeleccionada,
      })
    }

    return lista
  }, [fechaReferencia, hoyStr, fechaSeleccionada])

  // Días de la vista semanal (7 columnas, Lunes a Domingo)
  const diasSemana = useMemo(() => {
    const diaActual = (fechaReferencia.getDay() + 6) % 7 // 0 = Lunes
    const lunes = new Date(fechaReferencia)
    lunes.setDate(fechaReferencia.getDate() - diaActual)
    lunes.setHours(12, 0, 0, 0)

    const lista: {
      fechaStr: string
      diaNumero: number
      nombreCorto: string
      nombreCompleto: string
      esHoy: boolean
      esSeleccionado: boolean
    }[] = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes)
      d.setDate(lunes.getDate() + i)
      const fStr = toISODate(d)
      lista.push({
        fechaStr: fStr,
        diaNumero: d.getDate(),
        nombreCorto: DIAS_SEMANA_CORTOS[i],
        nombreCompleto: DIAS_SEMANA_COMPLETOS[i],
        esHoy: fStr === hoyStr,
        esSeleccionado: fStr === fechaSeleccionada,
      })
    }

    return lista
  }, [fechaReferencia, hoyStr, fechaSeleccionada])

  // Rango de fechas visibles en pantalla para la consulta del calendario
  const rangoVisible = useMemo(() => {
    if (tipoVista === 'mes') {
      if (diasMes.length === 0) return { inicio: hoyStr, fin: hoyStr }
      return {
        inicio: diasMes[0].fechaStr,
        fin: diasMes[diasMes.length - 1].fechaStr,
      }
    } else {
      if (diasSemana.length === 0) return { inicio: hoyStr, fin: hoyStr }
      return {
        inicio: diasSemana[0].fechaStr,
        fin: diasSemana[diasSemana.length - 1].fechaStr,
      }
    }
  }, [tipoVista, diasMes, diasSemana, hoyStr])

  // ==========================================
  // CARGA DE DATOS: RANGO Y DÍA DETALLADO
  // ==========================================

  // Carga las clases de todo el rango visible para pintar la cuadrícula del calendario
  const cargarClasesRango = useCallback(async () => {
    if (!empresaId) return
    setLoadingRango(true)
    try {
      const res = await clasesService.getClasesByRangoFechas(
        empresaId,
        rangoVisible.inicio,
        rangoVisible.fin
      )
      if (res.data) {
        setClasesRango(res.data)
      } else {
        setClasesRango([])
      }
    } catch (err) {
      console.warn('Error al cargar clases de rango:', err)
      setClasesRango([])
    } finally {
      setLoadingRango(false)
    }
  }, [empresaId, rangoVisible.inicio, rangoVisible.fin])

  useEffect(() => {
    cargarClasesRango()
  }, [cargarClasesRango])

  // Mapa de clases agrupadas por fecha (YYYY-MM-DD) para acceso rápido en la cuadrícula
  const clasesPorFechaMap = useMemo(() => {
    const map = new Map<string, ClaseConOcupacion[]>()
    for (const c of clasesRango) {
      const arr = map.get(c.fecha) || []
      arr.push(c)
      map.set(c.fecha, arr)
    }
    return map
  }, [clasesRango])

  // Carga las clases detalladas del día seleccionado (para el panel lateral y mapa)
  const cargarClasesDia = useCallback(
    async (fecha?: string) => {
      const targetFecha = fecha || fechaSeleccionada
      setLoadingDia(true)
      setErrorClases(null)
      try {
        const res = await adminService.getClasesAdmin(empresaId, targetFecha)
        if (res.error) {
          setErrorClases(res.error)
          setClasesDia([])
          setClaseActiva(null)
        } else {
          const lista = res.data || []
          setClasesDia(lista)
          setClaseActiva((prev) => {
            if (prev) {
              const found = lista.find((c) => c.id === prev.id)
              if (found) return found
            }
            return lista.length > 0 ? lista[0] : null
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error inesperado al cargar clases del día'
        setErrorClases(msg)
      } finally {
        setLoadingDia(false)
      }
    },
    [empresaId, fechaSeleccionada]
  )

  useEffect(() => {
    cargarClasesDia(fechaSeleccionada)
  }, [cargarClasesDia, fechaSeleccionada])

  // Cargar Horarios Base si se pasa a esa pestaña
  const cargarHorariosBase = useCallback(async () => {
    setLoadingHorarios(true)
    try {
      const res = await adminService.getHorariosBase(empresaId)
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error cargando horarios base',
          description: res.error,
        })
      } else {
        setHorariosBase(res.data || [])
      }
    } finally {
      setLoadingHorarios(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (vistaTab === 'horarios_base') {
      cargarHorariosBase()
    }
  }, [vistaTab, cargarHorariosBase])

  // ==========================================
  // NAVEGACIÓN DEL CALENDARIO
  // ==========================================

  const navegarAnterior = () => {
    const nuevaRef = new Date(fechaReferencia)
    if (tipoVista === 'mes') {
      nuevaRef.setMonth(nuevaRef.getMonth() - 1)
    } else {
      nuevaRef.setDate(nuevaRef.getDate() - 7)
    }
    setFechaReferencia(nuevaRef)
  }

  const navegarSiguiente = () => {
    const nuevaRef = new Date(fechaReferencia)
    if (tipoVista === 'mes') {
      nuevaRef.setMonth(nuevaRef.getMonth() + 1)
    } else {
      nuevaRef.setDate(nuevaRef.getDate() + 7)
    }
    setFechaReferencia(nuevaRef)
  }

  const navegarHoy = () => {
    const hoy = new Date()
    setFechaReferencia(hoy)
    setFechaSeleccionada(toISODate(hoy))
  }

  const handleSeleccionarDia = (fechaStr: string) => {
    setFechaSeleccionada(fechaStr)
  }

  // Título del encabezado del calendario según tipo de vista
  const tituloCalendario = useMemo(() => {
    if (tipoVista === 'mes') {
      return `${MESES[fechaReferencia.getMonth()]} ${fechaReferencia.getFullYear()}`
    } else {
      const lunes = diasSemana[0]
      const domingo = diasSemana[6]
      if (!lunes || !domingo) return ''
      return `Semana del ${lunes.diaNumero} al ${domingo.diaNumero} de ${
        MESES[fechaReferencia.getMonth()]
      } ${fechaReferencia.getFullYear()}`
    }
  }, [tipoVista, fechaReferencia, diasSemana])

  // ==========================================
  // MÉTRICAS DE OCUPACIÓN DEL DÍA SELECCIONADO
  // ==========================================

  const { totalCapacidadDia, totalOcupadosDia, porcentajeOcupacionDia } = useMemo(() => {
    const totalCap = clasesDia.reduce((sum, c) => sum + (c.capacidadTotal || capacidadDefault), 0)
    const totalOcup = clasesDia.reduce((sum, c) => sum + (c.cuposOcupados || 0), 0)
    const porcentaje = totalCap > 0 ? Math.round((totalOcup / totalCap) * 100) : 0
    return {
      totalCapacidadDia: totalCap,
      totalOcupadosDia: totalOcup,
      porcentajeOcupacionDia: porcentaje,
    }
  }, [clasesDia, capacidadDefault])

  // Clases del día filtradas
  const clasesDiaFiltradas = useMemo(() => {
    if (filtroDia === 'todas') return clasesDia
    if (filtroDia === 'confirmadas') {
      return clasesDia.filter(
        (c) =>
          (c.estado === 'programada' || c.estado === 'en_curso') && (c.cuposOcupados || 0) > 0
      )
    }
    if (filtroDia === 'pendientes') {
      return clasesDia.filter((c) => (c.cuposDisponibles || 0) > 0 && c.estado !== 'cancelada')
    }
    return clasesDia
  }, [clasesDia, filtroDia])

  // ==========================================
  // DRAWER: NUEVA RESERVA ADMINISTRATIVA (2 PASOS)
  // ==========================================

  // Abrir Drawer de reserva (opcionalmente preseleccionando una clase)
  const abrirDrawerNuevaReserva = (clasePreseleccionada?: ClaseAdminDetalle) => {
    const claseTarget = clasePreseleccionada || (clasesDia.length > 0 ? clasesDia[0] : null)
    setReservaClaseId(claseTarget?.id || '')
    setReservaPuestoNumero(null)
    setReservaModoPuesto('auto')
    setReservaClienteNombre('')
    setReservaClienteEmail('')
    setReservaClienteTelefono('')
    setReservaMetodoPago('efectivo')
    setPasoReserva(1)
    setDrawerReservaOpen(true)

    if (claseTarget) {
      cargarAsientosParaReserva(claseTarget.id, claseTarget.capacidadTotal || capacidadDefault)
    } else {
      setAsientosClaseReserva([])
    }
  }

  // Carga de asientos para el selector interactivo del paso 1
  const cargarAsientosParaReserva = async (claseId: string, cap: number) => {
    if (!empresaId || !claseId) return
    setLoadingAsientos(true)
    try {
      const res = await clasesService.getBicicletasParaClase(claseId, empresaId, cap)
      if (res.data) {
        setAsientosClaseReserva(res.data)
      } else {
        setAsientosClaseReserva([])
      }
    } catch (err) {
      console.warn('Error cargando asientos para reserva:', err)
      setAsientosClaseReserva([])
    } finally {
      setLoadingAsientos(false)
    }
  }

  // Manejar cambio de clase en el paso 1
  const handleCambiarClaseReserva = (nuevaClaseId: string) => {
    setReservaClaseId(nuevaClaseId)
    setReservaPuestoNumero(null)
    const encontrada = clasesDia.find((c) => c.id === nuevaClaseId)
    const cap = encontrada?.capacidadTotal || capacidadDefault
    cargarAsientosParaReserva(nuevaClaseId, cap)
  }

  // Confirmar la reserva administrativa en el Paso 2
  const handleConfirmarReservaAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId || !reservaClaseId) {
      toast({
        variant: 'destructive',
        title: 'Error de validación',
        description: 'Debes seleccionar una sesión válida.',
      })
      return
    }

    if (!reservaClienteNombre.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nombre requerido',
        description: 'Por favor ingresa el nombre completo del cliente.',
      })
      return
    }

    if (!reservaClienteEmail.trim() || !reservaClienteEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Correo inválido',
        description: 'Ingresa un correo electrónico válido para registrar la reserva.',
      })
      return
    }

    setGuardandoReserva(true)
    try {
      const res = await reservasService.crearReservaAdmin({
        empresaId,
        claseId: reservaClaseId,
        clienteNombre: reservaClienteNombre.trim(),
        clienteEmail: reservaClienteEmail.trim(),
        clienteTelefono: reservaClienteTelefono.trim() || undefined,
        puestoNumero: reservaModoPuesto === 'manual' && reservaPuestoNumero ? reservaPuestoNumero : undefined,
        metodoPago: reservaMetodoPago,
      })

      if (!res.success || res.error) {
        toast({
          variant: 'destructive',
          title: 'No se pudo crear la reserva',
          description: res.error || 'Ocurrió un error al procesar la reserva administrativa.',
        })
        return
      }

      toast({
        variant: 'success',
        title: '¡Reserva Creada!',
        description: `Se registró a ${reservaClienteNombre} en la sesión seleccionada exitosamente.`,
      })

      setDrawerReservaOpen(false)
      // Refrescar calendario y panel del día
      cargarClasesRango()
      cargarClasesDia(fechaSeleccionada)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al crear reserva'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setGuardandoReserva(false)
    }
  }

  // Clase seleccionada en el drawer para resumen visual
  const claseReservaSeleccionada = useMemo(() => {
    return clasesDia.find((c) => c.id === reservaClaseId) || null
  }, [clasesDia, reservaClaseId])

  // ==========================================
  // MODAL: MAPA DE PUESTOS Y ASISTENCIAS
  // ==========================================

  const abrirModalMapaPuestos = (clase: ClaseAdminDetalle) => {
    setClaseActiva(clase)
    setModalMapaPuestosOpen(true)
  }

  // Agrupar los puestos en filas de 5 para el visualizador
  const filasPuestos = useMemo(() => {
    if (!claseActiva) return []
    const capTotal = claseActiva.capacidadTotal || capacidadDefault
    const slots = []
    for (let i = 1; i <= capTotal; i++) {
      const biciEncontrada = bicicletasActivas.find((b) => b.numero === i)
      slots.push({
        numero: i,
        id: biciEncontrada?.id || `slot-${i}`,
        codigo: biciEncontrada?.codigo || `P-${i}`,
      })
    }

    const filas = []
    for (let i = 0; i < slots.length; i += 5) {
      filas.push(slots.slice(i, i + 5))
    }
    return filas
  }, [claseActiva, capacidadDefault, bicicletasActivas])

  // Marcar asistencia manual por alumno en la lista
  const handleMarcarAsistenciaManual = async (reservaId: string) => {
    setMarcandoReservaId(reservaId)
    try {
      const res = await reservasService.marcarAsistencia(reservaId)
      if (!res.success || res.error) {
        toast({
          variant: 'destructive',
          title: 'Error de asistencia',
          description: res.error || 'No se pudo marcar asistencia',
        })
      } else {
        toast({
          variant: 'success',
          title: 'Asistencia confirmada',
          description: 'Check-in registrado exitosamente.',
        })
        cargarClasesDia(fechaSeleccionada)
      }
    } finally {
      setMarcandoReservaId(null)
    }
  }

  // ==========================================
  // MODAL CREAR / EDITAR CLASE
  // ==========================================

  const abrirModalCrearClase = () => {
    setEditingClase(null)
    setFormDataClase({
      nombre: '',
      fecha: fechaSeleccionada,
      horaInicio: '07:00',
      horaFin: '07:45',
      descripcion: `${verticalConfig.sesionSingular} programada en ${verticalConfig.espacio.toLowerCase()}.`,
      capacidad: capacidadDefault,
      estado: 'programada',
    })
    setModalClaseOpen(true)
  }

  const abrirModalEditarClase = (clase: ClaseAdminDetalle) => {
    setEditingClase(clase)
    setFormDataClase({
      nombre: clase.titulo,
      fecha: clase.fecha,
      horaInicio: clase.hora_inicio.slice(0, 5),
      horaFin: clase.hora_fin.slice(0, 5),
      descripcion: clase.descripcion || '',
      capacidad: clase.capacidadTotal || 15,
      estado: clase.estado,
    })
    setModalClaseOpen(true)
  }

  const handleGuardarClase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDataClase.nombre.trim()) return

    setGuardandoClase(true)
    try {
      if (editingClase) {
        const res = await adminService.actualizarClase(editingClase.id, empresaId, {
          titulo: formDataClase.nombre.trim(),
          fecha: formDataClase.fecha,
          horaInicio: `${formDataClase.horaInicio.slice(0, 5)}:00`,
          horaFin: `${formDataClase.horaFin.slice(0, 5)}:00`,
          descripcion: formDataClase.descripcion.trim() || null,
          capacidad: formDataClase.capacidad || 15,
          estado: formDataClase.estado,
        })
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error actualizando clase',
            description: res.error || 'No se pudo actualizar la clase',
          })
          return
        }
        toast({
          variant: 'success',
          title: 'Clase actualizada',
          description: `"${res.data.titulo}" actualizada correctamente.`,
        })
      } else {
        const params: CrearClaseParams = {
          empresaId,
          nombre: formDataClase.nombre.trim(),
          fecha: formDataClase.fecha,
          horaInicio: `${formDataClase.horaInicio.slice(0, 5)}:00`,
          horaFin: `${formDataClase.horaFin.slice(0, 5)}:00`,
          descripcion: formDataClase.descripcion.trim() || null,
          capacidad: formDataClase.capacidad || 15,
        }
        const res = await adminService.crearClase(params)
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error creando clase',
            description: res.error || 'No se pudo crear la clase',
          })
          return
        }
        toast({
          variant: 'success',
          title: 'Clase creada',
          description: `"${res.data.titulo}" programada para el ${res.data.fecha}.`,
        })
      }

      setModalClaseOpen(false)
      cargarClasesRango()
      cargarClasesDia(formDataClase.fecha)
    } finally {
      setGuardandoClase(false)
    }
  }

  // Eliminar clase
  const handleConfirmEliminarClase = async () => {
    if (!claseParaEliminar) return
    setEliminandoClase(true)
    try {
      const res = await adminService.eliminarClase(
        claseParaEliminar.id,
        empresaId,
        { forzarConCancelacion: forzarCancelacion }
      )
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar clase',
          description: res.error,
        })
      } else {
        toast({
          variant: 'success',
          title: 'Clase eliminada',
          description: `La sesión "${claseParaEliminar.titulo}" ha sido eliminada.`,
        })
        setClaseParaEliminar(null)
        cargarClasesRango()
        cargarClasesDia(fechaSeleccionada)
      }
    } finally {
      setEliminandoClase(false)
    }
  }

  // ==========================================
  // HORARIOS BASE HANDLERS
  // ==========================================

  const abrirModalCrearHorario = () => {
    setEditingHorario(null)
    setFormHorario({
      diaSemana: 0,
      horaInicio: '06:00',
      horaFin: '06:45',
      activo: true,
    })
    setModalHorarioOpen(true)
  }

  const abrirModalEditarHorario = (h: Tables<'horarios_base'>) => {
    setEditingHorario(h)
    setFormHorario({
      diaSemana: h.dia_semana,
      horaInicio: h.hora_inicio.slice(0, 5),
      horaFin: h.hora_fin.slice(0, 5),
      activo: h.activo ?? true,
    })
    setModalHorarioOpen(true)
  }

  const handleGuardarHorario = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoHorario(true)
    try {
      if (editingHorario) {
        const res = await adminService.actualizarHorarioBase(editingHorario.id, empresaId, {
          diaSemana: formHorario.diaSemana,
          horaInicio: `${formHorario.horaInicio.slice(0, 5)}:00`,
          horaFin: `${formHorario.horaFin.slice(0, 5)}:00`,
          activo: formHorario.activo,
        })
        if (res.error) {
          toast({ variant: 'destructive', title: 'Error', description: res.error })
        } else {
          toast({ variant: 'success', title: 'Horario base actualizado' })
          setModalHorarioOpen(false)
          cargarHorariosBase()
        }
      } else {
        const res = await adminService.crearHorarioBase({
          empresaId,
          diaSemana: formHorario.diaSemana,
          horaInicio: `${formHorario.horaInicio.slice(0, 5)}:00`,
          horaFin: `${formHorario.horaFin.slice(0, 5)}:00`,
          activo: formHorario.activo,
        })
        if (res.error) {
          toast({ variant: 'destructive', title: 'Error', description: res.error })
        } else {
          toast({ variant: 'success', title: 'Horario base creado' })
          setModalHorarioOpen(false)
          cargarHorariosBase()
        }
      }
    } finally {
      setGuardandoHorario(false)
    }
  }

  const handleEliminarHorario = async (id: string) => {
    setEliminandoHorarioId(id)
    try {
      const res = await adminService.eliminarHorarioBase(id, empresaId)
      if (res.error) {
        toast({ variant: 'destructive', title: 'Error', description: res.error })
      } else {
        toast({ variant: 'success', title: 'Horario base eliminado' })
        cargarHorariosBase()
      }
    } finally {
      setEliminandoHorarioId(null)
    }
  }

  // ==========================================
  // ESCÁNER QR Y ASISTENCIA
  // ==========================================

  const detenerCamara = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCamaraActiva(false)
  }, [])

  const ejecutarValidacionQR = useCallback(
    async (rawCode: string) => {
      const codigo = rawCode.trim()
      if (!codigo || validandoQR) return
      setValidandoQR(true)
      try {
        const res = await reservasService.registrarAsistenciaQR(
          codigo,
          empresaId,
          claseActiva?.id
        )
        setResultadoAsistencia(res)
        if (res.success) {
          toast({
            variant: 'success',
            title: '¡Asistencia Confirmada!',
            description: res.mensaje,
          })
          cargarClasesDia(fechaSeleccionada)
        } else {
          toast({
            variant: 'destructive',
            title: 'Validación Rechazada',
            description: res.mensaje,
          })
        }
      } finally {
        setValidandoQR(false)
      }
    },
    [empresaId, validandoQR, fechaSeleccionada, claseActiva?.id, cargarClasesDia]
  )

  const iniciarCamara = useCallback(
    async (facing: 'environment' | 'user' = 'environment') => {
      detenerCamara()
      setCamaraError(null)
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Tu navegador no soporta acceso a la cámara web o video stream.')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCamaraActiva(true)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo activar la cámara'
        setCamaraError(msg)
        setCamaraActiva(false)
      }
    },
    [detenerCamara]
  )

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    if (camaraActiva) {
      iniciarCamara(nextMode)
    }
  }

  const handleBuscarAlumnos = async (q: string) => {
    setBusquedaQuery(q)
    if (!q.trim() || q.trim().length < 2) {
      setAlumnosBuscados([])
      return
    }
    setBuscandoAlumnos(true)
    try {
      const res = await authService.buscarAlumnos(empresaId, q.trim())
      setAlumnosBuscados(res.data || [])
    } finally {
      setBuscandoAlumnos(false)
    }
  }

  const handleValidarQR = (e: React.FormEvent) => {
    e.preventDefault()
    ejecutarValidacionQR(codigoQrInput)
  }

  useEffect(() => {
    if (!modalEscanerQR) {
      detenerCamara()
      setResultadoAsistencia(null)
      setCodigoQrInput('')
      setBusquedaQuery('')
      setAlumnosBuscados([])
    }
  }, [modalEscanerQR, detenerCamara])

  useEffect(() => {
    if (modalEscanerQR && modoAsistencia === 'camara' && !camaraActiva && !camaraError) {
      iniciarCamara(facingMode)
    } else if (modoAsistencia !== 'camara' && camaraActiva) {
      detenerCamara()
    }
  }, [modalEscanerQR, modoAsistencia, camaraActiva, camaraError, facingMode, iniciarCamara, detenerCamara])

  // Helper para asignar color a la píldora de la sesión según ocupación
  const getPildoraColor = (cuposOcupados: number, capTotal: number) => {
    const ratio = capTotal > 0 ? cuposOcupados / capTotal : 0
    if (ratio >= 0.9) {
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
    }
    if (ratio >= 0.5) {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
    }
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
  }

  return (
    <div className="space-y-6 w-full">
      {/* ========================================== */}
      {/* 1. BARRA SUPERIOR DE CONTROL Y ACCIONES     */}
      {/* ========================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className={`w-6 h-6 ${currentPalette.textClass}`} />
              Calendario de Reservas y {verticalConfig.sesionPlural}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {studioName}
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión full-width interactiva de {verticalConfig.sesionPlural.toLowerCase()} mensuales/semanales,
            control de cupos de {verticalConfig.recursoCortoPlural} y mesa de check-in QR.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Pestaña Principal: Calendario vs Horarios Base */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
            <Button
              type="button"
              size="sm"
              variant={vistaTab === 'calendario' ? 'default' : 'ghost'}
              onClick={() => setVistaTab('calendario')}
              className={`h-8 text-xs font-bold ${
                vistaTab === 'calendario' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1" />
              <span>Calendario</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vistaTab === 'horarios_base' ? 'default' : 'ghost'}
              onClick={() => setVistaTab('horarios_base')}
              className={`h-8 text-xs font-bold gap-1 ${
                vistaTab === 'horarios_base' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Plantillas Base</span>
            </Button>
          </div>

          {vistaTab === 'calendario' && (
            <>
              {/* Botón de Escáner QR de Recepción */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalEscanerQR(true)
                  setResultadoAsistencia(null)
                  setCodigoQrInput('')
                }}
                className="text-xs font-bold gap-1.5 h-8 border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Pase QR</span>
              </Button>

              {/* Botón Nueva Reserva Administrativa (Abre Drawer de 2 Pasos) */}
              <Button
                type="button"
                size="sm"
                onClick={() => abrirDrawerNuevaReserva()}
                className={`text-xs font-bold gap-1.5 h-8 ${currentPalette.bgClass} text-white shadow-sm hover:opacity-95`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Nueva Reserva</span>
              </Button>

              {/* Botón Crear Nueva Clase */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={abrirModalCrearClase}
                className="text-xs font-bold gap-1 h-8"
              >
                <span>+ {verticalConfig.sesionSingular}</span>
              </Button>
            </>
          )}

          {vistaTab === 'horarios_base' && (
            <Button
              type="button"
              size="sm"
              onClick={abrirModalCrearHorario}
              className={`text-xs font-bold gap-1.5 h-8 ${currentPalette.bgClass} text-white shadow-sm`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuevo Horario Base</span>
            </Button>
          )}
        </div>
      </div>

      {errorClases && vistaTab === 'calendario' && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorClases}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. VISTA DE HORARIOS BASE (PLANTILLAS)     */}
      {/* ========================================== */}
      {vistaTab === 'horarios_base' ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className={`w-4 h-4 ${currentPalette.textClass}`} />
                Plantillas de Horarios Base Semanales ({horariosBase.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Horarios recurrentes utilizados para generar planificaciones masivas y automatizadas.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loadingHorarios ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : horariosBase.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground space-y-3">
                <Repeat className="w-8 h-8 mx-auto opacity-30" />
                <p>No hay horarios base configurados para esta sede.</p>
                <Button type="button" size="sm" variant="outline" onClick={abrirModalCrearHorario}>
                  Crear Primer Horario Base
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {horariosBase.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-bold text-xs">
                        {DIAS_SEMANA_COMPLETOS[h.dia_semana] || `Día ${h.dia_semana}`}
                      </Badge>
                      <span className="font-mono text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                      </span>
                      <Badge variant={h.activo ? 'success' : 'secondary'} className="text-[10px]">
                        {h.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => abrirModalEditarHorario(h)}
                        className="h-8 text-xs gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={eliminandoHorarioId === h.id}
                        onClick={() => handleEliminarHorario(h.id)}
                        className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                      >
                        {eliminandoHorarioId === h.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ========================================== */
        /* 3. CALENDARIO FULL-WIDTH INTERACTIVO       */
        /* ========================================== */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
          {/* COLUMNA IZQUIERDA / PRINCIPAL: CUADRÍCULA CALENDARIO (7 Cols en XL) */}
          <div className="xl:col-span-7 2xl:col-span-8 space-y-4">
            <Card className="border-border/80 shadow-sm overflow-hidden">
              {/* Barra de Navegación del Calendario: Mes/Semana, Anterior, Hoy, Siguiente */}
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border bg-card p-0.5 shadow-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={navegarAnterior}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title={tipoVista === 'mes' ? 'Mes Anterior' : 'Semana Anterior'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={navegarHoy}
                      className="h-8 text-xs font-bold px-2.5"
                    >
                      Hoy
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={navegarSiguiente}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title={tipoVista === 'mes' ? 'Mes Siguiente' : 'Semana Siguiente'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <h2 className="text-base sm:text-lg font-black tracking-tight capitalize text-foreground flex items-center gap-2">
                    <span>{tituloCalendario}</span>
                    {loadingRango && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </h2>
                </div>

                {/* Alternador de vista: Mensual vs Semanal */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTipoVista('mes')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      tipoVista === 'mes'
                        ? `${currentPalette.bgClass} text-white shadow-xs`
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoVista('semana')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      tipoVista === 'semana'
                        ? `${currentPalette.bgClass} text-white shadow-xs`
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Semanal
                  </button>
                </div>
              </div>

              {/* Contenido de la Cuadrícula según la vista seleccionada */}
              {tipoVista === 'mes' ? (
                /* -------------------------------------- */
                /* VISTA MENSUAL: 7 COLUMNAS LUN A DOM    */
                /* -------------------------------------- */
                <div className="w-full">
                  {/* Encabezado de los días de la semana */}
                  <div className="grid grid-cols-7 border-b bg-muted/40 text-center font-bold text-xs py-2 text-muted-foreground">
                    {DIAS_SEMANA_CORTOS.map((dia) => (
                      <div key={dia} className="uppercase tracking-wider text-[11px]">
                        {dia}
                      </div>
                    ))}
                  </div>

                  {/* Cuadrícula de Celdas de Día */}
                  <div className="grid grid-cols-7 divide-x divide-y divide-border border-b bg-background">
                    {diasMes.map((dia) => {
                      const sesiones = clasesPorFechaMap.get(dia.fechaStr) || []
                      const totalSesiones = sesiones.length

                      return (
                        <div
                          key={dia.fechaStr}
                          onClick={() => handleSeleccionarDia(dia.fechaStr)}
                          className={`min-h-[105px] sm:min-h-[118px] p-1.5 sm:p-2 cursor-pointer transition-all flex flex-col justify-between group ${
                            !dia.esMesActual ? 'bg-muted/10 opacity-45' : 'hover:bg-muted/20'
                          } ${
                            dia.esSeleccionado
                              ? 'ring-2 ring-inset ' + currentPalette.ringClass + ' bg-primary/5'
                              : ''
                          }`}
                        >
                          {/* Fila Superior de la Celda: Número y Contador de Clases */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold font-mono transition-transform group-hover:scale-105 ${
                                dia.esHoy
                                  ? `${currentPalette.bgClass} text-white shadow-xs`
                                  : dia.esSeleccionado
                                  ? 'bg-foreground text-background font-extrabold'
                                  : 'text-foreground/90'
                              }`}
                            >
                              {dia.diaNumero}
                            </span>

                            {totalSesiones > 0 && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-muted border text-muted-foreground">
                                {totalSesiones}
                              </span>
                            )}
                          </div>

                          {/* Píldoras de las Sesiones del Día */}
                          <div className="space-y-1 flex-1 overflow-hidden">
                            {sesiones.slice(0, 3).map((sesion) => {
                              const pildoraColor = getPildoraColor(
                                sesion.cuposOcupados || 0,
                                sesion.capacidadTotal || 15
                              )
                              const cuposPct =
                                (sesion.capacidadTotal || 15) > 0
                                ? Math.round(
                                    ((sesion.cuposOcupados || 0) / (sesion.capacidadTotal || 15)) *
                                      100
                                  )
                                : 0

                              return (
                                <div
                                  key={sesion.id}
                                  title={`${sesion.titulo} (${sesion.hora_inicio?.slice(
                                    0,
                                    5
                                  )}) - ${sesion.cuposOcupados || 0}/${
                                    sesion.capacidadTotal || 15
                                  } cupos (${cuposPct}%)`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center justify-between gap-1 truncate ${pildoraColor}`}
                                >
                                  <div className="truncate flex items-center gap-1 min-w-0">
                                    <span className="font-mono text-[9px] shrink-0 font-bold">
                                      {sesion.hora_inicio?.slice(0, 5)}
                                    </span>
                                    <span className="truncate">{sesion.titulo}</span>
                                  </div>
                                  <span className="font-mono text-[9px] shrink-0 font-bold ml-1">
                                    {sesion.cuposOcupados || 0}/{sesion.capacidadTotal || 15}
                                  </span>
                                </div>
                              )
                            })}

                            {totalSesiones > 3 && (
                              <div className="text-[10px] text-muted-foreground font-bold px-1 text-right">
                                +{totalSesiones - 3} más
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* -------------------------------------- */
                /* VISTA SEMANAL: 7 COLUMNAS VERTICALES   */
                /* -------------------------------------- */
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[700px] grid grid-cols-7 divide-x divide-border">
                    {diasSemana.map((dia) => {
                      const sesiones = clasesPorFechaMap.get(dia.fechaStr) || []
                      return (
                        <div
                          key={dia.fechaStr}
                          onClick={() => handleSeleccionarDia(dia.fechaStr)}
                          className={`min-h-[460px] flex flex-col p-2.5 transition-all cursor-pointer ${
                            dia.esSeleccionado
                              ? 'bg-primary/5 ring-2 ring-inset ' + currentPalette.ringClass
                              : 'hover:bg-muted/10'
                          }`}
                        >
                          {/* Cabecera del Día de la Semana */}
                          <div className="text-center pb-2 border-b mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                              {dia.nombreCorto}
                            </span>
                            <span
                              className={`w-7 h-7 mx-auto mt-0.5 flex items-center justify-center rounded-full text-xs font-bold font-mono ${
                                dia.esHoy
                                  ? `${currentPalette.bgClass} text-white`
                                  : 'text-foreground'
                              }`}
                            >
                              {dia.diaNumero}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                              {sesiones.length} {sesiones.length === 1 ? 'clase' : 'clases'}
                            </span>
                          </div>

                          {/* Lista de Tarjetas de Sesión en la Columna */}
                          <div className="space-y-2 flex-1">
                            {sesiones.length === 0 ? (
                              <div className="h-28 flex items-center justify-center text-center text-[10px] text-muted-foreground">
                                Sin sesiones
                              </div>
                            ) : (
                              sesiones.map((sesion) => {
                                const cuposPct =
                                  (sesion.capacidadTotal || 15) > 0
                                    ? Math.round(
                                        ((sesion.cuposOcupados || 0) /
                                          (sesion.capacidadTotal || 15)) *
                                          100
                                      )
                                    : 0
                                const pildoraColor = getPildoraColor(
                                  sesion.cuposOcupados || 0,
                                  sesion.capacidadTotal || 15
                                )

                                return (
                                  <div
                                    key={sesion.id}
                                    className="p-2 rounded-lg border bg-card hover:shadow-xs transition-shadow text-xs space-y-1.5"
                                  >
                                    <div className="font-mono text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                                      <span>
                                        {sesion.hora_inicio?.slice(0, 5)} - {sesion.hora_fin?.slice(0, 5)}
                                      </span>
                                    </div>
                                    <div className="font-bold text-foreground truncate" title={sesion.titulo}>
                                      {sesion.titulo}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-muted-foreground">Ocupación</span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded font-mono font-bold border text-[9px] ${pildoraColor}`}
                                      >
                                        {sesion.cuposOcupados || 0}/{sesion.capacidadTotal || 15} ({cuposPct}%)
                                      </span>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* COLUMNA DERECHA: PANEL LATERAL INTERACTIVO DEL DÍA SELECCIONADO (5 Cols)   */}
          {/* ========================================================================= */}
          <div className="xl:col-span-5 2xl:col-span-4 space-y-4">
            <Card className="border-border/80 shadow-sm sticky top-4">
              <CardHeader className="p-4 border-b space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Sesiones del Día
                    </span>
                    <CardTitle className="text-base font-extrabold text-foreground">
                      {formatFechaLegible(fechaSeleccionada)}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                    {clasesDia.length} {verticalConfig.sesionPlural.toLowerCase()}
                  </Badge>
                </div>

                {/* Barra de Progreso de Ocupación del Día */}
                <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      Ocupación General del Día
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {porcentajeOcupacionDia}% ({totalOcupadosDia} / {totalCapacidadDia} cupos)
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        porcentajeOcupacionDia >= 90
                          ? 'bg-rose-500'
                          : porcentajeOcupacionDia >= 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, porcentajeOcupacionDia)}%` }}
                    />
                  </div>
                </div>

                {/* Filtros Rápidos: Todas / Confirmadas / Pendientes */}
                <div className="flex items-center gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setFiltroDia('todas')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filtroDia === 'todas'
                        ? `${currentPalette.bgClass} text-white`
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Todas ({clasesDia.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroDia('confirmadas')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filtroDia === 'confirmadas'
                        ? `${currentPalette.bgClass} text-white`
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Confirmadas (
                    {
                      clasesDia.filter(
                        (c) =>
                          (c.estado === 'programada' || c.estado === 'en_curso') &&
                          (c.cuposOcupados || 0) > 0
                      ).length
                    }
                    )
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroDia('pendientes')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filtroDia === 'pendientes'
                        ? `${currentPalette.bgClass} text-white`
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Con Cupos (
                    {
                      clasesDia.filter(
                        (c) => (c.cuposDisponibles || 0) > 0 && c.estado !== 'cancelada'
                      ).length
                    }
                    )
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                {loadingDia ? (
                  <div className="h-44 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : clasesDiaFiltradas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
                    <CalendarIcon className="w-8 h-8 mx-auto opacity-30" />
                    <p>
                      No hay {verticalConfig.sesionPlural.toLowerCase()} en este estado para la fecha seleccionada.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={abrirModalCrearClase}
                      className="text-xs"
                    >
                      + Programar {verticalConfig.sesionSingular}
                    </Button>
                  </div>
                ) : (
                  clasesDiaFiltradas.map((clase) => {
                    const isFull = (clase.cuposOcupados || 0) >= (clase.capacidadTotal || 15)
                    const cuposPct =
                      (clase.capacidadTotal || 15) > 0
                        ? Math.round(
                            ((clase.cuposOcupados || 0) / (clase.capacidadTotal || 15)) * 100
                          )
                        : 0

                    return (
                      <div
                        key={clase.id}
                        className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-border transition-all space-y-3 shadow-xs"
                      >
                        {/* Cabecera de la Tarjeta: Horario y Estado */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-extrabold text-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {formatHora12(clase.hora_inicio)} - {formatHora12(clase.hora_fin)}
                            </span>
                            <h3 className="font-black text-sm text-foreground mt-0.5 truncate max-w-[220px]">
                              {clase.titulo}
                            </h3>
                            {clase.instructor && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-primary" />
                                <span>Instructor: {clase.instructor.nombre_completo || 'Coach Staff'}</span>
                              </p>
                            )}
                          </div>

                          <Badge
                            variant={
                              clase.estado === 'cancelada'
                                ? 'destructive'
                                : isFull
                                ? 'destructive'
                                : clase.estado === 'en_curso'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-[10px] uppercase font-bold px-2 py-0.5"
                          >
                            {isFull ? 'Lleno' : clase.estado}
                          </Badge>
                        </div>

                        {/* Métrica de Ocupación Visual */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground text-[11px]">
                              Ocupación: {clase.cuposOcupados || 0} / {clase.capacidadTotal || 15}{' '}
                              {verticalConfig.recursoCortoPlural}
                            </span>
                            <span className="font-mono font-bold text-foreground text-[11px]">
                              {clase.cuposDisponibles || 0} disponibles ({cuposPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFull
                                  ? 'bg-rose-500'
                                  : cuposPct >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, cuposPct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Botones de Acceso Directo */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/60">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Ver Mapa de Puestos */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalMapaPuestos(clase)}
                              className="h-7 px-2 text-[11px] font-bold gap-1"
                              title="Visualizar mapa de 15 puestos"
                            >
                              <LayoutGrid className="w-3 h-3" />
                              <span>Mapa</span>
                            </Button>

                            {/* Escanear QR para Check-in */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setClaseActiva(clase)
                                setModalEscanerQR(true)
                              }}
                              className="h-7 px-2 text-[11px] font-bold gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>QR</span>
                            </Button>

                            {/* + Reservar Alumno en esta Clase */}
                            <Button
                              type="button"
                              size="sm"
                              disabled={isFull || clase.estado === 'cancelada'}
                              onClick={() => abrirDrawerNuevaReserva(clase)}
                              className={`h-7 px-2.5 text-[11px] font-bold gap-1 ${currentPalette.bgClass} text-white`}
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>+ Reservar</span>
                            </Button>
                          </div>

                          {/* Acciones de Edición / Eliminación */}
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirModalEditarClase(clase)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Editar clase"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setClaseParaEliminar(clase)
                                setForzarCancelacion((clase.cuposOcupados || 0) > 0)
                              }}
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Eliminar clase"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DRAWER LATERAL DESLIZANTE (SHEET): NUEVA RESERVA ADMINISTRATIVA (2 PASOS) */}
      {/* ========================================================================= */}
      {drawerReservaOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          <div
            className="w-full max-w-lg bg-card border-l border-border h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Cabecera del Drawer */}
            <div className="p-5 border-b sticky top-0 bg-card/95 backdrop-blur-xs z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg ${currentPalette.bgClass} text-white flex items-center justify-center font-bold`}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      Nueva Reserva Administrativa
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Inscribe un alumno rápidamente en 2 pasos
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawerReservaOpen(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Indicador visual de los 2 pasos */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div
                  className={`p-2 rounded-lg border flex items-center gap-2 font-bold transition-all ${
                    pasoReserva === 1
                      ? `${currentPalette.borderClass} bg-primary/10 text-foreground`
                      : 'border-border/60 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      pasoReserva === 1
                        ? `${currentPalette.bgClass} text-white`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    1
                  </span>
                  <span>Sesión y Puesto</span>
                </div>

                <div
                  className={`p-2 rounded-lg border flex items-center gap-2 font-bold transition-all ${
                    pasoReserva === 2
                      ? `${currentPalette.borderClass} bg-primary/10 text-foreground`
                      : 'border-border/60 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      pasoReserva === 2
                        ? `${currentPalette.bgClass} text-white`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    2
                  </span>
                  <span>Datos del Cliente</span>
                </div>
              </div>
            </div>

            {/* Contenido según el Paso Actual */}
            <div className="p-5 space-y-5 flex-1">
              {pasoReserva === 1 && (
                /* -------------------------------------- */
                /* PASO 1: SELECCIÓN DE SESIÓN Y PUESTO   */
                /* -------------------------------------- */
                <div className="space-y-4 text-xs">
                  {/* Selector de Sesión / Clase */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground flex items-center justify-between">
                      <span>Seleccionar {verticalConfig.sesionSingular}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {clasesDia.length} disponibles hoy
                      </span>
                    </label>

                    {clasesDia.length === 0 ? (
                      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                        No hay {verticalConfig.sesionPlural.toLowerCase()} programadas para el{' '}
                        {fechaSeleccionada}. Programa una sesión primero.
                      </div>
                    ) : (
                      <select
                        value={reservaClaseId}
                        onChange={(e) => handleCambiarClaseReserva(e.target.value)}
                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
                      >
                        <option value="">-- Elige una sesión --</option>
                        {clasesDia.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.hora_inicio?.slice(0, 5)} - {c.hora_fin?.slice(0, 5)} | {c.titulo} (
                            {c.cuposDisponibles || 0} cupos libres)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Selector de Modo de Puesto: Automático o Manual */}
                  {reservaClaseId && (
                    <div className="space-y-3 pt-2">
                      <label className="font-bold text-foreground block">
                        Asignación de {verticalConfig.recursoSingular} / Puesto
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReservaModoPuesto('auto')
                            setReservaPuestoNumero(null)
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            reservaModoPuesto === 'auto'
                              ? `${currentPalette.borderClass} bg-primary/10 ring-1 ` +
                                currentPalette.ringClass
                              : 'hover:bg-muted/30 border-border'
                          }`}
                        >
                          <span className="font-bold text-foreground text-xs block">
                            ⚡ Asignación Automática
                          </span>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Asigna el primer puesto libre disponible
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReservaModoPuesto('manual')}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            reservaModoPuesto === 'manual'
                              ? `${currentPalette.borderClass} bg-primary/10 ring-1 ` +
                                currentPalette.ringClass
                              : 'hover:bg-muted/30 border-border'
                          }`}
                        >
                          <span className="font-bold text-foreground text-xs block">
                            🎯 Selección Manual
                          </span>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Elige el número de puesto exacto (1..15)
                          </span>
                        </button>
                      </div>

                      {/* Cuadrícula interactiva de selección manual de puestos */}
                      {reservaModoPuesto === 'manual' && (
                        <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/80">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground">
                              Elige un puesto disponible en sala:
                            </span>
                            <span className="text-muted-foreground font-mono">
                              {reservaPuestoNumero
                                ? `Seleccionado: #${reservaPuestoNumero}`
                                : 'Ninguno elegido'}
                            </span>
                          </div>

                          {loadingAsientos ? (
                            <div className="h-28 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-5 gap-1.5 pt-1">
                              {(asientosClaseReserva.length > 0
                                ? asientosClaseReserva
                                : Array.from({ length: 15 }, (_, i) => ({
                                    numero: i + 1,
                                    ocupada: false,
                                    id: `slot-${i + 1}`,
                                  }))
                              ).map((slot) => {
                                const isSelected = reservaPuestoNumero === slot.numero
                                const isOcupado = slot.ocupada

                                return (
                                  <button
                                    key={slot.numero}
                                    type="button"
                                    disabled={isOcupado}
                                    onClick={() => setReservaPuestoNumero(slot.numero)}
                                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center min-h-[56px] ${
                                      isOcupado
                                        ? 'bg-rose-500/10 border-rose-500/30 text-muted-foreground cursor-not-allowed opacity-60'
                                        : isSelected
                                        ? `${currentPalette.bgClass} text-white font-extrabold ring-2 ` +
                                          currentPalette.ringClass
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-foreground hover:bg-emerald-500/20'
                                    }`}
                                  >
                                    <span className="font-mono text-xs font-bold">#{slot.numero}</span>
                                    <span className="text-[9px] mt-0.5">
                                      {isOcupado ? 'Ocupado' : isSelected ? 'Elegido' : 'Libre'}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumen Visual en Vivo de la Sesión Seleccionada */}
                  {claseReservaSeleccionada && (
                    <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Resumen de la Sesión
                      </span>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-foreground text-sm">
                            {claseReservaSeleccionada.titulo}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {formatFechaLegible(claseReservaSeleccionada.fecha)} •{' '}
                            {formatHora12(claseReservaSeleccionada.hora_inicio)}
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs font-bold">
                          {reservaModoPuesto === 'manual' && reservaPuestoNumero
                            ? `Puesto #${reservaPuestoNumero}`
                            : 'Puesto Automático'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pasoReserva === 2 && (
                /* -------------------------------------- */
                /* PASO 2: DATOS DEL CLIENTE Y PAGO       */
                /* -------------------------------------- */
                <form onSubmit={handleConfirmarReservaAdmin} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Nombre Completo del Alumno *</label>
                    <Input
                      required
                      placeholder="Ej: Carlos Mendoza"
                      value={reservaClienteNombre}
                      onChange={(e) => setReservaClienteNombre(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Correo Electrónico *</label>
                    <Input
                      type="email"
                      required
                      placeholder="alumno@ejemplo.com"
                      value={reservaClienteEmail}
                      onChange={(e) => setReservaClienteEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Teléfono / WhatsApp (Opcional)</label>
                    <Input
                      placeholder="+57 300 123 4567"
                      value={reservaClienteTelefono}
                      onChange={(e) => setReservaClienteTelefono(e.target.value)}
                    />
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground">Método de Pago en Recepción</label>
                    <select
                      value={reservaMetodoPago}
                      onChange={(e) => setReservaMetodoPago(e.target.value)}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
                    >
                      <option value="efectivo">💵 Efectivo (Pago en recepción)</option>
                      <option value="nequi">📱 Nequi</option>
                      <option value="bancolombia">🏦 Bancolombia Transferencia</option>
                      <option value="wompi">💳 Wompi / Tarjeta Débito/Crédito</option>
                      <option value="plan_credito">🎟️ Descontar de Tiquetera / Plan</option>
                    </select>
                  </div>

                  {/* Recapitulación de Confirmación */}
                  <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-1.5">
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Confirmación de Reserva Inmediata</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Al confirmar, la reserva se creará directamente garantizando anti-colisión en el puesto y se
                      generará el comprobante administrativo.
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* Pie del Drawer con Botones de Acción */}
            <div className="p-5 border-t sticky bottom-0 bg-card z-10 flex items-center justify-between gap-3">
              {pasoReserva === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawerReservaOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!reservaClaseId}
                    onClick={() => setPasoReserva(2)}
                    className={`font-bold text-xs gap-1.5 ${currentPalette.bgClass} text-white`}
                  >
                    <span>Continuar a Datos del Cliente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPasoReserva(1)}
                    className="gap-1 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a Sesión</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={guardandoReserva}
                    onClick={handleConfirmarReservaAdmin}
                    className={`font-bold text-xs gap-1.5 ${currentPalette.bgClass} text-white shadow-md`}
                  >
                    {guardandoReserva ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirmar Reserva Administrativa</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL INTERACTIVO: MAPA DE LOS 15 PUESTOS DE LA CLASE                   */}
      {/* ========================================================================= */}
      {modalMapaPuestosOpen && claseActiva && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl shadow-2xl border-border bg-card overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Disposición de Sala — {claseActiva.titulo}
                </CardTitle>
                <CardDescription className="text-xs">
                  {formatFechaLegible(claseActiva.fecha)} • {formatHora12(claseActiva.hora_inicio)} (
                  {claseActiva.cuposOcupados || 0} / {claseActiva.capacidadTotal || 15} ocupados)
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setModalMapaPuestosOpen(false)
                    abrirDrawerNuevaReserva(claseActiva)
                  }}
                  className={`text-xs font-bold gap-1 ${currentPalette.bgClass} text-white`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Reservar Alumno</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setModalMapaPuestosOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6 overflow-y-auto flex-1">
              {/* Tarima del Coach */}
              <div className="w-52 mx-auto py-2 rounded-lg bg-muted text-center border font-bold text-xs flex items-center justify-center gap-2 shadow-inner">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>
                  {verticalConfig.showBicycleMap
                    ? 'TARIMA DEL COACH'
                    : `FRENTE DE ${verticalConfig.espacio.toUpperCase()}`}
                </span>
              </div>

              {/* Cuadrícula de Puestos (1..15) */}
              <div className="space-y-3">
                {filasPuestos.map((filaItems, rowIndex) => {
                  const firstNum = filaItems[0]?.numero
                  const lastNum = filaItems[filaItems.length - 1]?.numero

                  return (
                    <div key={`fila-${rowIndex + 1}`} className="space-y-1">
                      <div className="flex items-center justify-between px-1 max-w-lg mx-auto text-[10px] uppercase font-bold text-muted-foreground">
                        <span>Fila {rowIndex + 1}</span>
                        <span>
                          {verticalConfig.recursoCortoPlural} #{firstNum} - #{lastNum}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
                        {filaItems.map((bici) => {
                          const alumno = claseActiva.alumnos?.find(
                            (a) => a.bicicletaNumero === bici.numero
                          )
                          const isOccupied = !!alumno

                          return (
                            <div
                              key={bici.id || bici.numero}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[76px] ${
                                isOccupied
                                  ? 'bg-rose-500/10 border-rose-500/40 text-foreground'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold">
                                <span>#{bici.numero}</span>
                                {isOccupied && alumno.asistenciaConfirmada && (
                                  <span title="Asistencia Confirmada">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  </span>
                                )}
                              </div>

                              {verticalConfig.showBicycleMap ? (
                                <Bike
                                  className={`w-5 h-5 my-1 ${
                                    isOccupied ? 'text-rose-600' : 'text-emerald-600'
                                  }`}
                                />
                              ) : (
                                <LayoutGrid
                                  className={`w-5 h-5 my-1 ${
                                    isOccupied ? 'text-rose-600' : 'text-emerald-600'
                                  }`}
                                />
                              )}

                              <div className="text-[10px] truncate max-w-full font-semibold">
                                {isOccupied ? (
                                  <span
                                    className="text-foreground block truncate"
                                    title={alumno.clienteNombre}
                                  >
                                    {alumno.clienteNombre.split(' ')[0]}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400">Libre</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Lista de Alumnos Inscritos */}
              <div className="border-t pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                  <span>
                    {verticalConfig.clientePlural} Inscritos ({claseActiva.alumnos?.length || 0})
                  </span>
                  <span className="font-normal font-sans text-[11px]">
                    Asistencias:{' '}
                    {claseActiva.alumnos?.filter((a) => a.asistenciaConfirmada).length || 0}
                  </span>
                </h3>

                <div className="max-h-48 overflow-y-auto divide-y text-xs border rounded-lg">
                  {claseActiva.alumnos?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      Aún no hay {verticalConfig.clientePlural.toLowerCase()} inscritos en esta sesión.
                    </div>
                  ) : (
                    claseActiva.alumnos?.map((a) => (
                      <div
                        key={a.reservaId}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/20"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-foreground block truncate">
                            {a.clienteNombre}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            Doc: {a.clienteDocumento || 'N/A'} • Tel: {a.clienteTelefono || 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {verticalConfig.recursoSingular} #{a.bicicletaNumero}
                          </Badge>

                          {a.asistenciaConfirmada ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Presente
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={marcandoReservaId === a.reservaId}
                              onClick={() => handleMarcarAsistenciaManual(a.reservaId)}
                              className="h-6 text-[10px] px-2 font-bold"
                            >
                              {marcandoReservaId === a.reservaId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Check-in'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>

            <div className="p-4 border-t flex justify-end shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalMapaPuestosOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: ESCÁNER QR DE RECEPCIÓN (CÁMARA, PISTOLA USB Y BUSCADOR)        */}
      {/* ========================================================================= */}
      {modalEscanerQR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-purple-600" />
                  <span>Control de Asistencia por Pase QR</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalEscanerQR(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Valida el ingreso con cámara en vivo, pistola lectora USB o búsqueda rápida de{' '}
                {verticalConfig.clienteSingular.toLowerCase()}.
              </CardDescription>

              {/* Selector de modo */}
              <div className="grid grid-cols-3 gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => setModoAsistencia('pistola')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                    modoAsistencia === 'pistola'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Pistola USB</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoAsistencia('camara')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                    modoAsistencia === 'camara'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cámara Viva</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoAsistencia('buscador')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                    modoAsistencia === 'buscador'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscador</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* MODO 1: CÁMARA EN VIVO */}
              {modoAsistencia === 'camara' && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-border">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`w-full h-full object-cover ${!camaraActiva ? 'hidden' : ''}`}
                    />

                    {camaraActiva && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-dashed border-purple-400 rounded-2xl relative animate-pulse shadow-lg">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-purple-500 rounded-tl-sm" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-purple-500 rounded-tr-sm" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-purple-500 rounded-bl-sm" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-purple-500 rounded-br-sm" />
                        </div>
                      </div>
                    )}

                    {!camaraActiva && !camaraError && (
                      <div className="text-center p-4 text-muted-foreground space-y-2">
                        <Camera className="w-8 h-8 mx-auto opacity-40 text-purple-400" />
                        <p className="text-xs">Cámara apagada</p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => iniciarCamara(facingMode)}
                          className="bg-purple-600 text-white font-bold text-xs"
                        >
                          Encender Cámara
                        </Button>
                      </div>
                    )}

                    {camaraError && (
                      <div className="text-center p-4 text-rose-400 space-y-2">
                        <CameraOff className="w-8 h-8 mx-auto" />
                        <p className="text-xs font-semibold">{camaraError}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Puedes utilizar la pistola lectora USB o el buscador de alumnos.
                        </p>
                      </div>
                    )}
                  </div>

                  {camaraActiva && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Escaneando código QR en vivo...
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={toggleFacingMode}
                          className="h-7 text-[11px] gap-1"
                        >
                          <SwitchCamera className="w-3.5 h-3.5" />
                          <span>{facingMode === 'environment' ? 'Trasera' : 'Frontal'}</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={detenerCamara}
                          className="h-7 text-[11px] text-destructive hover:text-destructive"
                        >
                          Pausar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: PISTOLA USB O INGRESO MANUAL */}
              {modoAsistencia === 'pistola' && (
                <form onSubmit={handleValidarQR} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground flex items-center justify-between">
                      <span>Pistola Lectora USB / Pase QR</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Presiona Enter o dispara con el lector
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        required
                        placeholder="Ej: RESERLY-PASS-04-8849 o RESERLY-XXXXXXXX"
                        value={codigoQrInput}
                        onChange={(e) => setCodigoQrInput(e.target.value)}
                        className="font-mono text-xs"
                      />
                      <Button
                        type="submit"
                        disabled={validandoQR}
                        className="font-bold shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {validandoQR ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar'}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Compatible con lectores láser y códigos de barras/QR USB tipo Plug & Play.
                    </p>
                  </div>
                </form>
              )}

              {/* MODO 3: BUSCADOR RÁPIDO DE ALUMNOS (RESPALDO MANUAL) */}
              {modoAsistencia === 'buscador' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground">
                      Buscador de {verticalConfig.clientePlural}
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Escribe nombre, correo o documento..."
                        value={busquedaQuery}
                        onChange={(e) => handleBuscarAlumnos(e.target.value)}
                        className="pl-8 text-xs font-sans"
                      />
                      {buscandoAlumnos && (
                        <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Resultados de búsqueda */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-border border rounded-lg bg-card">
                    {alumnosBuscados.length === 0 ? (
                      <div className="p-4 text-center text-[11px] text-muted-foreground">
                        {busquedaQuery.trim()
                          ? 'No se encontraron coincidencias.'
                          : 'Escribe para buscar alumnos registrados.'}
                      </div>
                    ) : (
                      alumnosBuscados.map((alumno) => (
                        <div
                          key={alumno.id}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {alumno.avatar_url ? (
                              <img
                                src={alumno.avatar_url}
                                alt={alumno.nombre_completo}
                                className="w-7 h-7 rounded-full object-cover shrink-0 border"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {alumno.nombre_completo.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-foreground truncate">
                                {alumno.nombre_completo}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {alumno.email} {alumno.documento ? `• Doc: ${alumno.documento}` : ''}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={validandoQR}
                            onClick={() => ejecutarValidacionQR(alumno.codigo_qr)}
                            className="h-7 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                          >
                            Registrar Asistencia
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TARJETA DE RESULTADO DE ASISTENCIA Y GAMIFICACIÓN */}
              {resultadoAsistencia && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    resultadoAsistencia.success
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold flex items-center gap-2 text-sm">
                      {resultadoAsistencia.success ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-emerald-800 dark:text-emerald-300">
                            ¡Asistencia Confirmada!
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-600" />
                          <span className="text-rose-800 dark:text-rose-300">Validación Rechazada</span>
                        </>
                      )}
                    </div>

                    {resultadoAsistencia.success && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-bold bg-background shadow-xs"
                        onClick={() => {
                          setResultadoAsistencia(null)
                          setCodigoQrInput('')
                          if (modoAsistencia === 'camara') {
                            iniciarCamara()
                          }
                        }}
                      >
                        Siguiente Alumno
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-foreground/90 font-medium">
                    {resultadoAsistencia.mensaje}
                  </p>

                  {resultadoAsistencia.reserva && (
                    <div className="p-3 bg-background/80 rounded-lg border border-border/60 text-xs space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {resultadoAsistencia.alumno?.avatar_url ? (
                            <img
                              src={resultadoAsistencia.alumno.avatar_url}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full object-cover border shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {(
                                resultadoAsistencia.alumno?.nombre_completo ||
                                resultadoAsistencia.reserva.cliente_nombre
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">
                              {resultadoAsistencia.alumno?.nombre_completo ||
                                resultadoAsistencia.reserva.cliente_nombre}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                              {resultadoAsistencia.reserva.cliente_email ||
                                resultadoAsistencia.alumno?.email}
                            </div>
                          </div>
                        </div>

                        <Badge variant="secondary" className="font-mono text-xs font-bold shrink-0">
                          {verticalConfig.recursoSingular} #
                          {resultadoAsistencia.reserva.bicicleta?.numero || 'N/A'} (
                          {resultadoAsistencia.reserva.bicicleta?.codigo || 'IC'})
                        </Badge>
                      </div>

                      {/* Desglose de Puntos XP Sumados */}
                      {resultadoAsistencia.xpOtorgados && (
                        <div className="pt-2 border-t space-y-1.5">
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Puntos XP acreditados en esta sesión:</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                              +{resultadoAsistencia.xpOtorgados.asistencia} XP Asistencia
                            </Badge>
                            {resultadoAsistencia.xpOtorgados.puntualidad > 0 && (
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[11px] font-bold">
                                +{resultadoAsistencia.xpOtorgados.puntualidad} XP Puntualidad
                              </Badge>
                            )}
                            {resultadoAsistencia.xpOtorgados.bonoPlan > 0 && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                                <Award className="w-3 h-3 mr-1 text-amber-500" />
                                +{resultadoAsistencia.xpOtorgados.bonoPlan} XP Plan Cumplido
                              </Badge>
                            )}
                            <Badge variant="outline" className="font-mono font-bold text-[11px] ml-auto">
                              Total: +{resultadoAsistencia.xpOtorgados.total} XP
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Progreso del Plan */}
                      {resultadoAsistencia.progresoPlan && (
                        <div className="pt-2 border-t space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground">
                              Progreso del Plan: {resultadoAsistencia.progresoPlan.dias_cumplidos} /{' '}
                              {resultadoAsistencia.progresoPlan.dias_programados || '–'}{' '}
                              {verticalConfig.sesionPlural.toLowerCase()}
                            </span>
                            <span className="font-mono font-extrabold text-foreground">
                              {resultadoAsistencia.progresoPlan.porcentaje}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, resultadoAsistencia.progresoPlan.porcentaje)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <div className="p-5 pt-0 flex justify-end border-t mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEscanerQR(false)}
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: CREAR / EDITAR CLASE CON HYBRID HOUR SELECTOR                   */}
      {/* ========================================================================= */}
      {modalClaseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className={`w-4 h-4 ${currentPalette.textClass}`} />
                  {editingClase
                    ? `Editar ${verticalConfig.sesionSingular} / Horario`
                    : `${sesionMasculina ? 'Nuevo' : 'Nueva'} ${verticalConfig.sesionSingular} / Horario`}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalClaseOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Usa las franjas rápidas (+45 min automáticos) o ajusta las horas manualmente.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarClase}>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Nombre / Título</label>
                    <Input
                      required
                      placeholder={`Ej: ${verticalConfig.ejemploSesion}`}
                      value={formDataClase.nombre}
                      onChange={(e) => setFormDataClase({ ...formDataClase, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Fecha</label>
                    <Input
                      type="date"
                      required
                      value={formDataClase.fecha}
                      onChange={(e) => setFormDataClase({ ...formDataClase, fecha: e.target.value })}
                    />
                  </div>
                </div>

                {/* Selector Híbrido de Horas */}
                <HybridHourSelector
                  horaInicio={formDataClase.horaInicio}
                  horaFin={formDataClase.horaFin}
                  onChange={(horaInicio, horaFin) =>
                    setFormDataClase((prev) => ({ ...prev, horaInicio, horaFin }))
                  }
                  accentClass={`${currentPalette.bgClass} text-white`}
                  disabled={guardandoClase}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">
                      Capacidad ({verticalConfig.recursoPlural})
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={formDataClase.capacidad}
                      onChange={(e) =>
                        setFormDataClase({
                          ...formDataClase,
                          capacidad: Number.parseInt(e.target.value, 10) || 15,
                        })
                      }
                    />
                  </div>

                  {editingClase && (
                    <div className="space-y-1">
                      <label className="font-bold text-foreground">Estado</label>
                      <select
                        value={formDataClase.estado}
                        onChange={(e) =>
                          setFormDataClase({
                            ...formDataClase,
                            estado: e.target.value as EstadoClase,
                          })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="programada">Programada</option>
                        <option value="en_curso">En curso</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Descripción</label>
                  <Input
                    placeholder="Descripción opcional de la sesión"
                    value={formDataClase.descripcion}
                    onChange={(e) =>
                      setFormDataClase({ ...formDataClase, descripcion: e.target.value })
                    }
                  />
                </div>
              </CardContent>

              <div className="p-5 pt-0 flex items-center justify-end gap-2 border-t mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalClaseOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={guardandoClase}
                  size="sm"
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {guardandoClase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando...
                    </>
                  ) : editingClase ? (
                    'Actualizar Clase'
                  ) : (
                    'Guardar Clase'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: ELIMINAR CLASE                                                  */}
      {/* ========================================================================= */}
      {claseParaEliminar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base text-destructive">Eliminar Clase</CardTitle>
              <CardDescription className="text-xs">
                ¿Deseas eliminar la clase <strong>{claseParaEliminar.titulo}</strong> (
                {claseParaEliminar.fecha})?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {(claseParaEliminar.cuposOcupados || 0) > 0 && (
                <label className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forzarCancelacion}
                    onChange={(e) => setForzarCancelacion(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Esta clase tiene <strong>{claseParaEliminar.cuposOcupados}</strong> reserva(s)
                    activa(s). Cancelar reservas y reintegrar créditos automáticamente antes de eliminar.
                  </span>
                </label>
              )}
            </CardContent>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={eliminandoClase}
                onClick={() => setClaseParaEliminar(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={eliminandoClase}
                onClick={handleConfirmEliminarClase}
              >
                {eliminandoClase ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirmar Eliminación
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: CREAR / EDITAR HORARIO BASE                                      */}
      {/* ========================================================================= */}
      {modalHorarioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Repeat className={`w-4 h-4 ${currentPalette.textClass}`} />
                  {editingHorario ? 'Editar Horario Base' : 'Nuevo Horario Base'}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalHorarioOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Define el día semanal y la franja horaria con selector híbrido.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarHorario}>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Día de la Semana</label>
                  <select
                    value={formHorario.diaSemana}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        diaSemana: Number.parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {DIAS_SEMANA_COMPLETOS.map((nombreDia, idx) => (
                      <option key={idx} value={idx}>
                        {nombreDia}
                      </option>
                    ))}
                  </select>
                </div>

                <HybridHourSelector
                  horaInicio={formHorario.horaInicio}
                  horaFin={formHorario.horaFin}
                  onChange={(horaInicio, horaFin) =>
                    setFormHorario((prev) => ({ ...prev, horaInicio, horaFin }))
                  }
                  accentClass={`${currentPalette.bgClass} text-white`}
                  disabled={guardandoHorario}
                />

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formHorario.activo}
                    onChange={(e) => setFormHorario({ ...formHorario, activo: e.target.checked })}
                  />
                  <span className="font-semibold text-foreground">Horario base activo</span>
                </label>
              </CardContent>

              <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalHorarioOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={guardandoHorario}
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {guardandoHorario ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando...
                    </>
                  ) : editingHorario ? (
                    'Actualizar Horario'
                  ) : (
                    'Crear Horario'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default CalendarView
