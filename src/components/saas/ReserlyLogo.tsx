import React from 'react'

interface ReserlyLogoProps {
  className?: string
  iconSize?: number
  showSubtitle?: boolean
  inverted?: boolean
  onClick?: () => void
}

export const ReserlyLogo: React.FC<ReserlyLogoProps> = ({
  className = '',
  iconSize = 44,
  showSubtitle = true,
  inverted = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Isotipo SVG de Remolino Dinámico Rojo & Plata */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-300"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            {/* Gradiente Rojo Intenso / Carmesí */}
            <linearGradient id="reserlyRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="45%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Gradiente Rojo Secundario para profundidad */}
            <linearGradient id="reserlyRedGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>

            {/* Gradiente Metálico Plateado / Cromo */}
            <linearGradient id="reserlySilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Gradiente Metálico de profundidad */}
            <linearGradient id="reserlySilverGrad2" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Sombra interna sutil */}
            <filter id="reserlyDrop" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Aspa Plateada Inferior Izquierda */}
          <path
            d="M 50 50 C 35 48 20 58 18 72 C 16 85 28 95 44 94 C 32 90 28 78 34 68 C 39 59 47 54 50 50 Z"
            fill="url(#reserlySilverGrad2)"
          />
          <path
            d="M 50 50 C 40 40 24 42 16 52 C 8 62 10 78 22 88 C 14 78 16 66 24 58 C 32 50 44 48 50 50 Z"
            fill="url(#reserlySilverGrad)"
          />

          {/* Aspa Plateada Central / Cola */}
          <path
            d="M 50 50 C 52 38 42 26 30 26 C 20 26 14 34 16 44 C 18 36 24 32 32 34 C 40 36 46 44 50 50 Z"
            fill="url(#reserlySilverGrad)"
            opacity="0.95"
          />

          {/* Aspa Roja Superior Principal (Arco exterior) */}
          <path
            d="M 50 50 C 52 34 66 18 82 20 C 94 22 98 36 94 48 C 96 36 88 26 76 24 C 62 22 52 34 50 50 Z"
            fill="url(#reserlyRedGrad)"
          />

          {/* Aspa Roja Externa Grande envolvente */}
          <path
            d="M 38 18 C 55 10 75 14 88 26 C 97 36 100 50 96 64 C 98 50 93 36 82 28 C 70 18 52 16 38 18 Z"
            fill="url(#reserlyRedGrad2)"
          />

          {/* Núcleo de Espiral Roja */}
          <path
            d="M 50 50 C 60 52 70 46 72 36 C 74 28 66 24 58 28 C 64 26 70 30 68 38 C 66 44 58 48 50 50 Z"
            fill="url(#reserlyRedGrad)"
          />

          {/* Ojo central sutil */}
          <circle cx="50" cy="50" r="4" fill="#991b1b" opacity="0.8" />
        </svg>
      </div>

      {/* Bloque Tipográfico */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline">
          <span
            className={`font-black tracking-tight text-2xl sm:text-[26px] leading-none ${
              inverted ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            Reserly
          </span>
          <span
            className={`font-semibold text-base sm:text-lg tracking-normal leading-none ml-0.5 ${
              inverted ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            .com
          </span>
        </div>

        {showSubtitle && (
          <div
            className={`hidden sm:flex flex-col border-l pl-3 py-0.5 text-[11px] leading-tight font-medium ${
              inverted
                ? 'border-white/20 text-slate-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>Software de</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Reservas &amp; Gestión
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReserlyLogo
