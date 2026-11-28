import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Rocket,
  Sun,
  Moon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  CreditCard,
  Users,
  Clock,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  HeartPulse,
  Dumbbell,
  Scissors,
  Stethoscope,
  Phone,
  Mail,
  Send,
} from 'lucide-react'
import { useBranding } from '@/context/BrandingContext'
import { AuthView } from '@/components/auth/AuthView'
import type { Tables } from '@/types/database'
import { ReserlyLogo } from './ReserlyLogo'
import { ReserlyModulesViewer } from './ReserlyModulesViewer'
import { ReserlyImpactBento } from './ReserlyImpactBento'
import { ReserlyPhoneMockup } from './ReserlyPhoneMockup'
import { ScrollReveal } from './ScrollReveal'

interface LandingReserlyViewProps {
  onAuthSuccess: (userProfile: Tables<'perfiles'> | null) => void
  onSkipToDemo: (rol: 'cliente' | 'admin') => void
  onBackToAuth?: () => void
}

type VerticalRubro =
  | 'spinning'
  | 'pilates'
  | 'yoga'
  | 'gimnasio'
  | 'belleza'
  | 'consultorio'

interface VerticalItem {
  id: VerticalRubro
  title: string
  subtitle: string
  image: string
  badge: string
  icon: React.ElementType
  features: {
    title: string
    description: string
  }[]
  previewSummary: string
  highlightMetric: string
}

const VERTICALES: VerticalItem[] = [
  {
    id: 'spinning',
    title: 'Spinning / Ciclismo indoor',
    subtitle: 'Distribución espacial de bicicletas y métricas de rendimiento',
    image: '/Sppining.png',
    badge: 'Ciclismo de Alta Intensidad',
    icon: Activity,
    previewSummary:
      'Mapa interactivo de sala 3x5 de bicicletas numeradas, control de potencia, cadencia y selección de asiento en tiempo real.',
    highlightMetric: 'Bicis en tiempo real',
    features: [
      {
        title: 'Mapa interactivo de sala 3x5',
        description: 'Visualización gráfica de las 15 posiciones en cabina con estado disponible, reservado o en mantenimiento.',
      },
      {
        title: 'Selección de bici en tiempo real',
        description: 'Los alumnos eligen exactamente su número de bicicleta favorito con bloqueo anti-colisión.',
      },
      {
        title: 'Métricas de cadencia y potencia',
        description: 'Registro de desempeño del pelotón y seguimiento de instructores líderes de clase.',
      },
      {
        title: 'Listas de espera automáticas',
        description: 'Si la clase se llena, los cupos cancelados se reasignan en orden de prelación.',
      },
    ],
  },
  {
    id: 'pilates',
    title: 'Pilates Reformer & Mat',
    subtitle: 'Gestión precisa de reformers y tiqueteras de créditos',
    image: '/Pilates.png',
    badge: 'Bienestar & Postura',
    icon: Layers,
    previewSummary:
      'Control riguroso de cupos por reformer, tiqueteras prepago de 4, 8 o 12 sesiones con caducidad automática.',
    highlightMetric: 'Aforo controlado por máquina',
    features: [
      {
        title: 'Control de tiqueteras y créditos',
        description: 'Descuento atómico de créditos con validación de vigencia de paquetes de sesiones.',
      },
      {
        title: 'Cupos limitados por clase',
        description: 'Aforo exacto según número de reformers disponibles para garantizar atención personalizada.',
      },
      {
        title: 'Listas de espera inteligentes',
        description: 'Notificación instantánea a alumnos en fila cuando se libera un cupo de último minuto.',
      },
      {
        title: 'Niveles principiante / avanzado',
        description: 'Filtrado de clases según nivel de habilidad y condición física de los practicantes.',
      },
    ],
  },
  {
    id: 'yoga',
    title: 'Yoga & Meditación',
    subtitle: 'Talleres, membresías ilimitadas y pase de asistencia por QR',
    image: '/yoga.png',
    badge: 'Mente & Cuerpo',
    icon: HeartPulse,
    previewSummary:
      'Membresías ilimitadas, programación de instructores, control de acceso por QR y talleres especiales de fin de semana.',
    highlightMetric: 'Acceso exprés con QR',
    features: [
      {
        title: 'Talleres y membresías ilimitadas',
        description: 'Configura pases mensuales, trimestrales o pases libres para todas las disciplinas.',
      },
      {
        title: 'Control de asistencia por QR',
        description: 'Validación en la entrada del salón en menos de 2 segundos desde el móvil del alumno.',
      },
      {
        title: 'Programación de instructores',
        description: 'Asignación visual de salones, tipos de yoga (Vinyasa, Hatha, Kundalini) y horarios.',
      },
      {
        title: 'Aforo de esterillas por sala',
        description: 'Visualización clara del cupo máximo por salón para garantizar comodidad y serenidad.',
      },
    ],
  },
  {
    id: 'gimnasio',
    title: 'Gimnasio / Entrenamiento',
    subtitle: 'Pases libres, franjas horarias y control de aforo por hora',
    image: '/Gym.png',
    badge: 'Fuerza & Rendimiento',
    icon: Dumbbell,
    previewSummary:
      'Pases mensuales, control de aforo por hora para evitar congestiones y validación veloz de membresías activas.',
    highlightMetric: 'Monitoreo de aforo 24/7',
    features: [
      {
        title: 'Pases libres y mensuales',
        description: 'Planes recurrentes con cobros automáticos y fechas de corte claramente comunicadas.',
      },
      {
        title: 'Control de aforo por franja horaria',
        description: 'Configura límites de personas por hora pico para garantizar entrenamiento fluido.',
      },
      {
        title: 'Validación rápida en recepción',
        description: 'Búsqueda por documento, código de barra o escaneo rápido para agilizar el ingreso.',
      },
      {
        title: 'Bloqueo automático por mora',
        description: 'Alertas en pantalla si el alumno tiene pagos pendientes o mensualidad vencida.',
      },
    ],
  },
  {
    id: 'belleza',
    title: 'Salón de belleza & Spa',
    subtitle: 'Agenda por estilista, duración inteligente y asignación de sillones',
    image: '/Salon-de-Belleza.png',
    badge: 'Estética & Cuidado',
    icon: Scissors,
    previewSummary:
      'Agenda segmentada por profesional, cálculo dinámico de duración según servicio y asignación de cabina o sillón.',
    highlightMetric: 'Cero tiempos muertos',
    features: [
      {
        title: 'Agenda por profesional / estilista',
        description: 'Horarios individualizados para cada miembro del equipo con sus servicios autorizados.',
      },
      {
        title: 'Duración automática del servicio',
        description: 'Corte (30 min), tinte (90 min), peinado (45 min) calculados sin sobreposiciones.',
      },
      {
        title: 'Asignación de cabina o sillón',
        description: 'Evita colisiones en el uso de espacios compartidos como lava-cabezas o cabinas de spa.',
      },
      {
        title: 'Recordatorios automáticos',
        description: 'Notificaciones claras que reducen hasta en un 80% las citas olvidadas.',
      },
    ],
  },
  {
    id: 'consultorio',
    title: 'Consultorio profesional',
    subtitle: 'Citas médicas o terapéuticas, ficha de paciente y cobro seguro',
    image: '/Consulta_profesional.png',
    badge: 'Salud & Asesoría',
    icon: Stethoscope,
    previewSummary:
      'Intervalos personalizados por tipo de consulta, registro de ficha básica del paciente y confirmación de pago anticipado.',
    highlightMetric: 'Confidencialidad & Puntualidad',
    features: [
      {
        title: 'Agenda médica con intervalos',
        description: 'Bloques de 20, 40 o 60 minutos con tiempos de sanitización y descanso entre consultas.',
      },
      {
        title: 'Ficha de paciente centralizada',
        description: 'Historial de citas anteriores, observaciones confidenciales y datos de contacto directo.',
      },
      {
        title: 'Cobro de consulta anticipado',
        description: 'Garantiza la asistencia exigiendo comprobante de pago o pasarela para confirmar turno.',
      },
      {
        title: 'Reprogramación flexible',
        description: 'Permite al paciente cambiar su cita con las políticas de anticipación que definas.',
      },
    ],
  },
]

export const LandingReserlyView: React.FC<LandingReserlyViewProps> = ({
  onAuthSuccess,
  onSkipToDemo,
  onBackToAuth,
}) => {
  const { isDarkMode, toggleDarkMode } = useBranding()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'register-studio'>('signin')
  const [authInitialRubro, setAuthInitialRubro] = useState<string | undefined>(undefined)
  const [selectedRubro, setSelectedRubro] = useState<VerticalRubro>('spinning')
  const [isVerticalPanelOpen, setIsVerticalPanelOpen] = useState<boolean>(true)
  const [contactSent, setContactSent] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')

  const [activeSection, setActiveSection] = useState<string>('inicio')

  const verticalCarouselRef = useRef<HTMLDivElement>(null)
  const verticalTimerRef = useRef<NodeJS.Timeout | null>(null)

  const activeVerticalIndex = VERTICALES.findIndex((v) => v.id === selectedRubro)
  const activeVertical =
    VERTICALES.find((v) => v.id === selectedRubro) || VERTICALES[0]

  // Reiniciar el temporizador de 10 segundos para el carrusel de verticales
  const resetVerticalTimer = useCallback(() => {
    if (verticalTimerRef.current) {
      clearInterval(verticalTimerRef.current)
    }
    verticalTimerRef.current = setInterval(() => {
      setSelectedRubro((prevRubro) => {
        const curIdx = VERTICALES.findIndex((v) => v.id === prevRubro)
        const nextIdx = (curIdx + 1) % VERTICALES.length
        return VERTICALES[nextIdx].id
      })
    }, 10000)
  }, [])

  useEffect(() => {
    resetVerticalTimer()
    return () => {
      if (verticalTimerRef.current) {
        clearInterval(verticalTimerRef.current)
      }
    }
  }, [resetVerticalTimer])

  // Desplazar automáticamente la tarjeta activa visible en el carrusel
  useEffect(() => {
    if (verticalCarouselRef.current && activeVerticalIndex >= 0) {
      const container = verticalCarouselRef.current
      const card = container.children[activeVerticalIndex] as HTMLElement
      if (card) {
        const containerLeft = container.getBoundingClientRect().left
        const cardLeft = card.getBoundingClientRect().left
        const offset = cardLeft - containerLeft - 16
        container.scrollBy({ left: offset, behavior: 'smooth' })
      }
    }
  }, [activeVerticalIndex])

  const handleSelectRubro = (rubroId: VerticalRubro) => {
    if (selectedRubro === rubroId) {
      setIsVerticalPanelOpen((prev) => !prev)
    } else {
      setSelectedRubro(rubroId)
      setIsVerticalPanelOpen(true)
    }
    resetVerticalTimer()
  }

  const handlePrevVertical = () => {
    const prevIdx = (activeVerticalIndex - 1 + VERTICALES.length) % VERTICALES.length
    setSelectedRubro(VERTICALES[prevIdx].id)
    setIsVerticalPanelOpen(true)
    resetVerticalTimer()
  }

  const handleNextVertical = () => {
    const nextIdx = (activeVerticalIndex + 1) % VERTICALES.length
    setSelectedRubro(VERTICALES[nextIdx].id)
    setIsVerticalPanelOpen(true)
    resetVerticalTimer()
  }

  useEffect(() => {
    const sectionIds = ['inicio', 'funciones', 'precios', 'nosotros', 'contacto']

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200
      let current = 'inicio'

      for (const sectionId of sectionIds) {
        const el = document.getElementById(sectionId)
        if (el) {
          const top = el.offsetTop
          if (scrollPosition >= top) {
            current = sectionId
          }
        }
      }

      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const openAuthModal = (mode: 'signin' | 'register-studio' = 'signin', rubro?: string) => {
    setAuthInitialMode(mode)
    setAuthInitialRubro(rubro)
    setIsAuthOpen(true)
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSent(true)
    setTimeout(() => {
      setContactSent(false)
      setContactName('')
      setContactEmail('')
      setContactMessage('')
    }, 4000)
  }

  const navLinks = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'funciones', label: 'Funciones' },
    { id: 'precios', label: 'Precios' },
    { id: 'contacto', label: 'Contacto' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* =========================================================================
          1. HEADER NAVEGACIÓN (Sin border-b para transición fluida con el Hero)
      ========================================================================= */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#070B14]/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo con alto contraste para claro y oscuro */}
          <ReserlyLogo
            showSubtitle={true}
            onClick={() => scrollTo('inicio')}
            className="cursor-pointer"
          />

          {/* Menú de navegación centrado con subrayado activo */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollTo(link.id)}
                  className={`transition-colors cursor-pointer pb-1 ${isActive
                    ? 'border-b-2 border-red-600 text-red-600 font-semibold'
                    : 'border-b-2 border-transparent text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-medium'
                    }`}
                >
                  {link.label}
                </button>
              )
            })}
          </nav>

          {/* Acciones a la derecha */}
          <div className="flex items-center gap-3">
            {/* Toggle Modo Claro / Oscuro */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Cambiar modo de color"
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="hidden sm:inline">Oscuro</span>
                </>
              )}
            </button>

            {/* Botón Volver a Iniciar Sesión si viene de app móvil nativa */}
            {onBackToAuth && (
              <button
                type="button"
                onClick={onBackToAuth}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all cursor-pointer shadow-xs"
                title="Volver a la pantalla de acceso de la app"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
            )}

            {/* Botón Acceso Clientes */}
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Acceso clientes</span>
            </button>

            {/* Botón Prueba Gratis (Rojo Sólido #DC2626) */}
            <button
              type="button"
              onClick={() => openAuthModal('register-studio')}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Prueba gratis</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* =========================================================================
            2. SECCIÓN HERO (PORTADA PRINCIPAL - id="inicio")
        ========================================================================= */}
        <section
          id="inicio"
          className="relative overflow-hidden pt-4 pb-10 sm:pt-10 sm:pb-16 md:pt-14 md:pb-18 bg-gradient-to-b from-slate-50/60 via-white to-white dark:from-[#070B14] dark:via-[#070B14] dark:to-[#0F172A]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Columna Izquierda: Mensaje y Acciones en orden estricto móvil */}
              <ScrollReveal direction="up" className="lg:col-span-5 space-y-4 sm:space-y-6 text-center lg:text-left">
                {/* 1) Título equilibrado */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.14]">
                  Automatiza tus{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-500">
                    reservas y pagos
                  </span>
                </h1>

                {/* 2) En móvil (< lg): Tarjeta horizontal del navegador inmediatamente debajo del título */}
                <div className="block lg:hidden my-3 sm:my-5">
                  <ReserlyPhoneMockup />
                </div>

                {/* 3) Subtítulo más compacto */}
                <p className="text-sm sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 font-normal">
                  Gestiona horarios, clientes, espacios, clases y servicios desde
                  una sola plataforma intuitiva y optimizada para convertir visitantes
                  en reservas confirmadas.
                </p>

                {/* 4) Botones uno al lado del otro en móvil (grid-cols-2 gap-2.5) */}
                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row items-center justify-center lg:justify-start sm:gap-4 pt-1 sm:pt-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal('register-studio')}
                    className="h-10 sm:h-auto text-xs sm:text-base font-semibold sm:font-bold px-3 sm:px-7 sm:py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Prueba gratis</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollTo('precios')}
                    className="h-10 sm:h-auto text-xs sm:text-base font-semibold px-3 sm:px-6 sm:py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-all flex items-center justify-center cursor-pointer"
                  >
                    <span>Conoce los planes</span>
                  </button>
                </div>

                {/* 5) Tres checks compactos y elegantes */}
                <div className="pt-3 sm:pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] sm:text-xs flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1 sm:gap-6 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                    <span>Sin tarjeta requerida</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                    <span>Configuración en 5 minutos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                    <span>Soporte prioritario en español</span>
                  </div>
                </div>
              </ScrollReveal>

              {/* Columna Derecha en escritorio (>= lg): Mockup Tarjeta Horizontal */}
              <ScrollReveal direction="up" delay={150} className="hidden lg:flex lg:col-span-7 relative justify-center items-center">
                <ReserlyPhoneMockup />
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. SECCIÓN MULTI-VERTICAL (id="funciones") - CARRUSEL AUTOMÁTICO 10S
        ========================================================================= */}
        <section
          id="funciones"
          className="py-10 md:py-16 bg-slate-50 dark:bg-[#070B14] border-y border-slate-200 dark:border-slate-800 transition-colors"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal direction="up" className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                Multi-Industria & Especializada
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Una plataforma para diferentes negocios
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Ideal para estudios, gimnasios, centros de bienestar, salones,
                consultorios y más. Cada vertical cuenta con flujos diseñados a la medida.
              </p>
            </ScrollReveal>

            {/* Barra de controles del carrusel: Flechas y Dots indicadores */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {activeVerticalIndex + 1} de {VERTICALES.length}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                  • {activeVertical.title}
                </span>
              </div>

              {/* Controles de avance y puntos */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {VERTICALES.map((rubro) => {
                    const isSelected = selectedRubro === rubro.id
                    return (
                      <button
                        key={rubro.id}
                        type="button"
                        onClick={() => handleSelectRubro(rubro.id)}
                        aria-label={`Ver ${rubro.title}`}
                        className={`transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'w-6 h-2 bg-red-600 rounded-full shadow-xs'
                            : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 rounded-full hover:bg-slate-400'
                        }`}
                      />
                    )
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevVertical}
                    aria-label="Vertical anterior"
                    className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextVertical}
                    aria-label="Vertical siguiente"
                    className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Carrusel horizontal continuo con snap manual y auto-avance */}
            <div
              ref={verticalCarouselRef}
              className="overflow-x-auto snap-x snap-mandatory scrollbar-none flex gap-3.5 sm:gap-4 pb-3 pt-1 px-1 -mx-4 sm:mx-0 px-4 sm:px-0"
            >
              {VERTICALES.map((rubro) => {
                const isSelected = selectedRubro === rubro.id
                return (
                  <button
                    key={rubro.id}
                    type="button"
                    onClick={() => handleSelectRubro(rubro.id)}
                    aria-expanded={isSelected && isVerticalPanelOpen}
                    className={`relative h-56 sm:h-64 w-[74%] sm:w-[46%] md:w-[31%] lg:w-[calc(16.666%-14px)] shrink-0 snap-center rounded-3xl overflow-hidden border-2 text-left transition-all duration-300 group cursor-pointer ${
                      isSelected
                        ? 'border-red-600 ring-2 ring-red-600/40 shadow-xl scale-[1.02]'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-700 hover:scale-[1.01] shadow-md'
                    }`}
                  >
                    <img
                      src={rubro.image}
                      alt={rubro.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Degradado oscuro inferior para contraste óptimo */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
                        isSelected
                          ? 'from-slate-950/95 via-slate-950/50 to-black/15'
                          : 'from-slate-950/90 via-slate-950/45 to-black/10 group-hover:from-slate-950/95'
                      }`}
                    />

                    {/* Etiqueta superior de categoría */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-red-600/90 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs">
                        {rubro.badge.split(' ')[0]}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Contenido inferior y píldora flotante "Ver módulo →" */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex flex-col justify-end gap-2.5 z-10">
                      <p className="font-bold text-xs sm:text-sm text-white leading-snug drop-shadow-xs">
                        {rubro.title}
                      </p>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 shadow-md ${
                            isSelected
                              ? 'bg-white text-red-600 ring-2 ring-red-500 shadow-red-600/30 translate-x-0.5'
                              : 'bg-white/95 text-slate-900 group-hover:bg-white group-hover:text-red-600 group-hover:ring-2 group-hover:ring-red-400/70 group-hover:shadow-lg group-hover:translate-x-0.5'
                          }`}
                        >
                          Ver módulo →
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Panel dinámico colapsable con las características de la vertical seleccionada */}
            {isVerticalPanelOpen ? (
              <ScrollReveal direction="up" className="mt-8 rounded-3xl border-2 border-red-500/30 dark:border-red-600/40 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 dark:bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider">
                          {activeVertical.badge}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Especializado para: {activeVertical.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsVerticalPanelOpen(false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <span>Ocultar detalle</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {activeVertical.title}
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2">
                        {activeVertical.previewSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {activeVertical.features.map((feat, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {feat.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {feat.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                      <button
                        type="button"
                        onClick={() => openAuthModal('register-studio', activeVertical.title)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
                      >
                        <Rocket className="w-4 h-4" />
                        <span>Configurar Reserly para {activeVertical.title.split('/')[0].trim()}</span>
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Incluye plantilla precargada y catálogo listo para personalizar.
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex justify-center">
                    <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl group">
                      <img
                        src={activeVertical.image}
                        alt={activeVertical.title}
                        className="w-full h-72 sm:h-80 object-cover transform transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5">
                        <span className="text-xs font-medium text-red-400">
                          {activeVertical.badge}
                        </span>
                        <p className="text-lg font-bold text-white">
                          {activeVertical.highlightMetric}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ) : (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsVerticalPanelOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <span>
                    Ver módulo de {activeVertical.title.split('/')[0].trim()}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 4 Tarjetas horizontales de Beneficios Clave */}
            <ScrollReveal direction="up" delay={100} className="mt-14 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Reservas en línea
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Recibe y gestiona reservas 24/7 de forma simple y segura, sin cruces
                  ni cancelaciones no deseadas.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Pagos integrados
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cobra por tus clases, servicios o espacios directamente desde la
                  plataforma por pasarelas o validación de transferencias.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Calendario y disponibilidad
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Organiza horarios, cupos y servicios en tiempo real con vista diaria,
                  semanal y asignación ágil de instructores.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Gestión de clientes
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Lleva el historial, preferencias, tiqueteras vigentes y reservas de
                  tus clientes en un solo lugar seguro.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            4. SECCIÓN "ASÍ FUNCIONA RESERLY"
        ========================================================================= */}
        <section className="py-10 md:py-16 bg-white dark:bg-[#070B14] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal direction="up" className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                Flujo Operativo
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Así funciona Reserly
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Una solución simple, rápida y efectiva para tu negocio.
              </p>
            </ScrollReveal>

            {/* Visor interactivo ampliado con 5 pestañas de módulos del sistema */}
            <ScrollReveal direction="up" delay={100}>
              <ReserlyModulesViewer
                onTryModule={() => openAuthModal('register-studio')}
              />
            </ScrollReveal>

            {/* 3 Pasos numerados limpios con círculos rojos #DC2626 conectados por flechas */}
            <ScrollReveal direction="up" delay={150} className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {/* Paso 1 */}
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-600/30 mb-4">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Crea tu cuenta
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Regístrate y configura tu negocio en pocos minutos. Asigna tu logo,
                    colores y datos de contacto.
                  </p>
                  {/* Flecha conectora a Paso 2 en pantallas medianas/grandes */}
                  <div className="hidden md:flex absolute -right-4 top-7 -translate-y-1/2 z-20 text-red-500 dark:text-red-400">
                    <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-600/30 mb-4">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Configura servicios y horarios
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Define tus clases, servicios, espacios, precios y disponibilidad
                    semanal de tu personal.
                  </p>
                  {/* Flecha conectora a Paso 3 en pantallas medianas/grandes */}
                  <div className="hidden md:flex absolute -right-4 top-7 -translate-y-1/2 z-20 text-red-500 dark:text-red-400">
                    <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-600/30 mb-4">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Comparte tu enlace y recibe reservas
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Envía tu enlace personalizado a tus clientes y comienza a recibir
                    reservas y pagos automáticamente.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            4B. FRANJA DE IMPACTO Y AUTOMATIZACIÓN (BENTO GRID)
        ========================================================================= */}
        <ScrollReveal direction="up">
          <ReserlyImpactBento />
        </ScrollReveal>

        {/* =========================================================================
            5. SECCIÓN "PRECIOS" (id="precios")
        ========================================================================= */}
        <section
          id="precios"
          className="py-10 md:py-16 bg-slate-50 dark:bg-[#070B14] border-t border-slate-200 dark:border-slate-800 transition-colors"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal direction="up" className="text-center max-w-3xl mx-auto mb-12 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                Inversión Transparente
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Planes adaptados a tu negocio
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Comienza sin riesgo y escala según la cantidad de sedes y volumen de reservas.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={100} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {/* Plan Básico */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-8 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Básico
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Ideal para iniciar y organizar tus reservas.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      $29
                    </span>
                    <span className="text-xs text-slate-500">/mes</span>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Gestión de reservas</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Calendario de horarios</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Administración de servicios</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={() => openAuthModal('register-studio')}
                    className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
                  >
                    Consultar plan
                  </button>
                </div>
              </div>

              {/* Plan Pro (Destacado con borde rojo #DC2626) */}
              <div className="relative rounded-3xl border-2 border-red-600 bg-white dark:bg-[#0F172A] p-8 flex flex-col justify-between shadow-2xl shadow-red-600/15 lg:-translate-y-3">
                {/* Badge Más Popular */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md">
                  Más popular
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Pro
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Para negocios en crecimiento.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      $59
                    </span>
                    <span className="text-xs text-slate-500">/mes</span>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Todo lo del plan Básico
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Pagos en línea integrados</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Gestión de clientes y tiqueteras</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Reportes básicos y exportables</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={() => openAuthModal('register-studio')}
                    className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 transition-all cursor-pointer"
                  >
                    Consultar plan Pro
                  </button>
                </div>
              </div>

              {/* Plan Premium */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-8 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Premium
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Máximo control y personalización.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      $99
                    </span>
                    <span className="text-xs text-slate-500">/mes</span>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Todo lo del plan Pro
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Múltiples sedes o servicios</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Personalización avanzada (Marca Blanca)</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Reportes y estadísticas en tiempo real</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={() => openAuthModal('register-studio')}
                    className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
                  >
                    Consultar plan
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            6. SECCIÓN "NOSOTROS", BANNER "CONTÁCTANOS" Y FOOTER (id="nosotros", id="contacto")
        ========================================================================= */}
        {/* Nosotros */}
        <section
          id="nosotros"
          className="py-10 md:py-16 bg-white dark:bg-[#070B14] transition-colors"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal direction="up" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Imagen a la izquierda */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="relative w-full max-w-lg rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-xl group">
                  <img
                    src="/Consulta_profesional.png"
                    alt="Equipo Reserly trabajando"
                    className="w-full h-80 sm:h-96 object-cover transform transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
              </div>

              {/* Contenido a la derecha */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                  NOSOTROS
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Facilitamos la gestión de reservas de tu negocio
                </h2>

                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  En Reserly nacimos con una premisa clara: eliminar la fricción entre
                  los centros de entrenamiento, estudios de bienestar, spas y
                  profesionales independientes y sus usuarios finales.
                </p>

                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Diseñamos un software intuitivo, veloz y escalable que se adapta a
                  la identidad visual de cada negocio (marca blanca), permitiendo
                  automatizar reservas 24/7, gestionar pagos y asegurar la máxima
                  rentabilidad de cada clase, cabina o cita médica.
                </p>

                {/* 3 Métricas compactadas en 3 columnas en móvil para evitar texto huérfano */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center sm:text-left">
                    <p className="text-lg sm:text-2xl font-bold text-red-600">99.9%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Disponibilidad</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-lg sm:text-2xl font-bold text-red-600">+15k</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Reservas</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-lg sm:text-2xl font-bold text-red-600">2 min</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Confirmación</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Banner Contáctanos (id="contacto") */}
        <section
          id="contacto"
          className="py-10 md:py-16 bg-slate-50 dark:bg-[#070B14] border-t border-slate-200 dark:border-slate-800 transition-colors"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal direction="up" className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    Contáctanos
                  </h3>
                  <p className="text-base sm:text-lg text-red-100 max-w-xl">
                    ¿Tienes dudas o necesitas más información? Estamos listos para
                    ayudarte a implementar Reserly en tu empresa hoy mismo.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-6 pt-2 text-xs font-medium text-red-100">
                    <a
                      href="mailto:contacto@reserly.com"
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>contacto@reserly.com</span>
                    </a>
                    <a
                      href="tel:+573101234567"
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>+57 (310) 123-4567</span>
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  {contactSent ? (
                    <div className="p-6 rounded-2xl bg-white text-slate-900 text-center shadow-lg">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                      <p className="font-bold text-base">¡Mensaje enviado!</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Un especialista de Reserly se comunicará contigo en breve.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleContactSubmit}
                      className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 space-y-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Tu nombre completo"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-400"
                      />
                      <input
                        type="email"
                        required
                        placeholder="correo@ejemplo.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-400"
                      />
                      <textarea
                        rows={3}
                        required
                        placeholder="¿Qué tipo de negocio tienes y en qué podemos ayudarte?"
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-400 resize-none"
                      />
                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-white text-red-600 hover:bg-red-50 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Enviar mensaje</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* =========================================================================
          7. FOOTER
      ========================================================================= */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            {/* Logo e Info */}
            <div className="flex items-center gap-4">
              <img
                src="/LogoReserly.png"
                alt="Reserly"
                className="h-10 w-auto object-contain brightness-0 invert opacity-90"
              />
              <div className="border-l border-slate-700 pl-4">
                <p className="font-semibold text-slate-200">
                  Software de Reservas y Gestión
                </p>
                <p className="text-[11px] text-slate-500">
                  Multi-tenant para estudios, spas, gimnasios y centros de salud
                </p>
              </div>
            </div>

            {/* Enlaces de Navegación Rápida */}
            <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-300">
              <button
                onClick={() => scrollTo('inicio')}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Inicio
              </button>
              <button
                onClick={() => scrollTo('nosotros')}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Nosotros
              </button>
              <button
                onClick={() => scrollTo('funciones')}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Funciones
              </button>
              <button
                onClick={() => scrollTo('precios')}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Precios
              </button>
              <button
                onClick={() => scrollTo('contacto')}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Contacto
              </button>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <p>© {new Date().getFullYear()} Reserly Inc. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => scrollTo('inicio')}
                className="hover:text-slate-400 transition-colors cursor-pointer"
              >
                Política de privacidad
              </button>
              <span>•</span>
              <button
                onClick={() => scrollTo('inicio')}
                className="hover:text-slate-400 transition-colors cursor-pointer"
              >
                Términos de uso
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          8. VISTA A PANTALLA COMPLETA DE AUTENTICACIÓN / ONBOARDING
      ========================================================================= */}
      {isAuthOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-background animate-in fade-in duration-200"
        >
          <AuthView
            initialMode={authInitialMode}
            initialRubro={authInitialRubro}
            onClose={() => setIsAuthOpen(false)}
            onAuthSuccess={(profile) => {
              setIsAuthOpen(false)
              onAuthSuccess(profile)
            }}
            onSkipToDemo={(rol) => {
              setIsAuthOpen(false)
              onSkipToDemo(rol)
            }}
          />
        </div>
      )}
    </div>
  )
}

export default LandingReserlyView
