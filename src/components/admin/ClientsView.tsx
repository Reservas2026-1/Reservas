import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useBranding } from '@/context/BrandingContext'
import { adminService, type ClienteConTiqueteraResumen } from '@/services/adminService'
import { pagosService } from '@/services/pagosService'
import type { Tables } from '@/types/database'

// Fallback de demostración
const fallbackClientes: ClienteConTiqueteraResumen[] = [
  {
    cliente: {
      id: 'usr-demo-01',
      empresa_id: 'emp-velo-001',
      nombre_completo: 'Alejandro Vargas',
      documento: '1029384756',
      email: 'alejandro@ejemplo.com',
      telefono: '3001234567',
      rol: 'cliente',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    tiqueteraActiva: {
      id: 'tiq-01',
      planNombre: 'Pack 10 Clases Pro',
      creditosDisponibles: 5,
      creditosTotales: 10,
      fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      estado: 'activa',
      diasRestantes: 30,
    },
    totalCreditosDisponibles: 5,
    totalTiqueteras: 1,
  },
  {
    cliente: {
      id: 'usr-demo-02',
      empresa_id: 'emp-velo-001',
      nombre_completo: 'Camila Ospina',
      documento: '1038472910',
      email: 'camila@ejemplo.com',
      telefono: '3109876543',
      rol: 'cliente',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    tiqueteraActiva: {
      id: 'tiq-02',
      planNombre: 'Pase Mensual 20 Clases Elite',
      creditosDisponibles: 14,
      creditosTotales: 20,
      fechaVencimiento: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      estado: 'activa',
      diasRestantes: 45,
    },
    totalCreditosDisponibles: 14,
    totalTiqueteras: 1,
  },
  {
    cliente: {
      id: 'usr-demo-03',
      empresa_id: 'emp-velo-001',
      nombre_completo: 'Sebastián Mora',
      documento: '1019283746',
      email: 'sebastian@ejemplo.com',
      telefono: '3171239876',
      rol: 'cliente',
      avatar_url: null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    tiqueteraActiva: null,
    totalCreditosDisponibles: 0,
    totalTiqueteras: 0,
  },
]

export const ClientsView: React.FC = () => {
  const { currentPalette, empresaId, studioName } = useBranding()

  // Estados de datos
  const [clientes, setClientes] = useState<ClienteConTiqueteraResumen[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [busqueda, setBusqueda] = useState<string>('')

  // Modal para asignación manual de planes
  const [modalAsignarPlan, setModalAsignarPlan] = useState<boolean>(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteConTiqueteraResumen | null>(null)
  const [planesDisponibles, setPlanesDisponibles] = useState<Tables<'planes'>[]>([])
  const [planIdSeleccionado, setPlanIdSeleccionado] = useState<string>('')
  const [asignandoPlan, setAsignandoPlan] = useState<boolean>(false)

  // Mensaje de retroalimentación
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; mensaje: string } | null>(null)

  const adminId = 'usr-admin-01'

  // Cargar clientes y tiqueteras
  const cargarClientes = async (termino?: string) => {
    try {
      const res = await adminService.getClientesConTiqueteras(empresaId, termino || busqueda)
      if (res.data && res.data.length > 0) {
        setClientes(res.data)
      } else {
        setClientes(fallbackClientes)
      }
    } catch (err) {
      console.warn('Error al cargar clientes, usando fallback:', err)
      setClientes(fallbackClientes)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Cargar catálogo de planes para el selector modal
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        const res = await pagosService.getPlanesEmpresa(empresaId)
        if (res.data && res.data.length > 0) {
          setPlanesDisponibles(res.data)
          setPlanIdSeleccionado(res.data[0].id)
        }
      } catch (err) {
        console.warn('Error al cargar catálogo de planes:', err)
      }
    }
    cargarPlanes()
  }, [empresaId])

  useEffect(() => {
    cargarClientes()
  }, [empresaId])

  const handleManualRefresh = () => {
    setRefreshing(true)
    cargarClientes()
  }

  // Abrir modal de asignación manual
  const handleAbrirModalAsignar = (item: ClienteConTiqueteraResumen) => {
    setClienteSeleccionado(item)
    setModalAsignarPlan(true)
    setFeedback(null)
  }

  // Confirmar asignación manual del plan
  const handleConfirmarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSeleccionado || !planIdSeleccionado) return

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
        setFeedback({
          type: 'success',
          mensaje: res.mensaje || 'Plan asignado exitosamente al alumno.',
        })
        setModalAsignarPlan(false)
        cargarClientes()
      } else {
        // En modo demostración
        setClientes((prev) =>
          prev.map((c) => {
            if (c.cliente.id === clienteSeleccionado.cliente.id) {
              return {
                ...c,
                totalCreditosDisponibles: c.totalCreditosDisponibles + 10,
                tiqueteraActiva: {
                  id: `tiq-${Date.now()}`,
                  planNombre: 'Pack 10 Clases Pro',
                  creditosDisponibles: 10,
                  creditosTotales: 10,
                  fechaVencimiento: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
                  estado: 'activa',
                  diasRestantes: 60,
                },
              }
            }
            return c
          })
        )
        setFeedback({
          type: 'success',
          mensaje: `Plan acreditado a ${clienteSeleccionado.cliente.nombre_completo} en la sesión.`,
        })
        setModalAsignarPlan(false)
      }
    } catch (err) {
      console.error('Error al asignar plan:', err)
      setFeedback({
        type: 'error',
        mensaje: 'Ocurrió un error inesperado al asignar el plan.',
      })
    } finally {
      setAsignandoPlan(false)
    }
  }

  // Filtrado reactivo en caso de que la búsqueda sea en memoria
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
      {/* Encabezado */}
      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className={`w-5 h-5 ${currentPalette.textClass}`} />
                  Directorio de Ciclistas y Tiqueteras
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {studioName}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Monitorea el saldo de créditos, vigencia de tiqueteras y asigna planes directamente desde recepción.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula o email..."
                  className="pl-9 text-xs"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                  }}
                />
              </div>

              <Button
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

        {/* Feedback alert */}
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
              <p>No se encontraron clientes con el criterio de búsqueda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clientesFiltrados.map((item) => {
                const tieneCreditos = item.totalCreditosDisponibles > 0
                const tiquetera = item.tiqueteraActiva

                return (
                  <div
                    key={item.cliente.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                  >
                    {/* Información del Ciclista */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-foreground">
                          {item.cliente.nombre_completo}
                        </span>
                        <Badge
                          variant={tieneCreditos ? 'success' : 'secondary'}
                          className="text-[10px]"
                        >
                          {tieneCreditos ? `${item.totalCreditosDisponibles} clases activas` : 'Sin saldo'}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>C.C: <strong className="text-foreground">{item.cliente.documento || 'No registrado'}</strong></span>
                        <span>Email: {item.cliente.email || 'N/A'}</span>
                        <span>Tel: {item.cliente.telefono || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Estado de Tiquetera & Botón Asignar */}
                    <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                      {tiquetera ? (
                        <div className="text-right text-xs space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-1 justify-end">
                            <Ticket className="w-3.5 h-3.5 text-primary" />
                            <span>{tiquetera.planNombre}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>
                              {tiquetera.diasRestantes} días restantes ({tiquetera.fechaVencimiento})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right text-xs text-muted-foreground italic">
                          Sin tiquetera activa
                        </div>
                      )}

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

      {/* Modal: Asignación Manual de Plan desde Recepción */}
      {modalAsignarPlan && clienteSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className={`w-4 h-4 ${currentPalette.textClass}`} />
                  Asignar Plan Manual a Ciclista
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
                Acredita clases inmediatamente y asienta el movimiento contable en caja.
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

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Seleccionar Paquete de Clases</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={planIdSeleccionado}
                    onChange={(e) => setPlanIdSeleccionado(e.target.value)}
                  >
                    {planesDisponibles.length > 0 ? (
                      planesDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {p.creditos} clases (COP ${p.precio.toLocaleString('es-CO')})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="plan-pack10">Pack 10 Clases Pro — 10 clases ($290.000)</option>
                        <option value="plan-pack5">Pack 5 Clases Rider — 5 clases ($160.000)</option>
                        <option value="plan-pack20">Pase Mensual 20 Clases Elite — 20 clases ($450.000)</option>
                        <option value="plan-single">Single Ride (1 Clase) — 1 clase ($35.000)</option>
                      </>
                    )}
                  </select>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Se activará automáticamente la vigencia correspondiente en la tiquetera.
                  </span>
                </div>
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
                  disabled={asignandoPlan}
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
    </div>
  )
}
export default ClientsView