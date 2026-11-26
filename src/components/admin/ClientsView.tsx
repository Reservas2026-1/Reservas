import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Ticket,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Award,
  Zap,
  Pencil,
  Trash2,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { useBranding } from '@/context/BrandingContext'
import { adminService, type ClienteConTiqueteraResumen } from '@/services/adminService'
import type { TiqueteraConPlan } from '@/services/tiqueterasService'
import type { EstadoTiquetera, Tables } from '@/types/database'

interface ClientsViewProps {
  adminId?: string
}

export const ClientsView: React.FC<ClientsViewProps> = ({ adminId = 'usr-admin-01' }) => {
  const { currentPalette, empresaId, studioName } = useBranding()

  const [clientes, setClientes] = useState<ClienteConTiqueteraResumen[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [busqueda, setBusqueda] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Catálogo de planes
  const [planesDisponibles, setPlanesDisponibles] = useState<Tables<'planes'>[]>([])

  // Modal Asignar Plan
  const [modalAsignarPlan, setModalAsignarPlan] = useState<boolean>(false)
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteConTiqueteraResumen | null>(null)
  const [planIdSeleccionado, setPlanIdSeleccionado] = useState<string>('')
  const [asignandoPlan, setAsignandoPlan] = useState<boolean>(false)

  // Modal Editar Cliente
  const [modalEditarCliente, setModalEditarCliente] = useState<boolean>(false)
  const [guardandoCliente, setGuardandoCliente] = useState<boolean>(false)
  const [formCliente, setFormCliente] = useState({
    nombreCompleto: '',
    documento: '',
    telefono: '',
    email: '',
    activo: true,
  })

  // Modal Gestionar Tiqueteras del Cliente
  const [modalTiqueteras, setModalTiqueteras] = useState<boolean>(false)
  const [tiqueterasCliente, setTiqueterasCliente] = useState<TiqueteraConPlan[]>([])
  const [loadingTiqueteras, setLoadingTiqueteras] = useState<boolean>(false)
  const [editingTiquetera, setEditingTiquetera] = useState<TiqueteraConPlan | null>(null)
  const [guardandoTiquetera, setGuardandoTiquetera] = useState<boolean>(false)
  const [eliminandoTiqueteraId, setEliminandoTiqueteraId] = useState<string | null>(null)
  const [formTiquetera, setFormTiquetera] = useState({
    creditosTotales: '10',
    creditosDisponibles: '10',
    diasVigencia: '30',
    fechaVencimiento: '',
    estado: 'activa' as EstadoTiquetera,
  })

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; mensaje: string } | null>(
    null
  )

  const cargarClientes = useCallback(
    async (termino?: string) => {
      setErrorMsg(null)
      try {
        const res = await adminService.getClientesConTiqueteras(
          empresaId,
          termino !== undefined ? termino : busqueda
        )
        if (res.error) {
          setErrorMsg(res.error)
          toast({
            variant: 'destructive',
            title: 'Error cargando clientes',
            description: res.error,
          })
          setClientes([])
        } else {
          setClientes(res.data || [])
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error inesperado al consultar clientes'
        setErrorMsg(msg)
        toast({ variant: 'destructive', title: 'Error', description: msg })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [empresaId, busqueda]
  )

  useEffect(() => {
    const cargarPlanes = async () => {
      const res = await adminService.getTodosLosPlanes(empresaId)
      if (res.data) {
        const activos = res.data.filter((p) => p.activo)
        setPlanesDisponibles(activos)
        if (activos.length > 0) {
          setPlanIdSeleccionado(activos[0].id)
        }
      }
    }
    cargarPlanes()
  }, [empresaId])

  useEffect(() => {
    setLoading(true)
    cargarClientes('')
  }, [empresaId])

  const handleManualRefresh = () => {
    setRefreshing(true)
    cargarClientes()
  }

  // Modal Asignar Plan
  const handleAbrirModalAsignar = (item: ClienteConTiqueteraResumen) => {
    setClienteSeleccionado(item)
    setModalAsignarPlan(true)
    setFeedback(null)
  }

  const handleConfirmarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSeleccionado || !planIdSeleccionado) {
      toast({
        variant: 'destructive',
        title: 'Plan requerido',
        description: 'Selecciona un plan del catálogo antes de asignar.',
      })
      return
    }

    setAsignandoPlan(true)
    setFeedback(null)

    try {
      const res = await adminService.asignarPlanManual(
        clienteSeleccionado.cliente.id,
        planIdSeleccionado,
        adminId,
        empresaId
      )

      if (res.success) {
        const msg = res.mensaje || 'Plan asignado exitosamente al ciclista.'
        setFeedback({ type: 'success', mensaje: msg })
        toast({ variant: 'success', title: 'Plan acreditado', description: msg })
        setModalAsignarPlan(false)
        cargarClientes()
      } else {
        const msg = res.error || res.mensaje || 'No se pudo asignar el plan.'
        setFeedback({ type: 'error', mensaje: msg })
        toast({ variant: 'destructive', title: 'Error al asignar plan', description: msg })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al asignar el plan.'
      setFeedback({ type: 'error', mensaje: msg })
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setAsignandoPlan(false)
    }
  }

  // Modal Editar Cliente
  const handleAbrirEditarCliente = (item: ClienteConTiqueteraResumen) => {
    setClienteSeleccionado(item)
    setFormCliente({
      nombreCompleto: item.cliente.nombre_completo,
      documento: item.cliente.documento || '',
      telefono: item.cliente.telefono || '',
      email: item.cliente.email || '',
      activo: item.cliente.activo,
    })
    setModalEditarCliente(true)
  }

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSeleccionado) return

    setGuardandoCliente(true)
    try {
      const res = await adminService.actualizarCliente(clienteSeleccionado.cliente.id, empresaId, {
        nombreCompleto: formCliente.nombreCompleto.trim(),
        documento: formCliente.documento.trim() || null,
        telefono: formCliente.telefono.trim() || null,
        email: formCliente.email.trim(),
        activo: formCliente.activo,
      })

      if (res.error || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error actualizando cliente',
          description: res.error || 'No se pudo actualizar el perfil',
        })
        return
      }

      toast({
        variant: 'success',
        title: 'Cliente actualizado',
        description: `Datos de ${res.data.nombre_completo} guardados.`,
      })
      setModalEditarCliente(false)
      cargarClientes()
    } finally {
      setGuardandoCliente(false)
    }
  }

  // Modal Gestionar Tiqueteras
  const handleAbrirTiqueteras = async (item: ClienteConTiqueteraResumen) => {
    setClienteSeleccionado(item)
    setEditingTiquetera(null)
    setFormTiquetera({
      creditosTotales: '10',
      creditosDisponibles: '10',
      diasVigencia: '30',
      fechaVencimiento: '',
      estado: 'activa',
    })
    setModalTiqueteras(true)
    setLoadingTiqueteras(true)

    try {
      const res = await adminService.getTiqueterasCliente(item.cliente.id, empresaId)
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'Error cargando tiqueteras',
          description: res.error,
        })
        setTiqueterasCliente([])
      } else {
        setTiqueterasCliente(res.data || [])
      }
    } finally {
      setLoadingTiqueteras(false)
    }
  }

  const handleSelectEditTiquetera = (t: TiqueteraConPlan) => {
    setEditingTiquetera(t)
    setFormTiquetera({
      creditosTotales: String(t.creditos_totales),
      creditosDisponibles: String(t.creditos_disponibles),
      diasVigencia: '30',
      fechaVencimiento: t.fecha_vencimiento.split('T')[0],
      estado: t.estado,
    })
  }

  const handleGuardarTiquetera = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSeleccionado) return

    setGuardandoTiquetera(true)
    try {
      const creditosTotales = Number.parseInt(formTiquetera.creditosTotales, 10)
      const creditosDisponibles = Number.parseInt(formTiquetera.creditosDisponibles, 10)

      if (editingTiquetera) {
        const res = await adminService.actualizarTiquetera(editingTiquetera.id, empresaId, {
          creditosTotales,
          creditosDisponibles,
          fechaVencimiento: formTiquetera.fechaVencimiento || undefined,
          estado: formTiquetera.estado,
        })
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error actualizando tiquetera',
            description: res.error || 'No se pudo actualizar',
          })
          return
        }
        toast({ variant: 'success', title: 'Tiquetera actualizada' })
      } else {
        const res = await adminService.asignarTiqueteraManual({
          empresaId,
          clienteId: clienteSeleccionado.cliente.id,
          creditosTotales,
          creditosDisponibles,
          diasVigencia: Number.parseInt(formTiquetera.diasVigencia, 10) || 30,
          estado: formTiquetera.estado,
        })
        if (res.error || !res.data) {
          toast({
            variant: 'destructive',
            title: 'Error asignando tiquetera',
            description: res.error || 'No se pudo asignar',
          })
          return
        }
        toast({ variant: 'success', title: 'Tiquetera manual asignada' })
      }

      setEditingTiquetera(null)
      const refreshRes = await adminService.getTiqueterasCliente(
        clienteSeleccionado.cliente.id,
        empresaId
      )
      setTiqueterasCliente(refreshRes.data || [])
      cargarClientes()
    } finally {
      setGuardandoTiquetera(false)
    }
  }

  const handleEliminarTiquetera = async (tiqueteraId: string) => {
    if (!clienteSeleccionado) return
    setEliminandoTiqueteraId(tiqueteraId)
    try {
      const res = await adminService.eliminarTiquetera(tiqueteraId, empresaId)
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Error eliminando tiquetera',
          description: res.error || 'No se pudo eliminar',
        })
        return
      }
      setTiqueterasCliente((prev) => prev.filter((t) => t.id !== tiqueteraId))
      toast({ variant: 'success', title: 'Tiquetera eliminada' })
      cargarClientes()
    } finally {
      setEliminandoTiqueteraId(null)
    }
  }

  const clientesFiltrados = clientes.filter((c) => {
    const texto = busqueda.toLowerCase().trim()
    if (!texto) return true
    return (
      c.cliente.nombre_completo.toLowerCase().includes(texto) ||
      (c.cliente.email || '').toLowerCase().includes(texto) ||
      (c.cliente.documento || '').toLowerCase().includes(texto)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Directorio de Ciclistas y Tiqueteras
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {studioName}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Edita perfiles, administra tiqueteras/créditos y asigna planes desde recepción.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula o email..."
                  className="pl-9 text-xs"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="h-9 w-9 shrink-0"
                title="Actualizar directorio"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {errorMsg && (
          <div className="px-6 pb-3">
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {feedback && (
          <div className="px-6 pb-2">
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{feedback.mensaje}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="font-bold text-xs hover:underline"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <CardContent>
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-30" />
              <p>No se encontraron clientes registrados en esta sede.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clientesFiltrados.map((item) => {
                const tieneCreditos = item.totalCreditosDisponibles > 0
                const tiquetera = item.tiqueteraActiva

                return (
                  <div
                    key={item.cliente.id}
                    className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-foreground">
                          {item.cliente.nombre_completo}
                        </span>
                        <Badge
                          variant={tieneCreditos ? 'success' : 'secondary'}
                          className="text-[10px]"
                        >
                          {tieneCreditos
                            ? `${item.totalCreditosDisponibles} clases activas`
                            : 'Sin saldo'}
                        </Badge>
                        {!item.cliente.activo && (
                          <Badge variant="destructive" className="text-[10px]">
                            Inactivo
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          C.C:{' '}
                          <strong className="text-foreground">
                            {item.cliente.documento || 'No registrado'}
                          </strong>
                        </span>
                        <span>Email: {item.cliente.email || 'N/A'}</span>
                        <span>Tel: {item.cliente.telefono || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                      {tiquetera ? (
                        <div className="text-right text-xs space-y-0.5 mr-2">
                          <div className="font-bold text-foreground flex items-center gap-1 justify-end">
                            <Ticket className="w-3.5 h-3.5 text-primary" />
                            <span>{tiquetera.planNombre}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>
                              {tiquetera.diasRestantes} días restantes (
                              {tiquetera.fechaVencimiento.split('T')[0]})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right text-xs text-muted-foreground italic mr-2">
                          Sin tiquetera activa
                        </div>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAbrirEditarCliente(item)}
                        className="h-8 text-xs gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAbrirTiqueteras(item)}
                        className="h-8 text-xs gap-1"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tiqueteras ({item.totalTiqueteras})</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAbrirModalAsignar(item)}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Asignar Plan</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Asignación Manual de Plan */}
      {modalAsignarPlan && clienteSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Asignar Plan a Ciclista
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalAsignarPlan(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Acredita clases inmediatamente mediante RPC y asienta el movimiento contable en caja.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleConfirmarAsignacion}>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <div className="font-bold text-foreground">
                    Ciclista: {clienteSeleccionado.cliente.nombre_completo}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Documento: {clienteSeleccionado.cliente.documento || 'N/A'} • Saldo Actual:{' '}
                    {clienteSeleccionado.totalCreditosDisponibles} clases
                  </div>
                </div>

                {planesDisponibles.length === 0 ? (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
                    No hay planes activos en el catálogo. Crea primero un plan en el módulo Planes.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground">Seleccionar Paquete de Clases</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      value={planIdSeleccionado}
                      onChange={(e) => setPlanIdSeleccionado(e.target.value)}
                    >
                      {planesDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {p.creditos} clases (COP ${p.precio.toLocaleString('es-CO')})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Se activará automáticamente la vigencia correspondiente en la tiquetera.
                    </span>
                  </div>
                )}
              </CardContent>

              <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalAsignarPlan(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={asignandoPlan || planesDisponibles.length === 0}
                  size="sm"
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {asignandoPlan ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Acreditando...
                    </>
                  ) : (
                    'Confirmar y Asignar'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Editar Cliente */}
      {modalEditarCliente && clienteSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pencil className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Editar Datos del Cliente
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalEditarCliente(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleGuardarCliente}>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Nombre Completo</label>
                  <Input
                    required
                    value={formCliente.nombreCompleto}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, nombreCompleto: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Documento</label>
                    <Input
                      value={formCliente.documento}
                      onChange={(e) =>
                        setFormCliente({ ...formCliente, documento: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Teléfono</label>
                    <Input
                      value={formCliente.telefono}
                      onChange={(e) =>
                        setFormCliente({ ...formCliente, telefono: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Correo Electrónico</label>
                  <Input
                    type="email"
                    required
                    value={formCliente.email}
                    onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formCliente.activo}
                    onChange={(e) => setFormCliente({ ...formCliente, activo: e.target.checked })}
                  />
                  <span className="font-semibold text-foreground">Cliente activo</span>
                </label>
              </CardContent>

              <div className="p-5 pt-0 border-t flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEditarCliente(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={guardandoCliente}
                  className={`font-bold ${currentPalette.bgClass} text-white`}
                >
                  {guardandoCliente ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Gestionar Tiqueteras del Cliente */}
      {modalTiqueteras && clienteSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-border bg-card overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="p-5 pb-3 border-b shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Tiqueteras de {clienteSeleccionado.cliente.nombre_completo}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setModalTiqueteras(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs">
                Crea, edita créditos/vigencia o elimina tiqueteras directamente.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-5 overflow-y-auto text-xs">
              {/* Lista de tiqueteras */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                  Tiqueteras Registradas ({tiqueterasCliente.length})
                </h4>
                {loadingTiqueteras ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : tiqueterasCliente.length === 0 ? (
                  <p className="text-muted-foreground py-3">
                    Este ciclista no tiene tiqueteras registradas.
                  </p>
                ) : (
                  <div className="divide-y border rounded-lg">
                    {tiqueterasCliente.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{t.plan?.nombre || 'Tiquetera Manual'}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {t.estado}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Disponibles: <strong>{t.creditos_disponibles}</strong> /{' '}
                            {t.creditos_totales} • Vence: {t.fecha_vencimiento.split('T')[0]}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectEditTiquetera(t)}
                            className="h-7 text-[11px] gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={eliminandoTiqueteraId === t.id}
                            onClick={() => handleEliminarTiquetera(t.id)}
                            className="h-7 text-[11px] text-destructive hover:text-destructive gap-1"
                          >
                            {eliminandoTiqueteraId === t.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulario Crear / Editar Tiquetera */}
              <form
                onSubmit={handleGuardarTiquetera}
                className="p-4 rounded-xl border bg-muted/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    {editingTiquetera
                      ? 'Editar Tiquetera Seleccionada'
                      : 'Asignar Nueva Tiquetera Manual'}
                  </span>
                  {editingTiquetera && (
                    <button
                      type="button"
                      onClick={() => setEditingTiquetera(null)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Cambiar a Nueva
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold">Créditos Totales</label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={formTiquetera.creditosTotales}
                      onChange={(e) =>
                        setFormTiquetera({ ...formTiquetera, creditosTotales: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Disponibles</label>
                    <Input
                      type="number"
                      min={0}
                      required
                      value={formTiquetera.creditosDisponibles}
                      onChange={(e) =>
                        setFormTiquetera({
                          ...formTiquetera,
                          creditosDisponibles: e.target.value,
                        })
                      }
                    />
                  </div>
                  {editingTiquetera ? (
                    <div className="space-y-1">
                      <label className="font-semibold">Vencimiento</label>
                      <Input
                        type="date"
                        value={formTiquetera.fechaVencimiento}
                        onChange={(e) =>
                          setFormTiquetera({
                            ...formTiquetera,
                            fechaVencimiento: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="font-semibold">Días Vigencia</label>
                      <Input
                        type="number"
                        min={1}
                        required
                        value={formTiquetera.diasVigencia}
                        onChange={(e) =>
                          setFormTiquetera({ ...formTiquetera, diasVigencia: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="font-semibold">Estado</label>
                    <select
                      value={formTiquetera.estado}
                      onChange={(e) =>
                        setFormTiquetera({
                          ...formTiquetera,
                          estado: e.target.value as EstadoTiquetera,
                        })
                      }
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="activa">Activa</option>
                      <option value="agotada">Agotada</option>
                      <option value="vencida">Vencida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={guardandoTiquetera}
                    className={`font-bold ${currentPalette.bgClass} text-white`}
                  >
                    {guardandoTiquetera ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Guardando...
                      </>
                    ) : editingTiquetera ? (
                      'Actualizar Tiquetera'
                    ) : (
                      'Crear Tiquetera Manual'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default ClientsView
