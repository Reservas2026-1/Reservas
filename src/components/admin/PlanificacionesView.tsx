import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Loader2,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Trash2,
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
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
import {
  generarProgramacionMasiva,
  crearClaseEspecial,
} from '@/services/clasesService'
import { bicicletasService } from '@/services/bicicletasService'
import { adminService, type ClaseAdminDetalle } from '@/services/adminService'
import type { Tables } from '@/types/database'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface PlanificacionesViewProps {
  empresaId?: string
}

export default function PlanificacionesView({ empresaId: propEmpresaId }: PlanificacionesViewProps) {
  const { empresaId: ctxEmpresaId, currentPalette, studioName, estudioActivo, verticalConfig } = useBranding()
  const sesionMasculina = ['Turno', 'WOD'].includes(verticalConfig.sesionSingular)
  const empresaId = propEmpresaId || ctxEmpresaId

  // Form masivo
  const [periodicidad, setPeriodicidad] = useState<'diaria' | 'semanal' | 'quincenal' | 'mensual'>('semanal')
  const [numClases, setNumClases] = useState<number>(7)
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(new Date())
  const [tituloMasivo, setTituloMasivo] = useState<string>(verticalConfig.ejemploSesion)
  const [capacidadMasiva, setCapacidadMasiva] = useState<number>(estudioActivo?.capacidad_sala || 15)
  const [horarioBaseId, setHorarioBaseId] = useState<string>('manual')
  const [horaInicioMasiva, setHoraInicioMasiva] = useState<string>('06:00')
  const [horaFinMasiva, setHoraFinMasiva] = useState<string>('06:45')
  const [generando, setGenerando] = useState<boolean>(false)

  // Form clase especial
  const [especialFecha, setEspecialFecha] = useState<Date | undefined>(new Date())
  const [especialTitulo, setEspecialTitulo] = useState<string>(
    `${verticalConfig.sesionSingular} Especial`
  )
  const [especialCapacidad, setEspecialCapacidad] = useState<number>(
    estudioActivo?.capacidad_sala || 15
  )
  const [especialHoraInicio, setEspecialHoraInicio] = useState<string>('18:00')
  const [especialHoraFin, setEspecialHoraFin] = useState<string>('18:45')
  const [creandoEspecial, setCreandoEspecial] = useState<boolean>(false)

  // Datos reales del backend
  const [horariosBase, setHorariosBase] = useState<Tables<'horarios_base'>[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState<boolean>(true)
  const [clasesProgramadas, setClasesProgramadas] = useState<ClaseAdminDetalle[]>([])
  const [loadingClases, setLoadingClases] = useState<boolean>(true)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  // Estados para Filtros y Paginación en "Clases Programadas Vigentes"
  const [filtroFechaPuntual, setFiltroFechaPuntual] = useState<string>('')
  const [filtroRango, setFiltroRango] = useState<'todas' | 'esta_semana' | 'este_mes'>('todas')
  const [filtroTurno, setFiltroTurno] = useState<'todos' | 'am' | 'pm'>('todos')
  const [busquedaTitulo, setBusquedaTitulo] = useState<string>('')
  const [paginaActual, setPaginaActual] = useState<number>(1)
  const ITEMS_PER_PAGE = 10

  const isFilterActive = useMemo(() => {
    return (
      filtroFechaPuntual !== '' ||
      filtroRango !== 'todas' ||
      filtroTurno !== 'todos' ||
      busquedaTitulo.trim() !== ''
    )
  }, [filtroFechaPuntual, filtroRango, filtroTurno, busquedaTitulo])

  const handleLimpiarFiltros = useCallback(() => {
    setFiltroFechaPuntual('')
    setFiltroRango('todas')
    setFiltroTurno('todos')
    setBusquedaTitulo('')
    setPaginaActual(1)
  }, [])

  const clasesFiltradas = useMemo(() => {
    return clasesProgramadas.filter((clase) => {
      // 1. Fecha puntual
      if (filtroFechaPuntual && clase.fecha !== filtroFechaPuntual) {
        return false
      }

      // 2. Rango rápido
      if (!filtroFechaPuntual && filtroRango !== 'todas') {
        const now = new Date()
        if (filtroRango === 'esta_semana') {
          const diaSemana = (now.getDay() + 6) % 7 // Lun = 0, Dom = 6
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - diaSemana)
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)

          const startIso = startOfWeek.toISOString().split('T')[0]
          const endIso = endOfWeek.toISOString().split('T')[0]
          if (clase.fecha < startIso || clase.fecha > endIso) {
            return false
          }
        } else if (filtroRango === 'este_mes') {
          const ano = now.getFullYear()
          const mes = String(now.getMonth() + 1).padStart(2, '0')
          const prefijoMes = `${ano}-${mes}`
          if (!clase.fecha.startsWith(prefijoMes)) {
            return false
          }
        }
      }

      // 3. Filtro por turno
      if (filtroTurno !== 'todos') {
        const hora = Number.parseInt(clase.hora_inicio?.slice(0, 2) || '0', 10)
        if (filtroTurno === 'am' && hora >= 12) return false
        if (filtroTurno === 'pm' && hora < 12) return false
      }

      // 4. Búsqueda por título
      if (busquedaTitulo.trim()) {
        const q = busquedaTitulo.trim().toLowerCase()
        if (!clase.titulo.toLowerCase().includes(q)) {
          return false
        }
      }

      return true
    })
  }, [clasesProgramadas, filtroFechaPuntual, filtroRango, filtroTurno, busquedaTitulo])

  const totalClasesFiltradas = clasesFiltradas.length
  const totalPaginas = Math.max(1, Math.ceil(totalClasesFiltradas / ITEMS_PER_PAGE))
  const paginaValida = Math.min(paginaActual, totalPaginas)

  const clasesPaginadas = useMemo(() => {
    const inicio = (paginaValida - 1) * ITEMS_PER_PAGE
    return clasesFiltradas.slice(inicio, inicio + ITEMS_PER_PAGE)
  }, [clasesFiltradas, paginaValida])

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

  const estudioCapacidadKey = `${estudioActivo?.id ?? ''}:${estudioActivo?.capacidad_sala ?? ''}`
  const [prevEstudioCapacidadKey, setPrevEstudioCapacidadKey] = useState(estudioCapacidadKey)
  if (estudioCapacidadKey !== prevEstudioCapacidadKey) {
    setPrevEstudioCapacidadKey(estudioCapacidadKey)
    if (estudioActivo?.capacidad_sala && estudioActivo.capacidad_sala > 0) {
      setCapacidadMasiva(estudioActivo.capacidad_sala)
      setEspecialCapacidad(estudioActivo.capacidad_sala)
    }
  }

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
    const capacidadObjetivo = capacidadMasiva || estudioActivo?.capacidad_sala || 15

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
        capacidad: capacidadObjetivo,
      })

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al generar programación',
          description: res.error,
        })
        return
      }

      const syncRes = await bicicletasService.sincronizarCapacidadSala(empresaId, capacidadObjetivo)
      if (!syncRes.success && syncRes.error) {
        console.warn('Aviso al sincronizar los puestos para la programación:', syncRes.error)
      }

      const count = res.data?.length || 0
      toast({
        variant: 'success',
        title: 'Programación generada con éxito',
        description: `Se crearon ${count} ${verticalConfig.sesionPlural.toLowerCase()} (excluyendo domingos y festivos). Sala y puestos sincronizados a ${capacidadObjetivo} ${verticalConfig.recursoPlural.toLowerCase()}.`,
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
    const capacidadObjetivo = especialCapacidad || estudioActivo?.capacidad_sala || 15

    setCreandoEspecial(true)
    try {
      const res = await crearClaseEspecial({
        empresaId,
        fecha: fechaStr,
        horaInicio: `${especialHoraInicio.slice(0, 5)}:00`,
        horaFin: `${especialHoraFin.slice(0, 5)}:00`,
        titulo: especialTitulo.trim() || 'Clase Especial',
        capacidad: capacidadObjetivo,
      })

      if (res.error || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error al crear clase especial',
          description: res.error || 'No se pudo registrar la clase especial',
        })
        return
      }

      const syncRes = await bicicletasService.sincronizarCapacidadSala(empresaId, capacidadObjetivo)
      if (!syncRes.success && syncRes.error) {
        console.warn('Aviso al sincronizar los puestos para la clase especial:', syncRes.error)
      }

      toast({
        variant: 'success',
        title: `${verticalConfig.sesionSingular} especial agregada`,
        description: `Programada para el ${fechaStr} (${especialHoraInicio} - ${especialHoraFin}). Sala y puestos sincronizados a ${capacidadObjetivo} ${verticalConfig.recursoPlural.toLowerCase()}.`,
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
    <div className="space-y-6 w-full">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ClipboardList className={`w-6 h-6 ${currentPalette.textClass}`} />
              <span>
                {verticalConfig.navPlanificacionesLabel} y {verticalConfig.sesionPlural} Especiales
              </span>
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {studioName}
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Genera programación masiva omitiendo domingos/festivos en Colombia o programa{' '}
            {verticalConfig.sesionPlural.toLowerCase()} especiales.
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
                  Título de {sesionMasculina ? 'los' : 'las'} {verticalConfig.sesionPlural}
                </Label>
                <Input
                  id="tituloMasivo"
                  value={tituloMasivo}
                  onChange={(e) => setTituloMasivo(e.target.value)}
                  placeholder={`Ej: ${verticalConfig.ejemploSesion}`}
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
                  Capacidad ({verticalConfig.recursoPlural})
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
            <span>Agregar {verticalConfig.sesionSingular} Especial</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Crea {verticalConfig.sesionPlural.toLowerCase()} temáticas puntuales con etiqueta especial.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-2">
            <Label className="text-xs font-bold">
              Fecha de {verticalConfig.sesionSingular} Especial
            </Label>
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
                  Título de {sesionMasculina ? 'l' : 'la'} {verticalConfig.sesionSingular} Especial
                </Label>
                <Input
                  id="especialTitulo"
                  value={especialTitulo}
                  onChange={(e) => setEspecialTitulo(e.target.value)}
                  placeholder={`Ej: ${verticalConfig.ejemploSesion} VIP`}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="especialCapacidad" className="text-xs font-bold">
                  Capacidad ({verticalConfig.recursoPlural})
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
                `Agregar ${verticalConfig.sesionSingular} Especial`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla real de clases programadas con Filtros y Paginación */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="p-5 pb-4 border-b space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>
                  {verticalConfig.sesionPlural} Programad{sesionMasculina ? 'os' : 'as'} Vigentes
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {totalClasesFiltradas} de {clasesProgramadas.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Listado organizado en base de datos desde la fecha actual con filtros y paginación.
              </CardDescription>
            </div>

            {isFilterActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLimpiarFiltros}
                className="h-7 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </Button>
            )}
          </div>

          {/* Barra de Filtros Compacta y Responsiva */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2 border-t text-xs">
            {/* Buscador por Título */}
            <div className="md:col-span-4 relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={busquedaTitulo}
                onChange={(e) => {
                  setBusquedaTitulo(e.target.value)
                  setPaginaActual(1)
                }}
                placeholder={`Buscar por título de ${verticalConfig.sesionSingular.toLowerCase()}...`}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>

            {/* Selector de Fecha Puntual */}
            <div className="md:col-span-3 flex items-center gap-1">
              <Input
                type="date"
                value={filtroFechaPuntual}
                onChange={(e) => {
                  setFiltroFechaPuntual(e.target.value)
                  setFiltroRango('todas')
                  setPaginaActual(1)
                }}
                className="h-8 text-xs bg-muted/30"
                title="Filtrar por fecha puntual"
              />
              {filtroFechaPuntual && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFiltroFechaPuntual('')
                    setPaginaActual(1)
                  }}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  title="Limpiar fecha"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Selector de Rango Rápido */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 hidden lg:inline">Rango:</span>
              <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs w-full justify-between sm:justify-start">
                {(['todas', 'esta_semana', 'este_mes'] as const).map((rango) => {
                  const label = rango === 'todas' ? 'Todas' : rango === 'esta_semana' ? 'Esta semana' : 'Este mes'
                  const activo = !filtroFechaPuntual && filtroRango === rango
                  return (
                    <button
                      key={rango}
                      type="button"
                      onClick={() => {
                        setFiltroRango(rango)
                        setFiltroFechaPuntual('')
                        setPaginaActual(1)
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                        activo
                          ? 'bg-background text-foreground shadow-xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filtro por Turno */}
            <div className="md:col-span-2 flex items-center justify-end">
              <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs w-full justify-center">
                {(['todos', 'am', 'pm'] as const).map((turno) => {
                  const label = turno === 'todos' ? 'Todos' : turno === 'am' ? 'Mañana AM' : 'Noche PM'
                  const activo = filtroTurno === turno
                  return (
                    <button
                      key={turno}
                      type="button"
                      onClick={() => {
                        setFiltroTurno(turno)
                        setPaginaActual(1)
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                        activo
                          ? 'bg-background text-foreground shadow-xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingClases ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : clasesProgramadas.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No hay {verticalConfig.sesionPlural.toLowerCase()} programad{sesionMasculina ? 'os' : 'as'} registrad
              {sesionMasculina ? 'os' : 'as'} aún.
            </div>
          ) : clasesFiltradas.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                No se encontraron {verticalConfig.sesionPlural.toLowerCase()} con los filtros aplicados.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLimpiarFiltros}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Horario</TableHead>
                    <TableHead className="text-xs">{verticalConfig.sesionSingular}</TableHead>
                    <TableHead className="text-xs">Ocupación ({verticalConfig.recursoCortoPlural})</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clasesPaginadas.map((clase) => (
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

              {/* Controles de Paginación */}
              <div className="p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-muted/10">
                <div className="text-muted-foreground text-center sm:text-left">
                  Página <span className="font-bold text-foreground">{paginaValida}</span> de{' '}
                  <span className="font-bold text-foreground">{totalPaginas}</span> (Total: {totalClasesFiltradas}{' '}
                  {verticalConfig.sesionPlural.toLowerCase()})
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaValida <= 1}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaValida >= totalPaginas}
                    className="h-8 text-xs gap-1"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
