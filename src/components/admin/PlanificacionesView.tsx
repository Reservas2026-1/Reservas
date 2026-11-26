import { useEffect, useState, useCallback } from 'react'
import { Loader2, CalendarDays, Sparkles, RefreshCw, Trash2, ClipboardList } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import { HybridHourSelector } from '@/components/admin/HybridHourSelector'
import { generarProgramacionMasiva, crearClaseEspecial } from '@/services/clasesService'
import { adminService, type ClaseAdminDetalle } from '@/services/adminService'
import type { Tables } from '@/types/database'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface PlanificacionesViewProps {
  empresaId?: string
}

export default function PlanificacionesView({ empresaId: propEmpresaId }: PlanificacionesViewProps) {
  const { empresaId: ctxEmpresaId, currentPalette, studioName } = useBranding()
  const empresaId = propEmpresaId || ctxEmpresaId

  // Form masivo
  const [periodicidad, setPeriodicidad] = useState<'diaria' | 'semanal' | 'quincenal' | 'mensual'>('semanal')
  const [numClases, setNumClases] = useState<number>(7)
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(new Date())
  const [tituloMasivo, setTituloMasivo] = useState<string>('Sesión Indoor Cycling')
  const [capacidadMasiva, setCapacidadMasiva] = useState<number>(15)
  const [horarioBaseId, setHorarioBaseId] = useState<string>('manual')
  const [horaInicioMasiva, setHoraInicioMasiva] = useState<string>('06:00')
  const [horaFinMasiva, setHoraFinMasiva] = useState<string>('06:45')
  const [generando, setGenerando] = useState<boolean>(false)

  // Form clase especial
  const [especialFecha, setEspecialFecha] = useState<Date | undefined>(new Date())
  const [especialTitulo, setEspecialTitulo] = useState<string>('Clase Especial')
  const [especialCapacidad, setEspecialCapacidad] = useState<number>(15)
  const [especialHoraInicio, setEspecialHoraInicio] = useState<string>('18:00')
  const [especialHoraFin, setEspecialHoraFin] = useState<string>('18:45')
  const [creandoEspecial, setCreandoEspecial] = useState<boolean>(false)

  // Datos reales del backend
  const [horariosBase, setHorariosBase] = useState<Tables<'horarios_base'>[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState<boolean>(true)
  const [clasesProgramadas, setClasesProgramadas] = useState<ClaseAdminDetalle[]>([])
  const [loadingClases, setLoadingClases] = useState<boolean>(true)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const cargarHorariosYClases = useCallback(async () => {
    setLoadingHorarios(true)
    setLoadingClases(true)
    try {
      const [horariosRes, clasesRes] = await Promise.all([
        adminService.getHorariosBase(empresaId, true),
        adminService.getClasesAdmin(empresaId),
      ])

      if (horariosRes.error) {
        toast({
          variant: 'destructive',
          title: 'Error cargando horarios base',
          description: horariosRes.error,
        })
      } else {
        const list = horariosRes.data || []
        setHorariosBase(list)
        if (list.length > 0) {
          setHorarioBaseId(list[0].id)
          setHoraInicioMasiva(list[0].hora_inicio.slice(0, 5))
          setHoraFinMasiva(list[0].hora_fin.slice(0, 5))
        } else {
          setHorarioBaseId('manual')
        }
      }

      if (clasesRes.error) {
        toast({
          variant: 'destructive',
          title: 'Error cargando clases',
          description: clasesRes.error,
        })
      } else {
        setClasesProgramadas(clasesRes.data || [])
      }
    } finally {
      setLoadingHorarios(false)
      setLoadingClases(false)
    }
  }, [empresaId])

  useEffect(() => {
    cargarHorariosYClases()
  }, [cargarHorariosYClases])

  const handleSelectHorarioBase = (id: string) => {
    setHorarioBaseId(id)
    if (id !== 'manual') {
      const h = horariosBase.find((item) => item.id === id)
      if (h) {
        setHoraInicioMasiva(h.hora_inicio.slice(0, 5))
        setHoraFinMasiva(h.hora_fin.slice(0, 5))
      }
    }
  }

  const handleGenerate = async () => {
    const fechaStr = fechaInicio
      ? fechaInicio.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    setGenerando(true)
    try {
      const res = await generarProgramacionMasiva({
        empresaId,
        tipo: periodicidad,
        dias: numClases,
        fechaInicio: fechaStr,
        horarioBaseId: horarioBaseId !== 'manual' ? horarioBaseId : undefined,
        horaInicio: `${horaInicioMasiva.slice(0, 5)}:00`,
        horaFin: `${horaFinMasiva.slice(0, 5)}:00`,
        titulo: tituloMasivo.trim() || undefined,
        capacidad: capacidadMasiva || 15,
      })

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al generar programación',
          description: res.error,
        })
        return
      }

      const count = res.data?.length || 0
      toast({
        variant: 'success',
        title: 'Programación generada',
        description: `Se crearon ${count} clases omitiendo domingos y festivos de Colombia.`,
      })
      cargarHorariosYClases()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: err instanceof Error ? err.message : 'No se pudo generar programación',
      })
    } finally {
      setGenerando(false)
    }
  }

  const handleAddEspecial = async () => {
    const fechaStr = especialFecha
      ? especialFecha.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    setCreandoEspecial(true)
    try {
      const res = await crearClaseEspecial({
        empresaId,
        fecha: fechaStr,
        horaInicio: `${especialHoraInicio.slice(0, 5)}:00`,
        horaFin: `${especialHoraFin.slice(0, 5)}:00`,
        titulo: especialTitulo.trim() || 'Clase Especial',
        capacidad: especialCapacidad || 15,
      })

      if (res.error || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error al crear clase especial',
          description: res.error || 'No se pudo registrar la clase especial',
        })
        return
      }

      toast({
        variant: 'success',
        title: 'Clase especial agregada',
        description: `Programada para el ${fechaStr} (${especialHoraInicio} - ${especialHoraFin}).`,
      })
      cargarHorariosYClases()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: err instanceof Error ? err.message : 'No se pudo crear clase especial',
      })
    } finally {
      setCreandoEspecial(false)
    }
  }

  const handleEliminarClase = async (clase: ClaseAdminDetalle) => {
    setEliminandoId(clase.id)
    try {
      const res = await adminService.eliminarClase(clase.id, empresaId, {
        forzarConCancelacion: false,
      })
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: res.error || 'Error al eliminar la clase',
        })
        return
      }
      setClasesProgramadas((prev) => prev.filter((c) => c.id !== clase.id))
      toast({ variant: 'success', title: 'Clase eliminada' })
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ClipboardList className={`w-6 h-6 ${currentPalette.textClass}`} />
              <span>Planificaciones y Clases Especiales</span>
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {studioName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Genera programación masiva omitiendo domingos/festivos en Colombia o programa sesiones especiales.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={cargarHorariosYClases}
          disabled={loadingClases}
          className="h-9 text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingClases ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </Button>
      </div>

      {/* Formulario principal: Planificación Masiva */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="p-5 pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className={`w-4 h-4 ${currentPalette.textClass}`} />
            <span>Generar Planificación Masiva</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Selecciona una plantilla de horario base o define un horario con el selector híbrido (+45 min).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tituloMasivo" className="text-xs font-bold">
                  Título de las Clases
                </Label>
                <Input
                  id="tituloMasivo"
                  value={tituloMasivo}
                  onChange={(e) => setTituloMasivo(e.target.value)}
                  placeholder="Ej: Power Cycling AM"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="periodicidad" className="text-xs font-bold">
                  Tipo de Periodicidad
                </Label>
                <Select
                  value={periodicidad}
                  onValueChange={(val) =>
                    setPeriodicidad(val as 'diaria' | 'semanal' | 'quincenal' | 'mensual')
                  }
                >
                  <SelectTrigger id="periodicidad" className="h-9 text-xs">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diaria (máx. 4 días)</SelectItem>
                    <SelectItem value="semanal">Semanal (7 días)</SelectItem>
                    <SelectItem value="quincenal">Quincenal (15 días)</SelectItem>
                    <SelectItem value="mensual">Mensual (30 días)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="numClases" className="text-xs font-bold">
                  Número de Días a Generar
                </Label>
                <Input
                  id="numClases"
                  type="number"
                  min={1}
                  max={31}
                  value={numClases}
                  onChange={(e) => setNumClases(Number.parseInt(e.target.value, 10) || 1)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacidadMasiva" className="text-xs font-bold">
                  Capacidad (Bicicletas)
                </Label>
                <Input
                  id="capacidadMasiva"
                  type="number"
                  min={1}
                  max={30}
                  value={capacidadMasiva}
                  onChange={(e) => setCapacidadMasiva(Number.parseInt(e.target.value, 10) || 15)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="horarioBase" className="text-xs font-bold">
                Plantilla de Horario Base {loadingHorarios ? '(Cargando...)' : ''}
              </Label>
              <Select value={horarioBaseId} onValueChange={handleSelectHorarioBase}>
                <SelectTrigger id="horarioBase" className="h-9 text-xs">
                  <SelectValue placeholder="Seleccione horario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Personalizado (Selector Híbrido)</SelectItem>
                  {horariosBase.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {DIAS_SEMANA[h.dia_semana] || `Día ${h.dia_semana}`} •{' '}
                      {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20">
              <HybridHourSelector
                horaInicio={horaInicioMasiva}
                horaFin={horaFinMasiva}
                onChange={(ini, fin) => {
                  setHoraInicioMasiva(ini)
                  setHoraFinMasiva(fin)
                }}
                accentClass={`${currentPalette.bgClass} text-white`}
                disabled={generando}
              />
            </div>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generando}
              className={`font-bold text-xs ${currentPalette.bgClass} text-white`}
            >
              {generando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Generando Programación...
                </>
              ) : (
                'Generar Programación Masiva'
              )}
            </Button>
          </div>

          <div className="lg:col-span-5 space-y-2">
            <Label className="text-xs font-bold">Fecha de Inicio</Label>
            <Calendar
              mode="single"
              selected={fechaInicio}
              onSelect={setFechaInicio}
              className="rounded-xl border bg-card"
            />
          </div>
        </CardContent>
      </Card>

      {/* Agregar clases especiales */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="p-5 pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${currentPalette.textClass}`} />
            <span>Agregar Clase Especial</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Crea sesiones temáticas puntuales con etiqueta especial.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-2">
            <Label className="text-xs font-bold">Fecha de Clase Especial</Label>
            <Calendar
              mode="single"
              selected={especialFecha}
              onSelect={setEspecialFecha}
              className="rounded-xl border bg-card"
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="especialTitulo" className="text-xs font-bold">
                  Título de la Sesión Especial
                </Label>
                <Input
                  id="especialTitulo"
                  value={especialTitulo}
                  onChange={(e) => setEspecialTitulo(e.target.value)}
                  placeholder="Ej: Glow Ride Neón VIP"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="especialCapacidad" className="text-xs font-bold">
                  Capacidad (Bicicletas)
                </Label>
                <Input
                  id="especialCapacidad"
                  type="number"
                  min={1}
                  max={30}
                  value={especialCapacidad}
                  onChange={(e) => setEspecialCapacidad(Number.parseInt(e.target.value, 10) || 15)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20">
              <HybridHourSelector
                horaInicio={especialHoraInicio}
                horaFin={especialHoraFin}
                onChange={(ini, fin) => {
                  setEspecialHoraInicio(ini)
                  setEspecialHoraFin(fin)
                }}
                accentClass={`${currentPalette.bgClass} text-white`}
                disabled={creandoEspecial}
              />
            </div>

            <Button
              type="button"
              onClick={handleAddEspecial}
              disabled={creandoEspecial}
              className={`font-bold text-xs ${currentPalette.bgClass} text-white`}
            >
              {creandoEspecial ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Agregando...
                </>
              ) : (
                'Agregar Clase Especial'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla real de clases programadas */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Clases Programadas Vigentes ({clasesProgramadas.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Listado real en base de datos desde la fecha actual.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingClases ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : clasesProgramadas.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No hay clases programadas registradas aún.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Horario</TableHead>
                  <TableHead className="text-xs">Clase</TableHead>
                  <TableHead className="text-xs">Ocupación</TableHead>
                  <TableHead className="text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clasesProgramadas.map((clase) => (
                  <TableRow key={clase.id} className="text-xs">
                    <TableCell className="font-mono">{clase.fecha}</TableCell>
                    <TableCell className="font-mono">
                      {clase.hora_inicio.slice(0, 5)} - {clase.hora_fin.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{clase.titulo}</span>
                        {clase.es_clase_especial && (
                          <Badge variant="secondary" className="text-[10px]">
                            Especial
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {clase.cuposOcupados} / {clase.capacidadTotal}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={eliminandoId === clase.id}
                        onClick={() => handleEliminarClase(clase)}
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                      >
                        {eliminandoId === clase.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Eliminar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
