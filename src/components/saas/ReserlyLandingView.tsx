import React, { useState, useRef, Suspense, lazy } from 'react'
import {
  Search,
  Sun,
  Moon,
  X,
  Sparkles,
  MessageCircle,
  Mail,
  ShieldCheck,
  Building2,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { ReserlyLogo } from './ReserlyLogo'
import { ReserlyPhoneMockup } from './ReserlyPhoneMockup'
import { AuthView } from '@/components/auth/AuthView'
import { useBranding } from '@/context/BrandingContext'
import type { Tables } from '@/types/database'

// Carga perezosa del Directorio de Estudios para no bloquear el bundle inicial
const EstudiosDirectoryView = lazy(() => import('./EstudiosDirectoryView'))

const CURRENT_YEAR = new Date().getFullYear()

interface ReserlyLandingViewProps {
  onAuthSuccess: (userProfile: Tables<'perfiles'> | null) => void
  onSkipToDemo: (rol: 'cliente' | 'admin') => void
}

export const ReserlyLandingView: React.FC<ReserlyLandingViewProps> = ({
  onAuthSuccess,
  onSkipToDemo,
}) => {
  const { isDarkMode, toggleDarkMode } = useBranding()
  const pricesRef = useRef<HTMLDivElement>(null)

  // Estados de modales
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<'LATAM' | 'USA'>('LATAM')
  const [searchQuery, setSearchQuery] = useState('')
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const scrollToPrices = () => {
    pricesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleOpenAuth = () => {
    setIsAuthModalOpen(true)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsDirectoryOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white transition-colors duration-300 relative overflow-x-hidden">
      {/* Fondo ambiental sutil con líneas arquitectónicas */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/5 dark:bg-rose-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* =========================================================================
          1. HEADER SUPERIOR
      ========================================================================= */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-4 flex items-center justify-between gap-4">
        {/* Logo Reserly.com */}
        <ReserlyLogo />

        {/* Acciones del Header: Botón Acceso y Toggle de Tema */}
        <div className="flex items-center gap-3">
          {/* Botón Acceso Cliente / Admin */}
          <button
            type="button"
            onClick={handleOpenAuth}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 shadow-sm transition-all duration-200 hover:shadow"
          >
            Acceso Cliente / Admin
          </button>

          {/* Toggle Claro / Oscuro Píldora (fiel a la referencia) */}
          <div
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 p-1 rounded-full border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 cursor-pointer shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <div
              className={`p-1.5 rounded-full transition-all ${
                !isDarkMode
                  ? 'bg-amber-400 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </div>
            <div
              className={`p-1.5 rounded-full transition-all ${
                isDarkMode
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. SECCIÓN HERO COMERCIAL
      ========================================================================= */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* COLUMNA IZQUIERDA: Titular, CTA y Precios */}
          <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
            {/* Título Principal Impactante */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
              Automatizá las reservas
              <br />
              y pagos de tu estudio.
            </h1>

            {/* Subtítulo en rojo y subtítulo aclaratorio */}
            <div className="flex flex-col gap-1 -mt-1">
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-500 tracking-tight">
                Prueba gratuita por 30 días
              </span>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                (Menos mensajes, clases organizadas y cero planillas)
              </span>
            </div>

            {/* Botones de Acción Principales */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {/* Botón Rojo Primario */}
              <button
                type="button"
                onClick={handleOpenAuth}
                className="px-6 py-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                PROBAR PARA MI ESTUDIO
              </button>

              {/* Botón Secundario Outline */}
              <button
                type="button"
                onClick={scrollToPrices}
                className="px-5 py-3.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs"
              >
                VER PRECIOS
              </button>

              {/* Botón Soy Alumno/a */}
              <button
                type="button"
                onClick={handleOpenAuth}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline transition-colors"
              >
                SOY ALUMNO/A
              </button>
            </div>

            {/* Badge / Cintillo horizontal con emojis */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs max-w-fit">
              <span className="tracking-wider uppercase text-[10px] font-black text-rose-600 dark:text-rose-400">
                SISTEMA DE RESERVAS
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="truncate">
                IDEAL PARA ESTUDIOS DE PILATES, YOGA Y POLEDANCE
              </span>
              <span className="text-sm">🧘 🤸 🏃</span>
            </div>

            {/* =========================================================================
                3. SECCIÓN DE PRECIOS (Fiel al mockup)
            ========================================================================= */}
            <div ref={pricesRef} className="pt-4 flex items-stretch gap-4 flex-wrap sm:flex-nowrap">
              {/* Tarjeta: PLAN A MEDIDA (Destacada con lengüeta roja) */}
              <div className="relative flex-1 min-w-[240px] bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/40 flex flex-col justify-between">
                {/* Lengüeta superior roja decorativa como en la imagen */}
                <div className="absolute -top-2 left-6 right-6 h-2 bg-rose-600 rounded-t-lg" />

                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                    PLAN A MEDIDA
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-1">
                    ALUMNOS ACTIVOS: 40 o menos
                  </p>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      20 USD
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      / mes
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleOpenAuth}
                    className="w-full text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center justify-between group"
                  >
                    <span>Registrar Estudio (1 mes Gratis)</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Tarjeta: PLAN A MEDIDA (PREMIUM) */}
              <div className="flex-1 min-w-[220px] bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
                    PLAN A MEDIDA
                  </h3>
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 block mt-0.5">
                    (PREMIUM)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Para cadenas, sedes ilimitadas y más de 100 alumnos activos.
                  </p>
                </div>

                <div className="mt-4 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPremiumModal(true)}
                    className="w-full py-2 px-3 rounded-full border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs tracking-tight transition-all shadow-xs"
                  >
                    VER PLAN PREMIUM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Mockup Smartphone Reserly */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <ReserlyPhoneMockup />
          </div>
        </div>
      </main>

      {/* =========================================================================
          4. FOOTER Y BUSCADOR DE LUGARES
      ========================================================================= */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-6 border-t border-slate-200/80 dark:border-slate-800/80 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Columnas de enlaces a la izquierda */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6 text-xs">
            {/* Columna NOSOTROS */}
            <div className="flex flex-col gap-2.5">
              <span className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                NOSOTROS
              </span>
              <a
                href="#protocolo"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Reserly: Plataforma SaaS multi-tenant en tiempo real para centros de fitness y bienestar.')
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                PROTOCOLO
              </a>
              <a
                href="#reserly"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToPrices()
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                SOBRE RESERLY
              </a>
              <a
                href="#blog"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Blog de innovación y tendencias para estudios de Pilates y Yoga.')
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                BLOG
              </a>
            </div>

            {/* Columna CONTACTO */}
            <div className="flex flex-col gap-2.5">
              <span className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                CONTACTO
              </span>
              <a
                href="#wonderato"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Alianza Wonderato x Reserly para pagos y automatización.')
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                WONDERATO
              </a>
              <a
                href="#soporte"
                onClick={(e) => {
                  e.preventDefault()
                  window.open('https://wa.me/?text=Hola%20Reserly,%20deseo%20información%20para%20mi%20estudio', '_blank')
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                SOPORTE 24/7
              </a>
              <a
                href="#terminos"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Términos de servicio y políticas de privacidad conformes con GDPR y regulación LATAM.')
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                TÉRMINOS
              </a>
            </div>

            {/* Columna CONSULTAS */}
            <div className="flex flex-col gap-2.5">
              <span className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                CONSULTAS
              </span>
              <a
                href="https://wa.me/?text=Hola%20Reserly,%20quiero%20probar%20la%20plataforma"
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>WHATSAPP</span>
              </a>
              <a
                href="mailto:contacto@reserly.com?subject=Consulta%20Reserly%20Estudios"
                className="text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-rose-500" />
                <span>CORREO</span>
              </a>
            </div>
          </div>

          {/* Columna Buscador de Lugares a la derecha */}
          <div className="md:col-span-5 flex flex-col items-start md:items-end gap-2.5">
            <div className="flex items-center justify-between w-full max-w-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                BUSCADOR DE LUGARES
              </span>
              {/* Tabs de región LATAM / USA */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedRegion('LATAM')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedRegion === 'LATAM'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  LATAM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRegion('USA')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedRegion === 'USA'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  USA
                </button>
              </div>
            </div>

            {/* Input de Búsqueda redondeado con lupa */}
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscador de lugares"
                className="w-full pl-9 pr-14 py-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold"
              >
                Ver
              </button>
            </form>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Pilates, Yoga, Spinning y Poledance en {selectedRegion}
            </span>
          </div>
        </div>

        {/* Barra de copyright inferior */}
        <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Reserly.com — Software de Gestión &amp; Reservas para Estudios</span>
          </div>
          <span>© {CURRENT_YEAR} Reserly Inc. Todos los derechos reservados.</span>
        </div>
      </footer>

      {/* =========================================================================
          5. MODAL DE AUTENTICACIÓN / ACCESO
      ========================================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Modal */}
            <div className="mb-4 text-center">
              <ReserlyLogo iconSize={36} showSubtitle={false} className="justify-center mb-2" />
              <h2 className="text-xl font-extrabold tracking-tight">Acceso a Reserly</h2>
              <p className="text-xs text-muted-foreground">
                Inicia sesión con tu cuenta de estudio o alumno, o utiliza un perfil demo.
              </p>
            </div>

            {/* Componente AuthView existente */}
            <AuthView
              onAuthSuccess={(profile) => {
                setIsAuthModalOpen(false)
                onAuthSuccess(profile)
              }}
              onSkipToDemo={(rol) => {
                setIsAuthModalOpen(false)
                onSkipToDemo(rol)
              }}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL DE DIRECTORIO DE ESTUDIOS
      ========================================================================= */}
      {isDirectoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[88vh] bg-card text-card-foreground rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            {/* Header del Directorio */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-card/90">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-rose-500" />
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg">Directorio de Estudios Reserly</h2>
                  <p className="text-xs text-muted-foreground">
                    Encuentra tu centro favorito de Pilates, Yoga, Barre o Cycling.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectoryOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                    <span className="text-xs font-semibold">Cargando directorio de estudios...</span>
                  </div>
                }
              >
                <EstudiosDirectoryView
                  onEstudioSeleccionado={(_estudio) => {
                    setIsDirectoryOpen(false)
                    // Abrir modal de autenticación para reservar en el estudio seleccionado
                    handleOpenAuth()
                  }}
                  onVolver={() => setIsDirectoryOpen(false)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL DETALLE PLAN PREMIUM
      ========================================================================= */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-6">
            <button
              type="button"
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-lg">PLAN A MEDIDA (PREMIUM)</h3>
                <span className="text-xs text-muted-foreground">Diseñado para estudios en expansión</span>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Alumnos activos y reservas ilimitadas sin comisiones ocultas.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Multi-sede con administración centralizada y permisos por sucursal.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Marca blanca completa: App personalizada, dominio propio y colores de marca.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Soporte prioritario y asesoría en migración de planillas y alumnos.</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPremiumModal(false)
                  window.open(
                    'https://wa.me/?text=Hola%20Reserly,%20deseo%20cotizar%20el%20Plan%20Premium%20para%20mi%20estudio',
                    '_blank'
                  )
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-tight shadow-md transition-colors text-center"
              >
                Cotizar por WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setShowPremiumModal(false)}
                className="px-4 py-2.5 rounded-xl border font-bold text-xs hover:bg-muted transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReserlyLandingView
