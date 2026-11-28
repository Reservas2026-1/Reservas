import React, { useState, useEffect, useRef } from 'react'
import {
  Palette,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Building2,
  Bike,
  Smartphone,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Sliders,
  ShieldCheck,
  Check,
  Eye,
  Flame,
  LayoutGrid,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBranding, PALETTES, getConfiguracionVertical } from '@/context/BrandingContext'
import { empresasService, type ActualizarConfiguracionEstudioParams } from '@/services/empresasService'

export const BrandSettingsView: React.FC = () => {
  const {
    studioName,
    setStudioName,
    currentPalette,
    setPaletteById,
    customPrimaryHex,
    setCustomPrimaryColor,
    logoUrl,
    setLogoUrl,
    portadaUrl,
    setPortadaUrl,
    empresaId,
    estudioActivo,
    setEstudioActivo,
    actualizarEstudio,
  } = useBranding()

  // Estados locales para el formulario de configuración
  const [nombre, setNombre] = useState(studioName || 'Mi Estudio')
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)
  const [colorPrimario, setColorPrimario] = useState(customPrimaryHex || currentPalette.primaryHex || '#DC2626')
  const [capacidadSala, setCapacidadSala] = useState<number>(estudioActivo?.capacidad_sala || 15)
  const [telefono, setTelefono] = useState<string>(estudioActivo?.telefono || '+57 310 123 4567')
  const [email, setEmail] = useState<string>(estudioActivo?.email || 'contacto@estudio.com')
  const [direccion, setDireccion] = useState<string>(
    estudioActivo?.direccion || 'Calle 85 # 12-40, Zona Rosa, Bogotá'
  )
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    logoUrl || estudioActivo?.logo_url || null
  )
  const [currentPortadaUrl, setCurrentPortadaUrl] = useState<string | null>(
    portadaUrl || estudioActivo?.portada_url || null
  )

  // Estados de subida y guardado
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false)
  const [uploadingPortada, setUploadingPortada] = useState<boolean>(false)
  const [savingSettings, setSavingSettings] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const portadaFileInputRef = useRef<HTMLInputElement | null>(null)

  // Sincronizar si cambia el estudioActivo externamente
  useEffect(() => {
    if (estudioActivo) {
      setNombre(estudioActivo.nombre || studioName)
      if (estudioActivo.color_primario) {
        setColorPrimario(estudioActivo.color_primario)
      }
      if (estudioActivo.capacidad_sala) {
        setCapacidadSala(estudioActivo.capacidad_sala)
      }
      if (estudioActivo.telefono) setTelefono(estudioActivo.telefono)
      if (estudioActivo.email) setEmail(estudioActivo.email)
      if (estudioActivo.direccion) setDireccion(estudioActivo.direccion)
      if (estudioActivo.logo_url) setCurrentLogoUrl(estudioActivo.logo_url)
      if (estudioActivo.portada_url) setCurrentPortadaUrl(estudioActivo.portada_url)
    }
  }, [estudioActivo, studioName])

  // Manejador para selector de color predefinido
  const handleSelectPresetPalette = (paletteId: string) => {
    const pal = PALETTES.find((p) => p.id === paletteId)
    if (pal) {
      setColorPrimario(pal.primaryHex)
      setPaletteById(paletteId)
    }
  }

  // Manejador para cambio manual de color hexadecimal
  const handleColorHexChange = (hex: string) => {
    setColorPrimario(hex)
    setCustomPrimaryColor(hex)
  }

  // Subida de imagen de logotipo hacia Supabase Storage 'logos-empresas'
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setFeedback(null)

    try {
      const uploadRes = await empresasService.subirLogoEstudio(file, empresaId)
      if (uploadRes.success && uploadRes.url) {
        setCurrentLogoUrl(uploadRes.url)
        setLogoUrl(uploadRes.url)
        setFeedback({
          type: 'success',
          message: '¡Logotipo subido exitosamente al almacenamiento de la marca!',
        })
      } else {
        setFeedback({
          type: 'error',
          message: uploadRes.error || 'No se pudo subir la imagen del logotipo.',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al subir el logotipo'
      setFeedback({ type: 'error', message })
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Subida de imagen de portada / banner hacia Supabase Storage
  const handlePortadaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPortada(true)
    setFeedback(null)

    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Solo se permiten imágenes en formato PNG, JPG o WEBP.')
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen de portada no debe superar los 5MB.')
      }

      const activeId = estudioActivo?.id || empresaId
      const publicUrl = await empresasService.subirPortadaEmpresa(activeId, file)

      setCurrentPortadaUrl(publicUrl)
      setPortadaUrl(publicUrl)
      if (actualizarEstudio) {
        await actualizarEstudio({ portada_url: publicUrl })
      }

      setFeedback({
        type: 'success',
        message: '¡Imagen de portada / banner actualizada exitosamente!',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al subir la imagen de portada'
      setFeedback({ type: 'error', message })
    } finally {
      setUploadingPortada(false)
      if (portadaFileInputRef.current) {
        portadaFileInputRef.current.value = ''
      }
    }
  }

  // Eliminar imagen de portada
  const handleEliminarPortada = async () => {
    setCurrentPortadaUrl(null)
    setPortadaUrl(null)
    if (actualizarEstudio) {
      await actualizarEstudio({ portada_url: null })
    }
    setFeedback({
      type: 'success',
      message: 'Imagen de portada eliminada. Se usará la portada por defecto del rubro.',
    })
  }

  // Guardar configuración completa en base de datos
  const handleGuardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setFeedback(null)

    try {
      const updateData: ActualizarConfiguracionEstudioParams = {
        nombre: nombre.trim(),
        color_primario: colorPrimario,
        capacidad_sala: capacidadSala,
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        logo_url: currentLogoUrl || undefined,
        portada_url: currentPortadaUrl || null,
      }

      const res = await empresasService.actualizarConfiguracionEstudio(empresaId, updateData)

      if (res.data) {
        // Actualizar BrandingContext inmediatamente
        setStudioName(nombre.trim())
        setCustomPrimaryColor(colorPrimario)
        if (currentLogoUrl) {
          setLogoUrl(currentLogoUrl)
        } else {
          setLogoUrl(null)
        }
        if (currentPortadaUrl) {
          setPortadaUrl(currentPortadaUrl)
        } else {
          setPortadaUrl(null)
        }
        setEstudioActivo({
          ...estudioActivo,
          id: empresaId,
          nombre: nombre.trim(),
          color_primario: colorPrimario,
          capacidad_sala: capacidadSala,
          direccion: direccion.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          logo_url: currentLogoUrl,
          portada_url: currentPortadaUrl,
        })
        if (actualizarEstudio) {
          await actualizarEstudio({
            nombre: nombre.trim(),
            color_primario: colorPrimario,
            capacidad_sala: capacidadSala,
            direccion: direccion.trim(),
            telefono: telefono.trim(),
            email: email.trim(),
            logo_url: currentLogoUrl,
            portada_url: currentPortadaUrl,
          })
        }

        setFeedback({
          type: 'success',
          message: '¡Configuración de Marca Blanca guardada y aplicada en toda la plataforma!',
        })
      } else {
        // Si no está registrado en DB (modo demo o red fallback), actualizar localmente de todos modos
        setStudioName(nombre.trim())
        setCustomPrimaryColor(colorPrimario)
        if (currentLogoUrl) setLogoUrl(currentLogoUrl)
        if (currentPortadaUrl) setPortadaUrl(currentPortadaUrl)
        if (actualizarEstudio) {
          await actualizarEstudio({
            nombre: nombre.trim(),
            color_primario: colorPrimario,
            logo_url: currentLogoUrl,
            portada_url: currentPortadaUrl,
          })
        }

        setFeedback({
          type: 'success',
          message: 'Configuración actualizada en memoria local del navegador (Modo Demo Activo).',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la configuración'
      setFeedback({ type: 'error', message })
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Personalización Multi-Tenant</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Configuración de Marca Blanca
          </h1>
          <p className="text-xs text-muted-foreground">
            Ajusta los colores, logotipo y datos corporativos que verán tus {verticalConfig.clientePlural.toLowerCase()} tanto en la app web como en el smartphone móvil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold">
            {verticalConfig.etiquetaNegocio}
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            Tenant ID: {empresaId.substring(0, 12)}...
          </Badge>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contenedor Principal en Dos Columnas: Formulario a la Izquierda y Mockup Móvil a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Formulario de Configuración (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleGuardarConfiguracion}>
            <Card className="border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-5 border-b bg-card">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Identidad Visual y Corporativa
                </CardTitle>
                <CardDescription className="text-xs">
                  Estos valores se inyectan en tiempo real en la vista de cliente y correos del estudio.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-6 text-xs">
                {/* 1. Nombre del Estudio */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Nombre Oficial del Estudio o Gimnasio *</span>
                  </label>
                  <Input
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Studio Velox"
                    className="text-xs font-medium"
                  />
                </div>

                {/* 2. Logotipo de la Empresa con Subida a Storage */}
                <div className="space-y-3 pt-2 border-t">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Logotipo de la Marca (Storage Supabase)</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      PNG, SVG, WEBP (Max 2MB)
                    </span>
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed bg-muted/20">
                    {/* Vista Previa del Logotipo */}
                    <div className="w-24 h-24 rounded-xl border bg-card flex items-center justify-center p-2 overflow-hidden shadow-sm shrink-0">
                      {currentLogoUrl ? (
                        <img
                          src={currentLogoUrl}
                          alt="Vista previa del logo"
                          className="max-h-full max-w-full object-contain"
                          onError={() => setCurrentLogoUrl(null)}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          {verticalConfig.showBicycleMap ? <Bike className="w-8 h-8 mx-auto opacity-30" /> : <LayoutGrid className="w-8 h-8 mx-auto opacity-30" />}
                          <span className="text-[9px] block mt-1">Sin Logo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1 w-full">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingLogo}
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs gap-1.5 font-semibold"
                        >
                          {uploadingLogo ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Subiendo a Storage...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Subir Nuevo Logo</span>
                            </>
                          )}
                        </Button>

                        {currentLogoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentLogoUrl(null)
                              setLogoUrl(null)
                            }}
                            className="text-xs text-destructive hover:bg-destructive/10"
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>

                      {/* Entrada opcional de URL directa */}
                      <Input
                        value={currentLogoUrl || ''}
                        onChange={(e) => {
                          const url = e.target.value.trim()
                          setCurrentLogoUrl(url || null)
                          setLogoUrl(url || null)
                        }}
                        placeholder="O ingresa una URL pública directa del logo..."
                        className="text-[11px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Imagen de Fondo / Portada del Estudio (Banner) */}
                <div className="space-y-3 pt-4 border-t">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Imagen de Fondo / Portada del Estudio (Banner)</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      PNG, JPG, WEBP (Max 5MB)
                    </span>
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed bg-muted/20">
                    {/* Vista previa de la portada rectangular */}
                    <div className="w-full sm:w-44 h-24 rounded-xl border bg-card relative overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                      {currentPortadaUrl ? (
                        <img
                          src={currentPortadaUrl}
                          alt="Vista previa de la portada"
                          className="w-full h-full object-cover"
                          onError={() => setCurrentPortadaUrl(null)}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground p-2">
                          <ImageIcon className="w-6 h-6 mx-auto opacity-30" />
                          <span className="text-[9px] block mt-1">Sin portada personalizada</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1 w-full">
                      <input
                        ref={portadaFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handlePortadaFileChange}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingPortada}
                          onClick={() => portadaFileInputRef.current?.click()}
                          className="text-xs gap-1.5 font-semibold"
                        >
                          {uploadingPortada ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Subiendo portada...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Subir Portada / Banner</span>
                            </>
                          )}
                        </Button>

                        {currentPortadaUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleEliminarPortada}
                            className="text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </Button>
                        )}
                      </div>

                      {/* Entrada opcional de URL directa de portada */}
                      <Input
                        value={currentPortadaUrl || ''}
                        onChange={(e) => {
                          const url = e.target.value.trim()
                          setCurrentPortadaUrl(url || null)
                          setPortadaUrl(url || null)
                        }}
                        placeholder="O ingresa una URL pública directa del banner..."
                        className="text-[11px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Selector de Color Primario en Vivo */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Color Primario de Marca Blanca</span>
                    </label>
                    <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded border bg-card">
                      {colorPrimario}
                    </span>
                  </div>

                  {/* Paletas Rápidas Predefinidas */}
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-2 font-medium">
                      Selecciona una paleta de color aprobada:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {PALETTES.map((pal) => {
                        const isSelected = colorPrimario.toLowerCase() === pal.primaryHex.toLowerCase()
                        return (
                          <button
                            key={pal.id}
                            type="button"
                            onClick={() => handleSelectPresetPalette(pal.id)}
                            className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                              isSelected
                                ? 'ring-2 ring-primary border-primary shadow-sm bg-primary/5'
                                : 'hover:border-primary/50 bg-card'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="w-5 h-5 rounded-full border shadow-xs"
                                style={{ backgroundColor: pal.primaryHex }}
                              />
                              {isSelected && <Check className="w-3 h-3 text-primary font-bold" />}
                            </div>
                            <span className="text-[10px] font-semibold text-foreground leading-tight truncate">
                              {pal.name.split(' ')[0]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Selector Hexadecimal Libre */}
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="color"
                      value={colorPrimario}
                      onChange={(e) => handleColorHexChange(e.target.value)}
                      className="w-10 h-10 p-1 rounded-xl border border-border cursor-pointer bg-card shrink-0"
                      title="Seleccionar color personalizado"
                    />
                    <div className="space-y-1 flex-1">
                      <Input
                        value={colorPrimario}
                        onChange={(e) => handleColorHexChange(e.target.value)}
                        placeholder="#DC2626"
                        maxLength={7}
                        className="text-xs font-mono uppercase"
                      />
                      <span className="text-[10px] text-muted-foreground block">
                        Introduce cualquier código hexadecimal corporativo (#RRGGBB).
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Datos de Contacto y Ubicación */}
                <div className="space-y-3 pt-2 border-t">
                  <label className="font-semibold text-foreground">Información de Ubicación y Contacto</label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Teléfono
                      </span>
                      <Input
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+57 310 123 4567"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </span>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contacto@estudio.com"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Dirección de la Sede
                    </span>
                    <Input
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Calle 85 # 12-40, Bogotá"
                      className="text-xs"
                    />
                  </div>
                </div>
              </CardContent>

              {/* Botón de Guardar Configuración */}
              <div className="p-5 border-t bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Aislamiento seguro multi-tenant con RLS</span>
                </div>

                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="font-bold shadow-md text-white gap-2 text-xs"
                  style={{ backgroundColor: colorPrimario }}
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Guardar Configuración de Marca</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Columna Derecha: Mockup Móvil Interactivo en Tiempo Real (5 columnas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className={`w-4 h-4 ${currentPalette.textClass}`} />
              <h2 className="text-sm font-bold text-foreground">Vista Previa Móvil en Vivo</h2>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono gap-1">
              <Eye className="w-3 h-3" />
              <span>Tiempo Real</span>
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Así es exactamente como se refleja tu paleta de marca y logotipo en la pantalla del celular de tus{' '}
            {verticalConfig.clientePlural.toLowerCase()}:
          </p>

          {/* Marco Smartphone (iPhone / Android) */}
          <div className="relative mx-auto w-[310px] sm:w-[320px] rounded-[42px] border-[8px] border-slate-900 dark:border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-slate-900/30">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-end px-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            {/* Pantalla Interna del Celular */}
            <div className="relative h-[560px] rounded-[32px] bg-slate-950 text-white overflow-hidden flex flex-col justify-between select-none">
              
              {/* Sección Superior: Banner de Portada + Barra de Estado + Logo Superpuesto */}
              <div className="relative">
                {/* Banner de Portada Superior */}
                <div className="relative h-28 sm:h-32 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={currentPortadaUrl || '/Sppining.png'}
                    alt="Portada del estudio en móvil"
                    className="w-full h-full object-cover opacity-90"
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
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white shadow-xs uppercase tracking-wider backdrop-blur-xs border border-white/20"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {verticalConfig.etiquetaNegocio}
                    </span>
                  </div>
                </div>

                {/* Superposición de Logo y Datos del Estudio */}
                <div className="relative px-3 -mt-7 z-20 flex items-end gap-2.5">
                  {/* Logotipo del Estudio */}
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 p-1 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg shrink-0 overflow-hidden">
                    {currentLogoUrl ? (
                      <img
                        src={currentLogoUrl}
                        alt="Logo móvil"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-xl flex items-center justify-center font-black text-white text-base shadow-inner"
                        style={{ backgroundColor: colorPrimario }}
                      >
                        {nombre ? nombre.slice(0, 2).toUpperCase() : 'ES'}
                      </div>
                    )}
                  </div>

                  {/* Nombre y Dirección */}
                  <div className="flex-1 min-w-0 pb-1">
                    <h3 className="text-sm font-black text-white truncate leading-tight drop-shadow-sm">
                      {nombre || `Mi ${verticalConfig.espacio}`}
                    </h3>
                    <div className="inline-flex items-center gap-1 text-[10px] text-slate-300 mt-0.5 truncate max-w-full">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                      <span className="truncate">{direccion || 'Bogotá, Colombia'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Próxima Clase en el Móvil */}
              <div className="px-3 my-auto space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" style={{ color: colorPrimario }} />
                      <span>{verticalConfig.ejemploSesion}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                      18:30 hrs
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-300">
                    Coach Principal • 45 min intervalo de alta intensidad
                  </p>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Disponibilidad en vivo</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Cupos Disponibles
                      </span>
                    </div>

                    <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: '75%', backgroundColor: colorPrimario }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>{verticalConfig.espacio} Climatizada</span>
                      <span>Audio & Iluminación Pro</span>
                    </div>
                  </div>
                </div>

                {/* Botón CTA móvil teñido con color primario */}
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: colorPrimario }}
                >
                  {verticalConfig.showBicycleMap ? <Bike className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                  <span>Reservar {verticalConfig.sesionSingular} Ahora</span>
                </button>
              </div>

              {/* Barra inferior de navegación del móvil */}
              <div className="px-3 pb-3">
                <div className="pt-2 border-t border-white/10 flex items-center justify-around text-slate-400 text-[10px]">
                  <div className="flex flex-col items-center gap-0.5" style={{ color: colorPrimario }}>
                    {verticalConfig.showBicycleMap ? <Bike className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                    <span className="text-[9px] font-bold">{verticalConfig.recursoPlural}</span>
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
        </div>
      </div>
    </div>
  )
}

export default BrandSettingsView
