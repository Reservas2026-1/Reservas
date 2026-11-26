import { useState, useEffect, Suspense, lazy } from 'react'
import {
  Bike,
  LayoutDashboard,
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
  Clock,
  ClipboardList,
  Package,
  UserPlus,
  QrCode,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/toaster'
import { BrandingProvider, useBranding } from '@/context/BrandingContext'
import { BrandingToolbar } from '@/components/ui/branding-toolbar'
import SidebarLayout, { type SidebarNavSection } from '@/components/layout/SidebarLayout'
import { AuthView } from '@/components/auth/AuthView'
import { ClientDashboard } from '@/components/cliente/ClientDashboard'
import { authService } from '@/services/authService'
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
  | 'admin-pagos'
  | 'admin-asistencias'
  | 'admin-bicicletas'
  | 'admin-caja'
  | 'admin-branding'

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

const NAVIGATION_SECTIONS: SidebarNavSection[] = [
  {
    title: 'Portal Cliente',
    items: [
      { id: 'cliente-dashboard', label: 'Mi Dashboard', icon: Ticket },
      { id: 'cliente-mapa', label: 'Mapa 15 Bicis', icon: MapPin },
      { id: 'cliente-planes', label: 'Comprar Clases', icon: ShoppingCart },
      { id: 'saas-directorio', label: 'Directorio Estudios', icon: Building2 },
    ],
  },
  {
    title: 'Administración',
    items: [
      { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'admin-reservas', label: 'Reservas', icon: CalendarCheck },
      { id: 'admin-clientes', label: 'Clientes', icon: Users },
      { id: 'admin-calendario', label: 'Horarios y clases', icon: Clock },
      { id: 'admin-planificaciones', label: 'Planificaciones', icon: ClipboardList },
      { id: 'admin-planes', label: 'Planes', icon: Package },
      { id: 'admin-asignar-planes', label: 'Asignar planes', icon: UserPlus },
      { id: 'admin-pagos', label: 'Pagos', icon: CheckSquare },
      { id: 'admin-asistencias', label: 'Asistencias', icon: QrCode },
      { id: 'admin-bicicletas', label: 'Bicicletas', icon: Bike },
    ],
  },
  {
    title: 'Operación y Marca',
    items: [
      { id: 'admin-caja', label: 'Caja', icon: Wallet },
      { id: 'admin-branding', label: 'Marca Blanca', icon: Sliders },
    ],
  },
]

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

function MainApp() {
  const { studioName, currentPalette, empresaId } = useBranding()

  // Estado de usuario y sesión
  const [currentUser, setCurrentUser] = useState<Tables<'perfiles'> | null>(mockClienteProfile)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [activeTab, setActiveTab] = useState<TabMode>('cliente-dashboard')

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
  }, [])

  const handleAuthSuccess = (profile: Tables<'perfiles'> | null) => {
    setCurrentUser(profile || mockClienteProfile)
    setIsLoggedIn(true)
    setActiveTab('cliente-dashboard')
  }

  const handleSkipToDemo = (rol: 'cliente' | 'admin') => {
    if (rol === 'admin') {
      setCurrentUser(mockAdminProfile)
      setIsLoggedIn(true)
      setActiveTab('admin-dashboard')
    } else {
      setCurrentUser(mockClienteProfile)
      setIsLoggedIn(true)
      setActiveTab('cliente-dashboard')
    }
  }

  const handleSignOut = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setActiveTab('cliente-dashboard')
  }

  // Si no está autenticado, mostramos la pantalla de Auth
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden relative">
        {/* Fondo ambiental del estudio y líneas sutiles */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12] dark:opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: "url('/bg-studio.jpg')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(220,38,38,0.04)_50%,transparent_60%)] pointer-events-none" />

        <header className="border-b bg-card/80 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-ruedapro.png"
              alt={studioName}
              className="h-14 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight truncate block">
                {studioName}
              </span>
              <span className="text-[11px] text-muted-foreground block truncate">
                Software de Gestión &amp; Reservas
              </span>
            </div>
          </div>

          <BrandingToolbar />
        </header>

        <main className="flex-1 flex items-center justify-center p-4 relative z-10">
          <AuthView onAuthSuccess={handleAuthSuccess} onSkipToDemo={handleSkipToDemo} />
        </main>

        <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-card/80 backdrop-blur-md px-4 relative z-10">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Sparkles className={`w-3.5 h-3.5 ${currentPalette.textClass}`} />
            <span>{studioName} — Reservas Multi-Tenant con Protección Transaccional RPC</span>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <SidebarLayout
      sections={NAVIGATION_SECTIONS}
      activeTab={activeTab}
      onSelectTab={(tabId) => setActiveTab(tabId as TabMode)}
      currentUser={currentUser}
      onSignOut={handleSignOut}
      onLogoClick={() => setActiveTab('cliente-dashboard')}
      headerActions={<BrandingToolbar />}
      footer={
        <footer className="border-t py-4 px-4 text-center text-xs text-muted-foreground mt-auto bg-card/30">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Sparkles className={`w-3.5 h-3.5 ${currentPalette.textClass} shrink-0`} />
            <span>
              {studioName} — Reservas Multi-Tenant en React 19 + TypeScript + Tailwind CSS v4 + Supabase RPC
            </span>
          </div>
        </footer>
      }
    >
      <Suspense fallback={<ViewSuspenseFallback />}>
        {/* Vista: Dashboard del Ciclista */}
        {activeTab === 'cliente-dashboard' && (
          <ClientDashboard
            currentUser={currentUser}
            onNavigateToBooking={() => setActiveTab('cliente-mapa')}
            onNavigateToPlanes={() => setActiveTab('cliente-planes')}
            onSignOut={handleSignOut}
          />
        )}

        {/* Vista: Mapa Interactivo de las 15 Bicicletas */}
        {activeTab === 'cliente-mapa' && (
          <IndoorBikeMap
            currentUser={currentUser}
            onReservaCompletada={() => {
              setActiveTab('cliente-dashboard')
            }}
            onVolverAlDashboard={() => setActiveTab('cliente-dashboard')}
          />
        )}

        {/* Vista: Compra de Planes y Pagos Nequi/Wompi */}
        {activeTab === 'cliente-planes' && (
          <PlanesPagosView
            currentUser={currentUser}
            onVolver={() => setActiveTab('cliente-dashboard')}
            onPagoCompletado={() => setActiveTab('cliente-dashboard')}
          />
        )}

        {/* Vista: Directorio SaaS de Estudios y Sedes */}
        {activeTab === 'saas-directorio' && (
          <EstudiosDirectoryView
            onEstudioSeleccionado={() => setActiveTab('cliente-dashboard')}
            onVolver={() => setActiveTab('cliente-dashboard')}
          />
        )}

        {/* Vistas Administrativas */}
        {activeTab === 'admin-dashboard' && (
          <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'admin-reservas' && (
          <>
            <AdminSectionBanner
              title="Gestión de Reservas"
              description="Consulta cupos ocupados por sesión, reservas activas y asignación de bicicletas."
            />
            <CalendarView />
          </>
        )}

        {activeTab === 'admin-clientes' && <ClientsView adminId={currentUser?.id} />}

        {activeTab === 'admin-calendario' && <CalendarView />}

        {activeTab === 'admin-planificaciones' && <PlanificacionesView empresaId={empresaId} />}

        {activeTab === 'admin-planes' && <PlanesAdminView />}

        {activeTab === 'admin-asignar-planes' && (
          <>
            <AdminSectionBanner
              title="Asignar Planes y Tiqueteras"
              description="Selecciona un cliente para acreditar manualmente un plan o tiquetera."
            />
            <ClientsView adminId={currentUser?.id} />
          </>
        )}

        {activeTab === 'admin-pagos' && <PaymentValidation adminId={currentUser?.id} />}

        {activeTab === 'admin-asistencias' && (
          <>
            <AdminSectionBanner
              title="Control de Asistencias"
              description="Valida códigos QR en recepción y registra el ingreso de alumnos por clase."
            />
            <CalendarView />
          </>
        )}

        {activeTab === 'admin-bicicletas' && (
          <>
            <AdminSectionBanner
              title="Flota de 15 Bicicletas"
              description="Monitorea la disposición de puestos, ocupación en tiempo real y estado de sala."
            />
            <IndoorBikeMap
              currentUser={currentUser}
              onReservaCompletada={() => setActiveTab('admin-reservas')}
              onVolverAlDashboard={() => setActiveTab('admin-dashboard')}
            />
          </>
        )}

        {activeTab === 'admin-caja' && (
          <CashRegister
            responsableNombre={currentUser?.nombre_completo || 'Administrador General'}
            usuarioId={currentUser?.id || null}
          />
        )}

        {activeTab === 'admin-branding' && <BrandSettingsView />}
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
