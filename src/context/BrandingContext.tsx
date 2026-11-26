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
  tipo_negocio?: string | null
  ruc_o_identificacion?: string | null
  logo_url?: string | null
  color_primario?: string | null
  color_secundario?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  capacidad_sala?: number
  activo?: boolean
  created_at?: string
  updated_at?: string | null
}

export type VerticalKey =
  | 'spinning'
  | 'pilates'
  | 'yoga'
  | 'gimnasio'
  | 'crossfit'
  | 'canchas'
  | 'belleza'
  | 'barberia'
  | 'spa'
  | 'consultorio'
  | 'danza'
  | 'general'

export interface ConfiguracionVertical {
  verticalKey: VerticalKey
  etiquetaNegocio: string
  recursoSingular: string
  recursoPlural: string
  recursoCortoPlural: string
  espacio: string
  clienteSingular: string
  clientePlural: string
  sesionSingular: string
  sesionPlural: string
  navMapaLabel: string
  navRecursosLabel: string
  navHorariosLabel: string
  navPlanificacionesLabel: string
  navPlanesLabel: string
  navAsignarPlanesLabel: string
  navAsistenciasLabel: string
  ejemploSesion: string
  showBicycleMap: boolean
  showCourtManagement: boolean
  showResourceMap: boolean
  enableTiqueteras: boolean
  enablePlanificaciones: boolean
  enableAsistenciasQR: boolean
}

function normalizarTipoNegocio(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Devuelve la configuración terminológica y los feature flags de la UI
 * adaptados al vertical / tipo de negocio del estudio activo.
 */
export function getConfiguracionVertical(tipoNegocio?: string | null): ConfiguracionVertical {
  const norm = normalizarTipoNegocio(tipoNegocio)

  if (norm.includes('spin') || norm.includes('ciclis') || norm.includes('cycling') || norm.includes('bici') || norm.includes('indoor')) {
    return {
      verticalKey: 'spinning',
      etiquetaNegocio: 'Spinning',
      recursoSingular: 'Bicicleta',
      recursoPlural: 'Bicicletas',
      recursoCortoPlural: 'bicis',
      espacio: 'Sala',
      clienteSingular: 'Ciclista',
      clientePlural: 'Ciclistas',
      sesionSingular: 'Clase',
      sesionPlural: 'Clases',
      navMapaLabel: 'Mapa de Bicis',
      navRecursosLabel: 'Bicicletas',
      navHorariosLabel: 'Horarios y clases',
      navPlanificacionesLabel: 'Planificaciones',
      navPlanesLabel: 'Planes',
      navAsignarPlanesLabel: 'Asignar planes',
      navAsistenciasLabel: 'Asistencias',
      ejemploSesion: 'Power Cycling & Beats',
      showBicycleMap: true,
      showCourtManagement: false,
      showResourceMap: true,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('pilat') || norm.includes('reformer')) {
    return {
      verticalKey: 'pilates',
      etiquetaNegocio: 'Pilates',
      recursoSingular: 'Reformer',
      recursoPlural: 'Reformers',
      recursoCortoPlural: 'reformers',
      espacio: 'Estudio',
      clienteSingular: 'Alumno',
      clientePlural: 'Alumnos',
      sesionSingular: 'Clase',
      sesionPlural: 'Clases',
      navMapaLabel: 'Mapa de Reformers',
      navRecursosLabel: 'Reformers',
      navHorariosLabel: 'Horarios y clases',
      navPlanificacionesLabel: 'Planificaciones',
      navPlanesLabel: 'Planes y Tiqueteras',
      navAsignarPlanesLabel: 'Asignar planes',
      navAsistenciasLabel: 'Asistencias QR',
      ejemploSesion: 'Pilates Reformer Nivel 1',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: true,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('yoga') || norm.includes('medit')) {
    return {
      verticalKey: 'yoga',
      etiquetaNegocio: 'Yoga',
      recursoSingular: 'Esterilla',
      recursoPlural: 'Esterillas',
      recursoCortoPlural: 'esterillas',
      espacio: 'Salón',
      clienteSingular: 'Practicante',
      clientePlural: 'Practicantes',
      sesionSingular: 'Clase',
      sesionPlural: 'Clases',
      navMapaLabel: 'Mapa de Esterillas',
      navRecursosLabel: 'Esterillas',
      navHorariosLabel: 'Horarios y clases',
      navPlanificacionesLabel: 'Planificaciones',
      navPlanesLabel: 'Membresías y Planes',
      navAsignarPlanesLabel: 'Asignar planes',
      navAsistenciasLabel: 'Asistencias QR',
      ejemploSesion: 'Vinyasa Flow Amanecer',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: true,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('cancha') || norm.includes('deport') || norm.includes('padel') || norm.includes('tenis') || norm.includes('futbol') || norm.includes('billar')) {
    return {
      verticalKey: 'canchas',
      etiquetaNegocio: 'Canchas',
      recursoSingular: 'Cancha',
      recursoPlural: 'Canchas',
      recursoCortoPlural: 'canchas',
      espacio: 'Complejo',
      clienteSingular: 'Jugador',
      clientePlural: 'Jugadores',
      sesionSingular: 'Turno',
      sesionPlural: 'Turnos',
      navMapaLabel: 'Reservar Cancha',
      navRecursosLabel: 'Gestión de Canchas',
      navHorariosLabel: 'Horarios de Canchas',
      navPlanificacionesLabel: 'Turnos recurrentes',
      navPlanesLabel: 'Tarifas y Bonos',
      navAsignarPlanesLabel: 'Asignar bonos',
      navAsistenciasLabel: 'Check-in Turnos',
      ejemploSesion: 'Cancha Sintética #1',
      showBicycleMap: false,
      showCourtManagement: true,
      showResourceMap: true,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('crossfit') || norm.includes('funcional')) {
    return {
      verticalKey: 'crossfit',
      etiquetaNegocio: 'CrossFit',
      recursoSingular: 'Estación',
      recursoPlural: 'Estaciones',
      recursoCortoPlural: 'estaciones',
      espacio: 'Box',
      clienteSingular: 'Atleta',
      clientePlural: 'Atletas',
      sesionSingular: 'WOD',
      sesionPlural: 'WODs',
      navMapaLabel: 'Reservar WOD',
      navRecursosLabel: 'Estaciones',
      navHorariosLabel: 'Horarios y WODs',
      navPlanificacionesLabel: 'Planificaciones WOD',
      navPlanesLabel: 'Planes y Tiqueteras',
      navAsignarPlanesLabel: 'Asignar planes',
      navAsistenciasLabel: 'Asistencias QR',
      ejemploSesion: 'WOD MetCon 60m',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('gimnas') || norm.includes('gym') || norm.includes('entrena')) {
    return {
      verticalKey: 'gimnasio',
      etiquetaNegocio: 'Gimnasio',
      recursoSingular: 'Cupo',
      recursoPlural: 'Cupos',
      recursoCortoPlural: 'cupos',
      espacio: 'Centro',
      clienteSingular: 'Socio',
      clientePlural: 'Socios',
      sesionSingular: 'Turno',
      sesionPlural: 'Turnos',
      navMapaLabel: 'Reservar Turno',
      navRecursosLabel: 'Aforo y Cupos',
      navHorariosLabel: 'Franjas horarias',
      navPlanificacionesLabel: 'Programación',
      navPlanesLabel: 'Membresías',
      navAsignarPlanesLabel: 'Asignar membresías',
      navAsistenciasLabel: 'Control de ingreso',
      ejemploSesion: 'Entrenamiento Libre AM',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('barber')) {
    return {
      verticalKey: 'barberia',
      etiquetaNegocio: 'Barbería',
      recursoSingular: 'Sillón',
      recursoPlural: 'Sillones',
      recursoCortoPlural: 'sillones',
      espacio: 'Barbería',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      sesionSingular: 'Cita',
      sesionPlural: 'Citas',
      navMapaLabel: 'Agendar Cita',
      navRecursosLabel: 'Sillones',
      navHorariosLabel: 'Agenda de Citas',
      navPlanificacionesLabel: 'Horarios Barberos',
      navPlanesLabel: 'Servicios y Combos',
      navAsignarPlanesLabel: 'Asignar combos',
      navAsistenciasLabel: 'Recepción',
      ejemploSesion: 'Corte Clásico & Barba',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: false,
      enablePlanificaciones: false,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('bellez') || norm.includes('salon') || norm.includes('estetic')) {
    return {
      verticalKey: 'belleza',
      etiquetaNegocio: 'Salón de Belleza',
      recursoSingular: 'Estación',
      recursoPlural: 'Estaciones',
      recursoCortoPlural: 'estaciones',
      espacio: 'Salón',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      sesionSingular: 'Cita',
      sesionPlural: 'Citas',
      navMapaLabel: 'Agendar Cita',
      navRecursosLabel: 'Estaciones',
      navHorariosLabel: 'Agenda de Citas',
      navPlanificacionesLabel: 'Turnos de Estilistas',
      navPlanesLabel: 'Servicios y Paquetes',
      navAsignarPlanesLabel: 'Asignar paquetes',
      navAsistenciasLabel: 'Recepción',
      ejemploSesion: 'Corte & Colorimetría',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: false,
      enablePlanificaciones: false,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('spa') || norm.includes('masaj') || norm.includes('bienestar')) {
    return {
      verticalKey: 'spa',
      etiquetaNegocio: 'Spa & Masajes',
      recursoSingular: 'Cabina',
      recursoPlural: 'Cabinas',
      recursoCortoPlural: 'cabinas',
      espacio: 'Spa',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      sesionSingular: 'Sesión',
      sesionPlural: 'Sesiones',
      navMapaLabel: 'Reservar Cabina',
      navRecursosLabel: 'Cabinas',
      navHorariosLabel: 'Agenda de Sesiones',
      navPlanificacionesLabel: 'Horarios Terapeutas',
      navPlanesLabel: 'Tratamientos y Bonos',
      navAsignarPlanesLabel: 'Asignar bonos',
      navAsistenciasLabel: 'Recepción',
      ejemploSesion: 'Masaje Relajante 60m',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: true,
      enablePlanificaciones: false,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('consult') || norm.includes('medic') || norm.includes('salud') || norm.includes('terap') || norm.includes('psicolog') || norm.includes('odonto')) {
    return {
      verticalKey: 'consultorio',
      etiquetaNegocio: 'Consultorio',
      recursoSingular: 'Consultorio',
      recursoPlural: 'Consultorios',
      recursoCortoPlural: 'consultorios',
      espacio: 'Clínica',
      clienteSingular: 'Paciente',
      clientePlural: 'Pacientes',
      sesionSingular: 'Consulta',
      sesionPlural: 'Consultas',
      navMapaLabel: 'Agendar Consulta',
      navRecursosLabel: 'Consultorios',
      navHorariosLabel: 'Agenda Médica',
      navPlanificacionesLabel: 'Horarios de Atención',
      navPlanesLabel: 'Servicios y Consultas',
      navAsignarPlanesLabel: 'Asignar paquetes',
      navAsistenciasLabel: 'Control de Pacientes',
      ejemploSesion: 'Consulta General',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: false,
      enablePlanificaciones: false,
      enableAsistenciasQR: true,
    }
  }

  if (norm.includes('danz') || norm.includes('baile')) {
    return {
      verticalKey: 'danza',
      etiquetaNegocio: 'Danza / Baile',
      recursoSingular: 'Cupo',
      recursoPlural: 'Cupos',
      recursoCortoPlural: 'cupos',
      espacio: 'Academia',
      clienteSingular: 'Alumno',
      clientePlural: 'Alumnos',
      sesionSingular: 'Clase',
      sesionPlural: 'Clases',
      navMapaLabel: 'Reservar Clase',
      navRecursosLabel: 'Salones',
      navHorariosLabel: 'Horarios y clases',
      navPlanificacionesLabel: 'Planificaciones',
      navPlanesLabel: 'Planes y Tiqueteras',
      navAsignarPlanesLabel: 'Asignar planes',
      navAsistenciasLabel: 'Asistencias QR',
      ejemploSesion: 'Salsa & Ritmos Latinos',
      showBicycleMap: false,
      showCourtManagement: false,
      showResourceMap: false,
      enableTiqueteras: true,
      enablePlanificaciones: true,
      enableAsistenciasQR: true,
    }
  }

  return {
    verticalKey: 'general',
    etiquetaNegocio: tipoNegocio?.trim() || 'Estudio',
    recursoSingular: 'Puesto',
    recursoPlural: 'Puestos',
    recursoCortoPlural: 'puestos',
    espacio: 'Sala',
    clienteSingular: 'Cliente',
    clientePlural: 'Clientes',
    sesionSingular: 'Sesión',
    sesionPlural: 'Sesiones',
    navMapaLabel: 'Reservar Cupo',
    navRecursosLabel: 'Espacios',
    navHorariosLabel: 'Horarios y sesiones',
    navPlanificacionesLabel: 'Planificaciones',
    navPlanesLabel: 'Planes y Paquetes',
    navAsignarPlanesLabel: 'Asignar planes',
    navAsistenciasLabel: 'Asistencias',
    ejemploSesion: 'Sesión Principal',
    showBicycleMap: false,
    showCourtManagement: false,
    showResourceMap: false,
    enableTiqueteras: true,
    enablePlanificaciones: true,
    enableAsistenciasQR: true,
  }
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
  verticalConfig: ConfiguracionVertical
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

const DEFAULT_ESTUDIO_ACTIVO: EstudioInfo = {
  id: 'e1000000-0000-0000-0000-000000000001',
  nombre: 'Reserly',
  slug: 'reserly',
  tipo_negocio: 'Spinning / Ciclismo indoor',
  logo_url: '/LogoReserly.png',
  color_primario: '#DC2626',
  color_secundario: '#991B1B',
  direccion: 'Calle 85 # 12-40, Zona Rosa, Bogotá',
  telefono: '+57 310 123 4567',
  email: 'contacto@reserly.com',
  capacidad_sala: 15,
  activo: true,
}

function readStoredEstudioActivo(): EstudioInfo | null {
  if (typeof window === 'undefined') return DEFAULT_ESTUDIO_ACTIVO
  const stored = localStorage.getItem('rtc_estudio_activo')
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as EstudioInfo
      if (parsed && (parsed.nombre === 'RuedaPro' || parsed.logo_url === '/logo-ruedapro.png')) {
        parsed.nombre = 'Reserly'
        parsed.slug = 'reserly'
        parsed.logo_url = '/LogoReserly.png'
        parsed.tipo_negocio = parsed.tipo_negocio || 'Spinning / Ciclismo indoor'
        localStorage.setItem('rtc_estudio_activo', JSON.stringify(parsed))
      }
      if (parsed && parsed.id === DEFAULT_ESTUDIO_ACTIVO.id && !parsed.tipo_negocio) {
        parsed.tipo_negocio = DEFAULT_ESTUDIO_ACTIVO.tipo_negocio
        localStorage.setItem('rtc_estudio_activo', JSON.stringify(parsed))
      }
      return parsed
    } catch {
      return null
    }
  }
  return DEFAULT_ESTUDIO_ACTIVO
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [estudioActivo, setEstudioActivoState] = useState<EstudioInfo | null>(() => readStoredEstudioActivo())

  const [studioName, setStudioName] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedEstudio = readStoredEstudioActivo()
      if (storedEstudio?.nombre) return storedEstudio.nombre
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
      const storedEstudio = readStoredEstudioActivo()
      if (storedEstudio?.color_primario) return storedEstudio.color_primario
      return localStorage.getItem('rtc_custom_hex') || '#DC2626'
    }
    return '#DC2626'
  })

  const [logoUrl, setLogoUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hasStoredEstudio = Boolean(localStorage.getItem('rtc_estudio_activo'))
      if (hasStoredEstudio) {
        const storedEstudio = readStoredEstudioActivo()
        return storedEstudio?.logo_url ?? null
      }
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
      const storedEstudio = readStoredEstudioActivo()
      if (storedEstudio?.id) return storedEstudio.id
      return localStorage.getItem('rtc_empresa_id') || DEFAULT_ESTUDIO_ACTIVO.id
    }
    return DEFAULT_ESTUDIO_ACTIVO.id
  })

  const verticalConfig = React.useMemo(
    () => getConfiguracionVertical(estudioActivo?.tipo_negocio),
    [estudioActivo?.tipo_negocio]
  )

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
    const estudioCompleto: EstudioInfo = {
      ...estudio,
      email: estudio.email ?? null,
      telefono: estudio.telefono ?? null,
      tipo_negocio: estudio.tipo_negocio ?? null,
    }
    setEstudioActivoState(estudioCompleto)
    setEmpresaIdState(estudioCompleto.id)
    setStudioName(estudioCompleto.nombre)
    setLogoUrl(estudioCompleto.logo_url || null)
    setCustomPrimaryColor(estudioCompleto.color_primario || '#DC2626')

    if (typeof window !== 'undefined') {
      localStorage.setItem('rtc_estudio_activo', JSON.stringify(estudioCompleto))
      localStorage.setItem('rtc_empresa_id', estudioCompleto.id)
      localStorage.setItem('rtc_studio_name', estudioCompleto.nombre)
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
        verticalConfig,
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
