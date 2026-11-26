import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  Bike,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Loader2,
  Palette,
  Check,
  Clock,
  Tag,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBranding } from '@/context/BrandingContext'
import { empresasService, type EstudioActivo, type RegistrarEstudioParams } from '@/services/empresasService'
import { authService } from '@/services/authService'
import { clasesService, type ClaseConOcupacion } from '@/services/clasesService'

export interface EstudioDirectorioItem extends EstudioActivo {
  tipo_negocio: string | null
  resumen_horario: string
}

interface EstudiosDirectoryViewProps {
  onEstudioSeleccionado?: (estudio: EstudioDirectorioItem) => void
  onVolver?: () => void
  allowCreateStudio?: boolean
}

const DEFAULT_SCHEDULE_SUMMARY = 'Lun – Sáb • Ver agenda disponible'

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getCategoryCoverImage(tipoNegocio?: string | null): string {
  if (!tipoNegocio) return '/Sppining.png'
  const lower = normalizeText(tipoNegocio)
  if (lower.includes('pilat')) return '/Pilates.png'
  if (lower.includes('yoga') || lower.includes('medit')) return '/yoga.png'
  if (lower.includes('gimnas') || lower.includes('crossfit') || lower.includes('entrena')) return '/Gym.png'
  if (lower.includes('bellez') || lower.includes('salon') || lower.includes('barber') || lower.includes('spa')) {
    return '/Salon-de-Belleza.png'
  }
  if (lower.includes('consult') || lower.includes('medic') || lower.includes('salud') || lower.includes('terap')) {
    return '/Consulta_profesional.png'
  }
  if (lower.includes('cancha') || lower.includes('tenis') || lower.includes('padel') || lower.includes('deport')) {
    return '/Cancha.png'
  }
  if (lower.includes('billar')) return '/Billar.png'
  return '/Sppining.png'
}

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function summarizeSchedule(clases: ClaseConOcupacion[]): string {
  if (!clases || clases.length === 0) {
    return DEFAULT_SCHEDULE_SUMMARY
  }

  let earliest = '23:59'
  let latest = '00:00'

  for (const clase of clases) {
    const start = clase.hora_inicio?.slice(0, 5) || ''
    const end = clase.hora_fin?.slice(0, 5) || ''
    if (start && start < earliest) earliest = start
    if (end && end > latest) latest = end
  }

  const countLabel =
    clases.length === 1 ? '1 sesión esta semana' : `${clases.length} sesiones esta semana`

  if (earliest <= latest) {
    return `${earliest} – ${latest} • ${countLabel}`
  }

  return countLabel
}

export const EstudiosDirectoryView: React.FC<EstudiosDirectoryViewProps> = ({
  onEstudioSeleccionado,
  onVolver,
  allowCreateStudio = true,
}) => {
  const { currentPalette, empresaId, setEstudioActivo } = useBranding()

  const [estudios, setEstudios] = useState<EstudioDirectorioItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState<string>('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [notificacionUrl, setNotificacionUrl] = useState<string | null>(null)
  const [brokenLogos, setBrokenLogos] = useState<Record<string, boolean>>({})

  // Modal para registrar nuevo estudio SaaS
  const [showRegistroModal, setShowRegistroModal] = useState<boolean>(false)
  const [registrando, setRegistrando] = useState<boolean>(false)
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null)
  const [nuevoEstudio, setNuevoEstudio] = useState<RegistrarEstudioParams>({
    nombre: '',
    slug: '',
    email: '',
    telefono: '',
    direccion: '',
    color_primario: '#DC2626',
    color_secundario: '#991B1B',
    capacidad_sala: 15,
  })

  const [reloadTick, setReloadTick] = useState<number>(0)

  const onEstudioSeleccionadoRef = useRef(onEstudioSeleccionado)
  const setEstudioActivoRef = useRef(setEstudioActivo)

  useEffect(() => {
    onEstudioSeleccionadoRef.current = onEstudioSeleccionado
  }, [onEstudioSeleccionado])

  useEffect(() => {
    setEstudioActivoRef.current = setEstudioActivo
  }, [setEstudioActivo])

  useEffect(() => {
    let cancelled = false

    const cargarDirectorio = async () => {
      try {
        const [estudiosRes, empresasMetaRes] = await Promise.all([
          empresasService.getEstudiosActivos(),
          authService.getActiveEmpresas(),
        ])

        if (cancelled) return

        if (estudiosRes.error && !estudiosRes.data) {
          setErrorCarga(estudiosRes.error)
          setEstudios([])
          return
        }

        const metaMap = new Map<string, string | null>()
        for (const meta of empresasMetaRes.data || []) {
          metaMap.set(meta.id, meta.tipo_negocio)
        }

        const baseItems: EstudioDirectorioItem[] = (estudiosRes.data || []).map((estudio) => ({
          ...estudio,
          tipo_negocio: metaMap.get(estudio.id) ?? null,
          resumen_horario: DEFAULT_SCHEDULE_SUMMARY,
        }))

        setEstudios(baseItems)

        // Enriquecer de forma no bloqueante el resumen de horarios próximos por estudio
        if (baseItems.length > 0) {
          const hoy = new Date()
          const en7Dias = new Date(hoy)
          en7Dias.setDate(hoy.getDate() + 7)
          const fechaInicio = formatLocalIsoDate(hoy)
          const fechaFin = formatLocalIsoDate(en7Dias)

          const scheduleResults = await Promise.allSettled(
            baseItems.slice(0, 24).map(async (item) => {
              const res = await clasesService.getClasesByRangoFechas(item.id, fechaInicio, fechaFin)
              return {
                id: item.id,
                resumen: summarizeSchedule(res.data || []),
              }
            })
          )

          if (cancelled) return

          const resumenMap = new Map<string, string>()
          for (const result of scheduleResults) {
            if (result.status === 'fulfilled') {
              resumenMap.set(result.value.id, result.value.resumen)
            }
          }

          if (resumenMap.size > 0) {
            setEstudios((prev) =>
              prev.map((item) => ({
                ...item,
                resumen_horario: resumenMap.get(item.id) || item.resumen_horario,
              }))
            )
          }
        }

        // Detección automática por URL (?estudio=slug o pathname /estudio/:slug)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const querySlug = urlParams.get('estudio') || urlParams.get('slug')
          let targetSlug = querySlug

          if (!targetSlug) {
            const pathMatch = window.location.pathname.match(/\/estudio\/([a-zA-Z0-9_-]+)/)
            if (pathMatch && pathMatch[1]) {
              targetSlug = pathMatch[1]
            }
          }

          if (targetSlug) {
            const slugRes = await empresasService.getEstudioBySlug(targetSlug)
            if (!cancelled && slugRes.data) {
              const enriched: EstudioDirectorioItem = {
                ...slugRes.data,
                tipo_negocio: metaMap.get(slugRes.data.id) ?? null,
                resumen_horario: DEFAULT_SCHEDULE_SUMMARY,
              }
              setEstudioActivoRef.current(enriched)
              setNotificacionUrl(`Estudio detectado automáticamente por URL: "${enriched.nombre}".`)
              onEstudioSeleccionadoRef.current?.(enriched)
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Error cargando el directorio de estudios'
          console.warn('[EstudiosDirectory] Error inicializando directorio:', err)
          setErrorCarga(msg)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void cargarDirectorio()

    return () => {
      cancelled = true
    }
  }, [reloadTick])

  // Categorías únicas disponibles para el dropdown de filtro
  const categoriasDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const est of estudios) {
      if (est.tipo_negocio?.trim()) {
        set.add(est.tipo_negocio.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [estudios])

  // Filtrado reactivo en vivo por nombre, dirección y categoría
  const estudiosFiltrados = useMemo(() => {
    const query = normalizeText(busqueda)

    return estudios.filter((e) => {
      if (categoriaFiltro !== 'todas') {
        const cat = (e.tipo_negocio || 'Sin categoría').trim()
        if (cat !== categoriaFiltro) return false
      }

      if (!query) return true

      const matchNombre = normalizeText(e.nombre).includes(query)
      const matchDir = e.direccion ? normalizeText(e.direccion).includes(query) : false
      const matchSlug = e.slug ? normalizeText(e.slug).includes(query) : false
      return matchNombre || matchDir || matchSlug
    })
  }, [estudios, busqueda, categoriaFiltro])

  // Seleccionar un estudio activo y navegar a su calendario/mapa manteniendo la sesión
  const handleSeleccionarEstudio = (estudio: EstudioDirectorioItem) => {
    setEstudioActivo(estudio)
    onEstudioSeleccionadoRef.current?.(estudio)
  }

  // Registrar un nuevo estudio SaaS
  const handleCrearEstudio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoEstudio.nombre || !nuevoEstudio.email) return

    setRegistrando(true)
    setErrorRegistro(null)

    try {
      const slugGenerado =
        nuevoEstudio.slug ||
        nuevoEstudio.nombre
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      const params: RegistrarEstudioParams = {
        ...nuevoEstudio,
        slug: slugGenerado,
      }

      const res = await empresasService.registrarEstudio(params)

      if (res.data) {
        const estudioCreado: EstudioDirectorioItem = {
          id: res.data.id,
          nombre: res.data.nombre,
          slug: res.data.slug,
          logo_url: res.data.logo_url,
          color_primario: res.data.color_primario,
          color_secundario: res.data.color_secundario,
          direccion: res.data.direccion,
          telefono: res.data.telefono,
          email: res.data.email,
          capacidad_sala: res.data.capacidad_sala || 15,
          activo: res.data.activo ?? true,
          tipo_negocio: res.data.tipo_negocio || null,
          resumen_horario: DEFAULT_SCHEDULE_SUMMARY,
        }

        setEstudios((prev) => [estudioCreado, ...prev])
        setEstudioActivo(estudioCreado)
        setShowRegistroModal(false)

        setNuevoEstudio({
          nombre: '',
          slug: '',
          email: '',
          telefono: '',
          direccion: '',
          color_primario: '#DC2626',
          color_secundario: '#991B1B',
          capacidad_sala: 15,
        })

        onEstudioSeleccionadoRef.current?.(estudioCreado)
      } else {
        setErrorRegistro(res.error || 'No se pudo crear el estudio')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al crear estudio'
      setErrorRegistro(message)
    } finally {
      setRegistrando(false)
    }
  }

  const hayFiltrosActivos = Boolean(busqueda.trim()) || categoriaFiltro !== 'todas'

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Banner de Bienvenida y Header SaaS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/40 border p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Directorio Multi-Estudio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Explora Estudios y Centros Asociados
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Elige el estudio o centro donde quieres reservar hoy. Puedes cambiar de sede en
              cualquier momento usando tu misma cuenta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {allowCreateStudio && (
              <Button
                type="button"
                onClick={() => setShowRegistroModal(true)}
                className={`gap-2 font-bold shadow-md ${currentPalette.bgClass} text-white hover:opacity-90`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Nuevo Estudio</span>
              </Button>
            )}
            {onVolver && (
              <Button type="button" variant="outline" onClick={onVolver} className="text-xs">
                Mi Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Notificación si se detectó por URL */}
        {notificacionUrl && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificacionUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificacionUrl(null)}
              className="text-xs font-bold hover:underline opacity-80"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Barra de Búsqueda y Filtro por Categoría */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar estudio por nombre o dirección..."
              aria-label="Buscar estudio por nombre o dirección"
              className="pl-9 h-10 text-xs sm:text-sm"
            />
          </div>

          <div className="w-full sm:w-64">
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger aria-label="Filtrar por categoría de negocio" className="h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categoriasDisponibles.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBusqueda('')
                setCategoriaFiltro('todas')
              }}
              className="text-xs h-10 px-3"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2 shrink-0">
          <Building2 className="w-4 h-4" />
          <span>
            Mostrando <strong>{estudiosFiltrados.length}</strong> de <strong>{estudios.length}</strong>{' '}
            estudios activos
          </span>
        </div>
      </div>

      {/* Mensaje de error si falla consulta */}
      {errorCarga && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No pudimos cargar los estudios: {errorCarga}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true)
              setErrorCarga(null)
              setReloadTick((prev) => prev + 1)
            }}
            className="text-xs gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </Button>
        </div>
      )}

      {/* Catálogo de Tarjetas de Estudios */}
      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-semibold">Cargando catálogo de estudios...</span>
        </div>
      ) : estudiosFiltrados.length === 0 ? (
        <Card className="border-dashed p-10 text-center space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
          <div className="font-bold text-sm text-foreground">No se encontraron estudios</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {hayFiltrosActivos
              ? 'No encontramos ningún estudio que coincida con tu búsqueda o categoría seleccionada.'
              : 'Aún no hay estudios activos registrados en la plataforma.'}
          </p>
          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBusqueda('')
                setCategoriaFiltro('todas')
              }}
              className="text-xs"
            >
              Limpiar Búsqueda y Filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {estudiosFiltrados.map((estudio) => {
            const esActivo = estudio.id === empresaId
            const colorPrimario = estudio.color_primario || '#DC2626'
            const coverImage = getCategoryCoverImage(estudio.tipo_negocio)
            const hasValidLogo = Boolean(estudio.logo_url) && !brokenLogos[estudio.id]

            return (
              <Card
                key={estudio.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSeleccionarEstudio(estudio)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSeleccionarEstudio(estudio)
                  }
                }}
                aria-label={`Ingresar al estudio ${estudio.nombre}`}
                className={`group flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  esActivo ? 'ring-2 ring-primary border-primary shadow-sm bg-primary/5' : 'bg-card'
                }`}
              >
                <div>
                  {/* Encabezado con fotografía del estudio / categoría y logo de marca blanca */}
                  <div className="relative h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img
                      src={coverImage}
                      alt={estudio.tipo_negocio ? `${estudio.nombre} - ${estudio.tipo_negocio}` : estudio.nombre}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/30" />

                    {/* Logo flotante si existe */}
                    {hasValidLogo && (
                      <div className="relative z-10 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-950/90 shadow-lg backdrop-blur-xs border border-white/20 max-w-[75%]">
                        <img
                          src={estudio.logo_url || ''}
                          alt={`Logotipo de ${estudio.nombre}`}
                          className="max-h-14 max-w-full object-contain mx-auto"
                          onError={() =>
                            setBrokenLogos((prev) => ({
                              ...prev,
                              [estudio.id]: true,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Categoría de negocio arriba a la izquierda */}
                    <div className="absolute top-3 left-3 z-10 max-w-[65%]">
                      <Badge className="bg-slate-950/80 hover:bg-slate-950/90 text-white border border-white/15 backdrop-blur-xs text-[10px] font-semibold gap-1 truncate max-w-full">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span className="truncate">{estudio.tipo_negocio || 'Centro / Estudio'}</span>
                      </Badge>
                    </div>

                    {/* Badge de Estudio Actual arriba a la derecha */}
                    {esActivo && (
                      <div className="absolute top-3 right-3 z-10 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Activo</span>
                      </div>
                    )}

                    {/* Franja de Color Primario de Marca Blanca */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1.5 z-10"
                      style={{ backgroundColor: colorPrimario }}
                    />
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                        {estudio.nombre}
                      </CardTitle>
                      <div
                        className="w-5 h-5 rounded-full border shadow-sm shrink-0"
                        style={{ backgroundColor: colorPrimario }}
                        title={`Color de Marca: ${colorPrimario}`}
                      />
                    </div>
                    {estudio.slug && (
                      <CardDescription className="text-[11px] font-mono text-muted-foreground">
                        @{estudio.slug}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
                    {/* Dirección, resumen de horarios y contacto */}
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-foreground/70 mt-0.5" />
                        <span className="line-clamp-2">
                          {estudio.direccion || 'Dirección por confirmar'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-foreground/90 font-medium">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="truncate">{estudio.resumen_horario}</span>
                      </div>

                      {estudio.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-foreground/70" />
                          <span>{estudio.telefono}</span>
                        </div>
                      )}

                      {estudio.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-foreground/70" />
                          <span className="truncate">{estudio.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacidad e Identidad */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                      <Badge variant="outline" className="text-[10px] font-semibold flex items-center gap-1">
                        <Bike className="w-3 h-3" />
                        <span>Capacidad: {estudio.capacidad_sala || 15} cupos</span>
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono flex items-center gap-1 uppercase"
                      >
                        <Palette className="w-3 h-3" />
                        <span>{colorPrimario}</span>
                      </Badge>
                    </div>
                  </CardContent>
                </div>

                {/* Footer de Acción — siempre clickeable para ir al calendario/mapa */}
                <div className="p-4 pt-0 mt-auto">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSeleccionarEstudio(estudio)
                    }}
                    className="w-full text-xs font-bold text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: colorPrimario }}
                  >
                    <span>{esActivo ? 'Ver Horarios y Reservar' : 'Ingresar a este Estudio'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal para Crear y Registrar Estudio en la plataforma SaaS */}
      {allowCreateStudio && showRegistroModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
            <CardHeader className="p-5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Registrar Nuevo Estudio SaaS
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowRegistroModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Crea una nueva franquicia o sede con su propio tenant y paleta de colores.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCrearEstudio}>
              <CardContent className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
                {errorRegistro && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                    {errorRegistro}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Nombre del Estudio *</label>
                  <Input
                    required
                    value={nuevoEstudio.nombre}
                    onChange={(e) => {
                      const nombre = e.target.value
                      setNuevoEstudio((prev) => ({
                        ...prev,
                        nombre,
                        slug: prev.slug ? prev.slug : nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      }))
                    }}
                    placeholder="Ej. Revolution Ride Cali"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Slug único para URL *</label>
                    <Input
                      required
                      value={nuevoEstudio.slug}
                      onChange={(e) =>
                        setNuevoEstudio((prev) => ({
                          ...prev,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                        }))
                      }
                      placeholder="ej: revolution-ride-cali"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Capacidad Sala (Bicis)</label>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={nuevoEstudio.capacidad_sala || 15}
                      onChange={(e) =>
                        setNuevoEstudio((prev) => ({
                          ...prev,
                          capacidad_sala: parseInt(e.target.value, 10) || 15,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Email de Contacto *</label>
                    <Input
                      type="email"
                      required
                      value={nuevoEstudio.email}
                      onChange={(e) => setNuevoEstudio((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@estudio.com"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Teléfono</label>
                    <Input
                      value={nuevoEstudio.telefono || ''}
                      onChange={(e) => setNuevoEstudio((prev) => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+57 300 123 4567"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Dirección y Ciudad</label>
                  <Input
                    value={nuevoEstudio.direccion || ''}
                    onChange={(e) => setNuevoEstudio((prev) => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Carrera 15 # 93-60, Chicó, Bogotá"
                    className="text-xs"
                  />
                </div>

                {/* Selector de Color Primario */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Color Primario de Marca Blanca</span>
                    <span className="font-mono text-[11px]">{nuevoEstudio.color_primario}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={nuevoEstudio.color_primario || '#DC2626'}
                      onChange={(e) =>
                        setNuevoEstudio((prev) => ({ ...prev, color_primario: e.target.value }))
                      }
                      className="w-10 h-10 p-1 rounded-lg border border-border cursor-pointer bg-card"
                    />
                    <Input
                      value={nuevoEstudio.color_primario || '#DC2626'}
                      onChange={(e) =>
                        setNuevoEstudio((prev) => ({ ...prev, color_primario: e.target.value }))
                      }
                      className="w-32 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </CardContent>

              <div className="p-5 border-t flex items-center justify-end gap-2 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegistroModal(false)}
                  disabled={registrando}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={registrando}
                  className={`text-xs font-bold ${currentPalette.bgClass} text-white gap-1.5`}
                >
                  {registrando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando Estudio...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Registrar Estudio</span>
                    </>
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

export default EstudiosDirectoryView
