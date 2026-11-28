import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bike,
  LayoutGrid,
  PlusCircle,
  Layers,
  Search,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Pencil,
  RefreshCw,
  Power,
  Loader2,
  Table as TableIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import {
  bicicletasService,
  type MetricasBicicletas,
  type CrearBicicletaParams,
  type CrearBicicletasEnLoteParams,
} from '@/services/bicicletasService'
import type { Tables } from '@/types/database'

type FiltroEstado = 'todas' | 'activas' | 'mantenimiento' | 'inactivas'

export const BicicletasAdminView: React.FC = () => {
  const { currentPalette, empresaId, estudioActivo } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)

  // Datos principales
  const [bicicletas, setBicicletas] = useState<Tables<'bicicletas'>[]>([])
  const [metricas, setMetricas] = useState<MetricasBicicletas | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filtros y vista
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas')
  const [busqueda, setBusqueda] = useState<string>('')
  const [vistaModo, setVistaModo] = useState<'grid' | 'table'>('grid')

  // Modales
  const [modalSingleOpen, setModalSingleOpen] = useState<boolean>(false)
  const [editingBici, setEditingBici] = useState<Tables<'bicicletas'> | null>(null)
  const [savingSingle, setSavingSingle] = useState<boolean>(false)

  const [modalBatchOpen, setModalBatchOpen] = useState<boolean>(false)
  const [savingBatch, setSavingBatch] = useState<boolean>(false)

  const [biciParaEliminar, setBiciParaEliminar] = useState<Tables<'bicicletas'> | null>(null)
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false)

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Formularios
  const [formSingle, setFormSingle] = useState({
    numero: '1',
    modelo: 'Stages SC3 Magnetic',
    fila: '1',
    columna: '1',
    estado: 'disponible' as 'disponible' | 'mantenimiento',
    activo: true,
  })

  const [formBatch, setFormBatch] = useState({
    cantidad: '5',
    modelo: 'Stages SC3 Magnetic',
    filaInicio: '1',
  })

  // Carga inicial y refresco de datos
  const cargarDatos = useCallback(async () => {
    setErrorMsg(null)
    try {
      const [biciRes, metricasRes] = await Promise.all([
        bicicletasService.obtenerBicicletas(empresaId, { soloActivas: false }),
        bicicletasService.obtenerMetricasBicicletas(empresaId),
      ])

      if (biciRes.error) {
        setErrorMsg(biciRes.error)
        toast({
          variant: 'destructive',
          title: `Error cargando ${verticalConfig.recursoPlural.toLowerCase()}`,
          description: biciRes.error,
        })
      } else {
        setBicicletas(biciRes.data || [])
      }

      if (metricasRes.data) {
        setMetricas(metricasRes.data)
      } else if (biciRes.data) {
        // Fallback de cálculo local
        const lista = biciRes.data
        setMetricas({
          total: lista.length,
          activas: lista.filter((b) => b.activo && b.estado !== 'mantenimiento' && b.estado !== 'baja').length,
          mantenimiento: lista.filter((b) => b.estado === 'mantenimiento').length,
          inactivas: lista.filter((b) => !b.activo || b.estado === 'baja').length,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al cargar datos'
      setErrorMsg(msg)
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [empresaId, verticalConfig.recursoPlural])

  useEffect(() => {
    setLoading(true)
    cargarDatos()
  }, [cargarDatos])

  const handleRefresh = () => {
    setRefreshing(true)
    cargarDatos()
  }

  // Filtrado de bicicletas
  const bicicletasFiltradas = useMemo(() => {
    return bicicletas.filter((b) => {
      // Filtro por estado
      if (filtroEstado === 'activas' && (!b.activo || b.estado === 'mantenimiento' || b.estado === 'baja')) {
        return false
      }
      if (filtroEstado === 'mantenimiento' && b.estado !== 'mantenimiento') {
        return false
      }
      if (filtroEstado === 'inactivas' && (b.activo && b.estado !== 'baja')) {
        return false
      }

      // Filtro de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim()
        const matchNum = String(b.numero).includes(query)
        const matchCodigo = b.codigo.toLowerCase().includes(query)
        const matchModelo = b.modelo.toLowerCase().includes(query)
        if (!matchNum && !matchCodigo && !matchModelo) {
          return false
        }
      }

      return true
    })
  }, [bicicletas, filtroEstado, busqueda])

  // Abrir modal de creación individual
  const abrirCrearSingle = () => {
    // Sugerir el siguiente número consecutivo
    const maxNum = bicicletas.reduce((acc, b) => Math.max(acc, b.numero), 0)
    const nextNum = maxNum + 1
    const fila = Math.ceil(nextNum / 5)
    const columna = ((nextNum - 1) % 5) + 1

    setEditingBici(null)
    setFormSingle({
      numero: String(nextNum),
      modelo: verticalConfig.showBicycleMap ? 'Stages SC3 Magnetic' : 'Estándar',
      fila: String(fila),
      columna: String(columna),
      estado: 'disponible',
      activo: true,
    })
    setModalSingleOpen(true)
  }

  // Abrir modal de edición individual
  const abrirEditarSingle = (bici: Tables<'bicicletas'>) => {
    setEditingBici(bici)
    setFormSingle({
      numero: String(bici.numero),
      modelo: bici.modelo,
      fila: String(bici.fila || 1),
      columna: String(bici.columna || 1),
      estado: bici.estado === 'mantenimiento' ? 'mantenimiento' : 'disponible',
      activo: bici.activo,
    })
    setModalSingleOpen(true)
  }

  // Guardar creación / edición individual
  const handleGuardarSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(formSingle.numero, 10)
    const fila = parseInt(formSingle.fila, 10)
    const col = parseInt(formSingle.columna, 10)

    if (isNaN(num) || num <= 0) {
      toast({
        variant: 'destructive',
        title: 'Número inválido',
        description: 'El número debe ser un entero positivo.',
      })
      return
    }

    setSavingSingle(true)
    try {
      if (editingBici) {
        const res = await bicicletasService.actualizarBicicleta(editingBici.id, empresaId, {
          numero: num,
          modelo: formSingle.modelo.trim(),
          fila: isNaN(fila) ? 1 : fila,
          columna: isNaN(col) ? 1 : col,
          estado: formSingle.estado,
          activo: formSingle.activo,
        })

        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error al actualizar',
            description: res.error || 'No se pudo guardar la modificación',
          })
          return
        }

        toast({
          variant: 'success',
          title: `${verticalConfig.recursoSingular} actualizada`,
          description: `${verticalConfig.recursoSingular} #${res.data.numero} modificada correctamente.`,
        })
      } else {
        const params: CrearBicicletaParams = {
          empresaId,
          numero: num,
          modelo: formSingle.modelo.trim(),
          fila: isNaN(fila) ? 1 : fila,
          columna: isNaN(col) ? 1 : col,
          estado: formSingle.estado,
          activo: formSingle.activo,
        }

        const res = await bicicletasService.crearBicicleta(params)

        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error al crear',
            description: res.error || 'No se pudo registrar la unidad',
          })
          return
        }

        toast({
          variant: 'success',
          title: `${verticalConfig.recursoSingular} agregada`,
          description: `${verticalConfig.recursoSingular} #${res.data.numero} registrada con código ${res.data.codigo}.`,
        })
      }

      setModalSingleOpen(false)
      cargarDatos()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setSavingSingle(false)
    }
  }

  // Abrir modal de creación en lote
  const abrirCrearLote = () => {
    setFormBatch({
      cantidad: '5',
      modelo: verticalConfig.showBicycleMap ? 'Stages SC3 Magnetic' : 'Estándar',
      filaInicio: '1',
    })
    setModalBatchOpen(true)
  }

  // Guardar creación en lote
  const handleGuardarBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    const cant = parseInt(formBatch.cantidad, 10)
    const filaIni = parseInt(formBatch.filaInicio, 10)

    if (isNaN(cant) || cant <= 0) {
      toast({
        variant: 'destructive',
        title: 'Cantidad inválida',
        description: 'La cantidad debe ser mayor a 0.',
      })
      return
    }

    setSavingBatch(true)
    try {
      const params: CrearBicicletasEnLoteParams = {
        empresaId,
        cantidad: cant,
        modelo: formBatch.modelo.trim(),
        filaInicio: isNaN(filaIni) ? undefined : filaIni,
      }

      const res = await bicicletasService.crearBicicletasEnLote(params)

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al crear lote',
          description: res.error,
        })
        return
      }

      toast({
        variant: 'success',
        title: 'Lote registrado con éxito',
        description: `Se agregaron ${res.creadas} ${verticalConfig.recursoPlural.toLowerCase()} a la flota.`,
      })

      setModalBatchOpen(false)
      cargarDatos()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: err instanceof Error ? err.message : 'Error al crear lote',
      })
    } finally {
      setSavingBatch(false)
    }
  }

  // Alternar rápidamente entre Disponible y Mantenimiento
  const handleToggleEstado = async (bici: Tables<'bicicletas'>) => {
    const nuevoEstado = bici.estado === 'mantenimiento' ? 'disponible' : 'mantenimiento'
    setActionLoadingId(bici.id)

    try {
      const res = await bicicletasService.actualizarBicicleta(bici.id, empresaId, {
        estado: nuevoEstado,
      })

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al cambiar estado',
          description: res.error,
        })
        return
      }

      toast({
        variant: 'success',
        title: 'Estado actualizado',
        description: `${verticalConfig.recursoSingular} #${bici.numero} marcada como ${
          nuevoEstado === 'mantenimiento' ? 'en mantenimiento' : 'disponible'
        }.`,
      })

      cargarDatos()
    } finally {
      setActionLoadingId(null)
    }
  }

  // Alternar rápidamente entre Activa e Inactiva
  const handleToggleActivo = async (bici: Tables<'bicicletas'>) => {
    const nuevoActivo = !bici.activo
    setActionLoadingId(bici.id)

    try {
      const res = await bicicletasService.actualizarBicicleta(bici.id, empresaId, {
        activo: nuevoActivo,
      })

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al cambiar visibilidad',
          description: res.error,
        })
        return
      }

      toast({
        variant: 'success',
        title: nuevoActivo ? 'Unidad Activada' : 'Unidad Desactivada',
        description: `${verticalConfig.recursoSingular} #${bici.numero} ha sido ${
          nuevoActivo ? 'activada para reservas' : 'desactivada del sistema'
        }.`,
      })

      cargarDatos()
    } finally {
      setActionLoadingId(null)
    }
  }

  // Confirmar eliminación física o baja lógica segura
  const handleConfirmEliminar = async () => {
    if (!biciParaEliminar) return
    setDeletingLoading(true)

    try {
      const res = await bicicletasService.eliminarBicicleta(biciParaEliminar.id, empresaId)

      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: res.error || 'Error al eliminar la unidad',
        })
        return
      }

      if (res.mensaje && res.mensaje.includes('desactivada')) {
        toast({
          title: 'Unidad archivada con historial',
          description: res.mensaje,
        })
      } else {
        toast({
          variant: 'success',
          title: 'Eliminación completada',
          description: res.mensaje || `${verticalConfig.recursoSingular} eliminada del inventario.`,
        })
      }

      setBiciParaEliminar(null)
      cargarDatos()
    } finally {
      setDeletingLoading(false)
    }
  }

  // Helper para determinar zona según número de fila
  const getZonaLabel = (fila?: number | null) => {
    if (!fila || fila <= 1) return 'Frente'
    if (fila === 2) return 'Central'
    return 'Posterior'
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. KPIs Reales de Bicicletas / Recursos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Registradas
              </p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
                {metricas ? metricas.total : '—'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Capacidad total de {verticalConfig.espacio.toLowerCase()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {verticalConfig.showBicycleMap ? (
                <Bike className={`w-5 h-5 ${currentPalette.textClass}`} />
              ) : (
                <LayoutGrid className={`w-5 h-5 ${currentPalette.textClass}`} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activas */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Activas
              </p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {metricas ? metricas.activas : '—'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Disponibles para reserva
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        {/* En Mantenimiento */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                En Mantenimiento
              </p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 mt-1">
                {metricas ? metricas.mantenimiento : '—'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Bloqueadas temporalmente
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        {/* Inactivas */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Inactivas
              </p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                {metricas ? metricas.inactivas : '—'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Fuera de servicio o baja
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Barra de Control: Acciones, Filtros y Búsqueda */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Buscar por número, código o modelo de ${verticalConfig.recursoSingular.toLowerCase()}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Acciones principales */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-9 text-xs font-semibold gap-1.5"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={abrirCrearLote}
                className="h-9 text-xs font-semibold gap-1.5 border-dashed"
              >
                <Layers className="w-4 h-4 text-primary" />
                <span>+ Agregar Lote</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={abrirCrearSingle}
                className={`h-9 text-xs font-bold gap-1.5 ${currentPalette.bgClass} text-white shadow-sm`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Agregar {verticalConfig.recursoSingular}</span>
              </Button>
            </div>
          </div>

          {/* Filtros de Pestañas y Selector de Modo de Vista */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'todas', label: 'Todas', count: metricas?.total },
                  { id: 'activas', label: 'Activas', count: metricas?.activas },
                  { id: 'mantenimiento', label: 'Mantenimiento', count: metricas?.mantenimiento },
                  { id: 'inactivas', label: 'Inactivas', count: metricas?.inactivas },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={filtroEstado === tab.id ? 'default' : 'ghost'}
                  onClick={() => setFiltroEstado(tab.id)}
                  className={`h-8 text-xs font-semibold rounded-lg px-3 ${
                    filtroEstado === tab.id ? `${currentPalette.bgClass} text-white` : ''
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge
                      variant="secondary"
                      className={`ml-1.5 text-[10px] px-1.5 py-0 font-mono ${
                        filtroEstado === tab.id ? 'bg-white/20 text-white' : ''
                      }`}
                    >
                      {tab.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Alternador Grid vs Table */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40">
              <Button
                type="button"
                size="sm"
                variant={vistaModo === 'grid' ? 'secondary' : 'ghost'}
                onClick={() => setVistaModo('grid')}
                className="h-7 px-2 text-xs gap-1"
                title="Vista de cuadrícula de puestos"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={vistaModo === 'table' ? 'secondary' : 'ghost'}
                onClick={() => setVistaModo('table')}
                className="h-7 px-2 text-xs gap-1"
                title="Vista de tabla"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Contenido: Cuadrícula o Tabla */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-semibold">
            Cargando inventario de {verticalConfig.recursoPlural.toLowerCase()}...
          </span>
        </div>
      ) : errorMsg && bicicletas.length === 0 ? (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h4 className="text-sm font-bold">No se pudieron cargar los datos</h4>
          <p className="text-xs mt-1 text-muted-foreground">{errorMsg}</p>
          <Button
            type="button"
            size="sm"
            onClick={cargarDatos}
            className="mt-4 text-xs font-semibold"
          >
            Reintentar
          </Button>
        </Card>
      ) : bicicletasFiltradas.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-muted-foreground space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            {verticalConfig.showBicycleMap ? (
              <Bike className="w-6 h-6" />
            ) : (
              <LayoutGrid className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              No se encontraron {verticalConfig.recursoPlural.toLowerCase()}
            </h4>
            <p className="text-xs">
              {busqueda
                ? `No hay coincidencias para "${busqueda}". Prueba con otro término.`
                : `No hay registros con el filtro "${filtroEstado}".`}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            {busqueda && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBusqueda('')}
                className="text-xs"
              >
                Limpiar búsqueda
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={abrirCrearSingle}
              className={`text-xs font-bold ${currentPalette.bgClass} text-white`}
            >
              + Agregar {verticalConfig.recursoSingular}
            </Button>
          </div>
        </Card>
      ) : vistaModo === 'grid' ? (
        /* VISTA CUADRÍCULA (Cards de sala) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {bicicletasFiltradas.map((bici) => {
            const isLoadingThis = actionLoadingId === bici.id
            const enMantenimiento = bici.estado === 'mantenimiento'
            const inactiva = !bici.activo || bici.estado === 'baja'

            return (
              <Card
                key={bici.id}
                className={`relative transition-all border shadow-xs hover:shadow-md overflow-hidden ${
                  inactiva
                    ? 'opacity-65 border-dashed bg-muted/30'
                    : enMantenimiento
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border/80 bg-card hover:border-primary/40'
                }`}
              >
                <CardHeader className="p-3.5 pb-2 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-foreground">
                      #{String(bici.numero).padStart(2, '0')}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {bici.codigo}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Badge de Estado */}
                    {enMantenimiento ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-1.5 py-0"
                      >
                        Mantenimiento
                      </Badge>
                    ) : inactiva ? (
                      <Badge
                        variant="destructive"
                        className="text-[10px] font-bold px-1.5 py-0"
                      >
                        Inactiva
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-1.5 py-0"
                      >
                        Disponible
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 space-y-3">
                  {/* Icono central + Modelo */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        enMantenimiento
                          ? 'bg-amber-500/10 text-amber-600'
                          : inactiva
                          ? 'bg-muted text-muted-foreground'
                          : `bg-primary/10 ${currentPalette.textClass}`
                      }`}
                    >
                      {verticalConfig.showBicycleMap ? (
                        <Bike className="w-5 h-5" />
                      ) : (
                        <LayoutGrid className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate" title={bici.modelo}>
                        {bici.modelo || 'Estándar'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Fila {bici.fila || 1} • {getZonaLabel(bici.fila)} (Col {bici.columna || 1})
                      </p>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="border-t pt-2.5 flex items-center justify-between gap-1 text-xs">
                    {/* Toggle Activo */}
                    <button
                      type="button"
                      disabled={isLoadingThis}
                      onClick={() => handleToggleActivo(bici)}
                      className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                        bici.activo
                          ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={bici.activo ? 'Desactivar unidad' : 'Activar unidad'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{bici.activo ? 'Activa' : 'Inactiva'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Cambiar Estado Rápido */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={isLoadingThis}
                        onClick={() => handleToggleEstado(bici)}
                        className={`h-7 w-7 ${
                          enMantenimiento
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={enMantenimiento ? 'Quitar de mantenimiento' : 'Poner en mantenimiento'}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </Button>

                      {/* Editar */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => abrirEditarSingle(bici)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Editar detalles"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      {/* Eliminar */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setBiciParaEliminar(bici)}
                        className="h-7 w-7 text-destructive/80 hover:text-destructive"
                        title="Eliminar de la flota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* VISTA TABLA DETALLADA */
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Número</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Modelo</th>
                  <th className="py-3 px-4">Zona / Fila</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Activa</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bicicletasFiltradas.map((bici) => {
                  const enMantenimiento = bici.estado === 'mantenimiento'
                  const inactiva = !bici.activo || bici.estado === 'baja'
                  const isLoadingThis = actionLoadingId === bici.id

                  return (
                    <tr
                      key={bici.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        inactiva ? 'opacity-60 bg-muted/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        #{String(bici.numero).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {bici.codigo}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {bici.modelo || 'Estándar Magnetic'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        Fila {bici.fila || 1} — {getZonaLabel(bici.fila)} (Col {bici.columna || 1})
                      </td>
                      <td className="py-3 px-4">
                        {enMantenimiento ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold"
                          >
                            Mantenimiento
                          </Badge>
                        ) : inactiva ? (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Inactiva
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold"
                          >
                            Disponible
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isLoadingThis}
                          onClick={() => handleToggleActivo(bici)}
                          className={`h-7 px-2 text-xs font-bold gap-1 ${
                            bici.activo
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{bici.activo ? 'Sí' : 'No'}</span>
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isLoadingThis}
                            onClick={() => handleToggleEstado(bici)}
                            className="h-7 px-2 text-[11px] gap-1"
                            title={enMantenimiento ? 'Quitar mantenimiento' : 'Poner en mantenimiento'}
                          >
                            <Wrench className="w-3 h-3" />
                            <span className="hidden sm:inline">
                              {enMantenimiento ? 'Habilitar' : 'Mantenimiento'}
                            </span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEditarSingle(bici)}
                            className="h-7 px-2 text-[11px] gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setBiciParaEliminar(bici)}
                            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. Modal: Crear / Editar Bicicleta Individual */}
      {modalSingleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  {verticalConfig.showBicycleMap ? (
                    <Bike className={`w-4 h-4 ${currentPalette.textClass}`} />
                  ) : (
                    <LayoutGrid className={`w-4 h-4 ${currentPalette.textClass}`} />
                  )}
                  {editingBici
                    ? `Editar ${verticalConfig.recursoSingular} #${editingBici.numero}`
                    : `Nueva ${verticalConfig.recursoSingular}`}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalSingleOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Configura número, ubicación dentro de {verticalConfig.espacio.toLowerCase()} y modelo.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarSingle}>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Número de puesto</label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={formSingle.numero}
                      onChange={(e) => {
                        const val = e.target.value
                        const n = parseInt(val, 10)
                        setFormSingle((prev) => ({
                          ...prev,
                          numero: val,
                          fila: !isNaN(n) && n > 0 ? String(Math.ceil(n / 5)) : prev.fila,
                          columna: !isNaN(n) && n > 0 ? String(((n - 1) % 5) + 1) : prev.columna,
                        }))
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Estado inicial</label>
                    <Select
                      value={formSingle.estado}
                      onValueChange={(val: string) =>
                        setFormSingle((prev) => ({
                          ...prev,
                          estado: val as 'disponible' | 'mantenimiento',
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="mantenimiento">En Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Modelo o Referencia</label>
                  <Input
                    placeholder="Ej: Stages SC3 Magnetic, Concept2 BikeErg"
                    value={formSingle.modelo}
                    onChange={(e) =>
                      setFormSingle((prev) => ({ ...prev, modelo: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Fila (Zona)</label>
                    <Input
                      type="number"
                      min={1}
                      value={formSingle.fila}
                      onChange={(e) =>
                        setFormSingle((prev) => ({ ...prev, fila: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Columna (Posición)</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={formSingle.columna}
                      onChange={(e) =>
                        setFormSingle((prev) => ({ ...prev, columna: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t">
                  <div>
                    <span className="font-bold text-foreground block">Habilitada para reservas</span>
                    <span className="text-[10px] text-muted-foreground">
                      Si se desactiva, los clientes no la verán en el mapa de reservas.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSingle.activo}
                    onChange={(e) =>
                      setFormSingle((prev) => ({ ...prev, activo: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </CardContent>

              <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalSingleOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingSingle}
                  className={`text-xs font-bold gap-1.5 ${currentPalette.bgClass} text-white`}
                >
                  {savingSingle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBici ? 'Guardar Cambios' : 'Crear Unidad'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 5. Modal: Crear Lote de Bicicletas */}
      {modalBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Crear Lote de {verticalConfig.recursoPlural}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalBatchOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Genera múltiples unidades consecutivas y calcula automáticamente sus filas y columnas.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarBatch}>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Cantidad de unidades a crear</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={formBatch.cantidad}
                    onChange={(e) =>
                      setFormBatch((prev) => ({ ...prev, cantidad: e.target.value }))
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se buscarán los primeros números disponibles consecutivamente a partir del #1.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Modelo / Referencia</label>
                  <Input
                    placeholder="Ej: Stages SC3 Magnetic"
                    value={formBatch.modelo}
                    onChange={(e) =>
                      setFormBatch((prev) => ({ ...prev, modelo: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Fila inicial (Opcional)</label>
                  <Input
                    type="number"
                    min={1}
                    value={formBatch.filaInicio}
                    onChange={(e) =>
                      setFormBatch((prev) => ({ ...prev, filaInicio: e.target.value }))
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Si se omite, se asigna Fila 1 a los puestos 1-5, Fila 2 a los 6-10, etc.
                  </p>
                </div>
              </CardContent>

              <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalBatchOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingBatch}
                  className={`text-xs font-bold gap-1.5 ${currentPalette.bgClass} text-white`}
                >
                  {savingBatch && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generar Lote</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 6. Modal Confirmar Eliminación */}
      {biciParaEliminar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border-destructive/30 bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Eliminar {verticalConfig.recursoSingular} #{biciParaEliminar.numero}
              </CardTitle>
              <CardDescription className="text-xs">
                Esta acción removerá la unidad del catálogo activo de {verticalConfig.espacio.toLowerCase()}.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 text-xs space-y-2">
              <p>
                ¿Confirmas que deseas eliminar {verticalConfig.recursoSingular.toLowerCase()}{' '}
                <strong>#{biciParaEliminar.numero}</strong> ({biciParaEliminar.codigo})?
              </p>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Si la unidad tiene reservas históricas completadas, el sistema la desactivará
                  automáticamente en lugar de borrarla físicamente para proteger la trazabilidad de los reportes.
                </span>
              </div>
            </CardContent>

            <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deletingLoading}
                onClick={() => setBiciParaEliminar(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingLoading}
                onClick={handleConfirmEliminar}
                className="text-xs font-bold gap-1.5"
              >
                {deletingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Unidad</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default BicicletasAdminView
