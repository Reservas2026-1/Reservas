import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { useBranding, getConfiguracionVertical } from '@/context/BrandingContext'
import { adminService } from '@/services/adminService'
import type { Tables } from '@/types/database'

export const PlanesAdminView: React.FC = () => {
  const { currentPalette, empresaId, studioName, estudioActivo } = useBranding()
  const verticalConfig = getConfiguracionVertical(estudioActivo?.tipo_negocio)

  const [planes, setPlanes] = useState<Tables<'planes'>[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal Crear / Editar Plan
  const [modalPlan, setModalPlan] = useState<boolean>(false)
  const [editingPlan, setEditingPlan] = useState<Tables<'planes'> | null>(null)
  const [savingPlan, setSavingPlan] = useState<boolean>(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingPlan, setDeletingPlan] = useState<Tables<'planes'> | null>(null)
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false)

  const [formPlan, setFormPlan] = useState({
    nombre: '',
    descripcion: '',
    precio: '35000',
    creditos: '1',
    diasVigencia: '30',
    duracionMinutos: '45',
    activo: true,
  })

  const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)

  const cargarPlanes = useCallback(async () => {
    setErrorMsg(null)
    try {
      const res = await adminService.getTodosLosPlanes(empresaId)
      if (res.error) {
        setErrorMsg(res.error)
        toast({
          variant: 'destructive',
          title: 'Error cargando planes',
          description: res.error,
        })
      } else {
        setPlanes(res.data || [])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al cargar planes'
      setErrorMsg(msg)
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [empresaId])

  useEffect(() => {
    setLoading(true)
    cargarPlanes()
  }, [cargarPlanes])

  const handleOpenCrear = () => {
    setEditingPlan(null)
    setFormPlan({
      nombre: '',
      descripcion: '',
      precio: '35000',
      creditos: '1',
      diasVigencia: '30',
      duracionMinutos: '45',
      activo: true,
    })
    setModalPlan(true)
  }

  const handleOpenEditar = (plan: Tables<'planes'>) => {
    setEditingPlan(plan)
    const durMinutos = plan.duracion_horas
      ? plan.duracion_horas < 10
        ? Math.round(plan.duracion_horas * 60)
        : plan.duracion_horas
      : 45
    setFormPlan({
      nombre: plan.nombre,
      descripcion: plan.descripcion || '',
      precio: String(plan.precio),
      creditos: String(plan.creditos),
      diasVigencia: String(plan.dias_vigencia),
      duracionMinutos: String(durMinutos),
      activo: plan.activo,
    })
    setModalPlan(true)
  }

  const handleGuardarPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPlan.nombre.trim()) return

    setSavingPlan(true)
    try {
      const precio = Number(formPlan.precio)
      const creditos = Number.parseInt(formPlan.creditos, 10)
      const diasVigencia = Number.parseInt(formPlan.diasVigencia, 10)
      const minutos = Number(formPlan.duracionMinutos) || 45
      // Almacenamos en duracionHoras equivalente (ej: 45 min -> 1 hora o fracción)
      const duracionHoras = Math.max(1, Math.round(minutos / 60))

      if (editingPlan) {
        const res = await adminService.actualizarPlan(editingPlan.id, empresaId, {
          nombre: formPlan.nombre.trim(),
          descripcion: formPlan.descripcion.trim() || null,
          precio,
          creditos,
          diasVigencia,
          duracionHoras,
          activo: formPlan.activo,
        })
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'No se pudo actualizar el plan',
            description: res.error || 'Error desconocido',
          })
          return
        }
        toast({
          variant: 'success',
          title: 'Plan actualizado',
          description: `"${res.data.nombre}" se actualizó correctamente.`,
        })
      } else {
        const res = await adminService.crearPlan({
          empresaId,
          nombre: formPlan.nombre.trim(),
          descripcion: formPlan.descripcion.trim() || null,
          precio,
          creditos,
          diasVigencia,
          duracionHoras,
          activo: formPlan.activo,
        })
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'No se pudo crear el plan',
            description: res.error || 'Error desconocido',
          })
          return
        }
        toast({
          variant: 'success',
          title: 'Plan creado',
          description: `"${res.data.nombre}" agregado al catálogo.`,
        })
      }

      setModalPlan(false)
      cargarPlanes()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error guardando plan',
        description: err instanceof Error ? err.message : 'Error inesperado',
      })
    } finally {
      setSavingPlan(false)
    }
  }

  const handleToggleEstado = async (plan: Tables<'planes'>) => {
    setTogglingId(plan.id)
    try {
      const res = await adminService.cambiarEstadoPlan(plan.id, empresaId, !plan.activo)
      if (res.error || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error cambiando estado',
          description: res.error || 'No se pudo cambiar el estado del plan',
        })
        return
      }
      setPlanes((prev) => prev.map((p) => (p.id === plan.id ? res.data! : p)))
      toast({
        variant: 'success',
        title: res.data.activo ? 'Plan activado' : 'Plan desactivado',
        description: `"${res.data.nombre}" ahora está ${res.data.activo ? 'activo' : 'inactivo'}.`,
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!deletingPlan) return
    setDeletingLoading(true)
    try {
      const res = await adminService.eliminarPlan(deletingPlan.id, empresaId)
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: res.error || 'El plan puede estar vinculado a tiqueteras o pagos existentes.',
        })
        return
      }
      setPlanes((prev) => prev.filter((p) => p.id !== deletingPlan.id))
      toast({
        variant: 'success',
        title: 'Plan eliminado',
        description: `"${deletingPlan.nombre}" fue eliminado correctamente.`,
      })
      setDeletingPlan(null)
    } finally {
      setDeletingLoading(false)
    }
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Package className={`w-6 h-6 ${currentPalette.textClass}`} />
              <span>Gestión de {verticalConfig.navPlanesLabel}</span>
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {studioName}
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold">
              {verticalConfig.etiquetaNegocio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crea, edita, activa/desactiva o elimina los planes de {verticalConfig.sesionPlural.toLowerCase()} y créditos de{' '}
            {verticalConfig.espacio.toLowerCase()}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              cargarPlanes()
            }}
            disabled={refreshing}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCrear}
            className={`h-9 text-xs font-bold gap-1.5 ${currentPalette.bgClass} text-white`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Plan</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Catálogo de Planes ({planes.length})</CardTitle>
            <CardDescription className="text-xs">
              Los planes activos aparecen disponibles para compra en el portal del cliente.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : planes.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground space-y-3">
              <Package className="w-9 h-9 mx-auto opacity-30" />
              <p>Aún no hay planes registrados para esta sede.</p>
              <Button type="button" size="sm" variant="outline" onClick={handleOpenCrear}>
                Crear Primer Plan
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {planes.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground">{plan.nombre}</span>
                      <Badge variant={plan.activo ? 'success' : 'secondary'} className="text-[10px]">
                        {plan.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {plan.descripcion && (
                      <p className="text-xs text-muted-foreground">{plan.descripcion}</p>
                    )}
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-1">
                      <span className="font-bold text-foreground">{formatCOP(plan.precio)}</span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {plan.creditos} {plan.creditos === 1 ? 'crédito' : 'créditos'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Vigencia: {plan.dias_vigencia} días
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        {plan.duracion_horas ? `${Math.round(plan.duracion_horas * 60)} min` : '45 min'} / sesión
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={togglingId === plan.id}
                      onClick={() => handleToggleEstado(plan)}
                      className="h-8 text-xs gap-1"
                    >
                      {togglingId === plan.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : plan.activo ? (
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{plan.activo ? 'Desactivar' : 'Activar'}</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditar(plan)}
                      className="h-8 text-xs gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingPlan(plan)}
                      className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear / Editar Plan */}
      {modalPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className={`w-4 h-4 ${currentPalette.textClass}`} />
                  {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalPlan(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Configura el valor en COP, créditos incluidos y días de vigencia.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGuardarPlan}>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Nombre del Plan</label>
                  <Input
                    required
                    placeholder="Ej: Pack 10 Clases Pro"
                    value={formPlan.nombre}
                    onChange={(e) => setFormPlan({ ...formPlan, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Descripción</label>
                  <Input
                    placeholder={`Ej: Válido para todas las ${verticalConfig.sesionPlural.toLowerCase()} en ${verticalConfig.espacio.toLowerCase()}`}
                    value={formPlan.descripcion}
                    onChange={(e) => setFormPlan({ ...formPlan, descripcion: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Precio (COP)</label>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      value={formPlan.precio}
                      onChange={(e) => setFormPlan({ ...formPlan, precio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">
                      Cantidad de {verticalConfig.sesionPlural} incluidas (Meta del Plan)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      required
                      placeholder="Ej: 5, 10, 20"
                      value={formPlan.creditos}
                      onChange={(e) => setFormPlan({ ...formPlan, creditos: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Días de Vigencia</label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={formPlan.diasVigencia}
                      onChange={(e) => setFormPlan({ ...formPlan, diasVigencia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Duración de la Sesión (minutos)</label>
                    <Input
                      type="number"
                      min={15}
                      step={5}
                      required
                      placeholder="45"
                      value={formPlan.duracionMinutos}
                      onChange={(e) => setFormPlan({ ...formPlan, duracionMinutos: e.target.value })}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPlan.activo}
                    onChange={(e) => setFormPlan({ ...formPlan, activo: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="font-semibold text-foreground">Plan activo para venta</span>
                </label>
              </CardContent>

              <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalPlan(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPlan}
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {savingPlan ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando...
                    </>
                  ) : editingPlan ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Plan'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base text-destructive">Eliminar Plan</CardTitle>
              <CardDescription className="text-xs">
                ¿Estás seguro de eliminar <strong>{deletingPlan.nombre}</strong>? Esta acción no se puede deshacer.
              </CardDescription>
            </CardHeader>
            <div className="p-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deletingLoading}
                onClick={() => setDeletingPlan(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingLoading}
                onClick={handleConfirmEliminar}
              >
                {deletingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Eliminar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default PlanesAdminView
