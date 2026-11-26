import React, { useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  Users,
  QrCode,
  CheckCircle2,
  ArrowRight,
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
 * Visor interactivo con 5 pestañas para explorar los módulos clave de Reserly.
 */
export const ReserlyModulesViewer: React.FC<ReserlyModulesViewerProps> = ({
  onTryModule,
}) => {
  const [activeTabId, setActiveTabId] = useState<SystemTabItem['id']>('admin')

  const activeTab =
    SYSTEM_TABS.find((tab) => tab.id === activeTabId) || SYSTEM_TABS[0]

  return (
    <div className="mb-16 sm:mb-20">
      {/* Barra superior centrada con 5 pestañas interactivas */}
      <div
        role="tablist"
        aria-label="Módulos del sistema Reserly"
        className="max-w-5xl mx-auto mb-8 flex flex-wrap justify-center gap-2.5 sm:gap-3"
      >
        {SYSTEM_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab.id

          return (
            <button
              key={tab.id}
              id={`module-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`module-panel-${tab.id}`}
              onClick={() => setActiveTabId(tab.id)}
              className={`w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-red-600 ring-2 ring-red-600/20 shadow-lg'
                  : 'bg-slate-50/90 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800/70 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                    : 'bg-red-100/80 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs sm:text-sm font-bold leading-tight truncate ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {tab.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                  {tab.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Ventana moderna de aplicación con la vista ampliada del módulo */}
      <div
        id={`module-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`module-tab-${activeTab.id}`}
        className="max-w-5xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 transition-colors"
      >
        {/* Cabecera estilo ventana de navegador / aplicación */}
        <div className="flex items-center justify-between gap-4 pb-4 mb-4 sm:mb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/90" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/90" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/90" />
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{activeTab.windowUrl}</span>
          </div>

          <Badge
            variant="outline"
            className="rounded-full px-3 py-0.5 text-[11px] font-bold border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
          >
            {activeTab.title}
          </Badge>
        </div>

        {/* Imagen grande del módulo activo */}
        <div className="rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-2 sm:p-4 overflow-hidden">
          <img
            key={activeTab.id}
            src={activeTab.image}
            alt={activeTab.imageAlt}
            className="w-full max-h-[520px] object-contain mx-auto rounded-xl transition-all duration-300"
          />
        </div>

        {/* Barra inferior con 3 beneficios clave y botón de acción */}
        <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1 w-full">
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
            className="w-full lg:w-auto shrink-0 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 h-auto shadow-md shadow-red-600/25 transition-all"
          >
            <span>Probar este módulo gratis</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReserlyModulesViewer
