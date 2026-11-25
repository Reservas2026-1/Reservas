import React, { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBranding } from '@/context/BrandingContext'
import { empresasService, type EstudioActivo, type RegistrarEstudioParams } from '@/services/empresasService'

interface EstudiosDirectoryViewProps {
  onEstudioSeleccionado?: (estudio: EstudioActivo) => void
  onVolver?: () => void
}

export const EstudiosDirectoryView: React.FC<EstudiosDirectoryViewProps> = ({
  onEstudioSeleccionado,
  onVolver,
}) => {
  const { currentPalette, empresaId, setEstudioActivo } = useBranding()

  const [estudios, setEstudios] = useState<EstudioActivo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [busqueda, setBusqueda] = useState<string>('')
  const [notificacionUrl, setNotificacionUrl] = useState<string | null>(null)

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

  // Cargar catálogo de estudios y resolver slug si viene en la URL
  useEffect(() => {
    let isMounted = true

    const inicializar = async () => {
      setLoading(true)
      try {
        // 1. Obtener lista de estudios activos
        const res = await empresasService.getEstudiosActivos()
        if (isMounted && res.data) {
          setEstudios(res.data)
        }

        // 2. Detección automática por URL (?estudio=slug o pathname /estudio/:slug)
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

          if (targetSlug && isMounted) {
            const slugRes = await empresasService.getEstudioBySlug(targetSlug)
            if (slugRes.data) {
              setEstudioActivo(slugRes.data)
              setNotificacionUrl(`Estudio detectado automáticamente por URL: "${slugRes.data.nombre}".`)
              if (onEstudioSeleccionado) {
                onEstudioSeleccionado(slugRes.data)
              }
            }
          }
        }
      } catch (err) {
        console.warn('[EstudiosDirectory] Error inicializando directorio:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    inicializar()

    return () => {
      isMounted = false
    }
  }, [setEstudioActivo, onEstudioSeleccionado])

  // Filtrado reactivo en vivo por nombre, dirección, email o slug
  const estudiosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return estudios
    const query = busqueda.toLowerCase().trim()
    return estudios.filter((e) => {
      const matchNombre = e.nombre.toLowerCase().includes(query)
      const matchDir = e.direccion?.toLowerCase().includes(query) || false
      const matchEmail = e.email?.toLowerCase().includes(query) || false
      const matchSlug = e.slug?.toLowerCase().includes(query) || false
      return matchNombre || matchDir || matchEmail || matchSlug
    })
  }, [estudios, busqueda])

  // Seleccionar un estudio activo y aplicarlo al contexto
  const handleSeleccionarEstudio = (estudio: EstudioActivo) => {
    setEstudioActivo(estudio)
    if (onEstudioSeleccionado) {
      onEstudioSeleccionado(estudio)
    }
  }

  // Registrar un nuevo estudio SaaS
  const handleCrearEstudio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoEstudio.nombre || !nuevoEstudio.email) return

    setRegistrando(true)
    setErrorRegistro(null)

    try {
      // Auto-generar slug si no se especificó
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
        const estudioCreado: EstudioActivo = {
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
        }

        setEstudios((prev) => [estudioCreado, ...prev])
        setEstudioActivo(estudioCreado)
        setShowRegistroModal(false)

        // Reset
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

        if (onEstudioSeleccionado) {
          onEstudioSeleccionado(estudioCreado)
        }
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

  return (
    <div className="space-y-8 pb-12">
      {/* Banner de Bienvenida y Header SaaS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/40 border p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plataforma SaaS Multi-Tenant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Directorio de Estudios de Indoor Cycling
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explora los gimnasios y boutiques asociados a la red. Cada estudio cuenta con su propia
              identidad visual, configuración de sala y calendario de reservas independiente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => setShowRegistroModal(true)}
              className={`gap-2 font-bold shadow-md ${currentPalette.bgClass} text-white hover:opacity-90`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Nuevo Estudio</span>
            </Button>
            {onVolver && (
              <Button type="button" variant="outline" onClick={onVolver} className="text-xs">
                Volver a la App
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

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, ciudad o dirección..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>
            Mostrando <strong>{estudiosFiltrados.length}</strong> de <strong>{estudios.length}</strong> estudios activos
          </span>
        </div>
      </div>

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
            No encontramos ningún estudio que coincida con &quot;{busqueda}&quot;. Intenta con otro término o registra uno nuevo.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBusqueda('')}
            className="text-xs"
          >
            Limpiar Búsqueda
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {estudiosFiltrados.map((estudio) => {
            const esActivo = estudio.id === empresaId
            const colorPrimario = estudio.color_primario || '#DC2626'

            return (
              <Card
                key={estudio.id}
                className={`flex flex-col justify-between transition-all duration-200 hover:shadow-md border overflow-hidden ${
                  esActivo ? 'ring-2 ring-primary border-primary shadow-sm bg-primary/5' : 'bg-card'
                }`}
              >
                <div>
                  {/* Encabezado con imagen / logo de marca blanca */}
                  <div className="relative h-36 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden p-4">
                    {estudio.logo_url ? (
                      <img
                        src={estudio.logo_url}
                        alt={`Logotipo de ${estudio.nombre}`}
                        className="max-h-24 max-w-[80%] object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          // Fallback si la imagen no carga
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-white/80 gap-1.5">
                        <Bike className="w-10 h-10" />
                        <span className="text-xs font-bold tracking-tight">{estudio.nombre}</span>
                      </div>
                    )}

                    {/* Badge de Puesto Activo */}
                    {esActivo && (
                      <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Estudio Actual</span>
                      </div>
                    )}

                    {/* Franja de Color Primario de Marca Blanca */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: colorPrimario }}
                    />
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-foreground">
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

                  <CardContent className="p-4 pt-1 space-y-3 text-xs">
                    {/* Metadatos del Estudio */}
                    <div className="space-y-1.5 text-muted-foreground">
                      {estudio.direccion && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-foreground/70" />
                          <span className="truncate">{estudio.direccion}</span>
                        </div>
                      )}
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
                        <span>Capacidad: {estudio.capacidad_sala || 15} bicis</span>
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

                {/* Footer de Acción */}
                <div className="p-4 pt-0 mt-auto">
                  {esActivo ? (
                    <Button
                      type="button"
                      disabled
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/5 cursor-default"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      <span>Estudio Seleccionado</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSeleccionarEstudio(estudio)}
                      className="w-full text-xs font-bold text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      <span>Ingresar a este Estudio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal para Crear y Registrar Estudio en la plataforma SaaS */}
      {showRegistroModal && (
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
