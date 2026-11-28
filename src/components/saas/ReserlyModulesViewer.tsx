import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  Users,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ReserlyModulesViewerProps {
  onTryModule: () => void
}

interface SystemTabItem {
  id: 'admin' | 'calendario' | 'reservas' | 'clientes' | 'movil'
  title: string
  description: string
  icon: React.ElementType
  image: string
  imageAlt: string
  windowUrl: string
  bullets: [string, string, string]
}

const SYSTEM_TABS: SystemTabItem[] = [
  {
    id: 'admin',
    title: 'Panel admin',
    description: 'Métricas e ingresos al día',
    icon: LayoutDashboard,
    image: encodeURI('/Panel admin.png'),
    imageAlt: 'Panel de administración Reserly con resumen e indicadores',
    windowUrl: 'app.reserly.com/admin/resumen',
    bullets: [
      'Resumen en vivo de reservas e ingresos diarios',
      'Alertas rápidas de pagos pendientes por aprobar',
      'Métricas de ocupación por sede e instructor',
    ],
  },
  {
    id: 'calendario',
    title: 'Calendario',
    description: 'Horarios, salas y cupos',
    icon: CalendarDays,
    image: '/Calendario.png',
    imageAlt: 'Calendario semanal de reservas y clases en Reserly',
    windowUrl: 'app.reserly.com/admin/calendario',
    bullets: [
      'Agenda semanal y diaria por sala o especialista',
      'Control automático de cupos y listas de espera',
      'Reprogramación y bloqueos en un solo clic',
    ],
  },
  {
    id: 'reservas',
    title: 'Lista / Mapa',
    description: 'Puestos, bicis y estados',
    icon: MapPin,
    image: '/Reservas.png',
    imageAlt: 'Lista de reservas con confirmación en tiempo real en Reserly',
    windowUrl: 'app.reserly.com/admin/reservas',
    bullets: [
      'Selección visual de bicicleta, camilla o puesto',
      'Estados confirmados y pendientes actualizados al instante',
      'Filtros ágiles por clase, franja horaria y cliente',
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Fichas y tiqueteras activas',
    icon: Users,
    image: '/Clientes.png',
    imageAlt: 'Módulo de gestión de clientes en Reserly',
    windowUrl: 'app.reserly.com/admin/clientes',
    bullets: [
      'Historial completo de reservas y asistencias',
      'Saldo de tiqueteras, créditos y vencimientos',
      'Búsqueda instantánea por nombre o documento',
    ],
  },
  {
    id: 'movil',
    title: 'App móvil / QR',
    description: 'Reservas 24/7 y check-in',
    icon: QrCode,
    image: encodeURI('/Panel de Reservas Reserly.png'),
    imageAlt: 'Vista móvil y aplicación web de reservas Reserly con QR',
    windowUrl: 'm.reserly.com/reservar',
    bullets: [
      'Autogestión de reservas desde cualquier celular',
      'Validación de entrada con código QR en <2 seg',
      'Sincronización inmediata con recepción y caja',
    ],
  },
]

/**
 * Visor interactivo de módulos con avance horizontal automático cada 10s,
 * deslizamiento táctil y controles minimalistas en pantallas móviles.
 */
export const ReserlyModulesViewer: React.FC<ReserlyModulesViewerProps> = ({
  onTryModule,
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartXRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeTab = SYSTEM_TABS[activeIndex] || SYSTEM_TABS[0]

  // Función para reiniciar el temporizador de 10 segundos
  const resetAutoAdvanceTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SYSTEM_TABS.length)
    }, 10000)
  }, [])

  // Iniciar auto-avance cada 10 segundos al montar
  useEffect(() => {
    resetAutoAdvanceTimer()
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [resetAutoAdvanceTimer])

  const handleSelectTab = (index: number) => {
    setActiveIndex(index)
    resetAutoAdvanceTimer()
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % SYSTEM_TABS.length)
    resetAutoAdvanceTimer()
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + SYSTEM_TABS.length) % SYSTEM_TABS.length)
    resetAutoAdvanceTimer()
  }

  // Soporte para deslizamiento manual con touch/swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartXRef.current - touchEndX

    if (diff > 45) {
      // Deslizó hacia la izquierda -> siguiente
      handleNext()
    } else if (diff < -45) {
      // Deslizó hacia la derecha -> anterior
      handlePrev()
    }
    touchStartXRef.current = null
  }

  return (
    <div className="mb-14 sm:mb-20">
      {/* =========================================================================
          CONTROLES DE PESTAÑAS:
          - En escritorio (>= md): Botones amplios con icono, título y descripción.
          - En móvil (< md): Barra minimalista con puntos indicadores interactivos.
      ========================================================================= */}

      {/* Pestañas para Escritorio (ocultas en móvil) */}
      <div
        role="tablist"
        aria-label="Módulos del sistema Reserly"
        className="hidden md:flex max-w-5xl mx-auto mb-8 flex-wrap justify-center gap-2.5 sm:gap-3"
      >
        {SYSTEM_TABS.map((tab, idx) => {
          const Icon = tab.icon
          const isActive = idx === activeIndex

          return (
            <button
              key={tab.id}
              id={`module-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`module-panel-${tab.id}`}
              onClick={() => handleSelectTab(idx)}
              className={`w-[calc(20%-10px)] flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-red-600 ring-2 ring-red-600/20 shadow-lg scale-[1.02]'
                  : 'bg-slate-50/90 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800/70 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                    : 'bg-red-100/80 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold leading-tight truncate ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {tab.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-1">
                  {tab.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Puntos Indicadores Minimalistas para Móvil (< md) */}
      <div className="flex md:hidden items-center justify-between max-w-sm mx-auto mb-4 px-2">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Módulo anterior"
          className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          {SYSTEM_TABS.map((tab, idx) => {
            const isActive = idx === activeIndex
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(idx)}
                aria-label={`Ir al módulo ${tab.title}`}
                className={`transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-7 h-2 bg-red-600 rounded-full shadow-xs'
                    : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 rounded-full hover:bg-slate-400'
                }`}
              />
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Módulo siguiente"
          className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* =========================================================================
          PANEL DE VISTA PREVIA (DESLIZABLE TÁCTILMENTE)
      ========================================================================= */}
      <div
        id={`module-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`module-tab-${activeTab.id}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 p-4 sm:p-7 transition-all duration-300"
      >
        {/* Cabecera estilo ventana de aplicación */}
        <div className="flex items-center justify-between gap-3 pb-3 mb-3 sm:mb-5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/90" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/90" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/90" />
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{activeTab.windowUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
              {activeIndex + 1} de {SYSTEM_TABS.length}
            </span>
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
            >
              {activeTab.title}
            </Badge>
          </div>
        </div>

        {/* Imagen del módulo con fondo blanco sólido y bordes definidos */}
        <div className="rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 p-2 sm:p-3 overflow-hidden">
          <img
            key={activeTab.id}
            src={activeTab.image}
            alt={activeTab.imageAlt}
            className="w-full max-h-[460px] sm:max-h-[520px] object-contain mx-auto rounded-lg transition-all duration-500 select-none"
            loading="lazy"
          />
        </div>

        {/* Barra inferior con beneficios y botón de acción */}
        <div className="mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 flex-1 w-full">
            {activeTab.bullets.map((bullet, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="font-medium leading-snug">{bullet}</span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            onClick={onTryModule}
            className="w-full lg:w-auto shrink-0 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 h-auto shadow-md shadow-red-600/25 transition-all cursor-pointer"
          >
            <span>Probar este módulo gratis</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReserlyModulesViewer
