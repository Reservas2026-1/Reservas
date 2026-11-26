import React from 'react'
import { ArrowLeft, Wifi, Battery, Sparkles } from 'lucide-react'

export const ReserlyPhoneMockup: React.FC = () => {
  return (
    <div className="relative w-full max-w-[500px] lg:max-w-[580px] mx-auto select-none py-6">
      {/* =========================================================================
          ELEMENTOS DECORATIVOS DE FONDO (Fiel a la imagen de referencia)
      ========================================================================= */}
      {/* Líneas horizontales futuristas de velocidad y perspectiva tecnológica */}
      <div className="absolute -top-6 right-0 w-[115%] h-48 pointer-events-none opacity-80 dark:opacity-40 overflow-hidden">
        <svg viewBox="0 0 600 200" fill="none" className="w-full h-full">
          <path
            d="M 120 40 L 580 40 M 160 65 L 600 65 M 80 90 L 590 90 M 200 115 L 560 115 M 240 140 L 590 140"
            stroke="url(#speedLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 280 45 L 320 45 M 340 45 L 420 45 M 440 65 L 520 65"
            stroke="#94a3b8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <polygon
            points="140,50 170,30 240,30 210,50"
            fill="#e2e8f0"
            opacity="0.5"
          />
          <polygon
            points="380,80 410,60 480,60 450,80"
            fill="#cbd5e1"
            opacity="0.4"
          />
          <defs>
            <linearGradient id="speedLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0" />
              <stop offset="30%" stopColor="#cbd5e1" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#94a3b8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Píldora Flotante "Integraciones" */}
      <div className="absolute top-10 right-4 sm:right-12 z-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] rounded-full px-7 py-2.5 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
        <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
          Integraciones
        </span>
      </div>

      {/* Texto flotante "Conecta con alumnos" e Iconos de aplicaciones */}
      <div className="absolute top-[48%] -right-2 sm:right-4 z-10 flex flex-col items-end gap-2 pointer-events-none">
        <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">
          Conecta con alumnos
        </span>
        <div className="flex items-center gap-2">
          {/* Instagram */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>

          {/* Vimeo */}
          <div className="w-8 h-8 rounded-xl bg-[#00adef] flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128 1.574-1.409 2.754-2.158 3.541-2.247 1.869-.179 3.023.998 3.465 3.53.535 3.032.903 4.935 1.104 5.71.602 2.656 1.258 3.984 1.97 3.984.551 0 1.34-.872 2.368-2.617 1.026-1.744 1.574-3.076 1.64-3.996.115-1.492-.416-2.241-1.594-2.241-.572 0-1.191.13-1.859.39 1.174-3.838 3.42-5.717 6.741-5.637 2.456.059 3.633 1.674 3.529 4.843z" />
            </svg>
          </div>

          {/* Fitness Flame */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-md text-white font-bold text-xs">
            🔥
          </div>
        </div>

        {/* Marca de pasarela o integración */}
        <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500 mt-1">
          ✓ EWOTOIGART
        </span>
      </div>

      {/* =========================================================================
          SMARTPHONE RESIDUAL ISOMÉTRICO 3D (Inclinado fiel a la referencia)
      ========================================================================= */}
      <div className="relative mx-auto w-[290px] sm:w-[320px] transform rotate-[-8deg] hover:rotate-[-4deg] transition-all duration-500 ease-out">
        {/* Sombra 3D profunda del dispositivo */}
        <div className="absolute inset-4 -bottom-6 bg-slate-900/40 dark:bg-black/60 blur-2xl rounded-[50px] transform translate-y-6 translate-x-4 pointer-events-none" />

        {/* Chasis exterior del teléfono (Bisel metálico) */}
        <div className="relative rounded-[46px] p-[10px] bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.8)] border border-slate-600/50">
          {/* Botones laterales simulados en el chasis */}
          <div className="absolute -left-[12px] top-28 w-[3px] h-10 bg-slate-600 rounded-l-sm" />
          <div className="absolute -left-[12px] top-42 w-[3px] h-10 bg-slate-600 rounded-l-sm" />
          <div className="absolute -right-[12px] top-32 w-[3px] h-14 bg-slate-600 rounded-r-sm" />

          {/* Pantalla Interna (Bisel negro fino y esquinas curvas) */}
          <div className="relative rounded-[38px] overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-900/10 shadow-inner flex flex-col">
            {/* Dynamic Island / Cámara Frontal */}
            <div className="relative h-7 bg-transparent z-30 flex items-center justify-between px-6 pt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              <span className="tracking-tight">9:41</span>
              {/* Dynamic Island pill */}
              <div className="w-20 h-4 bg-black rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 flex items-center justify-end pr-2 gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-950/60" />
              </div>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                <Battery className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 fill-current" />
              </div>
            </div>

            {/* Header de la App Móvil */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                {/* Mini isotipo */}
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white text-[9px] font-black">
                  R
                </div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">
                  Reserly<span className="font-normal text-[10px] text-slate-400">.com</span>
                </span>
              </div>
              {/* Avatar de alumna */}
              <div className="w-6 h-6 rounded-full overflow-hidden border border-rose-300 shadow-sm bg-gradient-to-tr from-rose-400 to-amber-300 flex items-center justify-center text-[10px] font-bold text-white">
                👩‍🦰
              </div>
            </div>

            {/* Subheader: ← Puestos de clases */}
            <div className="px-4 py-2 flex items-center gap-2 bg-slate-100/70 dark:bg-slate-800/50">
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                Puestos de clases
              </span>
            </div>

            {/* Matriz interactiva de puestos de sala */}
            <div className="p-3.5 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
              <div className="grid grid-cols-4 gap-2 mb-2">
                {/* Fila 1 */}
                <div className="h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  ✕
                </div>
                <div className="h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-[10px] font-bold text-purple-600">
                  03
                </div>
                <div className="h-8 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-500/30 text-white flex items-center justify-center text-[10px] font-extrabold">
                  07
                </div>
                <div className="h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  ✕
                </div>

                {/* Fila 2 */}
                <div className="h-8 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-500/30 text-white flex items-center justify-center text-[10px] font-extrabold">
                  12
                </div>
                <div className="h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  ✕
                </div>
                <div className="h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  ✕
                </div>
                <div className="h-8 rounded-lg bg-rose-600 shadow-sm shadow-rose-600/30 text-white flex items-center justify-center text-[10px] font-extrabold">
                  05
                </div>

                {/* Fila 3 */}
                <div className="h-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center text-[10px] font-extrabold">
                  01
                </div>
                <div className="h-8 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-500/30 text-white flex items-center justify-center text-[10px] font-extrabold">
                  09
                </div>
                <div className="h-8 rounded-lg bg-slate-600 text-white flex items-center justify-center text-[10px] font-bold">
                  10
                </div>
                <div className="h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  ✕
                </div>
              </div>

              {/* Tarjeta del Pase QR */}
              <div className="mt-2.5 bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 shadow-md flex flex-col items-center">
                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1">
                  Pase QR <Sparkles className="w-2.5 h-2.5 text-rose-500" />
                </span>

                {/* Código QR vectorial nítido */}
                <div className="p-1.5 bg-white rounded-xl shadow-inner border border-slate-100 mb-2">
                  <svg viewBox="0 0 100 100" className="w-24 h-24" fill="#0f172a">
                    {/* Esquinas Marcadoras de Posición (Finder Patterns) */}
                    <rect x="5" y="5" width="28" height="28" rx="4" />
                    <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="13" width="12" height="12" rx="2" />

                    <rect x="67" y="5" width="28" height="28" rx="4" />
                    <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="75" y="13" width="12" height="12" rx="2" />

                    <rect x="5" y="67" width="28" height="28" rx="4" />
                    <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="75" width="12" height="12" rx="2" />

                    {/* Datos aleatorios / módulos del QR */}
                    <rect x="40" y="8" width="6" height="6" rx="1" />
                    <rect x="52" y="8" width="6" height="6" rx="1" />
                    <rect x="46" y="20" width="6" height="6" rx="1" />
                    <rect x="38" y="28" width="8" height="6" rx="1" />
                    <rect x="54" y="28" width="6" height="8" rx="1" />

                    <rect x="10" y="42" width="6" height="6" rx="1" />
                    <rect x="22" y="42" width="6" height="6" rx="1" />
                    <rect x="40" y="40" width="8" height="8" rx="2" fill="#dc2626" />
                    <rect x="56" y="42" width="6" height="6" rx="1" />
                    <rect x="70" y="42" width="6" height="6" rx="1" />
                    <rect x="84" y="42" width="6" height="6" rx="1" />

                    <rect x="10" y="54" width="6" height="6" rx="1" />
                    <rect x="22" y="54" width="6" height="6" rx="1" />
                    <rect x="38" y="54" width="8" height="6" rx="1" />
                    <rect x="52" y="54" width="6" height="8" rx="1" />
                    <rect x="68" y="54" width="8" height="6" rx="1" />
                    <rect x="82" y="54" width="8" height="6" rx="1" />

                    <rect x="40" y="68" width="6" height="6" rx="1" />
                    <rect x="52" y="68" width="6" height="6" rx="1" />
                    <rect x="44" y="78" width="8" height="6" rx="1" />
                    <rect x="56" y="78" width="6" height="6" rx="1" />
                    <rect x="68" y="70" width="8" height="8" rx="1" />
                    <rect x="80" y="70" width="6" height="6" rx="1" />
                    <rect x="74" y="82" width="12" height="6" rx="1" />
                  </svg>
                </div>

                {/* Botón inferior "Descargar / Validar" */}
                <button
                  type="button"
                  className="w-full py-1.5 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold tracking-tight shadow-sm hover:opacity-90 transition-opacity"
                >
                  Descargar
                </button>
              </div>
            </div>

            {/* Barra Home inferior */}
            <div className="h-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <div className="w-24 h-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReserlyPhoneMockup
