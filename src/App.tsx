import { useState, useEffect, Suspense, lazy } from 'react'
import {
  Bike,
  LayoutDashboard,
  Calendar as CalendarIcon,
  CheckSquare,
  Wallet,
  Sparkles,
  LogOut,
  User,
  MapPin,
  Ticket,
  Users,
  ShoppingCart,
  Loader2,
  Building2,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrandingProvider, useBranding } from '@/context/BrandingContext'
import { BrandingToolbar } from '@/components/ui/branding-toolbar'
import { AuthView } from '@/components/auth/AuthView'
import { ClientDashboard } from '@/components/cliente/ClientDashboard'
import { authService } from '@/services/authService'
import type { Tables } from '@/types/database'

// Carga diferida (React.lazy) para optimización del bundle
const IndoorBikeMap = lazy(() => import('@/components/cliente/IndoorBikeMap'))
const PlanesPagosView = lazy(() => import('@/components/cliente/PlanesPagosView'))
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'))
const CalendarView = lazy(() => import('@/components/admin/CalendarView'))
const PaymentValidation = lazy(() => import('@/components/admin/PaymentValidation'))
const CashRegister = lazy(() => import('@/components/admin/CashRegister'))
const ClientsView = lazy(() => import('@/components/admin/ClientsView'))
const EstudiosDirectoryView = lazy(() => import('@/components/saas/EstudiosDirectoryView'))
const BrandSettingsView = lazy(() => import('@/components/admin/BrandSettingsView'))

type TabMode =
  | 'cliente-dashboard'
  | 'cliente-mapa'
  | 'cliente-planes'
  | 'saas-directorio'
  | 'admin-dashboard'
  | 'admin-calendario'
  | 'admin-pagos'
  | 'admin-caja'
  | 'admin-clientes'
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

function MainApp() {
  const { studioName, currentPalette, logoUrl } = useBranding()

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
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <header className="border-b bg-card/60 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl ${currentPalette.bgClass} text-white flex items-center justify-center shadow-md`}
            >
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight">{studioName}</span>
              <span className="text-[11px] text-muted-foreground block">
                Indoor Cycling & Booking System
              </span>
            </div>
          </div>

          <BrandingToolbar />
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <AuthView onAuthSuccess={handleAuthSuccess} onSkipToDemo={handleSkipToDemo} />
        </main>

        <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-card/30">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${currentPalette.textClass}`} />
            <span>{studioName} — Reservas Multi-Tenant con Protección Transaccional RPC</span>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header / Navbar Principal con Branding Dinámico */}
      <header className="border-b bg-card/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo y Nombre del Estudio */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => setActiveTab('cliente-dashboard')}
          >
            <div
              className={`w-10 h-10 rounded-xl ${currentPalette.bgClass} text-white flex items-center justify-center shadow-md shadow-red-500/10 transition-transform hover:scale-105 overflow-hidden p-1`}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={studioName}
                  className="max-h-full max-w-full object-contain drop-shadow-xs"
                />
              ) : (
                <Bike className="w-6 h-6" />
              )}
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-base leading-none flex items-center gap-2">
                {studioName}
                <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                  15 Bicis
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">Sistema de Indoor Cycling</span>
            </div>
          </div>

          {/* Selector de Vistas / Navegación */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {/* Vistas de Cliente */}
            <Button
              variant={activeTab === 'cliente-dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('cliente-dashboard')}
              className={`gap-1.5 text-xs font-semibold ${
                activeTab === 'cliente-dashboard' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Mi Dashboard</span>
            </Button>

            <Button
              variant={activeTab === 'cliente-mapa' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('cliente-mapa')}
              className={`gap-1.5 text-xs font-semibold ${
                activeTab === 'cliente-mapa' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Mapa 15 Bicis</span>
            </Button>

            <Button
              variant={activeTab === 'cliente-planes' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('cliente-planes')}
              className={`gap-1.5 text-xs font-semibold ${
                activeTab === 'cliente-planes' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Comprar Clases</span>
            </Button>

            <Button
              variant={activeTab === 'saas-directorio' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('saas-directorio')}
              className={`gap-1.5 text-xs font-semibold ${
                activeTab === 'saas-directorio' ? `${currentPalette.bgClass} text-white` : ''
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Directorio Estudios</span>
            </Button>

            <div className="h-4 w-px bg-border mx-1 hidden md:block" />

            {/* Vistas Administrativas */}
            <Button
              variant={activeTab === 'admin-dashboard' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin-dashboard')}
              className={`gap-1.5 text-xs ${
                activeTab === 'admin-dashboard' ? 'ring-1 ring-border font-semibold' : ''
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin</span>
            </Button>

            <Button
              variant={activeTab === 'admin-calendario' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin-calendario')}
              className={`gap-1.5 text-xs ${
                activeTab === 'admin-calendario' ? 'ring-1 ring-border font-semibold' : ''
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Calendario</span>
            </Button>

            <Button
              variant={activeTab === 'admin-pagos' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin-pagos')}
              className={`gap-1.5 text-xs ${
                activeTab === 'admin-pagos' ? 'ring-1 ring-border font-semibold' : ''
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Validar Pagos</span>
            </Button>

            <Button
              variant={activeTab === 'admin-caja' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin-caja')}
              className={`gap-1.5 text-xs ${
                activeTab === 'admin-caja' ? 'ring-1 ring-border font-semibold' : ''
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Caja</span>
            </Button>

            <Button
              variant={activeTab === 'admin-clientes' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin-clientes')}
              className={`gap-1.5 text-xs ${
                activeTab === 'admin-clientes' ? 'ring-1 ring-border font-semibold' : ''
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Clientes</span>
            </Button>

            <Button
              variant={activeTab === 'admin-branding' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin-branding')}
              className={`gap-1.5 text-xs ${
                activeTab === 'admin-branding' ? 'ring-1 ring-border font-semibold' : ''
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Marca Blanca</span>
            </Button>
          </nav>

          {/* Herramientas de Marca Blanca y Usuario */}
          <div className="flex items-center gap-2">
            <BrandingToolbar />

            {/* Avatar / Usuario */}
            <div className="flex items-center gap-1.5 pl-1 border-l">
              <div
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground"
                title={currentUser?.nombre_completo || 'Usuario'}
              >
                {currentUser?.nombre_completo ? (
                  currentUser.nombre_completo.charAt(0)
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Área de Contenido Principal con Suspense */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          {activeTab === 'admin-calendario' && <CalendarView />}
          {activeTab === 'admin-pagos' && <PaymentValidation />}
          {activeTab === 'admin-caja' && <CashRegister />}
          {activeTab === 'admin-clientes' && <ClientsView />}
          {activeTab === 'admin-branding' && <BrandSettingsView />}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground mt-auto bg-card/30">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className={`w-3.5 h-3.5 ${currentPalette.textClass}`} />
          <span>
            {studioName} — Reservas Multi-Tenant en React 19 + TypeScript + Tailwind CSS v4 + Supabase RPC
          </span>
        </div>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <BrandingProvider>
      <MainApp />
    </BrandingProvider>
  )
}

export default App