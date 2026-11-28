import { useState, useEffect, useRef, type ReactNode } from 'react'
import {
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Plus,
  Sun,
  Moon,
  Bell,
  Share2,
  Sliders,
  Building2,
  ChevronsUpDown,
  Check,
  Copy,
  CalendarCheck,
  MapPin,
  UserPlus,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QRCode } from '@/components/ui/qr-code'
import { useBranding } from '@/context/BrandingContext'
import { empresasService, type EstudioActivo } from '@/services/empresasService'
import type { Tables } from '@/types/database'

function capitalizeLabel(value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getPortadaFallback(tipoNegocio?: string | null): string {
  const norm = (tipoNegocio || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (norm.includes('spin') || norm.includes('ciclis') || norm.includes('cycling') || norm.includes('indoor')) {
    return '/Sppining.png'
  }
  if (norm.includes('pilates') || norm.includes('reformer')) {
    return '/Pilates.png'
  }
  if (norm.includes('cancha') || norm.includes('futbol') || norm.includes('padel') || norm.includes('tenis')) {
    return '/Cancha.png'
  }
  if (norm.includes('gym') || norm.includes('gimnasio') || norm.includes('crossfit') || norm.includes('funcional')) {
    return '/Gym.png'
  }
  if (norm.includes('yoga') || norm.includes('meditacion')) {
    return '/yoga.png'
  }
  if (norm.includes('belleza') || norm.includes('peluqueria') || norm.includes('barber') || norm.includes('spa')) {
    return '/Salon-de-Belleza.png'
  }
  if (norm.includes('consultorio') || norm.includes('medico') || norm.includes('salud') || norm.includes('psicolog')) {
    return '/Consulta_profesional.png'
  }
  if (norm.includes('billar')) {
    return '/Billar.png'
  }
  return '/Sppining.png'
}

export type SidebarNavSection = {
  title: string
  items: {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}

export type SidebarLayoutProps = {
  sections: SidebarNavSection[]
  activeTab: string
  onSelectTab: (tabId: string) => void
  currentUser: Tables<'perfiles'> | null
  onSignOut: () => void
  onLogoClick?: () => void
  onNewBooking?: () => void
  headerActions?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export default function SidebarLayout({
  sections,
  activeTab,
  onSelectTab,
  currentUser,
  onSignOut,
  onLogoClick,
  onNewBooking,
  headerActions,
  footer,
  children,
}: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [studioSelectorOpen, setStudioSelectorOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [estudiosDisponibles, setEstudiosDisponibles] = useState<EstudioActivo[]>([])

  const notifRef = useRef<HTMLDivElement>(null)
  const studioRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const {
    studioName,
    currentPalette,
    logoUrl,
    portadaUrl,
    estudioActivo,
    setEstudioActivo,
    verticalConfig,
    isDarkMode,
    toggleDarkMode,
  } = useBranding()

  const mapNavLabel = `Mapa de ${capitalizeLabel(verticalConfig.recursoCortoPlural)}`

  // Cargar sedes/estudios disponibles para el usuario
  useEffect(() => {
    let isMounted = true

    const cargarEstudios = async () => {
      try {
        if (currentUser?.id) {
          const resUser = await empresasService.getEstudiosUsuario(currentUser.id)
          if (isMounted && resUser.data && resUser.data.length > 0) {
            setEstudiosDisponibles(resUser.data)
            return
          }
        }
        // Fallback a estudios activos
        const resActivos = await empresasService.getEstudiosActivos()
        if (isMounted && resActivos.data) {
          setEstudiosDisponibles(resActivos.data)
        }
      } catch (err) {
        console.warn('[SidebarLayout] Error al cargar lista de estudios:', err)
      }
    }

    void cargarEstudios()

    return () => {
      isMounted = false
    }
  }, [currentUser?.id])

  // Cerrar popovers al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (studioRef.current && !studioRef.current.contains(event.target as Node)) {
        setStudioSelectorOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getItemLabel = (item: SidebarNavSection['items'][number]): string => {
    if (item.id === 'cliente-mapa' || item.label === 'Mapa 15 Bicis') {
      return mapNavLabel
    }
    return item.label
  }

  const activeItem = sections.flatMap((s) => s.items).find((item) => item.id === activeTab)
  const activeItemLabel = activeItem ? getItemLabel(activeItem) : 'Panel de Control'

  // URL pública del estudio para compartir
  const estudioSlug = estudioActivo?.slug || estudioActivo?.id || 'estudio'
  const shareUrl = `https://reserly.app/?estudio=${estudioSlug}`
  const portadaSrc = portadaUrl || estudioActivo?.portada_url || getPortadaFallback(estudioActivo?.tipo_negocio)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      // Fallback manual si portapapeles falla
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const handleIrAConfigMarca = () => {
    onSelectTab('admin-branding')
    setMobileOpen(false)
  }

  const handleOpenNewBooking = () => {
    if (onNewBooking) {
      onNewBooking()
    } else {
      setNewBookingModalOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
      {/* Overlay oscuro para móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar fijo lateral */}
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-200 ease-in-out shadow-sm ${
          desktopCollapsed ? 'w-64 lg:w-20' : 'w-64 lg:w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Cabecera superior del Sidebar con Logo Oficial de Reserly */}
        <div className="h-16 px-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (desktopCollapsed) {
                setDesktopCollapsed(false)
              } else {
                onLogoClick?.()
                setMobileOpen(false)
              }
            }}
            className={`flex items-center gap-2.5 min-w-0 rounded-lg p-1.5 hover:bg-muted/60 transition-colors text-left ${
              desktopCollapsed ? 'lg:justify-center' : ''
            }`}
            title={desktopCollapsed ? 'Expandir barra lateral' : 'Ir al inicio de Reserly'}
          >
            <img
              src="/Logo_sin_fondo.png"
              alt="Reserly Logo"
              className="w-8 h-8 object-contain shrink-0 drop-shadow-xs"
            />
            <div className={`flex flex-col min-w-0 ${desktopCollapsed ? 'lg:hidden' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-foreground">
                  Reserly
                </span>
                <span className="text-[10px] uppercase font-bold text-red-600 bg-red-500/10 dark:bg-red-950/40 px-1 py-0.2 rounded border border-red-500/20">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate font-medium">
                Gestión de Reservas
              </span>
            </div>
          </button>

          {/* Botón cerrar en móvil */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú lateral"
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Único botón para colapsar / expandir en escritorio */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground rounded-lg"
            onClick={() => setDesktopCollapsed((prev) => !prev)}
            title={desktopCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-label={desktopCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {desktopCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Tarjeta Visual de Identidad del Negocio Activo */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          {!desktopCollapsed ? (
            <div className="rounded-xl border border-border/80 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs hover:border-primary/40 transition-colors">
              {/* Portada del estudio con gradiente suave */}
              <div className="relative h-14 w-full overflow-hidden bg-slate-900">
                <img
                  src={portadaSrc}
                  alt={studioName}
                  className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
                  onError={(e) => {
                    // Fallback a imagen por defecto
                    const target = e.target as HTMLImageElement
                    target.src = '/Sppining.png'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-1.5 right-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[9px] font-bold px-1.5 py-0 h-4 bg-black/60 text-white backdrop-blur-xs border-0"
                  >
                    {verticalConfig.etiquetaNegocio}
                  </Badge>
                </div>
              </div>

              {/* Contenido completamente DEBAJO del bloque de portada con contraste nítido */}
              <div className="p-2.5 pt-0 relative bg-white dark:bg-slate-900/90">
                <div className="flex items-center gap-2.5 -mt-5 mb-2">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={studioName}
                      className="w-11 h-11 rounded-full border-2 border-white dark:border-slate-800 shadow-md object-contain bg-white shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center font-black text-white shrink-0 text-sm ${currentPalette.bgClass}`}
                    >
                      {studioName?.charAt(0) || 'R'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 pt-4">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate" title={studioName}>
                      {studioName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-muted-foreground" />
                      <span>{estudioActivo?.direccion || verticalConfig.espacio}</span>
                    </p>
                  </div>
                </div>

                {/* 2 Botones de acción rápida compactos */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/60">
                  <button
                    type="button"
                    onClick={handleIrAConfigMarca}
                    className="flex items-center justify-center gap-1 text-[11px] font-semibold py-1 px-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                    title="Configurar colores, logo y portada"
                  >
                    <Sliders className="w-3 h-3 shrink-0 text-primary" />
                    <span className="truncate">Marca</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="flex items-center justify-center gap-1 text-[11px] font-semibold py-1 px-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                    title="Compartir link público y código QR"
                  >
                    <Share2 className="w-3 h-3 shrink-0 text-red-600 dark:text-red-400" />
                    <span className="truncate">Link / QR</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Vista colapsada en escritorio */
            <div className="hidden lg:flex flex-col items-center gap-1.5 py-1">
              <button
                type="button"
                onClick={() => setDesktopCollapsed(false)}
                className="relative group p-0.5"
                title={`${studioName} - Click para expandir`}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={studioName}
                    className="w-10 h-10 rounded-full border-2 border-border object-contain bg-white shadow-xs"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full border-2 border-border shadow-xs flex items-center justify-center font-bold text-white text-xs ${currentPalette.bgClass}`}
                  >
                    {studioName?.charAt(0) || 'R'}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Compartir Link / QR"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Enlaces de navegación */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {sections.map((section, idx) => (
            <div key={idx}>
              <p
                className={`text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-2.5 ${
                  desktopCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {section.title}
              </p>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const IconComponent = item.icon
                  const isActive = activeTab === item.id
                  const itemLabel = getItemLabel(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={itemLabel}
                      onClick={() => {
                        onSelectTab(item.id)
                        setMobileOpen(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        desktopCollapsed ? 'lg:justify-center lg:px-2' : ''
                      } ${
                        isActive
                          ? `${currentPalette.bgClass} text-white shadow-xs font-bold`
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-4 h-4 shrink-0" />}
                      <span className={`truncate ${desktopCollapsed ? 'lg:hidden' : ''}`}>
                        {itemLabel}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Parte Inferior del Sidebar: Selector de Sede si administra más de un estudio */}
        {estudiosDisponibles.length > 1 && !desktopCollapsed && (
          <div className="p-3 border-t border-border shrink-0 bg-card">
            <div className="relative" ref={studioRef}>
              <button
                type="button"
                onClick={() => setStudioSelectorOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 hover:bg-muted/60 text-left transition-colors"
                title="Cambiar de estudio o sede"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
                      Sede Activa
                    </p>
                    <p className="text-xs font-bold truncate text-foreground leading-tight mt-0.5">
                      {studioName}
                    </p>
                  </div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>

              {/* Menú flotante de selector de sedes */}
              {studioSelectorOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 p-1.5 rounded-xl border border-border bg-popover shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1">
                    Seleccionar Estudio
                  </p>
                  <div className="space-y-0.5">
                    {estudiosDisponibles.map((estudio) => {
                      const isSelected = estudio.id === estudioActivo?.id
                      return (
                        <button
                          key={estudio.id}
                          type="button"
                          onClick={() => {
                            setEstudioActivo({
                              id: estudio.id,
                              nombre: estudio.nombre,
                              slug: estudio.slug,
                              tipo_negocio: estudio.tipo_negocio,
                              logo_url: estudio.logo_url,
                              portada_url: estudio.portada_url,
                              color_primario: estudio.color_primario,
                              color_secundario: estudio.color_secundario,
                              capacidad_sala: estudio.capacidad_sala,
                              direccion: estudio.direccion,
                              telefono: estudio.telefono,
                              email: estudio.email,
                              activo: estudio.activo,
                            })
                            setStudioSelectorOpen(false)
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {estudio.logo_url ? (
                              <img
                                src={estudio.logo_url}
                                alt={estudio.nombre}
                                className="w-5 h-5 rounded-md object-contain bg-white border shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                                {estudio.nombre.charAt(0)}
                              </div>
                            )}
                            <span className="truncate">{estudio.nombre}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Área de contenido principal con margen izquierdo dinámico en escritorio (lg:) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Topbar Superior Enriquecido */}
        <header className="h-16 border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-2xs">
          {/* A la izquierda: Botón menú móvil + Breadcrumb limpio y discreto */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Botón hamburguesa móvil */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Abrir menú lateral"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Breadcrumb sobrio y discreto (sin duplicar títulos ni badges) */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
              <span className="hidden sm:inline">Panel Administrativo</span>
              <span className="hidden sm:inline text-muted-foreground/40">/</span>
              <span className="font-bold text-foreground truncate">{activeItemLabel}</span>
            </div>
          </div>

          {/* A la derecha: Botón Nueva Reserva + Claro/Oscuro + Notificaciones + Perfil de Usuario */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Acciones adicionales heredadas (ej. botón Vista Previa Alumno) */}
            {headerActions}

            {/* Botón rápido destacado + Nueva Reserva */}
            <Button
              type="button"
              size="sm"
              onClick={handleOpenNewBooking}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-3 gap-1.5 shadow-sm text-xs sm:text-sm shrink-0 rounded-lg transition-transform active:scale-95"
              title="Crear una nueva reserva rápida"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Reserva</span>
              <span className="sm:hidden">Reserva</span>
            </Button>

            {/* Selector de tema Claro / Oscuro */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              )}
            </Button>

            {/* Campana de Notificaciones con badge contador */}
            <div className="relative" ref={notifRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg relative shrink-0"
                title="Notificaciones y avisos del estudio"
                aria-label="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-card animate-pulse" />
              </Button>

              {/* Popover de Notificaciones */}
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-red-600" />
                      <span className="font-bold text-xs">Notificaciones</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      3 pendientes
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div
                      onClick={() => {
                        onSelectTab('admin-reservas')
                        setNotificationsOpen(false)
                      }}
                      className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-left"
                    >
                      <p className="text-xs font-semibold text-foreground">
                        Nueva reserva confirmada
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Sofía Gómez reservó en la sesión de las 6:30 PM.
                      </p>
                      <span className="text-[9px] text-primary font-medium mt-1 inline-block">
                        Hace 5 minutos
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        onSelectTab('admin-pagos')
                        setNotificationsOpen(false)
                      }}
                      className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-left"
                    >
                      <p className="text-xs font-semibold text-foreground">
                        Comprobante por validar
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Carlos Mendoza subió comprobante Nequi ($85.000 COP).
                      </p>
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-1 inline-block">
                        Hace 18 minutos
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        onSelectTab('admin-reservas')
                        setNotificationsOpen(false)
                      }}
                      className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-left"
                    >
                      <p className="text-xs font-semibold text-foreground">
                        Capacidad alta (85%)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        La clase de las 7:30 PM tiene solo 2 cupos disponibles.
                      </p>
                      <span className="text-[9px] text-muted-foreground font-medium mt-1 inline-block">
                        Hace 1 hora
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bloque de usuario interactivo con Dropdown elegante */}
            {currentUser && (
              <div className="relative pl-2 border-l border-border" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-muted/70 transition-colors border border-transparent hover:border-border text-left group cursor-pointer"
                  title="Opciones de cuenta"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                    {currentUser.nombre_completo?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden lg:flex flex-col text-left leading-tight min-w-0 max-w-[130px]">
                    <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {currentUser.nombre_completo}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate font-mono">
                      {currentUser.email || studioName}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground hidden sm:block shrink-0" />
                </button>

                {/* Menú Desplegable Elegante */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Información del usuario */}
                    <div className="p-2.5 border-b border-border/80 mb-1 space-y-1 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-sm border border-primary/25 shrink-0">
                          {currentUser.nombre_completo?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {currentUser.nombre_completo}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {currentUser.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold py-0 h-4">
                          {currentUser.rol}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          • {studioName}
                        </span>
                      </div>
                    </div>

                    {/* Acceso a Mi Perfil / Marca Blanca */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('admin-branding')
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors text-foreground text-left cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-primary" />
                        <span>Mi Perfil / Configuración</span>
                      </button>
                    </div>

                    {/* Cerrar Sesión Destacado */}
                    <div className="border-t border-border/80 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false)
                          onSignOut()
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Área de trabajo principal ocupando el 100% del ancho (w-full) */}
        <main className="w-full flex-1 bg-background overflow-y-auto min-h-screen px-3 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {footer}
      </div>

      {/* Modal: Compartir Link / QR */}
      {shareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl relative space-y-5 text-center">
            <button
              type="button"
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-600/10 text-red-600 flex items-center justify-center mb-2">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-foreground">
                Compartir {studioName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Invita a tus alumnos a reservar directamente desde el enlace o código QR de tu estudio.
              </p>
            </div>

            {/* Código QR determinista y visualizador */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border/80 flex flex-col items-center justify-center">
              <QRCode
                value={shareUrl}
                size={180}
                showActions={true}
                label={studioName}
              />
            </div>

            {/* Input y botón para copiar link */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                <span className="truncate flex-1 font-mono text-[11px] text-foreground text-left">
                  {shareUrl}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-7 px-2.5 text-xs font-bold gap-1 shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>

              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
              >
                <span>Abrir enlace público en pestaña nueva</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Reserva Rápida */}
      {newBookingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-5">
            <button
              type="button"
              onClick={() => setNewBookingModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                <Plus className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-foreground">
                  Nueva Reserva Rápida
                </h3>
                <p className="text-xs text-muted-foreground">
                  Elige la modalidad para registrar la reserva en {studioName}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('admin-reservas')
                  setNewBookingModalOpen(false)
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 hover:border-primary hover:bg-muted/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Agendar en Calendario de {verticalConfig.sesionPlural}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Selecciona horario, cupos e inscribe al alumno directamente.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('cliente-mapa')
                  setNewBookingModalOpen(false)
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 hover:border-primary hover:bg-muted/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                      Elegir en el Mapa Interactivo ({verticalConfig.recursoCortoPlural})
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Visualiza los puestos libres y reserva el asiento específico.
                    </p>
                  </div>
                </div>
              </button>

              {verticalConfig.enableTiqueteras && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('admin-asignar-planes')
                    setNewBookingModalOpen(false)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 hover:border-primary hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-purple-600 transition-colors">
                        Asignar Plan o Tiquetera a un Alumno
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Carga créditos al cliente antes de programar sus sesiones.
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewBookingModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
