import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useBranding } from '@/context/BrandingContext'
import { adminService, type ClaseAdminDetalle, type CrearClaseParams } from '@/services/adminService'
import { reservasService, type AsistenciaQRResponse } from '@/services/reservasService'

export const CalendarView: React.FC = () => {
  const { currentPalette, empresaId, studioName } = useBranding()

  // Estado de fecha actual seleccionada
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [clases, setClases] = useState<ClaseAdminDetalle[]>([])
  const [claseActiva, setClaseActiva] = useState<ClaseAdminDetalle | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Estado de modal de creación de clase
  const [modalNuevaClase, setModalNuevaClase] = useState<boolean>(false)
  const [creandoClase, setCreandoClase] = useState<boolean>(false)
  const [formDataClase, setFormDataClase] = useState({
    nombre: '',
    horaInicio: '07:00',
    horaFin: '07:50',
    instructorNombre: 'Coach Pro',
    descripcion: 'Sesión de alta intensidad y ritmo musical.',
    capacidad: 15,
  })

  // Estado de modal escáner QR de asistencia
  const [modalEscanerQR, setModalEscanerQR] = useState<boolean>(false)
  const [codigoQrInput, setCodigoQrInput] = useState<string>('')
  const [validandoQR, setValidandoQR] = useState<boolean>(false)
  const [resultadoAsistencia, setResultadoAsistencia] = useState<AsistenciaQRResponse | null>(null)

  // Cargar clases de la sede
  const cargarClases = async (fecha?: string) => {
    setLoading(true)
    try {
      const res = await adminService.getClasesAdmin(empresaId, fecha || fechaSeleccionada)
      if (res.data) {
        setClases(res.data)
        if (res.data.length > 0) {
          setClaseActiva(res.data[0])
        } else {
          setClaseActiva(null)
        }
      }
    } catch (err) {
      console.warn('Error al cargar clases de admin:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarClases(fechaSeleccionada)
  }, [empresaId, fechaSeleccionada])

  // Navegación de fechas
  const cambiarDia = (dias: number) => {
    const fechaObj = new Date(fechaSeleccionada + 'T12:00:00')
    fechaObj.setDate(fechaObj.getDate() + dias)
    const nuevaFecha = fechaObj.toISOString().split('T')[0]
    setFechaSeleccionada(nuevaFecha)
  }

  // Enviar creación de clase
  const handleCrearClase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDataClase.nombre.trim()) return

    setCreandoClase(true)
    try {
      const params: CrearClaseParams = {
        empresaId,
        nombre: formDataClase.nombre,
        fecha: fechaSeleccionada,
        horaInicio: `${formDataClase.horaInicio}:00`,
        horaFin: `${formDataClase.horaFin}:00`,
        instructorNombre: formDataClase.instructorNombre,
        descripcion: formDataClase.descripcion,
        capacidad: formDataClase.capacidad || 15,
      }

      const res = await adminService.crearClase(params)
      if (res.data) {
        setModalNuevaClase(false)
        setFormDataClase({
          nombre: '',
          horaInicio: '07:00',
          horaFin: '07:50',
          instructorNombre: 'Coach Pro',
          descripcion: 'Sesión de alta intensidad y ritmo musical.',
          capacidad: 15,
        })
        cargarClases(fechaSeleccionada)
      }
    } catch (err) {
      console.error('Error al crear clase:', err)
    } finally {
      setCreandoClase(false)
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
      const res = await reservasService.registrarAsistenciaQR(
        codigo,
        empresaId,
        claseActiva?.id
      )
      setResultadoAsistencia(res)

      if (res.success) {
        // Actualizar la lista en vivo para marcar la asistencia del alumno
        setClases((prevClases) =>
          prevClases.map((c) => {
            if (c.id === (res.reserva?.clase_id || claseActiva?.id)) {
              return {
                ...c,
                alumnos: c.alumnos.map((a) =>
                  a.reservaId === res.reserva?.id ? { ...a, asistenciaConfirmada: true } : a
                ),
              }
            }
            return c
          })
        )

        if (claseActiva && res.reserva?.clase_id === claseActiva.id) {
          setClaseActiva((prev) =>
            prev
              ? {
                  ...prev,
                  alumnos: prev.alumnos.map((a) =>
                    a.reservaId === res.reserva?.id ? { ...a, asistenciaConfirmada: true } : a
                  ),
                }
              : null
          )
        }
      }
    } catch (err) {
      console.error('Error al registrar QR:', err)
      setResultadoAsistencia({
        success: false,
        reserva: null,
        mensaje: 'Error de conexión al validar código QR',
        error: String(err),
      })
    } finally {
      setValidandoQR(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Barra superior de calendario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight">Programación y Flota de 15 Bicis</h1>
            <Badge variant="secondary" className="text-xs">
              {studioName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión de horarios diarios, mapa interactivo de asientos y check-in por QR en recepción.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegación por fecha */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => cambiarDia(-1)}
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono font-bold px-2">{fechaSeleccionada}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => cambiarDia(1)}
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Botón Escáner QR de Recepción */}
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
            <span>Escáner QR Recepción</span>
          </Button>

          {/* Botón Crear Nueva Clase */}
          <Button
            type="button"
            size="sm"
            onClick={() => setModalNuevaClase(true)}
            className={`text-xs font-bold gap-1.5 h-9 ${currentPalette.bgClass} text-white shadow-sm`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Horario / Clase</span>
          </Button>
        </div>
      </div>

      {/* Contenedor Principal: Lista de Clases a la Izquierda, Mapa de las 15 Bicis a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Clases del Día (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarIcon className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Clases del {fechaSeleccionada}
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {clases.length} clases
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
                  <p>No hay clases programadas para esta fecha.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setModalNuevaClase(true)}
                    className="text-xs"
                  >
                    Programar Clase
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
                        className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-muted/60 border-l-4 ' + currentPalette.borderClass
                            : 'hover:bg-muted/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            {clase.titulo}
                            {isFull && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                Lleno
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-mono font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {clase.hora_inicio?.slice(0, 5)} - {clase.hora_fin?.slice(0, 5)}
                            </span>
                            <span>•</span>
                            <span>Capacidad: 15</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-foreground">
                            {clase.cuposOcupados || 0} / {clase.capacidadTotal || 15} bicis
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {clase.cuposDisponibles || 0} disponibles
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Mapa de los 15 Puestos de la Clase Seleccionada (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bike className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Disposición de los 15 Asientos
                </CardTitle>
                <CardDescription className="text-xs">
                  {claseActiva
                    ? `${claseActiva.titulo} (${claseActiva.hora_inicio?.slice(0, 5)} hrs)`
                    : 'Selecciona una clase para visualizar la sala'}
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
                    <span className="text-muted-foreground">Ocupada</span>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-5">
              {!claseActiva ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Selecciona una clase de la izquierda para ver el mapa de las 15 bicis.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tarima del Instructor */}
                  <div className="w-48 mx-auto py-2 rounded-lg bg-muted text-center border font-bold text-xs flex items-center justify-center gap-2 shadow-inner">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>TARIMA DEL COACH</span>
                  </div>

                  {/* Matriz 3 Filas x 5 Columnas (15 Bicicletas) */}
                  <div className="space-y-3">
                    {[1, 2, 3].map((fila) => {
                      return (
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

                                  <Bike
                                    className={`w-5 h-5 my-1 ${
                                      isOccupied ? 'text-rose-600' : 'text-emerald-600'
                                    }`}
                                  />

                                  <div className="text-[10px] truncate max-w-full font-semibold">
                                    {isOccupied ? (
                                      <span className="text-foreground block truncate" title={alumno.clienteNombre}>
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

                  {/* Lista de Alumnos Inscritos en la Clase */}
                  <div className="border-t pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                      <span>Alumnos Inscritos ({claseActiva.alumnos?.length || 0})</span>
                      <span className="font-normal font-sans text-[11px]">
                        Asistencias: {claseActiva.alumnos?.filter((a) => a.asistenciaConfirmada).length || 0}
                      </span>
                    </h3>

                    <div className="max-h-48 overflow-y-auto divide-y text-xs border rounded-lg">
                      {claseActiva.alumnos?.length === 0 ? (
                        <div className="p-3 text-center text-muted-foreground text-xs">
                          Aún no hay ciclistas inscritos en esta clase.
                        </div>
                      ) : (
                        claseActiva.alumnos?.map((a) => (
                          <div
                            key={a.reservaId}
                            className="p-2.5 flex items-center justify-between hover:bg-muted/20"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground block">
                                {a.clienteNombre}
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                Doc: {a.clienteDocumento} • Tel: {a.clienteTelefono}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                Bici #{a.bicicletaNumero}
                              </Badge>

                              {a.asistenciaConfirmada ? (
                                <Badge variant="success" className="text-[10px] gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Presente
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Pendiente
                                </Badge>
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

      {/* Modal: Crear Nueva Clase */}
      {modalNuevaClase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Crear Nueva Clase / Horario
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalNuevaClase(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Se habilitarán los 15 puestos para reservas de los ciclistas.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCrearClase}>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Nombre / Título de la Clase</label>
                  <Input
                    required
                    placeholder="Ej: Power Cycling & Beats"
                    value={formDataClase.nombre}
                    onChange={(e) => setFormDataClase({ ...formDataClase, nombre: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Hora Inicio</label>
                    <Input
                      type="time"
                      required
                      value={formDataClase.horaInicio}
                      onChange={(e) =>
                        setFormDataClase({ ...formDataClase, horaInicio: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Hora Fin</label>
                    <Input
                      type="time"
                      required
                      value={formDataClase.horaFin}
                      onChange={(e) =>
                        setFormDataClase({ ...formDataClase, horaFin: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Instructor / Coach</label>
                  <Input
                    placeholder="Nombre del Coach"
                    value={formDataClase.instructorNombre}
                    onChange={(e) =>
                      setFormDataClase({ ...formDataClase, instructorNombre: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Capacidad (Bicicletas)</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={formDataClase.capacidad}
                    onChange={(e) =>
                      setFormDataClase({
                        ...formDataClase,
                        capacidad: parseInt(e.target.value) || 15,
                      })
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Capacidad estándar del estudio: 15 bicicletas.
                  </span>
                </div>
              </CardContent>

              <div className="p-5 pt-0 flex items-center justify-end gap-2 border-t mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalNuevaClase(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creandoClase}
                  size="sm"
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {creandoClase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Clase'
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
                Ingresa o escanea el código del pase de entrada del ciclista.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleValidarQR}>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Código QR del Ciclista</label>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      required
                      placeholder="Ej: CYCLING-PASS-BICI04-8849"
                      value={codigoQrInput}
                      onChange={(e) => setCodigoQrInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="submit"
                      disabled={validandoQR}
                      className="font-bold shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {validandoQR ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Validar QR'
                      )}
                    </Button>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Los códigos QR se leen con lector de código de barras USB o cámara.
                  </span>
                </div>

                {/* Resultado de la validación */}
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
                        <div>Alumno: {resultadoAsistencia.reserva.cliente_nombre}</div>
                        <div>
                          Bicicleta #{resultadoAsistencia.reserva.bicicleta?.numero || '?'}{' '}
                          ({resultadoAsistencia.reserva.bicicleta?.codigo || 'IC'})
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