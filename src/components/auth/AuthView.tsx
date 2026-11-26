import React, { useState, useEffect } from 'react'
import {
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import { authService, type EmpresaActiva } from '@/services/authService'
import type { Tables } from '@/types/database'

export interface AuthViewProps {
  onAuthSuccess: (userProfile: Tables<'perfiles'> | null) => void
  onClose?: () => void
  initialMode?: 'signin' | 'signup' | 'register-studio'
  initialRubro?: string
  onSkipToDemo?: (rol: 'cliente' | 'admin') => void
}

const RUBRO_OPTIONS = [
  'Spinning / Ciclismo indoor',
  'Pilates',
  'Yoga',
  'Gimnasio / Entrenamiento',
  'CrossFit / Funcional',
  'Canchas deportivas',
  'Salón de belleza',
  'Barbería',
  'Spa & Masajes',
  'Consultorio profesional',
  'Danza / Baile',
]

/**
 * Normaliza y asocia el rubro recibido desde la landing page a las opciones estándar del selector.
 * Si no se recibe rubro inicial, retorna cadena vacía para mostrar el placeholder de búsqueda.
 */
function mapInitialRubro(rubro?: string): string {
  if (!rubro || !rubro.trim()) return ''
  const lower = rubro.toLowerCase()
  if (lower.includes('spin') || lower.includes('ciclis')) return 'Spinning / Ciclismo indoor'
  if (lower.includes('pilat')) return 'Pilates'
  if (lower.includes('yoga') || lower.includes('medita')) return 'Yoga'
  if (lower.includes('gimnas') || lower.includes('entrena') || lower.includes('funcional')) return 'Gimnasio / Entrenamiento'
  if (lower.includes('barber')) return 'Barbería'
  if (lower.includes('spa') || lower.includes('masaj')) return 'Spa & Masajes'
  if (lower.includes('belleza') || lower.includes('salon')) return 'Salón de belleza'
  if (lower.includes('consultorio') || lower.includes('medic') || lower.includes('terap')) return 'Consultorio profesional'
  if (lower.includes('cancha') || lower.includes('deport')) return 'Canchas deportivas'

  const exactMatch = RUBRO_OPTIONS.find((opt) => opt.toLowerCase() === lower)
  return exactMatch || rubro.trim()
}

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthSuccess,
  onClose,
  initialMode = 'signin',
  initialRubro,
}) => {
  const { setEstudioActivo } = useBranding()
  const [mode, setMode] = useState<'signin' | 'signup' | 'register-studio'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Campos de formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')

  // Campos específicos de registro de estudio
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [tipoNegocio, setTipoNegocio] = useState<string>(() => mapInitialRubro(initialRubro))
  const [nombreAdmin, setNombreAdmin] = useState('')

  // Empresas activas para registro de alumno (opcional, por defecto explorar todos)
  const [empresas, setEmpresas] = useState<EmpresaActiva[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')

  const [prevInitialMode, setPrevInitialMode] = useState(initialMode)
  if (initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode)
    if (initialMode) {
      setMode(initialMode)
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }

  const [prevInitialRubro, setPrevInitialRubro] = useState(initialRubro)
  if (initialRubro !== prevInitialRubro) {
    setPrevInitialRubro(initialRubro)
    setTipoNegocio(mapInitialRubro(initialRubro))
  }

  // Cargar lista de empresas activas cuando se entra a modo signup de alumno
  useEffect(() => {
    if (mode === 'signup') {
      let isMounted = true
      const fetchEmpresas = async () => {
        setLoadingEmpresas(true)
        try {
          const res = await authService.getActiveEmpresas()
          if (isMounted && res.data) {
            setEmpresas(res.data)
          }
        } catch (err) {
          console.error('Error al cargar empresas activas:', err)
        } finally {
          if (isMounted) setLoadingEmpresas(false)
        }
      }
      fetchEmpresas()
      return () => {
        isMounted = false
      }
    }
  }, [mode])

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
          onClose?.()
          onAuthSuccess(res.data?.perfil || null)
        }, 500)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // Handler: Registro de Alumno
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
        documento: documento.trim() || undefined,
        telefono: telefono.trim() || undefined,
        empresaId: selectedEmpresaId || undefined,
        rol: 'cliente',
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        // Autenticación automática tras registro si Supabase entrega sesión
        const signInRes = await authService.signIn({ email: email.trim(), password })
        if (signInRes.data?.perfil) {
          setSuccessMessage('¡Cuenta creada e inicio de sesión exitoso! Redirigiendo...')
          setTimeout(() => {
            onClose?.()
            onAuthSuccess(signInRes.data?.perfil || null)
          }, 500)
        } else {
          setSuccessMessage('¡Cuenta de alumno creada exitosamente! Ahora puedes iniciar sesión.')
          setMode('signin')
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado durante el registro')
    } finally {
      setLoading(false)
    }
  }

  // Handler: Registrar Estudio / Negocio
  const handleRegisterStudio = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!nombreNegocio.trim()) {
      setErrorMessage('Por favor ingresa el nombre de tu negocio o estudio')
      return
    }
    if (!tipoNegocio.trim()) {
      setErrorMessage('Por favor selecciona o escribe el tipo de negocio')
      return
    }
    if (!nombreAdmin.trim()) {
      setErrorMessage('Por favor ingresa el nombre del administrador')
      return
    }
    if (!email.trim()) {
      setErrorMessage('Por favor ingresa un correo electrónico')
      return
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const res = await authService.registerStudio({
        nombreNegocio: nombreNegocio.trim(),
        tipoNegocio: tipoNegocio.trim(),
        nombreAdmin: nombreAdmin.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
      })

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Error al crear el estudio en el sistema')
      } else {
        const { perfil, empresa } = res.data
        if (empresa) {
          setEstudioActivo({
            ...empresa,
            email: empresa.email || email.trim().toLowerCase(),
            telefono: empresa.telefono || telefono.trim() || null,
            tipo_negocio: empresa.tipo_negocio || tipoNegocio.trim() || null,
          })
        }

        setSuccessMessage('¡Estudio creado con éxito! Redirigiendo a tu panel...')
        toast({
          variant: 'success',
          title: '¡Estudio creado con éxito!',
          description: `Bienvenido a ${empresa?.nombre || nombreNegocio.trim()}.`,
        })

        onClose?.()
        onAuthSuccess(perfil || null)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado al registrar el estudio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-11 pb-4 sm:px-5 sm:py-5">
      <Card className="border-0 shadow-none bg-transparent">
        {/* Selector de modo estilo tabs */}
        <div className="flex gap-1 p-1 bg-muted/80 rounded-xl mb-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setErrorMessage(null)
              setSuccessMessage(null)
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-background shadow-xs text-foreground font-bold'
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
            className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-background shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Soy Alumno
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register-studio')
              setErrorMessage(null)
              setSuccessMessage(null)
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
              mode === 'register-studio'
                ? 'bg-red-600 text-white shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Crear Estudio
          </button>
        </div>

        {/* Encabezado dinámico */}
        <CardHeader className="p-0 pb-3 space-y-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {mode === 'register-studio' && (
              <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-bold tracking-wider">
                <Sparkles className="w-3 h-3 mr-1" /> Prueba 30 Días Gratis
              </Badge>
            )}
            {mode === 'signin' && (
              <Badge variant="outline" className="text-[10px] font-mono">
                Acceso Plataforma
              </Badge>
            )}
            {mode === 'signup' && (
              <Badge variant="outline" className="text-[10px] font-mono">
                Nuevo Alumno
              </Badge>
            )}
          </div>

          <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {mode === 'register-studio' && 'Registra tu Negocio o Estudio'}
            {mode === 'signin' && 'Iniciar Sesión'}
            {mode === 'signup' && 'Crear Cuenta de Alumno'}
          </CardTitle>

          <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
            {mode === 'register-studio' && 'Comienza tu prueba gratuita por 30 días sin tarjeta.'}
            {mode === 'signin' && 'Ingresa tus credenciales para acceder a tu cuenta.'}
            {mode === 'signup' && 'Crea una sola cuenta para explorar y reservar en cualquier estudio.'}
          </CardDescription>
        </CardHeader>

        {/* Notificaciones de error o éxito */}
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form
          onSubmit={
            mode === 'register-studio'
              ? handleRegisterStudio
              : mode === 'signin'
                ? handleSignIn
                : handleSignUp
          }
        >
          <CardContent className="p-0 space-y-3">
            {/* ========================================================
                CAMPOS MODO: REGISTRAR ESTUDIO / NEGOCIO
            ======================================================== */}
            {mode === 'register-studio' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    Nombre del Negocio / Estudio *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Studio Velox, Zen Yoga..."
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tipoNegocio"
                    className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Tipo de Negocio *
                  </label>
                  <Combobox
                    id="tipoNegocio"
                    required
                    value={tipoNegocio}
                    onChange={setTipoNegocio}
                    options={RUBRO_OPTIONS}
                    placeholder="Buscar categoría: ej. Spinning, Canchas, Barbería, Spa…"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5" />
                    Nombre del Administrador *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mendoza"
                    value={nombreAdmin}
                    onChange={(e) => setNombreAdmin(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    Correo Electrónico del Estudio *
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="admin@tuempresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    Contraseña *
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    Teléfono / WhatsApp del Estudio (opcional)
                  </label>
                  <Input
                    type="tel"
                    placeholder="Ej. +57 300 123 4567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="h-10"
                  />
                </div>
              </>
            )}

            {/* ========================================================
                CAMPOS MODO: INICIAR SESIÓN
            ======================================================== */}
            {mode === 'signin' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    Correo Electrónico *
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    Contraseña *
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                  />
                </div>
              </>
            )}

            {/* ========================================================
                CAMPOS MODO: REGISTRAR ALUMNO
            ======================================================== */}
            {mode === 'signup' && (
              <>
                <div>
                  <label
                    htmlFor="signupEmpresa"
                    className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Estudio inicial (opcional)
                  </label>
                  {loadingEmpresas ? (
                    <div className="h-10 flex items-center gap-2 px-3 text-xs text-muted-foreground border rounded-md bg-muted/30">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      <span>Cargando estudios disponibles...</span>
                    </div>
                  ) : (
                    <select
                      id="signupEmpresa"
                      value={selectedEmpresaId}
                      onChange={(e) => setSelectedEmpresaId(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:outline-hidden focus:ring-2 focus:ring-red-500 transition-colors"
                    >
                      <option value="">Explorar todos los estudios al entrar</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre} {emp.tipo_negocio ? `(${emp.tipo_negocio})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5" />
                    Nombre Completo *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Valeria Gómez"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    Correo Electrónico *
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="alumno@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    Contraseña *
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      DNI / Documento (opcional)
                    </label>
                    <Input
                      type="text"
                      placeholder="71829304"
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Phone className="w-3.5 h-3.5" />
                      Teléfono / WhatsApp (opcional)
                    </label>
                    <Input
                      type="tel"
                      placeholder="3001234567"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="p-0 pt-3 flex flex-col gap-2.5">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-bold shadow-md bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer py-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <span>
                    {mode === 'register-studio' && 'Crear mi Estudio (30 días gratis)'}
                    {mode === 'signin' && 'Ingresar'}
                    {mode === 'signup' && 'Crear Cuenta'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>

            {/* Enlaces de alternancia inferior */}
            <div className="w-full text-center text-xs text-muted-foreground space-y-1 pt-0.5">
              {mode === 'register-studio' && (
                <p>
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setErrorMessage(null)
                    }}
                    className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                </p>
              )}

              {mode === 'signin' && (
                <>
                  <p>
                    ¿Eres alumno nuevo?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup')
                        setErrorMessage(null)
                      }}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Regístrate aquí
                    </button>
                  </p>
                  <p>
                    ¿Quieres registrar tu estudio?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register-studio')
                        setErrorMessage(null)
                      }}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Prueba gratis
                    </button>
                  </p>
                </>
              )}

              {mode === 'signup' && (
                <p>
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setErrorMessage(null)
                    }}
                    className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                </p>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default AuthView
