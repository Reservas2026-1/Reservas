import React, { useState } from 'react'
import { Palette, Sun, Moon, Sparkles, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBranding, PALETTES } from '@/context/BrandingContext'

export const BrandingToolbar: React.FC = () => {
  const { currentPalette, setPaletteById, isDarkMode, toggleDarkMode, studioName, setStudioName } =
    useBranding()
  const [isOpen, setIsOpen] = useState(false)

  const studioPresets = [
    'VELO-X Cycling Studio',
    'Revolution Indoor Cycle',
    'PowerSpin Elite Club',
    'Rhythm & Beats Gym',
  ]

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Selector de Paleta / Marca Blanca */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
          className="h-8 text-xs gap-1.5 border-dashed"
          title="Personalizar Marca Blanca"
        >
          <div className={`w-3 h-3 rounded-full ${currentPalette.bgClass}`} />
          <span className="hidden sm:inline font-semibold">Marca Blanca</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>

        {/* Toggle Dark Mode */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleDarkMode}
          className="h-8 w-8 p-0"
          title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </Button>
      </div>

      {/* Popover / Menú Desplegable */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 p-3 bg-card border rounded-xl shadow-xl z-50 text-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" />
                Personalización Multi-Tenant
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>

            {/* Nombre del Estudio */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground block">
                Nombre del Estudio / Marca:
              </label>
              <select
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg border bg-background font-medium focus:outline-none"
              >
                {studioPresets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Paleta de Color */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground block">
                Color Primario Corporativo:
              </label>
              <div className="grid grid-cols-1 gap-1">
                {PALETTES.map((palette) => {
                  const isSelected = currentPalette.id === palette.id
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setPaletteById(palette.id)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 font-bold'
                          : 'border-transparent hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full ${palette.bgClass}`} />
                        <span className="text-[11px]">{palette.name}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-1 border-t text-[10px] text-muted-foreground text-center">
              Cambia en tiempo real la identidad corporativa de la empresa seleccionada.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
