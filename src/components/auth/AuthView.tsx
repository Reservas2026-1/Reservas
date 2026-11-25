import React, { useState } from 'react'
import {
  Bike,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBranding } from '@/context/BrandingContext'
import { authService, type SignUpParams, type SignInParams } from '@/services/authService'
import type { Tables } from '@/types/database'

interface AuthViewProps {
  onAuthSuccess: (userProfile: Tables<'perfiles'> | null) => void
  onSkipToDemo?: (rol: 'cliente' | 'admin') => void
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onSkipToDemo }) => {
  const { studioName, currentPalette } = useBranding()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Campos de formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const params: SignInParams = {
        email: email.trim(),
        password,
      }

      const res = await authService.signIn(params)

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo...')
        setTimeout(() => {
          onAuthSuccess(res.data?.perfil || null)
        }, 600)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const params: SignUpParams = {
        email: email.trim(),
        password,
        nombreCompleto: nombreCompleto.trim(),
        documento: documento.trim() || undefined,
        telefono: telefono.trim() || undefined,
        rol: 'cliente',
      }

      const res = await authService.signUp(params)

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage(
          '¡Cuenta creada exitosamente! Puedes iniciar sesión o revisar tu correo para confirmar.'
        )
        setMode('signin')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado durante el registro')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = (rol: 'cliente' | 'admin') => {
    if (onSkipToDemo) {
      onSkipToDemo(rol)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Banner Izquierdo Informativo y Branding */}
        <div className="space-y-6 lg:pr-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border text-xs font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${currentPalette.bgClass} animate-pulse`} />
            <span>Sistema Multi-Tenant Indoor Cycling</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl ${currentPalette.bgClass} text-white flex items-center justify-center shadow-lg shadow-red-500/20`}
              >
                <Bike className="w-7 h-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {studioName}
              </h1>
            </div>

            <p className="text-base text-muted-foreground leading-relaxed">
              Reserva tu bicicleta en tiempo real para las mejores sesiones de ritmo, potencia y
              resistencia. Gestiona tus créditos, paquetes y pases de acceso QR en un solo lugar.
            </p>
          </div>

          {/* Características clave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Bike className={`w-4 h-4 ${currentPalette.textClass}`} />
                <span>15 Bicicletas Pro</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Selección de puesto en tarima con vista 3x5 interactiva.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className={`w-4 h-4 ${currentPalette.textClass}`} />
                <span>Pase QR Inteligente</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Check-in instantáneo en recepción sin esperas ni fricción.
              </p>
            </div>
          </div>

          {/* Acceso Rápido Demo para Evaluador */}
          <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Acceso Rápido Demo (Sin necesidad de credenciales)</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('cliente')}
                className="text-xs gap-1.5 hover:border-primary"
              >
                <User className="w-3.5 h-3.5" />
                Ingresar como Cliente Demo
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleQuickDemo('admin')}
                className="text-xs gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Ingresar como Administrador Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Tarjeta de Login / Registro */}
        <Card className="shadow-xl border-border/80">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin')
                    setErrorMessage(null)
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    mode === 'signin'
                      ? 'bg-background shadow-sm text-foreground'
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
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    mode === 'signup'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              <Badge variant="outline" className="text-[10px] font-mono">
                {mode === 'signin' ? 'Acceso Cliente' : 'Nuevo Ciclista'}
              </Badge>
            </div>

            <CardTitle className="text-xl">
              {mode === 'signin' ? 'Bienvenido a tu Estudio' : 'Crea tu Cuenta de Ciclista'}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === 'signin'
                ? 'Ingresa tus credenciales para acceder a tus reservas y tiqueteras.'
                : 'Completa tus datos para empezar a reservar tus clases de Indoor Cycling.'}
            </CardDescription>
          </CardHeader>

          {/* Feedback de error y éxito */}
          {errorMessage && (
            <div className="mx-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mx-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
            <CardContent className="space-y-3.5 pt-2">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5" />
                      Nombre Completo
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Ej. Valeria Gómez"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5" />
                        DNI / Documento
                      </label>
                      <Input
                        type="text"
                        placeholder="71829304"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5" />
                        Teléfono / WhatsApp
                      </label>
                      <Input
                        type="tel"
                        placeholder="987654321"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  required
                  placeholder="ciclista@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5" />
                  Contraseña
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className={`w-full font-semibold shadow-md ${currentPalette.bgClass} text-white hover:opacity-90`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Iniciar Sesión' : 'Completar Registro'}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {mode === 'signin' ? (
                  <span>
                    ¿No tienes una cuenta aún?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className={`font-semibold underline ${currentPalette.textClass}`}
                    >
                      Regístrate aquí
                    </button>
                  </span>
                ) : (
                  <span>
                    ¿Ya estás registrado?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className={`font-semibold underline ${currentPalette.textClass}`}
                    >
                      Inicia sesión
                    </button>
                  </span>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
