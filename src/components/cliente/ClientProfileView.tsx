import React, { useState } from 'react'
import {
  User,
  Camera,
  Phone,
  Calendar,
  AlertTriangle,
  Target,
  QrCode as QrIcon,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  Ticket,
  Building2,
  LogOut,
  Save,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { QRCode } from '@/components/ui/qr-code'
import { useBranding } from '@/context/BrandingContext'
import { toast } from '@/components/ui/use-toast'
import { authService } from '@/services/authService'
import type { TiqueteraConPlan } from '@/services/tiqueterasService'
import type { Tables } from '@/types/database'

export interface ClientProfileViewProps {
  currentUser?: Tables<'perfiles'> | null
  onUserUpdated?: (updated: Tables<'perfiles'>) => void
  tiqueteraActiva?: TiqueteraConPlan | null
  creditosDisponibles?: number
  onNavigateToPlanes?: () => void
  onNavigateToDirectory?: () => void
  onSignOut: () => void
}

export const ClientProfileView: React.FC<ClientProfileViewProps> = ({
  currentUser,
  onUserUpdated,
  tiqueteraActiva,
  creditosDisponibles = 0,
  onNavigateToPlanes,
  onNavigateToDirectory,
  onSignOut,
}) => {
  const { currentPalette, estudioActivo, verticalConfig, isSingleTenant } = useBranding()

  // Form states
  const [nombreCompleto, setNombreCompleto] = useState(currentUser?.nombre_completo || '')
  const [telefono, setTelefono] = useState(currentUser?.telefono || '')
  const [fechaNacimiento, setFechaNacimiento] = useState(currentUser?.fecha_nacimiento || '')
  const [contactoEmergencia, setContactoEmergencia] = useState(currentUser?.contacto_emergencia || '')
  const [objetivosEntrenamiento, setObjetivosEntrenamiento] = useState(currentUser?.objetivos_entrenamiento || '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '')

  // Loading & UI states
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [qrModalFullscreen, setQrModalFullscreen] = useState(false)
  const [copiedReferral, setCopiedReferral] = useState(false)

  // Referral code determinístico
  const referralCode = currentUser?.id
    ? `RESERLY-${currentUser.id.slice(0, 5).toUpperCase()}`
    : 'RESERLY-VIP25'

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopiedReferral(true)
      toast({
        title: '¡Código copiado!',
        description: `Tu código de referido ${referralCode} está listo para compartir con tus amigos.`,
      })
      setTimeout(() => setCopiedReferral(false), 2500)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error al copiar',
        description: 'No se pudo copiar el código al portapapeles.',
      })
    }
  }

  // Manejo de carga de foto de perfil
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser?.id) return

    // Validar tamaño máximo 3MB
    if (file.size > 3 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Imagen demasiado pesada',
        description: 'El tamaño de la imagen no debe superar los 3 MB.',
      })
      return
    }

    setUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string
        setAvatarUrl(base64Data)

        const res = await authService.subirAvatar(currentUser.id, base64Data)
        if (res.error) {
          toast({
            variant: 'destructive',
            title: 'Error al actualizar avatar',
            description: res.error,
          })
        } else {
          toast({
            title: '¡Foto actualizada!',
            description: 'Tu avatar de perfil ha sido guardado con éxito.',
          })
          if (onUserUpdated && currentUser) {
            onUserUpdated({ ...currentUser, avatar_url: base64Data })
          }
        }
        setUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setUploadingAvatar(false)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo procesar la foto de perfil.',
      })
    }
  }

  // Guardar cambios en el perfil
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.id) return

    setSavingPerfil(true)
    try {
      const res = await authService.actualizarPerfil(currentUser.id, {
        nombre_completo: nombreCompleto.trim(),
        telefono: telefono.trim() || null,
        fecha_nacimiento: fechaNacimiento.trim() || null,
        contacto_emergencia: contactoEmergencia.trim() || null,
        objetivos_entrenamiento: objetivosEntrenamiento.trim() || null,
      })

      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error al guardar perfil',
          description: res.error,
        })
      } else {
        toast({
          title: '¡Perfil actualizado con éxito!',
          description: 'Tus datos personales y de entrenamiento han sido guardados.',
        })
        if (onUserUpdated && res.data) {
          onUserUpdated(res.data)
        }
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: 'Ocurrió un error al intentar actualizar el perfil.',
      })
    } finally {
      setSavingPerfil(false)
    }
  }

  const iniciales = (currentUser?.nombre_completo || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header con Avatar y Rol */}
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/70 shadow-sm">
        <div className={`h-20 sm:h-24 bg-gradient-to-r ${currentPalette.fromClass} ${currentPalette.toClass} relative opacity-90`}>
          <div className="absolute right-4 top-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>{estudioActivo?.nombre || 'Reserly Studio'}</span>
          </div>
        </div>

        <CardContent className="pt-0 relative px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            {/* Avatar con anillo de color */}
            <div className="relative group">
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-background overflow-hidden shadow-xl flex items-center justify-center bg-muted ring-4 ${currentPalette.ringClass}/40`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={currentUser?.nombre_completo || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${currentPalette.bgClass} text-white text-2xl font-black`}>
                    {iniciales || <User className="w-10 h-10" />}
                  </div>
                )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Input selector de foto */}
              <label
                htmlFor="avatar-file-input"
                className={`absolute bottom-0 right-0 p-2 rounded-full cursor-pointer shadow-md bg-white text-slate-800 dark:bg-slate-800 dark:text-white border hover:scale-105 transition-transform ${currentPalette.ringClass}`}
                title="Cambiar foto de perfil"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {/* Info usuario */}
            <div className="text-center sm:text-left flex-1 sm:ml-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {currentUser?.nombre_completo || 'Alumno'}
              </h2>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant="secondary" className="text-xs font-semibold">
                  {verticalConfig.clienteSingular} Activo
                </Badge>
                <Badge variant="outline" className={`text-xs font-bold gap-1 border-primary/30 ${currentPalette.textClass}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Socio Verificado
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tarjeta de Pase QR e Identificación Personal */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl bg-primary/10 ${currentPalette.textClass}`}>
                <QrIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Tu Pase QR de Acceso
                </CardTitle>
                <CardDescription className="text-xs">
                  Escanéalo en el tótem o recepción para registrar tu asistencia
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQrModalFullscreen(true)}
              className="text-xs gap-1.5 h-8"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Ampliar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col md:flex-row items-center justify-around gap-6">
          {/* QR visual */}
          <div className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-slate-900 border shadow-inner">
            <QRCode
              value={currentUser?.codigo_qr || currentUser?.id || 'RESERLY-QR-DEFAULT'}
              size={140}
              className="p-1"
              showValue={false}
              showActions={false}
            />
            <span className="text-[11px] font-mono font-bold text-muted-foreground mt-2">
              {currentUser?.codigo_qr || (currentUser?.id ? `ID: ${currentUser.id.slice(0, 12)}...` : 'QR ACTIVO')}
            </span>
          </div>

          {/* Código de Referido y Beneficios */}
          <div className="flex-1 w-full max-w-sm space-y-3">
            <div className="rounded-xl p-3.5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gana XP invitando amigos
                </span>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-300">
                  +150 XP
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Comparte tu código de referido para que tus amigos reciban su primera clase con descuento y tú sumes 150 XP extras.
              </p>

              <div className="flex items-center gap-2 bg-background p-1.5 rounded-lg border">
                <span className="flex-1 font-mono font-black text-sm text-center tracking-wider text-foreground">
                  {referralCode}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyReferral}
                  className="h-8 px-3 text-xs gap-1 font-bold"
                >
                  {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReferral ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Formulario de Datos Personales y Objetivos */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <User className={`w-5 h-5 ${currentPalette.textClass}`} />
            <span>Datos Personales y Perfil Físico</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Mantén tus datos actualizados para contacto de emergencia y seguimiento de rendimiento
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre Completo */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold">
                  Nombre Completo
                </Label>
                <Input
                  id="nombre"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                />
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-xs font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Teléfono / WhatsApp</span>
                </Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>

              {/* Fecha de Nacimiento */}
              <div className="space-y-1.5">
                <Label htmlFor="fecha_nac" className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Fecha de Nacimiento</span>
                </Label>
                <Input
                  id="fecha_nac"
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                />
              </div>

              {/* Contacto de Emergencia */}
              <div className="space-y-1.5">
                <Label htmlFor="contacto_emergencia" className="text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Contacto de Emergencia</span>
                </Label>
                <Input
                  id="contacto_emergencia"
                  value={contactoEmergencia}
                  onChange={(e) => setContactoEmergencia(e.target.value)}
                  placeholder="Nombre y teléfono de familiar"
                />
              </div>
            </div>

            {/* Objetivos de Entrenamiento */}
            <div className="space-y-1.5">
              <Label htmlFor="objetivos" className="text-xs font-semibold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>Objetivos de Entrenamiento y Notas de Salud</span>
              </Label>
              <textarea
                id="objetivos"
                rows={3}
                value={objetivosEntrenamiento}
                onChange={(e) => setObjetivosEntrenamiento(e.target.value)}
                placeholder="Ej. Mejorar resistencia cardiovascular, bajar porcentaje graso, preparar fondo de 80km..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={savingPerfil}
                className={`gap-2 font-bold ${currentPalette.bgClass} text-white hover:opacity-90`}
              >
                {savingPerfil ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingPerfil ? 'Guardando...' : 'Guardar Cambios'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. Estado del Plan / Tiquetera y Acciones Rápidas */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Ticket className={`w-5 h-5 ${currentPalette.textClass}`} />
            <span>Membresía y Plan Activo</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Resumen de créditos disponibles y vigencia de tu tiquetera
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-muted/20 gap-4">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Plan Actual</span>
              <h3 className="text-lg font-black text-foreground">
                {tiqueteraActiva?.plan?.nombre || 'Sin tiquetera activa'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={creditosDisponibles > 0 ? 'default' : 'secondary'} className="text-xs">
                  {creditosDisponibles} {creditosDisponibles === 1 ? 'crédito disponible' : 'créditos disponibles'}
                </Badge>
                {tiqueteraActiva?.fecha_vencimiento && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Vence: {new Date(tiqueteraActiva.fecha_vencimiento).toLocaleDateString('es-CO')}
                  </span>
                )}
              </div>
            </div>

            {onNavigateToPlanes && (
              <Button
                onClick={onNavigateToPlanes}
                variant="outline"
                className={`border-primary/40 font-bold ${currentPalette.textClass}`}
              >
                Comprar más clases
              </Button>
            )}
          </div>

          {/* Botones de acción rápida: Cambiar estudio y Cerrar sesión */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t">
            {!isSingleTenant && onNavigateToDirectory && (
              <Button
                variant="outline"
                onClick={onNavigateToDirectory}
                className="gap-2 text-xs sm:text-sm h-10"
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>Cambiar de Estudio</span>
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={onSignOut}
              className="gap-2 text-xs sm:text-sm h-10 ml-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Pantalla Completa QR */}
      {qrModalFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setQrModalFullscreen(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <QrIcon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black tracking-tight mb-1">
              Pase QR de Ingreso
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Brillo al máximo para escaneo rápido en la entrada de {estudioActivo?.nombre || 'Reserly'}
            </p>

            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md mb-4">
              <QRCode
                value={currentUser?.codigo_qr || currentUser?.id || 'RESERLY-QR-DEFAULT'}
                size={220}
                showValue={false}
                showActions={false}
              />
            </div>

            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full mb-6">
              {currentUser?.nombre_completo || 'Alumno'}
            </span>

            <Button
              onClick={() => setQrModalFullscreen(false)}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold"
            >
              Cerrar Pase
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
