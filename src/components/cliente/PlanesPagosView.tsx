import React, { useState, useEffect } from 'react'
import {
  Ticket,
  CheckCircle2,
  Upload,
  CreditCard,
  Building2,
  DollarSign,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import { pagosService } from '@/services/pagosService'
import type { Tables, MetodoPago } from '@/types/database'

interface PlanesPagosViewProps {
  currentUser?: Tables<'perfiles'> | null
  onVolver?: () => void
  onPagoCompletado?: () => void
}

export const PlanesPagosView: React.FC<PlanesPagosViewProps> = ({
  currentUser,
  onVolver,
  onPagoCompletado,
}) => {
  const { currentPalette, empresaId, studioName } = useBranding()

  // Estados de catálogo y selección
  const [planes, setPlanes] = useState<Tables<'planes'>[]>([])
  const [loadingPlanes, setLoadingPlanes] = useState<boolean>(true)
  const [selectedPlan, setSelectedPlan] = useState<Tables<'planes'> | null>(null)

  // Estados de método de pago
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<MetodoPago>('nequi')
  const [referencia, setReferencia] = useState<string>('')
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null)
  const [previewComprobante, setPreviewComprobante] = useState<string | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState<boolean>(false)
  const [procesandoPago, setProcesandoPago] = useState<boolean>(false)

  // Estado de feedback y confirmación modal
  const [modalConfirmacion, setModalConfirmacion] = useState<{
    visible: boolean
    titulo: string
    mensaje: string
    estado: 'revision' | 'aprobado'
    referencia?: string
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const clienteId = currentUser?.id || ''

  // Cargar planes reales de la empresa
  useEffect(() => {
    let isMounted = true
    const cargarPlanes = async () => {
      setLoadingPlanes(true)
      setErrorMessage(null)
      try {
        const res = await pagosService.getPlanesEmpresa(empresaId)
        if (isMounted) {
          if (res.error) {
            setErrorMessage(res.error)
            toast({
              variant: 'destructive',
              title: 'Error cargando planes',
              description: res.error,
            })
            setPlanes([])
            setSelectedPlan(null)
          } else {
            const lista = res.data || []
            setPlanes(lista)
            setSelectedPlan(lista.length > 0 ? lista[1] || lista[0] : null)
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al consultar catálogo de planes'
        if (isMounted) {
          setErrorMessage(msg)
          toast({ variant: 'destructive', title: 'Error', description: msg })
          setPlanes([])
          setSelectedPlan(null)
        }
      } finally {
        if (isMounted) setLoadingPlanes(false)
      }
    }

    cargarPlanes()
    return () => {
      isMounted = false
    }
  }, [empresaId])

  const formatCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)
  }

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('El comprobante no debe superar los 5 MB')
        return
      }
      setArchivoComprobante(file)
      setErrorMessage(null)

      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewComprobante(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewComprobante(null)
      }
    }
  }

  const handleEnviarPago = async () => {
    if (!selectedPlan) {
      setErrorMessage('Por favor selecciona un plan de clases')
      return
    }
    if (!clienteId) {
      const msg = 'Debes iniciar sesión con tu cuenta para registrar una compra.'
      setErrorMessage(msg)
      toast({ variant: 'destructive', title: 'Sesión requerida', description: msg })
      return
    }

    setErrorMessage(null)
    setProcesandoPago(true)

    try {
      let comprobanteUrl: string | null = null

      if (
        (metodoSeleccionado === 'nequi' ||
          metodoSeleccionado === 'bancolombia' ||
          metodoSeleccionado === 'transferencia') &&
        archivoComprobante
      ) {
        setSubiendoArchivo(true)
        const subidaRes = await pagosService.subirComprobante(
          archivoComprobante,
          empresaId,
          clienteId
        )
        setSubiendoArchivo(false)

        if (subidaRes.success && subidaRes.url) {
          comprobanteUrl = subidaRes.url
        } else {
          const msg = subidaRes.error || 'No se pudo subir el comprobante al almacenamiento.'
          setErrorMessage(msg)
          toast({ variant: 'destructive', title: 'Error subiendo comprobante', description: msg })
          return
        }
      }

      const referenciaFinal =
        referencia.trim() ||
        `${metodoSeleccionado.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`

      const pagoRes = await pagosService.registrarPago({
        empresaId,
        clienteId,
        planId: selectedPlan.id,
        monto: selectedPlan.precio,
        metodo: metodoSeleccionado,
        comprobanteUrl,
        referencia: referenciaFinal,
      })

      if (pagoRes.error || !pagoRes.data) {
        const msg = pagoRes.error || 'No se pudo registrar el pago en la base de datos.'
        setErrorMessage(msg)
        toast({ variant: 'destructive', title: 'Error al registrar pago', description: msg })
        return
      }

      toast({
        variant: 'success',
        title: 'Solicitud de pago enviada',
        description: `Referencia #${referenciaFinal} registrada correctamente.`,
      })

      if (metodoSeleccionado === 'wompi') {
        setModalConfirmacion({
          visible: true,
          titulo: '¡Pago Registrado con Wompi!',
          mensaje: `Tu pago de ${formatCOP(
            selectedPlan.precio
          )} ha sido registrado. En cuanto la pasarela confirme la transacción, se activarán tus ${selectedPlan.creditos} clases.`,
          estado: 'revision',
          referencia: referenciaFinal,
        })
      } else if (metodoSeleccionado === 'efectivo') {
        setModalConfirmacion({
          visible: true,
          titulo: 'Solicitud Registrada (Pago en Recepción)',
          mensaje: `Se ha generado tu orden de compra para '${selectedPlan.nombre}'. Por favor cancela ${formatCOP(
            selectedPlan.precio
          )} en efectivo al ingresar al estudio antes de tu clase.`,
          estado: 'revision',
          referencia: referenciaFinal,
        })
      } else {
        setModalConfirmacion({
          visible: true,
          titulo: 'Comprobante Enviado a Validación',
          mensaje: `Hemos recibido tu comprobante de ${metodoSeleccionado.toUpperCase()} con referencia #${referenciaFinal}. Nuestro equipo de recepción validará la transferencia y activará tus ${selectedPlan.creditos} clases.`,
          estado: 'revision',
          referencia: referenciaFinal,
        })
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al procesar el pago. Inténtalo nuevamente.'
      setErrorMessage(msg)
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setProcesandoPago(false)
      setSubiendoArchivo(false)
    }
  }

  const handleCerrarModalYFinalizar = () => {
    setModalConfirmacion(null)
    if (onPagoCompletado) {
      onPagoCompletado()
    } else if (onVolver) {
      onVolver()
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          {onVolver && (
            <button
              type="button"
              onClick={onVolver}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-2 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Mi Dashboard</span>
            </button>
          )}
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Comprar Clases y Tiqueteras
            </h1>
            <Badge variant="secondary" className="text-xs">
              {studioName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Adquiere paquetes de créditos para reservar tus bicicletas en cualquiera de nuestras sesiones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 gap-1.5 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Pagos Seguros y Encriptados</span>
          </Badge>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-bold text-xs hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Ticket className={`w-5 h-5 ${currentPalette.textClass}`} />
              1. Selecciona tu Paquete de Clases
            </h2>
            <p className="text-xs text-muted-foreground">
              Cada crédito equivale a 1 puesto de bicicleta reservado en una sesión de indoor cycling.
            </p>
          </div>
        </div>

        {loadingPlanes ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : planes.length === 0 ? (
          <div className="p-10 text-center border rounded-xl bg-muted/20 text-xs text-muted-foreground space-y-2">
            <Ticket className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-semibold text-foreground">
              No hay planes activos disponibles para compra en este estudio.
            </p>
            <p>Contacta al administrador para habilitar paquetes de clases.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {planes.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id
              const isPro = plan.creditos >= 10

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative rounded-xl border p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? `border-2 ${currentPalette.borderClass} shadow-md bg-card ring-2 ring-primary/20`
                      : 'border-border/80 bg-card hover:border-foreground/30 hover:shadow-sm'
                  }`}
                >
                  {isPro && (
                    <div
                      className={`absolute -top-2.5 right-4 text-[10px] uppercase font-black px-2 py-0.5 rounded-full text-white shadow-sm flex items-center gap-1 ${currentPalette.bgClass}`}
                    >
                      <Sparkles className="w-3 h-3" /> Popular
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-extrabold text-base text-foreground leading-tight">
                        {plan.nombre}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {plan.descripcion || 'Créditos válidos para todas las clases.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-2xl font-black text-foreground">
                        {formatCOP(plan.precio)}
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {plan.creditos} {plan.creditos === 1 ? 'Clase' : 'Clases incluidas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Vigencia: {plan.dias_vigencia || 30} días</span>
                    <Badge
                      variant={isSelected ? 'default' : 'outline'}
                      className={`text-[10px] ${
                        isSelected ? `${currentPalette.bgClass} text-white` : ''
                      }`}
                    >
                      {isSelected ? 'Seleccionado' : 'Elegir'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className={`w-5 h-5 ${currentPalette.textClass}`} />
                2. Elige tu Método de Pago
              </h2>
              <p className="text-xs text-muted-foreground">
                Aceptamos transferencias móviles sin costo adicional, pasarela directa con tarjeta o efectivo en sede.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMetodoSeleccionado('nequi')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  metodoSeleccionado === 'nequi' || metodoSeleccionado === 'bancolombia'
                    ? `border-2 ${currentPalette.borderClass} bg-muted/40 font-bold`
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <Smartphone className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-semibold">Nequi / Bancolombia</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoSeleccionado('wompi')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  metodoSeleccionado === 'wompi'
                    ? `border-2 ${currentPalette.borderClass} bg-muted/40 font-bold`
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-semibold">Wompi / Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoSeleccionado('efectivo')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  metodoSeleccionado === 'efectivo'
                    ? `border-2 ${currentPalette.borderClass} bg-muted/40 font-bold`
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-semibold">Efectivo en Sede</span>
              </button>
            </div>

            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-5 space-y-4">
                {(metodoSeleccionado === 'nequi' ||
                  metodoSeleccionado === 'bancolombia' ||
                  metodoSeleccionado === 'transferencia') && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-purple-600" />
                        Datos para Transferir con Nequi o Bancolombia
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground font-mono">
                        <div className="p-2 bg-background/80 rounded border">
                          <span className="text-[10px] text-muted-foreground block font-sans">
                            Nequi (Celular):
                          </span>
                          <span className="font-bold text-sm">300 123 4567</span>
                        </div>
                        <div className="p-2 bg-background/80 rounded border">
                          <span className="text-[10px] text-muted-foreground block font-sans">
                            Bancolombia Ahorros:
                          </span>
                          <span className="font-bold text-sm">123-456789-01</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Titular: {studioName} SAS (NIT: 901.884.231-1). Realiza la transferencia por{' '}
                        <strong className="text-foreground">
                          {formatCOP(selectedPlan.precio)}
                        </strong>{' '}
                        y sube el comprobante a continuación.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Adjuntar Comprobante de Transferencia</span>
                        <span className="text-muted-foreground font-normal">
                          PNG, JPG, PDF (Máx 5MB)
                        </span>
                      </label>

                      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/10 transition-colors">
                        <input
                          type="file"
                          id="comprobante-input"
                          accept="image/*,application/pdf"
                          onChange={handleArchivoChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="comprobante-input"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-primary hover:underline">
                              {archivoComprobante
                                ? `Archivo: ${archivoComprobante.name}`
                                : 'Haz clic para seleccionar comprobante'}
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              Captura de pantalla de Nequi o Bancolombia
                            </span>
                          </div>
                        </label>
                      </div>

                      {previewComprobante && (
                        <div className="mt-2 p-2 border rounded-lg flex items-center gap-3 bg-muted/20">
                          <img
                            src={previewComprobante}
                            alt="Previsualización"
                            className="w-14 h-14 object-cover rounded border"
                          />
                          <div className="text-xs">
                            <span className="font-semibold block text-foreground">
                              {archivoComprobante?.name}
                            </span>
                            <span className="text-emerald-600 text-[11px] flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Listo para enviar
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Número de Aprobación / Referencia de la Transferencia
                      </label>
                      <Input
                        placeholder="Ej: M123456 o #Op 884920"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {metodoSeleccionado === 'wompi' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        Pasarela de Pagos Segura Wompi Bancolombia
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Paga con tarjetas Visa, Mastercard, American Express o PSE con débito de cualquier banco de Colombia.
                      </p>
                    </div>

                    <div className="p-4 border rounded-xl space-y-3 bg-muted/10 text-xs">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Comercio: {studioName}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          Wompi Checkout
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Se registrará la orden para verificación de la pasarela y acreditación de créditos.
                      </div>
                    </div>
                  </div>
                )}

                {metodoSeleccionado === 'efectivo' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        Pago en Efectivo en Recepción
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Registraremos tu intención de compra. Recuerda llegar 15 minutos antes de tu clase a la recepción del estudio para cancelar el monto exacto en efectivo.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-border/80 shadow-md sticky top-24">
              <CardHeader className="p-5 pb-3 border-b">
                <CardTitle className="text-base">Resumen del Pedido</CardTitle>
                <CardDescription className="text-xs">
                  Detalle del paquete y condiciones de servicio.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-sm">
                    <span>{selectedPlan.nombre}</span>
                    <span>{formatCOP(selectedPlan.precio)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Clases otorgadas:</span>
                    <span className="font-semibold text-foreground">
                      {selectedPlan.creditos} clases
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Vigencia:</span>
                    <span>{selectedPlan.dias_vigencia || 30} días calendario</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Método de pago:</span>
                    <span className="capitalize font-semibold text-foreground">
                      {metodoSeleccionado}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between items-baseline">
                  <span className="font-extrabold text-sm">Total a Pagar:</span>
                  <span className={`text-2xl font-black ${currentPalette.textClass}`}>
                    {formatCOP(selectedPlan.precio)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground">Garantía de Cancelación:</div>
                  <p>
                    Cancelando tus reservas con más de 2 horas de anticipación, tu clase vuelve automáticamente a tu tiquetera.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0">
                <Button
                  type="button"
                  disabled={procesandoPago || subiendoArchivo}
                  onClick={handleEnviarPago}
                  className={`w-full font-bold shadow-md h-11 text-sm ${currentPalette.bgClass} text-white gap-2`}
                >
                  {procesandoPago || subiendoArchivo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {subiendoArchivo ? 'Subiendo Comprobante...' : 'Procesando Pago...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {metodoSeleccionado === 'wompi'
                          ? `Pagar ${formatCOP(selectedPlan.precio)} con Wompi`
                          : metodoSeleccionado === 'efectivo'
                          ? 'Registrar Intención de Pago'
                          : 'Enviar Comprobante de Pago'}
                      </span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {modalConfirmacion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card text-center overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div
                className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 ${
                  modalConfirmacion.estado === 'aprobado'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {modalConfirmacion.estado === 'aprobado' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <Ticket className="w-8 h-8" />
                )}
              </div>
              <CardTitle className="text-xl font-black">{modalConfirmacion.titulo}</CardTitle>
              <CardDescription className="text-xs pt-1">
                {modalConfirmacion.mensaje}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3">
              {modalConfirmacion.referencia && (
                <div className="p-2.5 rounded-lg bg-muted font-mono text-xs text-muted-foreground">
                  Referencia:{' '}
                  <strong className="text-foreground">{modalConfirmacion.referencia}</strong>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Recibirás la confirmación en cuanto el recepcionista verifique la transacción.
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              <Button
                type="button"
                onClick={handleCerrarModalYFinalizar}
                className={`w-full font-bold ${currentPalette.bgClass} text-white`}
              >
                Volver al Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
export default PlanesPagosView
