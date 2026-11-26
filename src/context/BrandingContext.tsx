import React, { createContext, useContext, useState, useEffect } from 'react'

export interface ColorPalette {
  id: string
  name: string
  primaryHex: string
  bgClass: string
  textClass: string
  borderClass: string
  ringClass: string
  fromClass: string
  toClass: string
}

export const PALETTES: ColorPalette[] = [
  {
    id: 'red-cycle',
    name: 'Rojo Pasión (Por Defecto)',
    primaryHex: '#DC2626',
    bgClass: 'bg-red-600',
    textClass: 'text-red-600',
    borderClass: 'border-red-600',
    ringClass: 'ring-red-600',
    fromClass: 'from-red-600',
    toClass: 'to-rose-700',
  },
  {
    id: 'blue-nitro',
    name: 'Azul Eléctrico',
    primaryHex: '#2563EB',
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-600',
    ringClass: 'ring-blue-600',
    fromClass: 'from-blue-600',
    toClass: 'to-indigo-700',
  },
  {
    id: 'emerald-neon',
    name: 'Verde Neón',
    primaryHex: '#16A34A',
    bgClass: 'bg-emerald-600',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-600',
    ringClass: 'ring-emerald-600',
    fromClass: 'from-emerald-600',
    toClass: 'to-teal-700',
  },
  {
    id: 'purple-flow',
    name: 'Púrpura Flow',
    primaryHex: '#7C3AED',
    bgClass: 'bg-purple-600',
    textClass: 'text-purple-600',
    borderClass: 'border-purple-600',
    ringClass: 'ring-purple-600',
    fromClass: 'from-purple-600',
    toClass: 'to-fuchsia-700',
  },
  {
    id: 'amber-boost',
    name: 'Naranja Boost',
    primaryHex: '#EA580C',
    bgClass: 'bg-orange-600',
    textClass: 'text-orange-600',
    borderClass: 'border-orange-600',
    ringClass: 'ring-orange-600',
    fromClass: 'from-orange-600',
    toClass: 'to-amber-700',
  },
]

export interface EstudioInfo {
  id: string
  nombre: string
  slug?: string | null
  logo_url?: string | null
  color_primario?: string | null
  color_secundario?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  capacidad_sala?: number
  activo?: boolean
}

interface BrandingContextType {
  studioName: string
  setStudioName: (name: string) => void
  currentPalette: ColorPalette
  setPaletteById: (id: string) => void
  customPrimaryHex: string | null
  setCustomPrimaryColor: (hex: string) => void
  logoUrl: string | null
  setLogoUrl: (url: string | null) => void
  isDarkMode: boolean
  toggleDarkMode: () => void
  empresaId: string
  setEmpresaId: (id: string) => void
  estudioActivo: EstudioInfo | null
  setEstudioActivo: (estudio: EstudioInfo) => void
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studioName, setStudioName] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rtc_studio_name')
      if (!saved || saved === 'Revolution Indoor Cycle' || saved === 'VELO-X Cycling Studio' || saved === 'RuedaPro') {
        localStorage.setItem('rtc_studio_name', 'Reserly')
        return 'Reserly'
      }
      return saved
    }
    return 'Reserly'
  })

  const [paletteId, setPaletteId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rtc_palette_id') || 'red-cycle'
    }
    return 'red-cycle'
  })

  const [customPrimaryHex, setCustomPrimaryHex] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rtc_custom_hex') || '#DC2626'
    }
    return '#DC2626'
  })

  const [logoUrl, setLogoUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedLogo = localStorage.getItem('rtc_logo_url')
      if (!savedLogo || savedLogo === '/logo-ruedapro.png') {
        localStorage.setItem('rtc_logo_url', '/LogoReserly.png')
        return '/LogoReserly.png'
      }
      return savedLogo
    }
    return '/LogoReserly.png'
  })

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rtc_theme') === 'dark'
    }
    return false
  })

  const [empresaId, setEmpresaIdState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rtc_empresa_id') || 'e1000000-0000-0000-0000-000000000001'
    }
    return 'e1000000-0000-0000-0000-000000000001'
  })

  const [estudioActivo, setEstudioActivoState] = useState<EstudioInfo | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rtc_estudio_activo')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed && (parsed.nombre === 'RuedaPro' || parsed.logo_url === '/logo-ruedapro.png')) {
            parsed.nombre = 'Reserly'
            parsed.slug = 'reserly'
            parsed.logo_url = '/LogoReserly.png'
            localStorage.setItem('rtc_estudio_activo', JSON.stringify(parsed))
          }
          return parsed
        } catch {
          return null
        }
      }
    }
    return {
      id: 'e1000000-0000-0000-0000-000000000001',
      nombre: 'Reserly',
      slug: 'reserly',
      logo_url: '/LogoReserly.png',
      color_primario: '#DC2626',
      color_secundario: '#991B1B',
      direccion: 'Calle 85 # 12-40, Zona Rosa, Bogotá',
      telefono: '+57 310 123 4567',
      email: 'contacto@reserly.com',
      capacidad_sala: 15,
      activo: true,
    }
  })

  // Encontrar paleta basada en id o color hexadecimal
  const currentPalette = React.useMemo(() => {
    const found = PALETTES.find((p) => p.id === paletteId)
    if (found) {
      if (customPrimaryHex && customPrimaryHex !== found.primaryHex) {
        return {
          ...found,
          primaryHex: customPrimaryHex,
        }
      }
      return found
    }
    return PALETTES[0]
  }, [paletteId, customPrimaryHex])

  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem('rtc_theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('rtc_theme', 'light')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev)

  const setPaletteById = (id: string) => {
    setPaletteId(id)
    const p = PALETTES.find((item) => item.id === id)
    if (p) {
      setCustomPrimaryHex(p.primaryHex)
      if (typeof window !== 'undefined') {
        localStorage.setItem('rtc_palette_id', id)
        localStorage.setItem('rtc_custom_hex', p.primaryHex)
      }
    }
  }

  const setCustomPrimaryColor = (hex: string) => {
    const cleanHex = hex.trim()
    setCustomPrimaryHex(cleanHex)
    if (typeof window !== 'undefined') {
      localStorage.setItem('rtc_custom_hex', cleanHex)
    }

    // Buscar si coincide con alguna paleta predefinida
    const matched = PALETTES.find((p) => p.primaryHex.toLowerCase() === cleanHex.toLowerCase())
    if (matched) {
      setPaletteId(matched.id)
      if (typeof window !== 'undefined') {
        localStorage.setItem('rtc_palette_id', matched.id)
      }
    }
  }

  const setLogoUrl = (url: string | null) => {
    setLogoUrlState(url)
    if (typeof window !== 'undefined') {
      if (url) localStorage.setItem('rtc_logo_url', url)
      else localStorage.removeItem('rtc_logo_url')
    }
  }

  const setEmpresaId = (id: string) => {
    setEmpresaIdState(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('rtc_empresa_id', id)
    }
  }

  const setEstudioActivo = (estudio: EstudioInfo) => {
    setEstudioActivoState(estudio)
    setEmpresaIdState(estudio.id)
    setStudioName(estudio.nombre)
    if (estudio.logo_url) {
      setLogoUrlState(estudio.logo_url)
    }
    if (estudio.color_primario) {
      setCustomPrimaryColor(estudio.color_primario)
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('rtc_estudio_activo', JSON.stringify(estudio))
      localStorage.setItem('rtc_empresa_id', estudio.id)
      localStorage.setItem('rtc_studio_name', estudio.nombre)
      if (estudio.logo_url) localStorage.setItem('rtc_logo_url', estudio.logo_url)
      if (estudio.color_primario) localStorage.setItem('rtc_custom_hex', estudio.color_primario)
    }
  }

  return (
    <BrandingContext.Provider
      value={{
        studioName,
        setStudioName: (name: string) => {
          setStudioName(name)
          if (typeof window !== 'undefined') localStorage.setItem('rtc_studio_name', name)
        },
        currentPalette,
        setPaletteById,
        customPrimaryHex,
        setCustomPrimaryColor,
        logoUrl,
        setLogoUrl,
        isDarkMode,
        toggleDarkMode,
        empresaId,
        setEmpresaId,
        estudioActivo,
        setEstudioActivo,
      }}
    >
      {children}
    </BrandingContext.Provider>
  )
}

export const useBranding = () => {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error('useBranding debe usarse dentro de un BrandingProvider')
  }
  return context
}