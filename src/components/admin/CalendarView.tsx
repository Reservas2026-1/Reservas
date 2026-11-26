import React, { useState, useEffect, useCallback } from 'react'
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
import { reservasService, type AsistenciaQRResponse } from '@/services/reservasService'
import type { EstadoClase, Tables } from '@/types/database'

const DIAS_SEMANA_LABELS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

export const CalendarView: React.FC = () => {
  const { currentPalette, empresaId, studioName, estudioActivo } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)
  const sesionMasculina = ['Turno', 'WOD'].includes(verticalConfig.sesionSingular)
  const capacidadDefault = estudioActivo?.capacidad_sala || 15

  const [vistaTab, setVistaTab] = useState<'clases' | 'horarios_base'>('clases')

  // Estado de fecha y clases
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [clases, setClases] = useState<ClaseAdminDetalle[]>([])
  const [claseActiva, setClaseActiva] = useState<ClaseAdminDetalle | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [errorClases, setErrorClases] = useState<string | null>(null)

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

  // Escáner QR y asistencia manual
  const [modalEscanerQR, setModalEscanerQR] = useState<boolean>(false)
  const [codigoQrInput, setCodigoQrInput] = useState<string>('')
  const [validandoQR, setValidandoQR] = useState<boolean>(false)
  const [resultadoAsistencia, setResultadoAsistencia] = useState<AsistenciaQRResponse | null>(null)
  const [marcandoReservaId, setMarcandoReservaId] = useState<string | null>(null)

  const cargarClases = useCallback(
    async (fecha?: string) => {
      const targetFecha = fecha || fechaSeleccionada
      setLoading(true)
      setErrorClases(null)
      try {
        const res = await adminService.getClasesAdmin(empresaId, targetFecha)
        if (res.error) {
          setErrorClases(res.error)
          toast({
            variant: 'destructive',
            title: 'Error cargando clases',
            description: res.error,
          })
          setClases([])
          setClaseActiva(null)
        } else {
          const lista = res.data || []
          setClases(lista)
          setClaseActiva((prev) => {
            if (prev) {
              const found = lista.find((c) => c.id === prev.id)
              if (found) return found
            }
            return lista.length > 0 ? lista[0] : null
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error inesperado al cargar clases'
        setErrorClases(msg)
        toast({ variant: 'destructive', title: 'Error', description: msg })
      } finally {
        setLoading(false)
      }
    },
    [empresaId, fechaSeleccionada]
  )

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
    cargarClases(fechaSeleccionada)
  }, [cargarClases, fechaSeleccionada])

  useEffect(() => {
    if (vistaTab === 'horarios_base') {
      cargarHorariosBase()
    }
  }, [vistaTab, cargarHorariosBase])

  const cambiarDia = (dias: number) => {
    const fechaObj = new Date(fechaSeleccionada + 'T12:00:00')
    fechaObj.setDate(fechaObj.getDate() + dias)
    const nuevaFecha = fechaObj.toISOString().split('T')[0]
    setFechaSeleccionada(nuevaFecha)
  }

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
      cargarClases(fechaSeleccionada)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar clase',
        description: err instanceof Error ? err.message : 'Error inesperado',
      })
    } finally {
      setGuardandoClase(false)
    }
  }

  const handleConfirmEliminarClase = async () => {
    if (!claseParaEliminar) return
    setEliminandoClase(true)
    try {
      const res = await adminService.eliminarClase(claseParaEliminar.id, empresaId, {
        forzarConCancelacion: forzarCancelacion,
      })
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar la clase',
          description: res.error || 'Error al eliminar',
        })
        return
      }
      toast({
        variant: 'success',
        title: 'Clase eliminada',
        description: `"${claseParaEliminar.titulo}" fue eliminada.`,
      })
      setClaseParaEliminar(null)
      setForzarCancelacion(false)
      cargarClases(fechaSeleccionada)
    } finally {
      setEliminandoClase(false)
    }
  }

  // Horarios Base Handlers
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
      activo: h.activo,
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
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error actualizando horario',
            description: res.error || 'No se pudo actualizar',
          })
          return
        }
        toast({
          variant: 'success',
          title: 'Horario base actualizado',
          description: `${DIAS_SEMANA_LABELS[res.data.dia_semana]} ${res.data.hora_inicio.slice(0, 5)}`,
        })
      } else {
        const res = await adminService.crearHorarioBase({
          empresaId,
          diaSemana: formHorario.diaSemana,
          horaInicio: `${formHorario.horaInicio.slice(0, 5)}:00`,
          horaFin: `${formHorario.horaFin.slice(0, 5)}:00`,
          activo: formHorario.activo,
        })
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error creando horario base',
            description: res.error || 'No se pudo crear',
          })
          return
        }
        toast({
          variant: 'success',
          title: 'Horario base creado',
          description: `${DIAS_SEMANA_LABELS[res.data.dia_semana]} ${res.data.hora_inicio.slice(0, 5)}`,
        })
      }

      setModalHorarioOpen(false)
      cargarHorariosBase()
    } finally {
      setGuardandoHorario(false)
    }
  }

  const handleEliminarHorario = async (horarioId: string) => {
    setEliminandoHorarioId(horarioId)
    try {
      const res = await adminService.eliminarHorarioBase(horarioId, empresaId)
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: res.error || 'Error al eliminar horario base',
        })
        return
      }
      setHorariosBase((prev) => prev.filter((h) => h.id !== horarioId))
      toast({
        variant: 'success',
        title: 'Horario base eliminado',
      })
    } finally {
      setEliminandoHorarioId(null)
    }
  }

  // Registrar asistencia por código QR
  const handleValidarQR = async (e: React.FormEvent) => {
    e.preventDefault()
    const codigo = codigoQrInput.trim()
    if (!codigo) return

    setValidandoQR(true)
    setResultadoAsistencia(null)

    try {
      const res = await reservasService.registrarAsistenciaQR(codigo, empresaId, claseActiva?.id)
      setResultadoAsistencia(res)

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Asistencia confirmada',
          description: res.mensaje,
        })
        cargarClases(fechaSeleccionada)
      } else {
        toast({
          variant: 'destructive',
          title: 'Validación QR fallida',
          description: res.mensaje || res.error || 'Código inválido',
        })
      }
    } catch (err) {
      const msg = String(err)
      setResultadoAsistencia({
        success: false,
        reserva: null,
        mensaje: 'Error de conexión al validar código QR',
        error: msg,
      })
      toast({ variant: 'destructive', title: 'Error QR', description: msg })
    } finally {
      setValidandoQR(false)
    }
  }

  // Marcar asistencia manual por alumno
  const handleMarcarAsistenciaManual = async (reservaId: string) => {
    setMarcandoReservaId(reservaId)
    try {
      const res = await reservasService.marcarAsistencia(reservaId)
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Error marcando asistencia',
          description: res.error || 'No se pudo confirmar la asistencia',
        })
        return
      }
      toast({ variant: 'success', title: 'Asistencia registrada' })
      cargarClases(fechaSeleccionada)
    } finally {
      setMarcandoReservaId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">
              {verticalConfig.navHorariosLabel} y {verticalConfig.recursoPlural}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {studioName}
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            CRUD completo de {verticalConfig.sesionPlural.toLowerCase()} diarias, horarios base semanales, disponibilidad de{' '}
            {verticalConfig.recursoCortoPlural} y check-in QR.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de pestaña Clases / Horarios Base */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
            <Button
              type="button"
              size="sm"
              variant={vistaTab === 'clases' ? 'default' : 'ghost'}
              onClick={() => setVistaTab('clases')}
              className={`h-7 text-xs font-bold ${
                vistaTab === 'clases' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              {verticalConfig.sesionPlural} del Día
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vistaTab === 'horarios_base' ? 'default' : 'ghost'}
              onClick={() => setVistaTab('horarios_base')}
              className={`h-7 text-xs font-bold gap-1 ${
                vistaTab === 'horarios_base' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Horarios Base</span>
            </Button>
          </div>

          {vistaTab === 'clases' ? (
            <>
              <div className="flex items-center gap-1 border rounded-lg p-1 bg-card">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => cambiarDia(-1)}
                  title="Día anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="h-7 w-32 text-xs font-mono border-0 bg-transparent px-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => cambiarDia(1)}
                  title="Día siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalEscanerQR(true)
                  setResultadoAsistencia(null)
                  setCodigoQrInput('')
                }}
                className="text-xs font-bold gap-1.5 h-9 border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400"
              >
                <QrCode className="w-4 h-4" />
                <span>Escáner QR</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={abrirModalCrearClase}
                className={`text-xs font-bold gap-1.5 h-9 ${currentPalette.bgClass} text-white shadow-sm`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear {verticalConfig.sesionSingular}</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={abrirModalCrearHorario}
              className={`text-xs font-bold gap-1.5 h-9 ${currentPalette.bgClass} text-white shadow-sm`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuevo Horario Base</span>
            </Button>
          )}
        </div>
      </div>

      {errorClases && vistaTab === 'clases' && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorClases}</span>
        </div>
      )}

      {vistaTab === 'horarios_base' ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className={`w-4 h-4 ${currentPalette.textClass}`} />
                Plantillas de Horarios Base Semanales ({horariosBase.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Horarios recurrentes utilizados para generar planificaciones masivas.
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
                        {DIAS_SEMANA_LABELS[h.dia_semana] || `Día ${h.dia_semana}`}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Clases del Día (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CalendarIcon className={`w-4 h-4 ${currentPalette.textClass}`} />
                    {verticalConfig.sesionPlural} del {fechaSeleccionada}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    {clases.length} {verticalConfig.sesionPlural.toLowerCase()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="h-44 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : clases.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
                    <CalendarIcon className="w-8 h-8 mx-auto opacity-30" />
                    <p>
                      No hay {verticalConfig.sesionPlural.toLowerCase()} programad{sesionMasculina ? 'os' : 'as'} para esta fecha.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={abrirModalCrearClase}
                      className="text-xs"
                    >
                      Programar {verticalConfig.sesionSingular}
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {clases.map((clase) => {
                      const isSelected = claseActiva?.id === clase.id
                      const isFull = (clase.cuposOcupados || 0) >= (clase.capacidadTotal || 15)

                      return (
                        <div
                          key={clase.id}
                          onClick={() => setClaseActiva(clase)}
                          className={`p-4 cursor-pointer transition-all space-y-2 ${
                            isSelected
                              ? 'bg-muted/60 border-l-4 ' + currentPalette.borderClass
                              : 'hover:bg-muted/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                                <span className="truncate">{clase.titulo}</span>
                                <Badge
                                  variant={
                                    clase.estado === 'cancelada'
                                      ? 'destructive'
                                      : isFull
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-[10px] capitalize px-1.5 py-0"
                                >
                                  {isFull ? 'Lleno' : clase.estado}
                                </Badge>
                              </div>

                              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {clase.hora_inicio?.slice(0, 5)} - {clase.hora_fin?.slice(0, 5)}
                                </span>
                                <span>•</span>
                                <span>Cap: {clase.capacidadTotal || 15}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-foreground">
                                {clase.cuposOcupados || 0} / {clase.capacidadTotal || capacidadDefault}{' '}
                                {verticalConfig.recursoCortoPlural}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {clase.cuposDisponibles || 0} libres
                              </span>
                            </div>
                          </div>

                          {/* Acciones CRUD de la clase */}
                          <div
                            className="flex items-center justify-end gap-1.5 pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => abrirModalEditarClase(clase)}
                              className="h-7 px-2 text-[11px] gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setClaseParaEliminar(clase)
                                setForzarCancelacion((clase.cuposOcupados || 0) > 0)
                              }}
                              className="h-7 px-2 text-[11px] text-destructive hover:text-destructive gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
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

          {/* Columna Derecha: Mapa de los 15 Puestos (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {verticalConfig.showBicycleMap ? (
                      <Bike className={`w-5 h-5 ${currentPalette.textClass}`} />
                    ) : (
                      <LayoutGrid className={`w-5 h-5 ${currentPalette.textClass}`} />
                    )}
                    Disposición de {verticalConfig.recursoPlural}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {claseActiva
                      ? `${claseActiva.titulo} (${claseActiva.hora_inicio?.slice(0, 5)} hrs)`
                      : `Selecciona ${sesionMasculina ? 'un' : 'una'} ${verticalConfig.sesionSingular.toLowerCase()} para visualizar ${verticalConfig.espacio.toLowerCase()}`}
                  </CardDescription>
                </div>

                {claseActiva && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-muted-foreground">Libre</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                      <span className="text-muted-foreground">
                        {verticalConfig.recursoSingular === 'Bicicleta' || verticalConfig.recursoSingular === 'Cancha' || verticalConfig.recursoSingular === 'Esterilla' || verticalConfig.recursoSingular === 'Estación' || verticalConfig.recursoSingular === 'Cabina'
                          ? 'Ocupada'
                          : 'Ocupado'}
                      </span>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-5">
                {!claseActiva ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    Selecciona {sesionMasculina ? 'un' : 'una'} {verticalConfig.sesionSingular.toLowerCase()} de la izquierda para ver la disponibilidad de{' '}
                    {verticalConfig.recursoCortoPlural}.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-48 mx-auto py-2 rounded-lg bg-muted text-center border font-bold text-xs flex items-center justify-center gap-2 shadow-inner">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {verticalConfig.showBicycleMap
                          ? 'TARIMA DEL COACH'
                          : `FRENTE DE ${verticalConfig.espacio.toUpperCase()}`}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[1, 2, 3].map((fila) => (
                        <div key={fila} className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block text-center">
                            Fila {fila}
                          </span>
                          <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
                            {[1, 2, 3, 4, 5].map((col) => {
                              const numeroBici = (fila - 1) * 5 + col
                              const alumno = claseActiva.alumnos?.find(
                                (a) => a.bicicletaNumero === numeroBici
                              )
                              const isOccupied = !!alumno

                              return (
                                <div
                                  key={numeroBici}
                                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[78px] ${
                                    isOccupied
                                      ? 'bg-rose-500/10 border-rose-500/40 text-foreground'
                                      : 'bg-emerald-500/10 border-emerald-500/30 text-muted-foreground'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold">
                                    <span>#{numeroBici}</span>
                                    {isOccupied && alumno.asistenciaConfirmada && (
                                      <span title="Asistencia Confirmada">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
                                      <span className="text-emerald-700 dark:text-emerald-400">
                                        Libre
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
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

                      <div className="max-h-56 overflow-y-auto divide-y text-xs border rounded-lg">
                        {claseActiva.alumnos?.length === 0 ? (
                          <div className="p-3 text-center text-muted-foreground text-xs">
                            Aún no hay {verticalConfig.clientePlural.toLowerCase()} inscritos en esta{' '}
                            {verticalConfig.sesionSingular.toLowerCase()}.
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
                                  Doc: {a.clienteDocumento} • Tel: {a.clienteTelefono}
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
                                    className="h-6 text-[10px] px-2"
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Clase con Selector Híbrido de Horas */}
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

      {/* Modal: Eliminar Clase */}
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

      {/* Modal: Crear / Editar Horario Base con Selector Híbrido */}
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
                    {DIAS_SEMANA_LABELS.map((nombreDia, idx) => (
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

      {/* Modal: Escáner QR de Recepción */}
      {modalEscanerQR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-purple-600" />
                  Control de Asistencia por Pase QR
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
                Ingresa o escanea el código del pase de entrada del {verticalConfig.clienteSingular.toLowerCase()}.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleValidarQR}>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">
                    Código QR del {verticalConfig.clienteSingular}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      required
                      placeholder="Ej: RESERLY-PASS-04-8849"
                      value={codigoQrInput}
                      onChange={(e) => setCodigoQrInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="submit"
                      disabled={validandoQR}
                      className="font-bold shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {validandoQR ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar QR'}
                    </Button>
                  </div>
                </div>

                {resultadoAsistencia && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      resultadoAsistencia.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {resultadoAsistencia.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>¡Asistencia Confirmada!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Error de Validación</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px]">{resultadoAsistencia.mensaje}</p>
                    {resultadoAsistencia.reserva && (
                      <div className="mt-2 pt-2 border-t text-[11px] font-mono space-y-0.5 text-foreground">
                        <div>
                          {verticalConfig.clienteSingular}: {resultadoAsistencia.reserva.cliente_nombre}
                        </div>
                        <div>
                          {verticalConfig.recursoSingular} #{resultadoAsistencia.reserva.bicicleta?.numero || '?'} (
                          {resultadoAsistencia.reserva.bicicleta?.codigo || 'IC'})
                        </div>
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
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
export default CalendarView
