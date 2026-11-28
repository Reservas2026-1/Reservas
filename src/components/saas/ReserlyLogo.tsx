import React from 'react'

interface ReserlyLogoProps {
  className?: string
  iconSize?: number
  showSubtitle?: boolean
  inverted?: boolean
  variant?: 'light' | 'dark' | 'auto'
  onClick?: () => void
}

export const ReserlyLogo: React.FC<ReserlyLogoProps> = ({
  className = '',
  iconSize = 42,
  showSubtitle = true,
  inverted = false,
  variant = 'auto',
  onClick,
}) => {
  const isDark = variant === 'dark' || inverted
  const isLight = variant === 'light'

  const titleColor = isDark
    ? 'text-white'
    : isLight
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white'

  const subtitleBorder = isDark
    ? 'border-white/20 text-slate-300'
    : isLight
      ? 'border-slate-300 text-slate-600'
      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'

  const subtitleBold = isDark
    ? 'text-white'
    : isLight
      ? 'text-slate-800'
      : 'text-slate-800 dark:text-slate-200'

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Isotipo /Logo_sin_fondo.png encuadrado con object-contain */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-300"
        style={{ width: iconSize, height: iconSize }}
      >
        <img
          src="/Logo_sin_fondo.png"
          alt="Reserly Logo"
          className="w-full h-full object-contain drop-shadow-xs"
          loading="eager"
        />
      </div>

      {/* Bloque Tipográfico: Únicamente 'Reserly' en negrita limpia sin '.com' */}
      <div className="flex items-center gap-3">
        <span
          className={`font-black tracking-tight text-2xl sm:text-[26px] leading-none ${titleColor}`}
        >
          Reserly
        </span>

        {showSubtitle && (
          <div
            className={`hidden sm:flex flex-col border-l pl-3 py-0.5 text-[11px] leading-tight font-medium ${subtitleBorder}`}
          >
            <span>Software de</span>
            <span className={`font-semibold ${subtitleBold}`}>
              Reservas &amp; Gestión
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReserlyLogo
