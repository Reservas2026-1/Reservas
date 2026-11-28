import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Trophy,
  Sparkles,
  Zap,
  Award,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  TrendingUp,
  Flame,
  Calendar,
  Gift,
  ShieldAlert,
  QrCode,
  PackageOpen,
  Layers,
  X,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { QRCode } from '@/components/ui/qr-code'
import { toast } from '@/components/ui/use-toast'
import { useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import {
  gamificacionService,
  type AlumnoGamificacionResumen,
} from '@/services/gamificacionService'
import { tiqueterasService } from '@/services/tiqueterasService'
import type { ReglasXpRow, PremiosPlanRow, Tables } from '@/types/database'

type PlanEstudio = Tables<'planes'>

interface FormPremiosState {
  puesto1: { premio: string; icono: string }
  puesto2: { premio: string; icono: string }
  puesto3: { premio: string; icono: string }
}

const PREMIOS_DEFAULT_CONFIG: FormPremiosState = {
  puesto1: { premio: '1 Mes Gratis + Merchandising', icono: '🥇' },
  puesto2: { premio: '50% de Descuento en renovación', icono: '🥈' },
  puesto3: { premio: 'Toalla deportiva del estudio', icono: '🥉' },
}

export const GamificacionAdminView: React.FC = () => {
  const { currentPalette, empresaId, studioName, estudioActivo } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)

  // Estados Sección 1: Reglas XP
  const [reglas, setReglas] = useState<ReglasXpRow[]>([])
  const [loadingReglas, setLoadingReglas] = useState<boolean>(true)
  const [togglingReglaId, setTogglingReglaId] = useState<string | null>(null)

  // Modal Regla XP (Crear/Editar)
  const [modalReglaOpen, setModalReglaOpen] = useState<boolean>(false)
  const [editingRegla, setEditingRegla] = useState<ReglasXpRow | null>(null)
  const [guardandoRegla, setGuardandoRegla] = useState<boolean>(false)
  const [formRegla, setFormRegla] = useState({
    criterio: '',
    puntosXp: '100',
    descripcion: '',
    activo: true,
  })

  // Modal Confirmación Eliminar Regla
  const [deletingRegla, setDeletingRegla] = useState<ReglasXpRow | null>(null)
  const [eliminandoRegla, setEliminandoRegla] = useState<boolean>(false)

  // Estados Sección 2: Planes, Premios y Ranking de Alumnos
  const [planes, setPlanes] = useState<PlanEstudio[]>([])
  const [loadingPlanes, setLoadingPlanes] = useState<boolean>(true)
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<string | null>(null)

  const [alumnos, setAlumnos] = useState<AlumnoGamificacionResumen[]>([])
  const [loadingAlumnos, setLoadingAlumnos] = useState<boolean>(true)
  const [busquedaAlumno, setBusquedaAlumno] = useState<string>('')
  const [filtroPlanCumplido, setFiltroPlanCumplido] = useState<'todos' | 'cumplido' | 'en_progreso'>('todos')

  // Premios del Plan Seleccionado
  const [premiosPlan, setPremiosPlan] = useState<PremiosPlanRow[]>([])
  const [loadingPremios, setLoadingPremios] = useState<boolean>(false)
  const [modalPremiosOpen, setModalPremiosOpen] = useState<boolean>(false)
  const [guardandoPremios, setGuardandoPremios] = useState<boolean>(false)
  const [formPremios, setFormPremios] = useState<FormPremiosState>(PREMIOS_DEFAULT_CONFIG)

  // Estado Entrega de Premios
  const [entregandoPremioId, setEntregandoPremioId] = useState<string | null>(null)

  // Modal Visualización Código QR
  const [alumnoQrSeleccionado, setAlumnoQrSeleccionado] = useState<AlumnoGamificacionResumen | null>(null)

  // 1. Cargar Reglas XP
  const cargarReglas = useCallback(async () => {
    if (!empresaId) return
    setLoadingReglas(true)
    try {
      const res = await gamificacionService.obtenerReglasXP(empresaId)
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al cargar reglas XP',
          description: res.error,
        })
      } else {
        setReglas(res.data || [])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al consultar reglas'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoadingReglas(false)
    }
  }, [empresaId])

  // 2. Cargar Planes del Estudio
  const cargarPlanes = useCallback(async () => {
    if (!empresaId) return
    setLoadingPlanes(true)
    try {
      const res = await tiqueterasService.getTodosLosPlanes(empresaId)
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al cargar planes',
          description: res.error,
        })
      } else {
        const listaPlanes = res.data || []
        // Priorizar planes activos
        const planesActivos = listaPlanes.filter((p) => p.activo)
        const planesFinales = planesActivos.length > 0 ? planesActivos : listaPlanes
        setPlanes(planesFinales)

        setPlanSeleccionadoId((prev) => {
          if (prev && planesFinales.some((p) => p.id === prev)) {
            return prev
          }
          return planesFinales[0]?.id || null
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al consultar planes'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoadingPlanes(false)
    }
  }, [empresaId])

  // 3. Cargar Progreso de Alumnos
  const cargarAlumnos = useCallback(async () => {
    if (!empresaId) return
    setLoadingAlumnos(true)
    try {
      const res = await gamificacionService.obtenerResumenGamificacionEmpresa(empresaId)
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al cargar alumnos',
          description: res.error,
        })
      } else {
        setAlumnos(res.data || [])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al consultar alumnos'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoadingAlumnos(false)
    }
  }, [empresaId])

  // 4. Cargar Premios del Plan Seleccionado
  const cargarPremios = useCallback(async (planId: string | null) => {
    if (!empresaId || !planId) {
      setPremiosPlan([])
      return
    }
    setLoadingPremios(true)
    try {
      const res = await gamificacionService.obtenerPremiosPorPlan(empresaId, planId)
      if (res.data) {
        setPremiosPlan(res.data)
      } else {
        setPremiosPlan([])
      }
    } catch (err) {
      console.error('Error al cargar premios del plan:', err)
      setPremiosPlan([])
    } finally {
      setLoadingPremios(false)
    }
  }, [empresaId])

  useEffect(() => {
    cargarReglas()
    cargarPlanes()
    cargarAlumnos()
  }, [cargarReglas, cargarPlanes, cargarAlumnos])

  useEffect(() => {
    if (planSeleccionadoId) {
      cargarPremios(planSeleccionadoId)
    }
  }, [planSeleccionadoId, cargarPremios])

  // Plan actualmente seleccionado
  const planActual = useMemo(() => {
    return planes.find((p) => p.id === planSeleccionadoId) || null
  }, [planes, planSeleccionadoId])

  // Conteo de alumnos por plan
  const conteoAlumnosPorPlan = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of alumnos) {
      if (a.plan_id) {
        map.set(a.plan_id, (map.get(a.plan_id) || 0) + 1)
      }
    }
    return map
  }, [alumnos])

  // Premios configurados o por defecto para el plan seleccionado
  const premiosPodio = useMemo(() => {
    const p1 = premiosPlan.find((p) => p.puesto === 1)
    const p2 = premiosPlan.find((p) => p.puesto === 2)
    const p3 = premiosPlan.find((p) => p.puesto === 3)

    return {
      puesto1: {
        premio: p1?.premio || PREMIOS_DEFAULT_CONFIG.puesto1.premio,
        icono: p1?.icono || PREMIOS_DEFAULT_CONFIG.puesto1.icono,
        personalizado: Boolean(p1),
      },
      puesto2: {
        premio: p2?.premio || PREMIOS_DEFAULT_CONFIG.puesto2.premio,
        icono: p2?.icono || PREMIOS_DEFAULT_CONFIG.puesto2.icono,
        personalizado: Boolean(p2),
      },
      puesto3: {
        premio: p3?.premio || PREMIOS_DEFAULT_CONFIG.puesto3.premio,
        icono: p3?.icono || PREMIOS_DEFAULT_CONFIG.puesto3.icono,
        personalizado: Boolean(p3),
      },
    }
  }, [premiosPlan])

  // Handlers Reglas XP
  const handleOpenCrearRegla = () => {
    setEditingRegla(null)
    setFormRegla({
      criterio: '',
      puntosXp: '100',
      descripcion: '',
      activo: true,
    })
    setModalReglaOpen(true)
  }

  const handleOpenEditarRegla = (regla: ReglasXpRow) => {
    setEditingRegla(regla)
    setFormRegla({
      criterio: regla.criterio,
      puntosXp: String(regla.puntos_xp),
      descripcion: regla.descripcion || '',
      activo: regla.activo,
    })
    setModalReglaOpen(true)
  }

  const handleGuardarRegla = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRegla.criterio.trim()) return

    setGuardandoRegla(true)
    try {
      const puntosXp = Math.max(0, Number.parseInt(formRegla.puntosXp, 10) || 0)

      if (editingRegla) {
        const res = await gamificacionService.actualizarReglaXP(editingRegla.id, empresaId, {
          criterio: formRegla.criterio.trim(),
          puntos_xp: puntosXp,
          descripcion: formRegla.descripcion.trim() || null,
          activo: formRegla.activo,
        })

        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'No se pudo actualizar la regla',
            description: res.error || 'Error inesperado',
          })
          return
        }

        setReglas((prev) => prev.map((r) => (r.id === editingRegla.id ? res.data! : r)))
        toast({
          variant: 'success',
          title: 'Regla actualizada',
          description: `"${res.data.criterio}" (+${res.data.puntos_xp} XP) guardada.`,
        })
      } else {
        const res = await gamificacionService.crearReglaXP({
          empresaId,
          criterio: formRegla.criterio.trim(),
          puntosXp,
          descripcion: formRegla.descripcion.trim() || undefined,
          activo: formRegla.activo,
        })

        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'No se pudo crear la regla',
            description: res.error || 'Error inesperado',
          })
          return
        }

        setReglas((prev) => [res.data!, ...prev])
        toast({
          variant: 'success',
          title: 'Regla XP creada',
          description: `"${res.data.criterio}" agregada exitosamente.`,
        })
      }

      setModalReglaOpen(false)
    } finally {
      setGuardandoRegla(false)
    }
  }

  const handleToggleEstadoRegla = async (regla: ReglasXpRow) => {
    setTogglingReglaId(regla.id)
    try {
      const res = await gamificacionService.cambiarEstadoReglaXP(regla.id, empresaId, !regla.activo)
      if (res.error || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error cambiando estado',
          description: res.error || 'No se pudo modificar la regla',
        })
        return
      }
      setReglas((prev) => prev.map((r) => (r.id === regla.id ? res.data! : r)))
      toast({
        variant: 'success',
        title: res.data.activo ? 'Regla activada' : 'Regla desactivada',
        description: `"${res.data.criterio}" ahora está ${res.data.activo ? 'activa' : 'inactiva'}.`,
      })
    } finally {
      setTogglingReglaId(null)
    }
  }

  const handleConfirmEliminarRegla = async () => {
    if (!deletingRegla) return
    setEliminandoRegla(true)
    try {
      const res = await gamificacionService.eliminarReglaXP(deletingRegla.id, empresaId)
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar la regla',
          description: res.error || 'Error al eliminar',
        })
        return
      }

      setReglas((prev) => prev.filter((r) => r.id !== deletingRegla.id))
      toast({
        variant: 'success',
        title: 'Regla eliminada',
        description: `"${deletingRegla.criterio}" fue retirada del estudio.`,
      })
      setDeletingRegla(null)
    } finally {
      setEliminandoRegla(false)
    }
  }

  // Handlers Modal Premios Plan
  const handleOpenConfigurarPremios = () => {
    setFormPremios({
      puesto1: {
        premio: premiosPodio.puesto1.premio,
        icono: premiosPodio.puesto1.icono,
      },
      puesto2: {
        premio: premiosPodio.puesto2.premio,
        icono: premiosPodio.puesto2.icono,
      },
      puesto3: {
        premio: premiosPodio.puesto3.premio,
        icono: premiosPodio.puesto3.icono,
      },
    })
    setModalPremiosOpen(true)
  }

  const handleGuardarPremios = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId || !planSeleccionadoId) return

    setGuardandoPremios(true)
    try {
      const p1 = premiosPlan.find((p) => p.puesto === 1)
      const p2 = premiosPlan.find((p) => p.puesto === 2)
      const p3 = premiosPlan.find((p) => p.puesto === 3)

      const res1 = await gamificacionService.guardarPremioPlan({
        id: p1?.id,
        empresaId,
        planId: planSeleccionadoId,
        puesto: 1,
        premio: formPremios.puesto1.premio.trim(),
        icono: formPremios.puesto1.icono.trim() || '🥇',
      })

      const res2 = await gamificacionService.guardarPremioPlan({
        id: p2?.id,
        empresaId,
        planId: planSeleccionadoId,
        puesto: 2,
        premio: formPremios.puesto2.premio.trim(),
        icono: formPremios.puesto2.icono.trim() || '🥈',
      })

      const res3 = await gamificacionService.guardarPremioPlan({
        id: p3?.id,
        empresaId,
        planId: planSeleccionadoId,
        puesto: 3,
        premio: formPremios.puesto3.premio.trim(),
        icono: formPremios.puesto3.icono.trim() || '🥉',
      })

      if (res1.error || res2.error || res3.error) {
        toast({
          variant: 'destructive',
          title: 'Error al guardar podio',
          description: res1.error || res2.error || res3.error || 'No se pudieron actualizar los premios.',
        })
        return
      }

      toast({
        variant: 'success',
        title: 'Premios configurados',
        description: `Podio actualizado para el plan "${planActual?.nombre}".`,
      })
      setModalPremiosOpen(false)
      await cargarPremios(planSeleccionadoId)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error inesperado al guardar premios',
      })
    } finally {
      setGuardandoPremios(false)
    }
  }

  // Handler Entrega de Premios
  const handleEntregarPremio = async (alumno: AlumnoGamificacionResumen) => {
    if (!empresaId) return
    setEntregandoPremioId(alumno.usuario_id)
    try {
      const res = await gamificacionService.marcarPremioEntregado(
        alumno.usuario_id,
        alumno.tiquetera_id,
        empresaId
      )

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al registrar entrega',
          description: res.error,
        })
        return
      }

      toast({
        variant: 'success',
        title: '¡Premio Entregado con Éxito! 🎉',
        description: `Se registró la entrega del premio a ${alumno.nombre_completo}.`,
      })

      // Recargar alumnos para refrescar estado en tiempo real
      await cargarAlumnos()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al entregar premio',
        description: err instanceof Error ? err.message : 'Error al registrar entrega',
      })
    } finally {
      setEntregandoPremioId(null)
    }
  }

  // Alumnos del Plan Seleccionado ordenados estrictamente por cumplimiento y puntos
  const alumnosDelPlan = useMemo(() => {
    if (!planSeleccionadoId) return []

    // 1. Filtrar únicamente alumnos cuyo plan activo coincide con el seleccionado
    let lista = alumnos.filter((alumno) => alumno.plan_id === planSeleccionadoId)

    // 2. Filtro de búsqueda por nombre, email, documento o QR
    if (busquedaAlumno.trim()) {
      const q = busquedaAlumno.toLowerCase().trim()
      lista = lista.filter(
        (alumno) =>
          alumno.nombre_completo.toLowerCase().includes(q) ||
          alumno.email.toLowerCase().includes(q) ||
          (alumno.documento && alumno.documento.includes(q)) ||
          (alumno.codigo_qr && alumno.codigo_qr.toLowerCase().includes(q))
      )
    }

    // 3. Filtro de cumplimiento
    if (filtroPlanCumplido === 'cumplido') {
      lista = lista.filter(
        (alumno) =>
          alumno.porcentaje >= 100 ||
          (alumno.dias_programados > 0 && alumno.dias_cumplidos >= alumno.dias_programados) ||
          alumno.bono_plan_otorgado
      )
    } else if (filtroPlanCumplido === 'en_progreso') {
      lista = lista.filter(
        (alumno) =>
          alumno.porcentaje < 100 &&
          (!alumno.dias_programados || alumno.dias_cumplidos < alumno.dias_programados) &&
          !alumno.bono_plan_otorgado
      )
    }

    // 4. Ordenar por mayor cumplimiento (porcentaje DESC) y empate por puntos_acumulados DESC
    lista.sort((a, b) => {
      if (b.porcentaje !== a.porcentaje) {
        return b.porcentaje - a.porcentaje
      }
      return (b.puntos_acumulados || b.xp_ciclo || 0) - (a.puntos_acumulados || a.xp_ciclo || 0)
    })

    // 5. Asignar puesto recalculado
    return lista.map((alumno, idx) => ({
      ...alumno,
      rankingRelativo: idx + 1,
    }))
  }, [alumnos, planSeleccionadoId, busquedaAlumno, filtroPlanCumplido])

  // Estadísticas rápidas globales
  const metricasResumen = useMemo(() => {
    const totalXP = alumnos.reduce((acc, a) => acc + (a.puntos_acumulados || 0), 0)
    const completados = alumnos.filter(
      (a) => a.bono_plan_otorgado || a.porcentaje >= 100
    ).length
    const topAlumno = alumnos.length > 0 ? alumnos[0] : null
    return {
      totalAlumnos: alumnos.length,
      totalXP,
      completados,
      topAlumno,
    }
  }, [alumnos])

  const getCriterioIcon = (criterio: string) => {
    const c = criterio.toLowerCase()
    if (c.includes('asistencia')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    if (c.includes('puntualidad')) return <Calendar className="w-4 h-4 text-blue-500" />
    if (c.includes('plan')) return <Award className="w-4 h-4 text-amber-500" />
    if (c.includes('caloría')) return <Flame className="w-4 h-4 text-rose-500" />
    if (c.includes('corazón') || c.includes('cardíaca')) return <Zap className="w-4 h-4 text-red-500" />
    if (c.includes('constancia')) return <TrendingUp className="w-4 h-4 text-indigo-500" />
    if (c.includes('reto')) return <Trophy className="w-4 h-4 text-yellow-500" />
    if (c.includes('referido')) return <Gift className="w-4 h-4 text-purple-500" />
    return <Sparkles className="w-4 h-4 text-primary" />
  }

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Trophy className={`w-7 h-7 ${currentPalette.textClass}`} />
              <span>Gamificación y Progreso de {verticalConfig.clientePlural}</span>
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {studioName}
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gestiona las reglas de puntos XP por esfuerzo y premia la constancia en el cumplimiento de los planes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              cargarReglas()
              cargarPlanes()
              cargarAlumnos()
              if (planSeleccionadoId) {
                cargarPremios(planSeleccionadoId)
              }
            }}
            disabled={loadingReglas || loadingAlumnos || loadingPlanes}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingReglas || loadingAlumnos || loadingPlanes ? 'animate-spin' : ''
              }`}
            />
            <span>Actualizar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCrearRegla}
            className={`h-9 text-xs font-bold gap-1.5 ${currentPalette.bgClass} text-white`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Regla XP</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Globales de Gamificación */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              XP Totales Entregados
            </span>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {metricasResumen.totalXP.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground">Puntos acumulados en la sede</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              Planes Cumplidos
            </span>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {metricasResumen.completados}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {metricasResumen.totalAlumnos > 0
                ? `${Math.round((metricasResumen.completados / metricasResumen.totalAlumnos) * 100)}% de los alumnos activos`
                : '0% de alumnos'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              Líder del Podio (#1)
            </span>
            <div className="text-base font-extrabold tracking-tight text-foreground truncate">
              {metricasResumen.topAlumno ? metricasResumen.topAlumno.nombre_completo : 'Sin datos'}
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              {metricasResumen.topAlumno
                ? `${metricasResumen.topAlumno.puntos_acumulados.toLocaleString()} XP (Nivel ${metricasResumen.topAlumno.nivel})`
                : '0 XP'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Reglas Activas
            </span>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {reglas.filter((r) => r.activo).length} / {reglas.length}
            </div>
            <p className="text-[11px] text-muted-foreground">Criterios de puntuación automáticos</p>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 1: REGLAS XP DEL ESTUDIO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Reglas de Puntuación XP del Estudio</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Configura los puntos otorgados por asistencia, puntualidad, superación del plan o hitos comerciales.
            </p>
          </div>
        </div>

        <Card className="border-border/80 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            {loadingReglas ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : reglas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <ShieldAlert className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
                <p>No se encontraron reglas configuradas para este estudio.</p>
                <Button size="sm" variant="outline" onClick={handleOpenCrearRegla}>
                  Crear Primera Regla XP
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border gap-px bg-border/40">
                {reglas.map((regla) => (
                  <div
                    key={regla.id}
                    className={`p-4 bg-card flex flex-col justify-between gap-3 transition-colors ${
                      !regla.activo ? 'opacity-60 bg-muted/20' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-secondary/80">
                            {getCriterioIcon(regla.criterio)}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-foreground block">
                              {regla.criterio}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {regla.activo ? 'Activa' : 'Desactivada'}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className="font-black font-mono text-xs px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        >
                          +{regla.puntos_xp} XP
                        </Badge>
                      </div>

                      {regla.descripcion && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {regla.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t pt-2.5 mt-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={togglingReglaId === regla.id}
                        onClick={() => handleToggleEstadoRegla(regla)}
                        className="h-7 px-2 text-[11px] gap-1"
                      >
                        {togglingReglaId === regla.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : regla.activo ? (
                          <XCircle className="w-3 h-3 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>{regla.activo ? 'Pausar' : 'Activar'}</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditarRegla(regla)}
                          className="h-7 w-7 p-0"
                          title="Editar regla"
                        >
                          <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingRegla(regla)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Eliminar regla"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 2: PROGRESO DE PLANES Y RANKING DE ALUMNOS (SEGMENTADO POR PLAN) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              <span>Progreso de Planes y Ranking de {verticalConfig.clientePlural}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Segmentado por cada plan de clases del estudio. Premia a los mejores alumnos con podio de recompensas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${verticalConfig.clienteSingular.toLowerCase()}...`}
                value={busquedaAlumno}
                onChange={(e) => setBusquedaAlumno(e.target.value)}
                className="h-9 text-xs pl-8 font-sans"
              />
            </div>

            <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
              <button
                type="button"
                onClick={() => setFiltroPlanCumplido('todos')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                  filtroPlanCumplido === 'todos'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                Todos ({alumnosDelPlan.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroPlanCumplido('cumplido')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                  filtroPlanCumplido === 'cumplido'
                    ? 'bg-background shadow-xs text-emerald-600'
                    : 'text-muted-foreground'
                }`}
              >
                Plan 100% ({alumnosDelPlan.filter((a) => a.porcentaje >= 100 || a.bono_plan_otorgado).length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroPlanCumplido('en_progreso')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                  filtroPlanCumplido === 'en_progreso'
                    ? 'bg-background shadow-xs text-blue-600'
                    : 'text-muted-foreground'
                }`}
              >
                En Progreso
              </button>
            </div>
          </div>
        </div>

        {/* 1. BARRA DE PESTAÑAS (TABS) POR PLAN HORIZONTAL Y SCROLLEABLE */}
        {loadingPlanes ? (
          <div className="h-14 flex items-center justify-center border rounded-xl bg-card">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground ml-2">Cargando planes del estudio...</span>
          </div>
        ) : planes.length === 0 ? (
          <Card className="border-dashed border-2 border-border/80 bg-muted/10 p-8 text-center space-y-3">
            <PackageOpen className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">
                No hay planes de clases creados en este estudio
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Crea planes o paquetes de créditos en el módulo de Planes y Tiqueteras para habilitar el ranking segmentado y el podio de premios.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
              {planes.map((plan) => {
                const isActive = plan.id === planSeleccionadoId
                const cantAlumnos = conteoAlumnosPorPlan.get(plan.id) || 0

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanSeleccionadoId(plan.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all border shrink-0 ${
                      isActive
                        ? `${currentPalette.bgClass} text-white font-black border-transparent shadow-md ring-2 ring-primary/30`
                        : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border/70'
                    }`}
                  >
                    <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                    <span>{plan.nombre}</span>
                    <span className={`text-[11px] ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                      ({plan.creditos} {plan.creditos === 1 ? verticalConfig.sesionSingular.toLowerCase() : verticalConfig.sesionPlural.toLowerCase()})
                    </span>
                    <Badge
                      variant={isActive ? 'secondary' : 'outline'}
                      className={`text-[10px] px-1.5 py-0 font-bold ${
                        isActive
                          ? 'bg-white/20 text-white border-transparent'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {cantAlumnos} {cantAlumnos === 1 ? verticalConfig.clienteSingular.toLowerCase() : verticalConfig.clientePlural.toLowerCase()}
                    </Badge>
                  </button>
                )
              })}
            </div>

            {/* 2. TARJETA DE PREMIOS DEL PLAN SELECCIONADO (PODIO) */}
            {planActual && (
              <Card className="border-border/80 shadow-xs bg-linear-to-b from-card to-muted/20 overflow-hidden">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span>Podio de Premios: {planActual.nombre}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {planActual.creditos} {verticalConfig.sesionPlural.toLowerCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Recompensas para los alumnos que completen el 100% del plan y lideren el ranking de constancia.
                    </CardDescription>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenConfigurarPremios}
                    className="h-8 text-xs font-bold gap-1.5 shrink-0 self-start sm:self-auto border-border hover:bg-muted"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-500" />
                    <span>Configurar Premios</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  {loadingPremios ? (
                    <div className="h-24 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 🥇 Puesto 1 (Oro) */}
                      <div className="rounded-xl p-3.5 border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 flex items-start gap-3 relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xl flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
                          {premiosPodio.puesto1.icono || '🥇'}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                              1° Puesto (Oro)
                            </span>
                            <Badge className="bg-amber-500 text-black font-extrabold text-[9px] px-1.5 py-0 h-4">
                              Líder
                            </Badge>
                          </div>
                          <p className="font-bold text-xs text-foreground leading-snug line-clamp-2">
                            {premiosPodio.puesto1.premio}
                          </p>
                          <span className="text-[10px] text-muted-foreground block">
                            Meta 100% de asistencia requerida
                          </span>
                        </div>
                      </div>

                      {/* 🥈 Puesto 2 (Plata) */}
                      <div className="rounded-xl p-3.5 border border-slate-400/30 bg-slate-400/5 dark:bg-slate-900/30 flex items-start gap-3 relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-slate-400/20 text-slate-700 dark:text-slate-300 font-black text-xl flex items-center justify-center shrink-0 border border-slate-400/30 shadow-xs">
                          {premiosPodio.puesto2.icono || '🥈'}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              2° Puesto (Plata)
                            </span>
                            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 h-4">
                              Subcampeón
                            </Badge>
                          </div>
                          <p className="font-bold text-xs text-foreground leading-snug line-clamp-2">
                            {premiosPodio.puesto2.premio}
                          </p>
                          <span className="text-[10px] text-muted-foreground block">
                            Meta 100% de asistencia requerida
                          </span>
                        </div>
                      </div>

                      {/* 🥉 Puesto 3 (Bronce) */}
                      <div className="rounded-xl p-3.5 border border-amber-700/30 bg-amber-700/5 dark:bg-amber-950/15 flex items-start gap-3 relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-amber-700/20 text-amber-800 dark:text-amber-500 font-black text-xl flex items-center justify-center shrink-0 border border-amber-700/30 shadow-xs">
                          {premiosPodio.puesto3.icono || '🥉'}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-amber-800 dark:text-amber-500 uppercase tracking-wider">
                              3° Puesto (Bronce)
                            </span>
                            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 h-4">
                              Tercero
                            </Badge>
                          </div>
                          <p className="font-bold text-xs text-foreground leading-snug line-clamp-2">
                            {premiosPodio.puesto3.premio}
                          </p>
                          <span className="text-[10px] text-muted-foreground block">
                            Meta 100% de asistencia requerida
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 3. TABLA DE RANKING FILTRADA POR EL PLAN ACTIVO */}
            <Card className="border-border/80 shadow-xs overflow-hidden">
              <CardContent className="p-0">
                {loadingAlumnos ? (
                  <div className="h-56 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground ml-2">Cargando ranking de alumnos...</span>
                  </div>
                ) : alumnosDelPlan.length === 0 ? (
                  <div className="p-10 text-center text-xs text-muted-foreground space-y-2">
                    <Award className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
                    <p className="font-semibold text-foreground">
                      No hay alumnos inscritos con el plan "{planActual?.nombre || 'seleccionado'}".
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Los alumnos aparecerán aquí automáticamente en cuanto adquieran este plan y acumulen asistencias.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {alumnosDelPlan.map((alumno) => {
                      const esPuesto1 = alumno.rankingRelativo === 1
                      const esPuesto2 = alumno.rankingRelativo === 2
                      const esPuesto3 = alumno.rankingRelativo === 3
                      const esPodio = esPuesto1 || esPuesto2 || esPuesto3

                      const planCompletado =
                        alumno.porcentaje >= 100 ||
                        (alumno.dias_programados > 0 && alumno.dias_cumplidos >= alumno.dias_programados) ||
                        Boolean(alumno.bono_plan_otorgado)

                      return (
                        <div
                          key={alumno.usuario_id}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                        >
                          {/* Columna Alumno y Puesto */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Medalla o Puesto */}
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                                esPuesto1
                                  ? 'bg-amber-500 text-black shadow-amber-500/20 ring-2 ring-amber-300 text-sm'
                                  : esPuesto2
                                  ? 'bg-slate-300 text-slate-800 text-sm'
                                  : esPuesto3
                                  ? 'bg-amber-700 text-white text-sm'
                                  : 'bg-secondary text-muted-foreground font-mono text-xs'
                              }`}
                            >
                              {esPuesto1 ? '🥇' : esPuesto2 ? '🥈' : esPuesto3 ? '🥉' : `#${alumno.rankingRelativo}`}
                            </div>

                            {/* Avatar */}
                            {alumno.avatar_url ? (
                              <img
                                src={alumno.avatar_url}
                                alt={alumno.nombre_completo}
                                className="w-10 h-10 rounded-full object-cover border shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border">
                                {alumno.nombre_completo.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-foreground truncate">
                                  {alumno.nombre_completo}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                >
                                  Nivel {alumno.nivel}
                                </Badge>
                                {planCompletado && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1"
                                  >
                                    <Award className="w-3 h-3 text-emerald-600" />
                                    Meta 100%
                                  </Badge>
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                                <span>{alumno.email}</span>
                                {alumno.codigo_qr && (
                                  <button
                                    type="button"
                                    onClick={() => setAlumnoQrSeleccionado(alumno)}
                                    title="Ver código QR del alumno"
                                    className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted hover:bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border/60 transition-colors cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3 text-primary" />
                                    <span>{alumno.codigo_qr}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Progreso del Plan, XP y Entrega de Premios */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shrink-0 md:min-w-[420px] justify-end">
                            {/* Barra de Progreso del Plan */}
                            <div className="space-y-1.5 flex-1 max-w-[220px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-foreground flex items-center gap-1">
                                  <span>Progreso:</span>
                                  <span className="text-muted-foreground font-normal">
                                    {alumno.dias_cumplidos} / {alumno.dias_programados || planActual?.creditos || '–'}{' '}
                                    {verticalConfig.sesionPlural.toLowerCase()}
                                  </span>
                                </span>
                                <span className="font-mono font-extrabold text-[11px] text-foreground">
                                  {alumno.porcentaje}%
                                </span>
                              </div>

                              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 rounded-full ${
                                    alumno.porcentaje >= 100
                                      ? 'bg-emerald-500'
                                      : alumno.porcentaje >= 50
                                      ? 'bg-blue-500'
                                      : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(100, alumno.porcentaje)}%` }}
                                />
                              </div>
                            </div>

                            {/* XP Acumulados */}
                            <div className="text-right shrink-0">
                              <div className="flex items-center justify-end gap-1 font-mono font-black text-sm text-foreground">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span>{alumno.puntos_acumulados.toLocaleString()} XP</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">Puntos acumulados</span>
                            </div>

                            {/* Entrega de Premios / Estado */}
                            <div className="shrink-0 flex items-center justify-end min-w-[130px]">
                              {esPodio && planCompletado ? (
                                alumno.premio_entregado ? (
                                  <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold gap-1 text-[11px] py-1 px-2.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Premio Entregado
                                  </Badge>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={entregandoPremioId === alumno.usuario_id}
                                    onClick={() => handleEntregarPremio(alumno)}
                                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  >
                                    {entregandoPremioId === alumno.usuario_id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Gift className="w-3.5 h-3.5" />
                                    )}
                                    <span>Entregar Premio</span>
                                  </Button>
                                )
                              ) : planCompletado ? (
                                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800">
                                  ✓ Plan Completado
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-muted-foreground font-medium">
                                  En Progreso
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL CONFIGURAR PREMIOS POR PLAN */}
      {modalPremiosOpen && planActual && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Configurar Premios del Podio</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalPremiosOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs">
                Asigna los premios para los puestos 1, 2 y 3 del plan <strong>"{planActual.nombre}"</strong>.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarPremios}>
              <CardContent className="p-5 space-y-4 text-xs">
                {/* Puesto 1 (Oro) */}
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-700 dark:text-amber-400">
                    <span className="text-base">🥇</span>
                    <span>1° Puesto (Medalla de Oro)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Premio o Recompensa</label>
                      <Input
                        required
                        placeholder="Ej: 1 Mes Gratis + Merchandising"
                        value={formPremios.puesto1.premio}
                        onChange={(e) =>
                          setFormPremios({
                            ...formPremios,
                            puesto1: { ...formPremios.puesto1, premio: e.target.value },
                          })
                        }
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Ícono</label>
                      <Input
                        placeholder="🥇"
                        value={formPremios.puesto1.icono}
                        onChange={(e) =>
                          setFormPremios({
                            ...formPremios,
                            puesto1: { ...formPremios.puesto1, icono: e.target.value },
                          })
                        }
                        className="h-8 text-xs text-center bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Puesto 2 (Plata) */}
                <div className="p-3 rounded-xl border border-slate-400/30 bg-slate-400/5 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-700 dark:text-slate-300">
                    <span className="text-base">🥈</span>
                    <span>2° Puesto (Medalla de Plata)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Premio o Recompensa</label>
                      <Input
                        required
                        placeholder="Ej: 50% de Descuento en renovación"
                        value={formPremios.puesto2.premio}
                        onChange={(e) =>
                          setFormPremios({
                            ...formPremios,
                            puesto2: { ...formPremios.puesto2, premio: e.target.value },
                          })
                        }
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Ícono</label>
                      <Input
                        placeholder="🥈"
                        value={formPremios.puesto2.icono}
                        onChange={(e) =>
                          setFormPremios({
                            ...formPremios,
                            puesto2: { ...formPremios.puesto2, icono: e.target.value },
                          })
                        }
                        className="h-8 text-xs text-center bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Puesto 3 (Bronce) */}
                <div className="p-3 rounded-xl border border-amber-700/30 bg-amber-700/5 space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-500">
                    <span className="text-base">🥉</span>
                    <span>3° Puesto (Medalla de Bronce)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Premio o Recompensa</label>
                      <Input
                        required
                        placeholder="Ej: Toalla deportiva del estudio"
                        value={formPremios.puesto3.premio}
                        onChange={(e) =>
                          setFormPremios({
                            ...formPremios,
                            puesto3: { ...formPremios.puesto3, premio: e.target.value },
                          })
                        }
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Ícono</label>
                      <Input
                        placeholder="🥉"
                        value={formPremios.puesto3.icono}
                        onChange={(e) =>
                          setFormPremios({
                            ...formPremios,
                            puesto3: { ...formPremios.puesto3, icono: e.target.value },
                          })
                        }
                        className="h-8 text-xs text-center bg-background"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalPremiosOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={guardandoPremios}
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {guardandoPremios ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando Premios...
                    </>
                  ) : (
                    'Guardar Premios'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL VISUALIZACIÓN CÓDIGO QR DEL ALUMNO */}
      {alumnoQrSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border-border bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="p-5 pb-3 border-b text-center relative">
              <button
                type="button"
                onClick={() => setAlumnoQrSeleccionado(null)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
              <CardTitle className="text-base font-black flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <span>Credencial Digital</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {alumnoQrSeleccionado.nombre_completo}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 flex flex-col items-center justify-center space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-inner border border-border/80">
                <QRCode
                  value={alumnoQrSeleccionado.codigo_qr || alumnoQrSeleccionado.usuario_id}
                  size={190}
                  showValue={false}
                  showActions={true}
                  label="Acceso Estudio"
                />
              </div>

              <div className="text-center space-y-1">
                <span className="font-mono text-xs font-bold text-foreground block bg-muted px-2.5 py-1 rounded">
                  {alumnoQrSeleccionado.codigo_qr || 'SIN QR'}
                </span>
                <p className="text-[11px] text-muted-foreground">{alumnoQrSeleccionado.email}</p>
                {alumnoQrSeleccionado.documento && (
                  <p className="text-[10px] text-muted-foreground">Doc: {alumnoQrSeleccionado.documento}</p>
                )}
              </div>
            </CardContent>

            <div className="p-4 border-t flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAlumnoQrSeleccionado(null)}
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL CREAR / EDITAR REGLA XP */}
      {modalReglaOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${currentPalette.textClass}`} />
                  {editingRegla ? 'Editar Regla de Puntuación XP' : 'Nueva Regla XP del Estudio'}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalReglaOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Define el criterio y la cantidad de puntos XP que se acreditarán automáticamente.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarRegla}>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Criterio o Evento</label>
                  <Input
                    required
                    placeholder="Ej: Asistencia, Puntualidad, Reto Semanal..."
                    value={formRegla.criterio}
                    onChange={(e) => setFormRegla({ ...formRegla, criterio: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Puntos XP Otorgados</label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    required
                    placeholder="100"
                    value={formRegla.puntosXp}
                    onChange={(e) => setFormRegla({ ...formRegla, puntosXp: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Cada 300 XP el alumno sube 1 nivel de maestría.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Descripción del Hito</label>
                  <Input
                    placeholder="Ej: Se otorga al validar el ingreso en el control de asistencia..."
                    value={formRegla.descripcion}
                    onChange={(e) => setFormRegla({ ...formRegla, descripcion: e.target.value })}
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRegla.activo}
                    onChange={(e) => setFormRegla({ ...formRegla, activo: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="font-semibold text-foreground">Regla activa en el cálculo automático</span>
                </label>
              </CardContent>

              <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalReglaOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={guardandoRegla}
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {guardandoRegla ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando...
                    </>
                  ) : editingRegla ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Regla XP'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN REGLA */}
      {deletingRegla && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base text-destructive">Eliminar Regla XP</CardTitle>
              <CardDescription className="text-xs">
                ¿Estás seguro de eliminar la regla <strong>{deletingRegla.criterio}</strong>? Los puntos ya otorgados a los alumnos no se verán afectados.
              </CardDescription>
            </CardHeader>
            <div className="p-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={eliminandoRegla}
                onClick={() => setDeletingRegla(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={eliminandoRegla}
                onClick={handleConfirmEliminarRegla}
              >
                {eliminandoRegla ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Eliminar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default GamificacionAdminView
