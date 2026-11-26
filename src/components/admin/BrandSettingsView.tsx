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
    empresaId,
    estudioActivo,
    setEstudioActivo,
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

  // Estados de subida y guardado
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false)
  const [savingSettings, setSavingSettings] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      }

      const res = await empresasService.actualizarConfiguracionEstudio(empresaId, updateData)

      if (res.data) {
        // Actualizar BrandingContext inmediatamente
        setStudioName(nombre.trim())
        setCustomPrimaryColor(colorPrimario)
        if (currentLogoUrl) {
          setLogoUrl(currentLogoUrl)
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
        })

        setFeedback({
          type: 'success',
          message: '¡Configuración de Marca Blanca guardada y aplicada en toda la plataforma!',
        })
      } else {
        // Si no está registrado en DB (modo demo o red fallback), actualizar localmente de todos modos
        setStudioName(nombre.trim())
        setCustomPrimaryColor(colorPrimario)
        if (currentLogoUrl) setLogoUrl(currentLogoUrl)

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

                {/* 3. Selector de Color Primario en Vivo */}
                <div className="space-y-3 pt-2 border-t">
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

                {/* 4. Capacidad de Sala de Indoor Cycling */}
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      {verticalConfig.showBicycleMap ? <Bike className="w-3.5 h-3.5 text-muted-foreground" /> : <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span>Capacidad de {verticalConfig.espacio} ({verticalConfig.recursoPlural})</span>
                    </label>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {capacidadSala} {verticalConfig.recursoPlural}
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={capacidadSala}
                    onChange={(e) => setCapacidadSala(parseInt(e.target.value, 10) || 15)}
                    className="text-xs font-medium"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Define la cantidad máxima de {verticalConfig.recursoCortoPlural} disponibles por{' '}
                    {verticalConfig.sesionSingular.toLowerCase()} en tu {verticalConfig.espacio.toLowerCase()}.
                  </span>
                </div>

                {/* 5. Datos de Contacto y Ubicación */}
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
            <div className="relative h-[560px] rounded-[32px] bg-slate-900 text-white overflow-hidden flex flex-col justify-between pt-6 pb-4 px-4 select-none">
              {/* Barra de Estado del Móvil */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-2 pt-1 mb-3">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="w-4 h-2 border border-slate-400 rounded-xs flex items-center p-0.5">
                    <div className="w-full h-full bg-emerald-500 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Cabecera Móvil con Logo y Nombre */}
              <div className="text-center space-y-3 pt-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center border border-white/20 shadow-md">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt="Logo móvil"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    verticalConfig.showBicycleMap ? <Bike className="w-8 h-8 text-white" /> : <LayoutGrid className="w-8 h-8 text-white" />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight leading-tight px-2 text-white">
                    {nombre || `Mi ${verticalConfig.espacio}`}
                  </h3>
                  <div className="inline-flex items-center gap-1 text-[10px] text-slate-300 mt-1">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[200px]">{direccion || 'Bogotá, Colombia'}</span>
                  </div>
                </div>

                {/* Badge con color primario */}
                <div className="flex justify-center">
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs uppercase tracking-wider"
                    style={{ backgroundColor: colorPrimario }}
                  >
                    {verticalConfig.espacio} de {capacidadSala} {verticalConfig.recursoPlural}
                  </span>
                </div>
              </div>

              {/* Tarjeta de Próxima Clase en el Móvil */}
              <div className="my-auto space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" style={{ color: colorPrimario }} />
                      {verticalConfig.ejemploSesion}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">18:30 hrs</span>
                  </div>

                  <p className="text-[10px] text-slate-300">
                    Coach Camila Rossi • 45 min intervalo
                  </p>

                  {/* Mini Mapa de Puestos 3x5 dentro del Celular */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[9px] text-slate-400 mb-1 flex justify-between">
                      <span>Puestos en Sala:</span>
                      <span className="font-bold text-emerald-400">Libres 11 / 15</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-lg bg-black/40">
                      {Array.from({ length: 15 }).map((_, idx) => {
                        const num = idx + 1
                        const ocupada = num === 3 || num === 7 || num === 10 || num === 14
                        const esSeleccionada = num === 4
                        return (
                          <div
                            key={num}
                            className={`h-5 rounded-md text-[8px] font-bold flex items-center justify-center transition-all ${
                              esSeleccionada
                                ? 'text-white font-black shadow-xs'
                                : ocupada
                                ? 'bg-white/10 text-white/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                            style={esSeleccionada ? { backgroundColor: colorPrimario } : undefined}
                          >
                            #{num}
                          </div>
                        )
                      })}
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
                  <span>Reservar {verticalConfig.recursoSingular} #4 Ahora</span>
                </button>
              </div>

              {/* Barra inferior de navegación del móvil */}
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
  )
}

export default BrandSettingsView
