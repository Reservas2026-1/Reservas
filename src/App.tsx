import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  Bike,
  LayoutDashboard,
  LayoutGrid,
  CalendarCheck,
  CheckSquare,
  Wallet,
  Sparkles,
  MapPin,
  Ticket,
  Users,
  ShoppingCart,
  Loader2,
  Building2,
  Sliders,
  ClipboardList,
  Package,
  UserPlus,
  QrCode,
  Eye,
  ArrowLeft,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { BrandingProvider, useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import SidebarLayout, { type SidebarNavSection } from '@/components/layout/SidebarLayout'
import { LandingReserlyView } from '@/components/saas/LandingReserlyView'
import { AuthView } from '@/components/auth/AuthView'
import { ClientDashboard } from '@/components/cliente/ClientDashboard'
import { authService } from '@/services/authService'
import { empresasService } from '@/services/empresasService'
import type { Tables } from '@/types'

// Carga diferida (React.lazy) para optimización del bundle
const IndoorBikeMap = lazy(() => import('@/components/cliente/IndoorBikeMap'))
const PlanesPagosView = lazy(() => import('@/components/cliente/PlanesPagosView'))
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'))
const CalendarView = lazy(() => import('@/components/admin/CalendarView'))
const PlanificacionesView = lazy(() => import('@/components/admin/PlanificacionesView'))
const PlanesAdminView = lazy(() => import('@/components/admin/PlanesAdminView'))
const PaymentValidation = lazy(() => import('@/components/admin/PaymentValidation'))
const CashRegister = lazy(() => import('@/components/admin/CashRegister'))
const ClientsView = lazy(() => import('@/components/admin/ClientsView'))
const EstudiosDirectoryView = lazy(() => import('@/components/saas/EstudiosDirectoryView'))
const BrandSettingsView = lazy(() => import('@/components/admin/BrandSettingsView'))
const BicicletasAdminView = lazy(() => import('@/components/admin/BicicletasAdminView'))
const GamificacionAdminView = lazy(() => import('@/components/admin/GamificacionAdminView'))

export type TabMode =
  | 'cliente-dashboard'
  | 'cliente-mapa'
  | 'cliente-planes'
  | 'saas-directorio'
  | 'admin-dashboard'
  | 'admin-reservas'
  | 'admin-clientes'
  | 'admin-calendario'
  | 'admin-planificaciones'
  | 'admin-planes'
  | 'admin-asignar-planes'
  | 'admin-gamificacion'
  | 'admin-pagos'
  | 'admin-asistencias'
  | 'admin-bicicletas'
  | 'admin-canchas'
  | 'admin-caja'
  | 'admin-branding'
  | 'config-marca'

const mockClienteProfile: Tables<'perfiles'> = {
  id: 'usr-demo-01',
  empresa_id: 'emp-velo-001',
  email: 'alejandro@ejemplo.com',
  nombre_completo: 'Alejandro Vargas',
  documento: '1029384756',
  telefono: '3001234567',
  rol: 'cliente',
  avatar_url: null,
  activo: true,
  created_at: new Date().toISOString(),
  updated_at: null,
}

const mockAdminProfile: Tables<'perfiles'> = {
  id: 'usr-admin-01',
  empresa_id: 'emp-velo-001',
  email: 'admin@estudiocycling.com',
  nombre_completo: 'Administrador General',
  documento: '99887766',
  telefono: '3109876543',
  rol: 'admin',
  avatar_url: null,
  activo: true,
  created_at: new Date().toISOString(),
  updated_at: null,
}

// Componente accesible de carga para Suspense
function ViewSuspenseFallback() {
  return (
    <div
      role="status"
      aria-label="Cargando módulo"
      className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground"
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-xs font-semibold">Cargando módulo...</span>
    </div>
  )
}

function AdminSectionBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border bg-card/70 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
            {title}
          </h2>
          <Badge variant="secondary" className="text-[10px] uppercase font-mono">
            Admin
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

const isNative = Capacitor.isNativePlatform()

function isAdminUser(profile: Tables<'perfiles'> | null): boolean {
  return profile?.rol === 'admin' || profile?.rol === 'superadmin'
}

function MainApp() {
  const {
    studioName,
    currentPalette,
    empresaId,
    estudioActivo,
    setEstudioActivo,
    isSingleTenant,
  } = useBranding()
  const verticalConfig = useMemo(
    () => getConfiguracionVertical(estudioActivo?.tipo_negocio),
    [estudioActivo?.tipo_negocio]
  )

  const defaultClientTab: TabMode = isSingleTenant ? 'cliente-dashboard' : 'saas-directorio'

  // Estado de usuario y sesión (por defecto no autenticado para mostrar la Landing Page)
  const [currentUser, setCurrentUser] = useState<Tables<'perfiles'> | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<TabMode>(defaultClientTab)
  const [showPresentationLanding, setShowPresentationLanding] = useState(false)

  const syncEstudioForProfile = useCallback(
    async (profile: Tables<'perfiles'> | null) => {
      const targetEmpresaId = profile?.empresa_id
      if (!targetEmpresaId || targetEmpresaId === 'emp-velo-001') return
      if (estudioActivo?.id === targetEmpresaId) return

      try {
        const [estudioRes, empresasMetaRes] = await Promise.all([
          empresasService.getEstudioById(targetEmpresaId),
          authService.getActiveEmpresas(),
        ])
        if (estudioRes.data) {
          const metaMatch = (empresasMetaRes.data || []).find((m) => m.id === targetEmpresaId)
          setEstudioActivo({
            ...estudioRes.data,
            tipo_negocio: metaMatch?.tipo_negocio ?? null,
          })
        }
      } catch (err) {
        console.warn('No se pudo sincronizar el estudio del usuario:', err)
      }
    },
    [estudioActivo?.id, setEstudioActivo]
  )

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      void syncEstudioForProfile(currentUser)
    }
  }, [isLoggedIn, currentUser, syncEstudioForProfile])

  // Derivar la pestaña activa segura cuando el vertical del estudio oculta un módulo o si es single-tenant
  const resolvedActiveTab = useMemo<TabMode>(() => {
    if (activeTab === 'config-marca') {
      return 'admin-branding'
    }
    if (isSingleTenant && activeTab === 'saas-directorio') {
      return isAdminUser(currentUser) ? 'admin-dashboard' : 'cliente-dashboard'
    }
    if (activeTab === 'admin-calendario') {
      return 'admin-reservas'
    }
    if (activeTab === 'admin-bicicletas' && !verticalConfig.showBicycleMap) {
      return verticalConfig.showCourtManagement ? 'admin-canchas' : 'admin-dashboard'
    }
    if (activeTab === 'admin-canchas' && !verticalConfig.showCourtManagement) {
      return verticalConfig.showBicycleMap ? 'admin-bicicletas' : 'admin-dashboard'
    }
    if (activeTab === 'admin-asignar-planes' && !verticalConfig.enableTiqueteras) {
      return 'admin-dashboard'
    }
    if (activeTab === 'admin-planificaciones' && !verticalConfig.enablePlanificaciones) {
      return 'admin-dashboard'
    }
    if (activeTab === 'admin-asistencias' && !verticalConfig.enableAsistenciasQR) {
      return 'admin-dashboard'
    }
    return activeTab
  }, [activeTab, verticalConfig, isSingleTenant, currentUser])

  // Suscripción a cambios de autenticación de Supabase Auth
  useEffect(() => {
    let isMounted = true

    const checkInitialSession = async () => {
      try {
        const sessionRes = await authService.getSession()
        if (sessionRes.data && sessionRes.data.user) {
          const profileRes = await authService.getCurrentProfile()
          if (isMounted && profileRes.data) {
            setCurrentUser(profileRes.data)
            setIsLoggedIn(true)
            setActiveTab(
              isAdminUser(profileRes.data)
                ? 'admin-dashboard'
                : isSingleTenant
                  ? 'cliente-dashboard'
                  : 'saas-directorio'
            )
          }
        }
      } catch (e) {
        console.warn('Verificación de sesión Supabase inicial:', e)
      }
    }

    checkInitialSession()

    const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profileRes = await authService.getCurrentProfile()
        if (profileRes.data) {
          setCurrentUser(profileRes.data)
          setIsLoggedIn(true)
          setActiveTab(
            isAdminUser(profileRes.data)
              ? 'admin-dashboard'
              : isSingleTenant
                ? 'cliente-dashboard'
                : 'saas-directorio'
          )
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setIsLoggedIn(false)
      }
    })

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe?.()
    }
  }, [isSingleTenant])

  const userIsAdmin = isAdminUser(currentUser)
  const isInClientPreview =
    userIsAdmin &&
    (resolvedActiveTab.startsWith('cliente-') || resolvedActiveTab === 'saas-directorio')

  const showClientMapTab =
    verticalConfig.showBicycleMap ||
    verticalConfig.showResourceMap ||
    verticalConfig.showCourtManagement

  const navigationSections = useMemo<SidebarNavSection[]>(() => {
    const portalClienteItems: SidebarNavSection['items'] = [
      ...(!isSingleTenant
        ? [{ id: 'saas-directorio', label: 'Directorio Estudios', icon: Building2 }]
        : []),
      { id: 'cliente-dashboard', label: 'Mi Dashboard', icon: Ticket },
      ...(showClientMapTab
        ? [
          {
            id: 'cliente-mapa',
            label: verticalConfig.navMapaLabel,
            icon: verticalConfig.showBicycleMap ? Bike : MapPin,
          },
        ]
        : []),
      {
        id: 'cliente-planes',
        label: verticalConfig.enableTiqueteras
          ? `Comprar ${verticalConfig.navPlanesLabel}`
          : 'Comprar Servicios',
        icon: ShoppingCart,
      },
    ]

    const adminItems: SidebarNavSection['items'] = [
      { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        id: 'admin-reservas',
        label:
          verticalConfig.sesionSingular === 'Cita' || verticalConfig.sesionSingular === 'Consulta'
            ? `Agenda de ${verticalConfig.sesionPlural}`
            : `Reservas y ${verticalConfig.sesionPlural}`,
        icon: CalendarCheck,
      },
      { id: 'admin-clientes', label: verticalConfig.clientePlural, icon: Users },
      ...(verticalConfig.enablePlanificaciones
        ? [
          {
            id: 'admin-planificaciones',
            label: verticalConfig.navPlanificacionesLabel,
            icon: ClipboardList,
          },
        ]
        : []),
      { id: 'admin-planes', label: verticalConfig.navPlanesLabel, icon: Package },
      ...(verticalConfig.enableTiqueteras
        ? [
          {
            id: 'admin-asignar-planes',
            label: verticalConfig.navAsignarPlanesLabel,
            icon: UserPlus,
          },
        ]
        : []),
      { id: 'admin-gamificacion', label: 'Gamificación y XP', icon: Trophy },
      { id: 'admin-pagos', label: 'Pagos', icon: CheckSquare },
      ...(verticalConfig.enableAsistenciasQR
        ? [{ id: 'admin-asistencias', label: verticalConfig.navAsistenciasLabel, icon: QrCode }]
        : []),
      ...(verticalConfig.showBicycleMap
        ? [{ id: 'admin-bicicletas', label: 'Bicicletas', icon: Bike }]
        : []),
      ...(verticalConfig.showCourtManagement
        ? [{ id: 'admin-canchas', label: 'Gestión de Canchas', icon: LayoutGrid }]
        : []),
    ]

    const operacionItems: SidebarNavSection['items'] = [
      { id: 'admin-caja', label: 'Caja', icon: Wallet },
      { id: 'admin-branding', label: 'Marca Blanca', icon: Sliders },
    ]

    // Si el usuario es Administrador:
    if (userIsAdmin) {
      if (isInClientPreview) {
        // En modo vista previa, mostramos el portal de cliente para que pueda interactuar y el panel admin
        return [
          { title: 'Vista Previa Alumno', items: portalClienteItems },
          { title: 'Administración', items: adminItems },
          { title: 'Operación y Marca', items: operacionItems },
        ]
      }
      // Menú limpio de administración: oculta completamente la sección PORTAL CLIENTE
      return [
        { title: 'Administración', items: adminItems },
        { title: 'Operación y Marca', items: operacionItems },
      ]
    }

    // Si es un cliente regular
    return [{ title: 'Portal Cliente', items: portalClienteItems }]
  }, [showClientMapTab, verticalConfig, userIsAdmin, isInClientPreview, isSingleTenant])

  const handleAuthSuccess = (profile: Tables<'perfiles'> | null) => {
    setCurrentUser(profile)
    setIsLoggedIn(true)
    setActiveTab(isAdminUser(profile) ? 'admin-dashboard' : defaultClientTab)
  }

  const handleSkipToDemo = (rol: 'cliente' | 'admin') => {
    if (rol === 'admin') {
      setCurrentUser(mockAdminProfile)
      setIsLoggedIn(true)
      setActiveTab('admin-dashboard')
    } else {
      setCurrentUser(mockClienteProfile)
      setIsLoggedIn(true)
      setActiveTab(defaultClientTab)
    }
  }

  const handleSignOut = () => {
    void authService.signOut().catch(() => { })
    setCurrentUser(null)
    setIsLoggedIn(false)
    setActiveTab(defaultClientTab)
  }

  // Si no está autenticado:
  // En modo single-tenant mostramos la vista a pantalla completa con la marca exclusiva del estudio
  // En app móvil nativa (Capacitor) mostramos AuthView a pantalla completa con opción de ver presentación
  // En web mostramos la Landing Comercial general Reserly
  if (!isLoggedIn) {
    if (isSingleTenant) {
      return (
        <AuthView
          initialMode="signin"
          onAuthSuccess={handleAuthSuccess}
          onSkipToDemo={handleSkipToDemo}
        />
      )
    }

    // Experiencia nativa Capacitor: Inicio de sesión / registro directo en pantalla completa
    if (isNative && !showPresentationLanding) {
      return (
        <AuthView
          initialMode="signin"
          onAuthSuccess={handleAuthSuccess}
          onSkipToDemo={handleSkipToDemo}
          onClose={() => setShowPresentationLanding(true)}
        />
      )
    }

    return (
      <LandingReserlyView
        onAuthSuccess={handleAuthSuccess}
        onSkipToDemo={handleSkipToDemo}
        onBackToAuth={isNative ? () => setShowPresentationLanding(false) : undefined}
      />
    )
  }

  return (
    <SidebarLayout
      sections={navigationSections}
      activeTab={resolvedActiveTab}
      onSelectTab={(tabId) => setActiveTab(tabId as TabMode)}
      currentUser={currentUser}
      onSignOut={handleSignOut}
      onLogoClick={() => setActiveTab(userIsAdmin ? 'admin-dashboard' : defaultClientTab)}
      headerActions={
        <div className="flex items-center gap-2">
          {userIsAdmin ? (
            resolvedActiveTab.startsWith('admin-') ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('cliente-mapa')}
                className="h-8 text-xs font-semibold gap-1.5 border-dashed border-primary/60 text-foreground hover:bg-primary/10 shadow-xs"
                title="Previsualizar el mapa y reservas tal como las ve un alumno"
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Vista previa Alumno</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setActiveTab('admin-dashboard')}
                className="h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                title="Salir de la vista previa y regresar al panel administrativo"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Administración</span>
              </Button>
            )
          ) : (
            !isSingleTenant &&
            resolvedActiveTab !== 'saas-directorio' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('saas-directorio')}
                className="h-8 text-xs font-semibold gap-1.5"
                title="Explorar directorio y elegir otro estudio"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Cambiar de Estudio</span>
              </Button>
            )
          )}
        </div>
      }
      footer={
        <footer className="border-t py-4 px-4 text-center text-xs text-muted-foreground mt-auto bg-card/30">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Sparkles className={`w-3.5 h-3.5 ${currentPalette.textClass} shrink-0`} />
            <span>
              {studioName} ({verticalConfig.etiquetaNegocio}) —{' '}
              {isSingleTenant
                ? 'Portal Exclusivo de Marca'
                : 'Reservas Multi-Tenant en React 19 + TypeScript + Tailwind CSS v4 + Supabase RPC'}
            </span>
          </div>
        </footer>
      }
    >
      <Suspense fallback={<ViewSuspenseFallback />}>
        {/* Vista: Directorio SaaS de Estudios (landing por defecto para alumnos solo en multi-tenant) */}
        {!isSingleTenant && resolvedActiveTab === 'saas-directorio' && (
          <EstudiosDirectoryView
            allowCreateStudio={userIsAdmin}
            onEstudioSeleccionado={(estudio) => {
              const nextConfig = getConfiguracionVertical(estudio.tipo_negocio)
              const hasMap =
                nextConfig.showBicycleMap ||
                nextConfig.showResourceMap ||
                nextConfig.showCourtManagement
              setActiveTab(hasMap ? 'cliente-mapa' : 'cliente-dashboard')
            }}
            onVolver={() => setActiveTab('cliente-dashboard')}
          />
        )}

        {/* Vista: Dashboard del Cliente */}
        {resolvedActiveTab === 'cliente-dashboard' && (
          <ClientDashboard
            currentUser={currentUser}
            onNavigateToBooking={() =>
              setActiveTab(showClientMapTab ? 'cliente-mapa' : 'cliente-planes')
            }
            onNavigateToPlanes={() => setActiveTab('cliente-planes')}
            onNavigateToDirectory={
              !isSingleTenant ? () => setActiveTab('saas-directorio') : undefined
            }
            onSignOut={handleSignOut}
          />
        )}

        {/* Vista: Mapa Interactivo de Recursos / Puestos */}
        {resolvedActiveTab === 'cliente-mapa' && (
          <IndoorBikeMap
            currentUser={currentUser}
            onReservaCompletada={() => {
              setActiveTab('cliente-dashboard')
            }}
            onVolverAlDashboard={() => setActiveTab('cliente-dashboard')}
            onCambiarEstudio={
              !isSingleTenant ? () => setActiveTab('saas-directorio') : undefined
            }
          />
        )}

        {/* Vista: Compra de Planes y Pagos Nequi/Wompi */}
        {resolvedActiveTab === 'cliente-planes' && (
          <PlanesPagosView
            currentUser={currentUser}
            onVolver={() => setActiveTab('cliente-dashboard')}
            onPagoCompletado={() => setActiveTab('cliente-dashboard')}
          />
        )}

        {/* Vistas Administrativas */}
        {resolvedActiveTab === 'admin-dashboard' && (
          <AdminDashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            currentUser={currentUser}
          />
        )}

        {(resolvedActiveTab === 'admin-reservas' || resolvedActiveTab === 'admin-calendario') && (
          <CalendarView />
        )}

        {resolvedActiveTab === 'admin-clientes' && <ClientsView adminId={currentUser?.id} />}

        {resolvedActiveTab === 'admin-planificaciones' && verticalConfig.enablePlanificaciones && (
          <PlanificacionesView empresaId={empresaId} />
        )}

        {resolvedActiveTab === 'admin-planes' && <PlanesAdminView />}

        {resolvedActiveTab === 'admin-gamificacion' && <GamificacionAdminView />}

        {resolvedActiveTab === 'admin-asignar-planes' && verticalConfig.enableTiqueteras && (
          <>
            <AdminSectionBanner
              title={verticalConfig.navAsignarPlanesLabel}
              description={`Selecciona un ${verticalConfig.clienteSingular.toLowerCase()} para acreditar manualmente un plan o tiquetera.`}
            />
            <ClientsView adminId={currentUser?.id} />
          </>
        )}

        {resolvedActiveTab === 'admin-pagos' && <PaymentValidation adminId={currentUser?.id} />}

        {resolvedActiveTab === 'admin-asistencias' && verticalConfig.enableAsistenciasQR && (
          <CalendarView />
        )}

        {resolvedActiveTab === 'admin-bicicletas' && verticalConfig.showBicycleMap && (
          <>
            <AdminSectionBanner
              title={`Flota de ${estudioActivo?.capacidad_sala || 15} ${verticalConfig.recursoPlural}`}
              description={`Monitorea y gestiona el inventario de ${verticalConfig.recursoCortoPlural}, estados de mantenimiento y capacidad activa en ${verticalConfig.espacio.toLowerCase()}.`}
            />
            <BicicletasAdminView />
          </>
        )}

        {resolvedActiveTab === 'admin-canchas' && verticalConfig.showCourtManagement && (
          <CalendarView />
        )}

        {resolvedActiveTab === 'admin-caja' && (
          <CashRegister
            responsableNombre={currentUser?.nombre_completo || 'Administrador General'}
            usuarioId={currentUser?.id || null}
          />
        )}

        {resolvedActiveTab === 'admin-branding' && <BrandSettingsView />}
      </Suspense>
    </SidebarLayout>
  )
}

export function App() {
  return (
    <BrandingProvider>
      <MainApp />
      <Toaster />
    </BrandingProvider>
  )
}

export default App
