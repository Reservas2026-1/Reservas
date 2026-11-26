import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBranding } from '@/context/BrandingContext'

export const BrandingToolbar: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useBranding()

  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleDarkMode}
        className="h-8 w-8 p-0"
        title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      >
        {isDarkMode ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        )}
      </Button>
    </div>
  )
}