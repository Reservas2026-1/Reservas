import React from 'react'

export const ReserlyPhoneMockup: React.FC = () => {
  return (
    <div className="relative w-full max-w-full select-none py-1 sm:py-3">
      {/* =====================================================================
          VENTANA / TARJETA HORIZONTAL DEL PANEL ADMINISTRATIVO
          Barra del navegador (app.reserly.com/admin/panel)
          Fondo blanco sólido, bordes definidos y sombra pronunciada
      ===================================================================== */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xl transition-all">
        {/* Pantalla Interna: fondo blanco sólido (bg-white text-slate-900) siempre nítido */}
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-white text-slate-900 border border-slate-200/90 dark:border-slate-700/60 shadow-inner flex flex-col">
          {/* Barra superior de app web / navegador */}
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-100/95 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="px-3 py-0.5 sm:py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-xs font-mono text-slate-600 dark:text-slate-300 truncate max-w-[220px] sm:max-w-none shadow-2xs">
              app.reserly.com/admin/panel
            </div>
            <div className="w-8 sm:w-10" />
          </div>

          {/* Imagen del Panel de Reservas */}
          <div className="relative bg-white flex items-center justify-center p-1 sm:p-2">
            <img
              src={encodeURI('/Panel de Reservas Reserly_1.png')}
              alt="Panel de Reservas Reserly"
              className="w-full h-auto object-contain select-none rounded-b-lg"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReserlyPhoneMockup
