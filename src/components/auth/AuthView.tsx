import React, { useState, useEffect, useMemo } from 'react'
import {
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Sparkles,
  PartyPopper,
  Zap,
  Smartphone,
  ShieldCheck,
  Activity,
  Layers,
  LayoutGrid,
  Stethoscope,
  Scissors,
  Dumbbell,
  Check,
  ExternalLink,
  Copy,
  Image as ImageIcon,
  Palette,
  Upload,
  MapPin,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBranding } from '@/context/BrandingContext'
import { authService, type RegisterStudioResult } from '@/services/authService'
import type { Tables } from '@/types/database'

export interface AuthViewProps {
  onAuthSuccess: (userProfile: Tables<'perfiles'> | null) => void
  initialMode?: 'signin' | 'signup' | 'register-studio'
  initialRubro?: string
  onSkipToDemo?: (rol: 'cliente' | 'admin') => void
  onClose?: () => void
  onNavigateToStudioPortal?: (slugOrId: string) => void
}

export interface RubroInfo {
  id: string
  label: string
  shortLabel: string
  icon: React.ElementType
  defaultImage: string
  sampleTitle: string
  sampleSubtitle: string
}

export const RUBROS_CATALOG: RubroInfo[] = [
  {
    id: 'Spinning / Ciclismo indoor',
    label: 'Spinning / Ciclismo',
    shortLabel: 'Spinning',
    icon: Activity,
    defaultImage: '/Sppining.png',
    sampleTitle: 'Velox Cycle Club',
    sampleSubtitle: 'Sala indoor con 15 bicis de alta potencia',
  },
  {
    id: 'Pilates / Yoga',
    label: 'Pilates / Yoga',
    shortLabel: 'Pilates & Yoga',
    icon: Layers,
    defaultImage: '/Pilates.png',
    sampleTitle: 'Zenith Pilates Studio',
    sampleSubtitle: 'Reformer & Mat con cupos exclusivos',
  },
  {
    id: 'Canchas Deportivas',
    label: 'Canchas Deportivas',
    shortLabel: 'Canchas',
    icon: LayoutGrid,
    defaultImage: '/Cancha.png',
    sampleTitle: 'Complejo Deportivo Elite',
    sampleSubtitle: 'Turnos de Pádel, Fútbol 5 y Tenis',
  },
  {
    id: 'Consultorio / Salud',
    label: 'Consultorio / Salud',
    shortLabel: 'Salud',
    icon: Stethoscope,
    defaultImage: '/Consulta_profesional.png',
    sampleTitle: 'Centro Médico & Fisioterapia',
    sampleSubtitle: 'Agendamiento y control de citas clínicas',
  },
  {
    id: 'Salón / Spa / Belleza',
    label: 'Salón / Spa / Belleza',
    shortLabel: 'Belleza & Spa',
    icon: Scissors,
    defaultImage: '/Salon-de-Belleza.png',
    sampleTitle: 'Luxe Beauty Lounge',
    sampleSubtitle: 'Estilismo, manicure y cuidado estético',
  },
  {
    id: 'Gimnasio / Fitness',
    label: 'Gimnasio / Fitness',
    shortLabel: 'Gimnasio',
    icon: Dumbbell,
    defaultImage: '/Gym.png',
    sampleTitle: 'Ironbox Fitness Center',
    sampleSubtitle: 'Musculación, WODs y pases libres',
  },
  {
    id: 'Otro',
    label: 'Otro',
    shortLabel: 'Servicios',
    icon: Building2,
    defaultImage: '/Sppining.png',
    sampleTitle: 'Reserly Studio Hub',
    sampleSubtitle: 'Reservas inteligentes para cualquier espacio',
  },
]

export const COLOR_PRESETS = [
  {
    id: 'red',
    name: 'Rojo Reserly',
    hex: '#DC2626',
    bg: 'bg-red-600',
    ring: 'ring-red-600',
  },
  {
    id: 'blue',
    name: 'Azul Real',
    hex: '#2563EB',
    bg: 'bg-blue-600',
    ring: 'ring-blue-600',
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    hex: '#059669',
    bg: 'bg-emerald-600',
    ring: 'ring-emerald-600',
  },
  {
    id: 'purple',
    name: 'Violeta',
    hex: '#7C3AED',
    bg: 'bg-purple-600',
    ring: 'ring-purple-600',
  },
  {
    id: 'amber',
    name: 'Ámbar',
    hex: '#D97706',
    bg: 'bg-amber-600',
    ring: 'ring-amber-600',
  },
  {
    id: 'obsidian',
    name: 'Negro Obsidiana',
    hex: '#0F172A',
    bg: 'bg-slate-900',
    ring: 'ring-slate-900',
  },
]

function mapInitialRubro(rubro?: string): RubroInfo {
  if (!rubro) return RUBROS_CATALOG[0]
  const lower = rubro.toLowerCase()
  if (lower.includes('spin') || lower.includes('ciclis')) return RUBROS_CATALOG[0]
  if (lower.includes('pilat') || lower.includes('yoga') || lower.includes('medita')) return RUBROS_CATALOG[1]
  if (lower.includes('cancha') || lower.includes('padel') || lower.includes('futbol') || lower.includes('deport')) return RUBROS_CATALOG[2]
  if (lower.includes('consultorio') || lower.includes('salud') || lower.includes('medic') || lower.includes('terap')) return RUBROS_CATALOG[3]
  if (lower.includes('belleza') || lower.includes('salon') || lower.includes('spa') || lower.includes('barber')) return RUBROS_CATALOG[4]
  if (lower.includes('gimnas') || lower.includes('gym') || lower.includes('fitness') || lower.includes('crossfit')) return RUBROS_CATALOG[5]
  return RUBROS_CATALOG[6]
}

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthSuccess,
  initialMode = 'signin',
  initialRubro,
  onSkipToDemo,
  onClose,
  onNavigateToStudioPortal,
}) => {
  const {
    isSingleTenant,
    empresaId,
    studioName,
    estudioActivo,
    setEstudioActivo,
    setStudioName,
    setCustomPrimaryColor,
    setLogoUrl,
    setPortadaUrl,
  } = useBranding()

  // Modo principal: 'signin' | 'signup' | 'register-studio'
  const [mode, setMode] = useState<'signin' | 'signup' | 'register-studio'>(
    isSingleTenant && initialMode === 'register-studio' ? 'signin' : initialMode
  )

  // Paso del flujo "Crear Estudio": 1 = Cuenta y Negocio, 2 = Identidad Visual, 3 = Felicitaciones / Éxito
  const [studioStep, setStudioStep] = useState<1 | 2 | 3>(1)

  // Estado de carga y mensajes
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Campos de formulario para Alumno / Sesión
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')

  // Campos de formulario para Crear Estudio
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [selectedRubro, setSelectedRubro] = useState<RubroInfo>(() => mapInitialRubro(initialRubro))
  const [nombreAdmin, setNombreAdmin] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [telefono, setTelefono] = useState('')

  // Campos de Identidad Visual (Paso 2)
  const [colorPrimario, setColorPrimario] = useState<string>(COLOR_PRESETS[0].hex)
  const [logoInputUrl, setLogoInputUrl] = useState<string>('')
  const [portadaInputUrl, setPortadaInputUrl] = useState<string>('')

  // Datos del estudio recién creado (para la pantalla de bienvenida)
  const [createdStudioResult, setCreatedStudioResult] = useState<RegisterStudioResult | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Sincronizar modo inicial si cambia prop
  useEffect(() => {
    if (initialMode) {
      setMode(isSingleTenant && initialMode === 'register-studio' ? 'signin' : initialMode)
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [initialMode, isSingleTenant])

  useEffect(() => {
    if (initialRubro) {
      setSelectedRubro(mapInitialRubro(initialRubro))
    }
  }, [initialRubro])

  // Portada activa en la previsualización
  const previewPortada = useMemo(() => {
    if (portadaInputUrl.trim()) return portadaInputUrl.trim()
    return selectedRubro.defaultImage
  }, [portadaInputUrl, selectedRubro])

  // Logo activo en la previsualización
  const previewLogo = useMemo(() => {
    if (logoInputUrl.trim()) return logoInputUrl.trim()
    return null
  }, [logoInputUrl])

  // Handler: Iniciar Sesión
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña')
      return
    }

    setLoading(true)
    try {
      const res = await authService.signIn({
        email: email.trim(),
        password,
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo...')
        setTimeout(() => {
          onAuthSuccess(res.data?.perfil || null)
        }, 400)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // Handler: Registro Simplificado de Alumno (3 campos)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!nombreCompleto.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo')
      return
    }
    if (!email.trim()) {
      setErrorMessage('Por favor ingresa un correo electrónico válido')
      return
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const res = await authService.signUp({
        email: email.trim(),
        password,
        nombreCompleto: nombreCompleto.trim(),
        empresaId: isSingleTenant && empresaId ? empresaId : undefined,
        rol: 'cliente',
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        const signInRes = await authService.signIn({ email: email.trim(), password })
        const perfil = signInRes.data?.perfil || res.data?.perfil
        if (perfil) {
          setSuccessMessage('¡Cuenta creada con éxito! Redirigiendo a tus reservas...')
          setTimeout(() => {
            onAuthSuccess(perfil)
          }, 400)
        } else {
          setSuccessMessage('¡Cuenta creada con éxito! Ya puedes iniciar sesión.')
          setMode('signin')
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado durante el registro')
    } finally {
      setLoading(false)
    }
  }

  // Handler: Validación y avance al Paso 2 de Crear Estudio
  const handleContinueToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nombreNegocio.trim()) {
      setErrorMessage('Por favor ingresa el nombre de tu estudio o negocio')
      return
    }
    if (!nombreAdmin.trim()) {
      setErrorMessage('Por favor ingresa el nombre del administrador')
      return
    }
    if (!adminEmail.trim()) {
      setErrorMessage('Por favor ingresa un correo electrónico profesional')
      return
    }
    if (adminPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setStudioStep(2)
  }

  // Handler: Crear Estudio Definitivo (Paso 2 o Skip)
  const handleFinalizeStudio = async (skipVisualIdentity: boolean = false) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const chosenColor = skipVisualIdentity ? COLOR_PRESETS[0].hex : colorPrimario
      const chosenLogo = skipVisualIdentity ? null : (logoInputUrl.trim() || null)
      const chosenPortada = skipVisualIdentity
        ? selectedRubro.defaultImage
        : (portadaInputUrl.trim() || selectedRubro.defaultImage)

      const res = await authService.registerStudio({
        nombreNegocio: nombreNegocio.trim(),
        tipoNegocio: selectedRubro.id,
        nombreAdmin: nombreAdmin.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        telefono: telefono.trim() || null,
        color_primario: chosenColor,
        color_secundario: chosenColor,
        logo_url: chosenLogo,
        portada_url: chosenPortada,
      })

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Error al crear el estudio')
        setLoading(false)
        return
      }

      // Sincronizar contexto de Branding
      setCreatedStudioResult(res.data)
      setStudioName(res.data.empresa.nombre)
      setCustomPrimaryColor(chosenColor)
      if (chosenLogo) setLogoUrl(chosenLogo)
      if (chosenPortada) setPortadaUrl(chosenPortada)

      setEstudioActivo({
        id: res.data.empresa.id,
        nombre: res.data.empresa.nombre,
        slug: res.data.empresa.slug,
        tipo_negocio: res.data.empresa.tipo_negocio,
        logo_url: res.data.empresa.logo_url,
        portada_url: res.data.empresa.portada_url,
        color_primario: res.data.empresa.color_primario,
        color_secundario: res.data.empresa.color_secundario,
        direccion: res.data.empresa.direccion,
        telefono: res.data.empresa.telefono,
        email: res.data.empresa.email,
        capacidad_sala: res.data.empresa.capacidad_sala || 15,
        activo: true,
      })

      // Pasar a la pantalla de felicitaciones
      setStudioStep(3)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado al registrar el estudio')
    } finally {
      setLoading(false)
    }
  }

  // Handler de carga local de archivos de imagen para Logo o Portada
  const handleLocalImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'portada'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        if (target === 'logo') setLogoInputUrl(dataUrl)
        if (target === 'portada') setPortadaInputUrl(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  // Copiar link de estudio al portapapeles
  const handleCopyStudioLink = () => {
    if (!createdStudioResult?.empresa?.slug) return
    const url = `${window.location.origin}/?estudio=${createdStudioResult.empresa.slug}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className="min-h-screen w-full bg-background grid grid-cols-1 lg:grid-cols-12 selection:bg-red-500/20">
      {/* =========================================================================
          COLUMNA IZQUIERDA: Formulario, Pasos, Navegación y Bienvenida (7 cols en Desktop)
      ========================================================================= */}
      <div className="col-span-12 lg:col-span-7 flex flex-col justify-between min-h-screen p-5 sm:p-8 lg:p-12 xl:p-16 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Cabecera superior con botón Volver y Logo */}
          <div className="flex items-center justify-between gap-4">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer group py-1.5 px-2.5 rounded-lg hover:bg-muted"
                aria-label="Volver a Reserly"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Volver a Reserly</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <img
                src="/Logo_sin_fondo.png"
                alt="Reserly"
                className="h-7 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span className="font-black text-base tracking-tight text-foreground">
                Reserly<span className="text-red-600">.</span>
              </span>
            </div>
          </div>

          {/* =====================================================================
              CASO: PANTALLA DE FELICITACIONES (Paso 3 completado)
          ===================================================================== */}
          {mode === 'register-studio' && studioStep === 3 && createdStudioResult && (
            <div className="py-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="relative inline-flex items-center justify-center mx-auto">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-red-500/20"
                  style={{ backgroundColor: colorPrimario }}
                >
                  <PartyPopper className="w-10 h-10 animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-3 py-1 text-xs">
                  ¡Estudio Creado Exitosamente!
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  ¡Bienvenido a Reserly, {createdStudioResult.empresa.nombre}!
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Tu plataforma exclusiva de reservas y gestión ya está configurada con periodo de
                  prueba por 30 días.
                </p>
              </div>

              {/* Tarjeta de enlace público */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/40 text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Enlace público de tu estudio:</span>
                  <span className="text-[11px] font-mono bg-background px-2 py-0.5 rounded-md border">
                    {selectedRubro.shortLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-background border font-mono text-xs text-foreground truncate select-all">
                    reserly.app/?estudio={createdStudioResult.empresa.slug}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyStudioLink}
                    className="shrink-0 h-9 gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Botones de acción directa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => onAuthSuccess(createdStudioResult.perfil)}
                  className="w-full h-12 text-sm font-bold shadow-lg shadow-red-600/20 text-white cursor-pointer transition-all hover:opacity-95"
                  style={{ backgroundColor: colorPrimario }}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  <span>Ir a mi Panel de Control</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (onNavigateToStudioPortal && createdStudioResult.empresa.slug) {
                      onNavigateToStudioPortal(createdStudioResult.empresa.slug)
                    } else {
                      onAuthSuccess(createdStudioResult.perfil)
                    }
                  }}
                  className="w-full h-12 text-sm font-bold border-2 cursor-pointer hover:bg-muted"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <span>Ver mi Página de Reservas</span>
                </Button>
              </div>
            </div>
          )}

          {/* =====================================================================
              CASO: MODOS NORMALES (Iniciar Sesión, Soy Alumno, Crear Estudio Pasos 1 y 2)
          ===================================================================== */}
          {!(mode === 'register-studio' && studioStep === 3) && (
            <div className="space-y-6">
              {/* Barra de Pestañas de Navegación Estilizadas */}
              <div className="flex gap-1.5 p-1.5 bg-muted/70 rounded-2xl border border-border/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin')
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer font-bold ${
                    mode === 'signin'
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer font-bold ${
                    mode === 'signup'
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Soy Alumno
                </button>
                {!isSingleTenant && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register-studio')
                      setStudioStep(1)
                      setErrorMessage(null)
                      setSuccessMessage(null)
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer font-bold ${
                      mode === 'register-studio'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Crear Estudio
                  </button>
                )}
              </div>

              {/* Título y Descripción de la vista */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {mode === 'register-studio' && (
                    <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-bold tracking-wider">
                      <Sparkles className="w-3 h-3 mr-1" /> 30 Días de Prueba Gratis
                    </Badge>
                  )}
                  {mode === 'signin' && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Acceso Plataforma
                    </Badge>
                  )}
                  {mode === 'signup' && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Registro de Alumno
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {mode === 'signin' && '¡Hola de nuevo! Ingresa a tu cuenta'}
                  {mode === 'signup' && 'Regístrate para reservar tus clases'}
                  {mode === 'register-studio' &&
                    (studioStep === 1
                      ? 'Lanza tu estudio en menos de 2 minutos'
                      : 'Personaliza la identidad visual de tu negocio')}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {mode === 'signin' && 'Administra tu negocio o reserva en tu centro favorito.'}
                  {mode === 'signup' &&
                    'Acceso instantáneo a mapas de puestos, horarios y compras seguras.'}
                  {mode === 'register-studio' &&
                    (studioStep === 1
                      ? 'Crea tu cuenta administradora y selecciona la disciplina de tu estudio.'
                      : 'Añade tu logotipo, portada y elige tu paleta corporativa (puedes omitirlo y editarlo luego).')}
                </p>
              </div>

              {/* Barra de progreso para Crear Estudio (Paso 1 y 2) */}
              {mode === 'register-studio' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className={studioStep >= 1 ? 'text-foreground font-bold' : ''}>
                      1. Cuenta y Negocio
                    </span>
                    <span className={studioStep >= 2 ? 'text-foreground font-bold' : ''}>
                      2. Identidad Visual (Opcional)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="h-full bg-red-600 transition-all duration-300 rounded-full"
                      style={{ width: studioStep === 1 ? '50%' : '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Mensajes de Alerta y Éxito */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* =================================================================
                  FORMULARIO 1: INICIAR SESIÓN
              ================================================================= */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Correo Electrónico
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="admin@tuempresa.com o tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      Contraseña
                    </label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 cursor-pointer transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <span>Ingresar a Reserly</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* =================================================================
                  FORMULARIO 2: REGISTRO SIMPLIFICADO DE ALUMNO (3 Campos)
              ================================================================= */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {isSingleTenant && (
                    <div className="p-3 rounded-xl border bg-muted/40 text-xs flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="text-muted-foreground">
                        Inscribiéndote en:{' '}
                        <strong className="text-foreground">
                          {studioName || estudioActivo?.nombre || 'Estudio Oficial'}
                        </strong>
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Nombre Completo *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Ej. Sofía Valderrama"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Correo Electrónico *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="alumno@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      Contraseña *
                    </label>
                    <Input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 cursor-pointer transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creando cuenta...
                      </>
                    ) : (
                      <>
                        <span>Crear Cuenta de Alumno</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* =================================================================
                  FORMULARIO 3: CREAR ESTUDIO - PASO 1 (Cuenta y Negocio)
              ================================================================= */}
              {mode === 'register-studio' && studioStep === 1 && (
                <form onSubmit={handleContinueToStep2} className="space-y-4">
                  {/* Nombre del Estudio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      Nombre de tu Estudio / Negocio *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Ej. Studio Velox, Zen Yoga, Padel Center..."
                      value={nombreNegocio}
                      onChange={(e) => setNombreNegocio(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {/* Selector visual de Rubro */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Disciplina o Rubro Principal *</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {selectedRubro.shortLabel}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RUBROS_CATALOG.map((rubro) => {
                        const Icon = rubro.icon
                        const isSelected = selectedRubro.id === rubro.id
                        return (
                          <button
                            key={rubro.id}
                            type="button"
                            onClick={() => setSelectedRubro(rubro)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                              isSelected
                                ? 'border-red-600 bg-red-500/10 text-foreground ring-1 ring-red-600'
                                : 'border-border/80 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Icon
                                className={`w-4 h-4 ${
                                  isSelected ? 'text-red-600' : 'text-muted-foreground'
                                }`}
                              />
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-red-600" />
                              )}
                            </div>
                            <span className="text-xs font-bold leading-tight line-clamp-1">
                              {rubro.shortLabel}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Datos del Administrador */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        Tu Nombre Completo *
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="Ej. Carlos Mendoza"
                        value={nombreAdmin}
                        onChange={(e) => setNombreAdmin(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        Teléfono / WhatsApp
                      </label>
                      <Input
                        type="tel"
                        placeholder="Ej. +57 300 123 4567"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        Correo Profesional *
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="admin@tuempresa.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        Contraseña Segura *
                      </label>
                      <Input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 cursor-pointer transition-all mt-2"
                  >
                    <span>Continuar a Identidad Visual</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>
              )}

              {/* =================================================================
                  FORMULARIO 4: CREAR ESTUDIO - PASO 2 (Identidad Visual Opcional)
              ================================================================= */}
              {mode === 'register-studio' && studioStep === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Selector de Paleta de Color Corporativo */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                      Color Primario de tu Marca
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {COLOR_PRESETS.map((color) => {
                        const isSelected = colorPrimario.toLowerCase() === color.hex.toLowerCase()
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setColorPrimario(color.hex)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-foreground bg-muted font-bold ring-2 ring-foreground/20'
                                : 'border-border/60 hover:bg-muted/50'
                            }`}
                          >
                            <span
                              className="w-6 h-6 rounded-full shadow-xs flex items-center justify-center text-white"
                              style={{ backgroundColor: color.hex }}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate w-full text-center">
                              {color.name.split(' ')[0]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Subida o URL de Logotipo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        Logotipo del Estudio (Opcional)
                      </span>
                      {logoInputUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoInputUrl('')}
                          className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://... o sube un archivo"
                        value={logoInputUrl}
                        onChange={(e) => setLogoInputUrl(e.target.value)}
                        className="h-10 rounded-xl text-xs"
                      />
                      <label className="h-10 px-3 rounded-xl border bg-muted/60 hover:bg-muted flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLocalImageUpload(e.target.value ? e : e, 'logo')}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Subida o URL de Portada */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        Portada o Fondo (Opcional)
                      </span>
                      {portadaInputUrl && (
                        <button
                          type="button"
                          onClick={() => setPortadaInputUrl('')}
                          className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          Usar imagen del rubro
                        </button>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://... o sube una imagen"
                        value={portadaInputUrl}
                        onChange={(e) => setPortadaInputUrl(e.target.value)}
                        className="h-10 rounded-xl text-xs"
                      />
                      <label className="h-10 px-3 rounded-xl border bg-muted/60 hover:bg-muted flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLocalImageUpload(e, 'portada')}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Acciones del Paso 2: Volver, Omitir y Finalizar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStudioStep(1)}
                      className="w-full sm:w-auto h-11 text-xs font-semibold text-muted-foreground cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                      Atrás
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleFinalizeStudio(true)}
                      className="w-full sm:flex-1 h-11 rounded-xl text-xs font-bold cursor-pointer hover:bg-muted"
                    >
                      Omitir por ahora
                    </Button>

                    <Button
                      type="button"
                      disabled={loading}
                      onClick={() => handleFinalizeStudio(false)}
                      className="w-full sm:flex-1 h-11 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 cursor-pointer transition-all"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Creando estudio...
                        </>
                      ) : (
                        <>
                          <span>Finalizar y Crear Estudio</span>
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Enlaces de alternancia inferior */}
              <div className="pt-4 border-t border-border/60 text-center text-xs text-muted-foreground space-y-1.5">
                {mode === 'signin' && (
                  <p>
                    ¿Eres nuevo alumno?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup')
                        setErrorMessage(null)
                      }}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Regístrate gratis
                    </button>
                    {!isSingleTenant && (
                      <>
                        {' '}
                        o{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setMode('register-studio')
                            setStudioStep(1)
                            setErrorMessage(null)
                          }}
                          className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          Crea tu Estudio
                        </button>
                      </>
                    )}
                  </p>
                )}

                {mode === 'signup' && (
                  <p>
                    ¿Ya tienes una cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin')
                        setErrorMessage(null)
                      }}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Inicia Sesión
                    </button>
                  </p>
                )}

                {mode === 'register-studio' && (
                  <p>
                    ¿Ya registraste tu negocio?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin')
                        setErrorMessage(null)
                      }}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Inicia sesión como administrador
                    </button>
                  </p>
                )}

                {onSkipToDemo && (
                  <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <span>Acceso rápido:</span>
                    <button
                      type="button"
                      onClick={() => onSkipToDemo('cliente')}
                      className="hover:underline font-semibold text-primary cursor-pointer"
                    >
                      Demo Alumno
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => onSkipToDemo('admin')}
                      className="hover:underline font-semibold text-primary cursor-pointer"
                    >
                      Demo Admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer simple de seguridad */}
        <div className="w-full max-w-xl mx-auto pt-8 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Plataforma protegida con cifrado SSL y Supabase Row Level Security</span>
        </div>
      </div>

      {/* =========================================================================
          COLUMNA DERECHA: Vista Previa en Vivo y Beneficios Clave (5 cols en Desktop)
      ========================================================================= */}
      <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-6 sm:p-10 lg:p-12 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between relative overflow-hidden">
        {/* Glow de fondo decorativo */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: colorPrimario }}
        />

        {/* Encabezado del Mockup */}
        <div className="relative z-10 space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vista Previa en Vivo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Así experimentarán tus clientes tu marca
          </h2>
          <p className="text-xs text-slate-400">
            Los cambios de nombre, color y portada se reflejan de inmediato en tu portal y app móvil.
          </p>
        </div>

        {/* Mockup Realista de Smartphone Moderno (iPhone Style de Alta Fidelidad) */}
        <div className="relative z-10 w-full max-w-sm mx-auto my-auto py-2">
          <div className="relative mx-auto w-[310px] sm:w-[325px] rounded-[42px] border-[8px] border-slate-900 bg-slate-950 p-3 shadow-2xl shadow-slate-900/60">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-4.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-end px-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            {/* Pantalla Interna del Celular */}
            <div className="relative h-[530px] rounded-[30px] bg-slate-950 text-white overflow-hidden flex flex-col justify-between select-none border border-slate-800/80">
              {/* Sección Superior: Banner de Portada + Barra de Estado + Logo Superpuesto */}
              <div className="relative">
                {/* Banner de Portada Superior */}
                <div className="relative h-28 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={previewPortada}
                    alt="Portada del estudio en móvil"
                    className="w-full h-full object-cover opacity-90 transition-all duration-300"
                    onError={(e) => {
                      e.currentTarget.src = selectedRubro.defaultImage
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/60" />

                  {/* Barra de Estado del Móvil (superpuesta en el banner) */}
                  <div className="relative z-20 flex items-center justify-between text-[10px] font-mono text-white/90 px-4 pt-2">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span>5G</span>
                      <div className="w-4 h-2 border border-white/70 rounded-xs flex items-center p-0.5">
                        <div className="w-full h-full bg-emerald-400 rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* Badge de Rubro sobre la portada */}
                  <div className="absolute top-7 right-3 z-20">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white shadow-xs uppercase tracking-wider backdrop-blur-xs border border-white/20 transition-colors"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {selectedRubro.shortLabel}
                    </span>
                  </div>
                </div>

                {/* Superposición de Logo y Datos del Estudio */}
                <div className="relative px-3 -mt-7 z-20 flex items-end gap-2.5">
                  {/* Logotipo del Estudio */}
                  <div className="w-13 h-13 rounded-2xl bg-white p-1 flex items-center justify-center border-2 border-slate-900 shadow-xl shrink-0 overflow-hidden">
                    {previewLogo ? (
                      <img
                        src={previewLogo}
                        alt="Logo móvil"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-xl flex items-center justify-center font-black text-white text-base shadow-inner transition-colors"
                        style={{ backgroundColor: colorPrimario }}
                      >
                        {(nombreNegocio || selectedRubro.sampleTitle).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Nombre y Ubicación */}
                  <div className="flex-1 min-w-0 pb-1">
                    <h3 className="text-sm font-black text-white truncate leading-tight drop-shadow-sm">
                      {nombreNegocio.trim() || selectedRubro.sampleTitle}
                    </h3>
                    <div className="inline-flex items-center gap-1 text-[10px] text-slate-300 mt-0.5 truncate max-w-full">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                      <span className="truncate">{selectedRubro.sampleSubtitle || 'Sede Principal • Abierto hoy'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Próxima Sesión / Disponibilidad en Vivo */}
              <div className="px-3 my-auto space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" style={{ color: colorPrimario }} />
                      <span className="truncate">{selectedRubro.label}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                      18:30 hrs
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-300 truncate">
                    Coach Certificado • Sesión guiada de alta intensidad
                  </p>

                  <div className="pt-1.5 border-t border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Disponibilidad en vivo</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Cupos Disponibles
                      </span>
                    </div>

                    <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: '80%', backgroundColor: colorPrimario }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Aforo Controlado</span>
                      <span className="text-amber-300">4.9 ★ (120+)</span>
                    </div>
                  </div>
                </div>

                {/* Botón CTA móvil teñido con color primario */}
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: colorPrimario }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reservar Cupo Ahora</span>
                </button>
              </div>

              {/* Barra inferior de navegación del móvil */}
              <div className="px-3 pb-2.5">
                <div className="pt-2 border-t border-white/10 flex items-center justify-around text-slate-400 text-[10px]">
                  <div className="flex flex-col items-center gap-0.5 font-bold" style={{ color: colorPrimario }}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="text-[9px]">Clases</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-slate-500">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[9px]">Planes</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-slate-500">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="text-[9px]">Pase QR</span>
                  </div>
                </div>

                {/* Home indicator bar del iPhone */}
                <div className="w-24 h-1 bg-white/30 rounded-full mx-auto mt-2" />
              </div>
            </div>
          </div>

          {/* Nota discreta al pie */}
          <p className="text-center text-[10px] text-slate-400 mt-2.5 px-2 italic">
            Podrás personalizar y actualizar todos estos datos en cualquier momento desde Marca Blanca
          </p>
        </div>

        {/* 3 Píldoras de Beneficios Clave */}
        <div className="relative z-10 space-y-2.5 pt-6 mt-6 border-t border-slate-800">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <strong className="text-white">Listo en 2 minutos:</strong>{' '}
              <span className="text-slate-400">Sin instalaciones complejas ni tarjetas de crédito.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <strong className="text-white">App Móvil y Web:</strong>{' '}
              <span className="text-slate-400">Tus clientes reservan desde cualquier dispositivo.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <strong className="text-white">Multi-sede y Pagos:</strong>{' '}
              <span className="text-slate-400">Control de aforos, pagos y códigos QR automáticos.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthView
