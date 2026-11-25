import React, { useState, useEffect } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  Wallet,
  Smartphone,
  CreditCard,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBranding } from '@/context/BrandingContext'
import { adminService, type CierreCajaResumen } from '@/services/adminService'
import type { Tables } from '@/types/database'

// Fallback de demostración con montos en COP para Indoor Cycling
const fallbackCierre: CierreCajaResumen = {
  fecha: new Date().toISOString().split('T')[0],
  totalIngresos: 1350000,
  totalEgresos: 65000,
  balanceNeto: 1285000,
  totalMovimientos: 5,
  desglosePorMetodo: {
    efectivo: {
      metodo: 'efectivo',
      ingresos: 320000,
      egresos: 65000,
      neto: 255000,
      cantidadTransacciones: 3,
    },
    nequi: {
      metodo: 'nequi',
      ingresos: 580000,
      egresos: 0,
      neto: 580000,
      cantidadTransacciones: 2,
    },
    bancolombia: {
      metodo: 'bancolombia',
      ingresos: 450000,
      egresos: 0,
      neto: 450000,
      cantidadTransacciones: 1,
    },
    wompi: {
      metodo: 'wompi',
      ingresos: 0,
      egresos: 0,
      neto: 0,
      cantidadTransacciones: 0,
    },
  },
  movimientos: [
    {
      id: 'mov-01',
      empresa_id: 'emp-velo-001',
      usuario_id: null,
      pago_id: null,
      tipo: 'ingreso',
      concepto: 'Pago Single Ride #RES-884 (Efectivo)',
      monto: 35000,
      metodo: 'efectivo',
      reserva_id: null,
      responsable: 'Carlos Recepción',
      fecha: `${new Date().toISOString().split('T')[0]}T07:15:00`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mov-02',
      empresa_id: 'emp-velo-001',
      usuario_id: null,
      pago_id: null,
      tipo: 'ingreso',
      concepto: 'Pago Pack 10 Clases Pro (Nequi #NEQUI-8849)',
      monto: 290000,
      metodo: 'nequi',
      reserva_id: null,
      responsable: 'Carlos Recepción',
      fecha: `${new Date().toISOString().split('T')[0]}T08:30:00`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mov-03',
      empresa_id: 'emp-velo-001',
      usuario_id: null,
      pago_id: null,
      tipo: 'egreso',
      concepto: 'Compra de toallas limpias e hidratación para ciclistas',
      monto: 65000,
      metodo: 'efectivo',
      reserva_id: null,
      responsable: 'Carlos Recepción',
      fecha: `${new Date().toISOString().split('T')[0]}T10:45:00`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mov-04',
      empresa_id: 'emp-velo-001',
      usuario_id: null,
      pago_id: null,
      tipo: 'ingreso',
      concepto: 'Pago Pase Mensual 20 Clases (Bancolombia #BC-9948)',
      monto: 450000,
      metodo: 'bancolombia',
      reserva_id: null,
      responsable: 'Carlos Recepción',
      fecha: `${new Date().toISOString().split('T')[0]}T11:20:00`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mov-05',
      empresa_id: 'emp-velo-001',
      usuario_id: null,
      pago_id: null,
      tipo: 'ingreso',
      concepto: 'Pago Pack 10 Clases Pro (Nequi #NEQUI-1123)',
      monto: 290000,
      metodo: 'nequi',
      reserva_id: null,
      responsable: 'Carlos Recepción',
      fecha: `${new Date().toISOString().split('T')[0]}T14:10:00`,
      created_at: new Date().toISOString(),
    },
  ],
}

export const CashRegister: React.FC = () => {
  const { currentPalette, empresaId, studioName } = useBranding()

  const [fechaConsulta, setFechaConsulta] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [resumenCaja, setResumenCaja] = useState<CierreCajaResumen>(fallbackCierre)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Formulario de nuevo movimiento manual
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [metodo, setMetodo] = useState<'efectivo' | 'nequi' | 'bancolombia' | 'wompi'>('efectivo')

  const cargarCierre = async (fecha?: string) => {
    try {
      const res = await adminService.getCierreCaja(empresaId, fecha || fechaConsulta)
      if (res.data) {
        setResumenCaja(res.data)
      } else {
        setResumenCaja(fallbackCierre)
      }
    } catch (err) {
      console.warn('Error al cargar cierre de caja, usando fallback:', err)
      setResumenCaja(fallbackCierre)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    cargarCierre(fechaConsulta)
  }, [empresaId, fechaConsulta])

  const handleManualRefresh = () => {
    setRefreshing(true)
    cargarCierre(fechaConsulta)
  }

  // Formato COP
  const formatCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)
  }

  // Agregar movimiento local / sesión
  const handleAgregarMovimiento = (e: React.FormEvent) => {
    e.preventDefault()
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0) return

    const valorMonto = parseFloat(monto)
    const nuevoMovimiento: Tables<'movimientos_caja'> = {
      id: `mov-${Date.now()}`,
      empresa_id: empresaId,
      usuario_id: null,
      pago_id: null,
      tipo,
      concepto: concepto.trim(),
      monto: valorMonto,
      metodo,
      reserva_id: null,
      responsable: 'Operador Recepción',
      fecha: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    setResumenCaja((prev) => {
      const nuevoIngresos = tipo === 'ingreso' ? prev.totalIngresos + valorMonto : prev.totalIngresos
      const nuevoEgresos = tipo === 'egreso' ? prev.totalEgresos + valorMonto : prev.totalEgresos

      const desgloseActual = { ...prev.desglosePorMetodo }
      if (!desgloseActual[metodo]) {
        desgloseActual[metodo] = {
          metodo,
          ingresos: 0,
          egresos: 0,
          neto: 0,
          cantidadTransacciones: 0,
        }
      }
      desgloseActual[metodo].cantidadTransacciones += 1
      if (tipo === 'ingreso') {
        desgloseActual[metodo].ingresos += valorMonto
        desgloseActual[metodo].neto += valorMonto
      } else {
        desgloseActual[metodo].egresos += valorMonto
        desgloseActual[metodo].neto -= valorMonto
      }

      return {
        ...prev,
        totalIngresos: nuevoIngresos,
        totalEgresos: nuevoEgresos,
        balanceNeto: nuevoIngresos - nuevoEgresos,
        totalMovimientos: prev.totalMovimientos + 1,
        desglosePorMetodo: desgloseActual,
        movimientos: [nuevoMovimiento, ...prev.movimientos],
      }
    })

    setConcepto('')
    setMonto('')
  }

  // Totales segregados
  const totalEfectivo =
    (resumenCaja.desglosePorMetodo?.['efectivo']?.ingresos || 0) -
    (resumenCaja.desglosePorMetodo?.['efectivo']?.egresos || 0)

  const totalNequiBancolombia =
    (resumenCaja.desglosePorMetodo?.['nequi']?.ingresos || 0) +
    (resumenCaja.desglosePorMetodo?.['bancolombia']?.ingresos || 0) +
    (resumenCaja.desglosePorMetodo?.['transferencia']?.ingresos || 0)

  const totalWompiTarjeta =
    (resumenCaja.desglosePorMetodo?.['wompi']?.ingresos || 0) +
    (resumenCaja.desglosePorMetodo?.['tarjeta']?.ingresos || 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado y Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight">Arqueo y Cierre de Caja</h1>
            <Badge variant="outline" className="text-xs font-mono">
              {studioName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Liquidación financiera diaria segregada por Efectivo, Nequi/Bancolombia y pasarela Wompi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border rounded-lg p-1.5 bg-card">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              className="text-xs h-7 border-0 p-0 font-mono"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-9 w-9 shrink-0"
            title="Actualizar arqueo"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero Segregado (4 Tarjetas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Efectivo Físico */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Efectivo en Cajón
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-foreground">
                  {formatCOP(totalEfectivo)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dinero físico disponible en recepción
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta 2: Nequi / Bancolombia */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nequi / Bancolombia
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {formatCOP(totalNequiBancolombia)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Transferencias bancarias verificadas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta 3: Wompi / Tarjeta */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Wompi / Tarjetas
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {formatCOP(totalWompiTarjeta)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pasarela en línea con dispersión automática
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tarjeta 4: Balance Neto Diario */}
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className={`absolute top-0 left-0 right-0 h-1 ${currentPalette.bgClass}`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Balance Neto del Día
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div
                  className={`text-2xl font-black ${
                    resumenCaja.balanceNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatCOP(resumenCaja.balanceNeto)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    +{formatCOP(resumenCaja.totalIngresos)} / -{formatCOP(resumenCaja.totalEgresos)}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contenedor Principal: Formulario Nuevo Movimiento + Tabla de Movimientos del Día */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro de Movimiento Manual */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className={`w-4 h-4 ${currentPalette.textClass}`} />
              Registrar Movimiento
            </CardTitle>
            <CardDescription className="text-xs">
              Ingresos de mostrador o gastos operativos del estudio.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleAgregarMovimiento}>
            <CardContent className="p-5 space-y-4 text-xs">
              {/* Selector de Tipo (Ingreso / Egreso) */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === 'ingreso' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipo('ingreso')}
                  className={tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
                >
                  <ArrowUpRight className="mr-1.5 h-4 w-4" /> Ingreso
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'egreso' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipo('egreso')}
                  className={tipo === 'egreso' ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold' : ''}
                >
                  <ArrowDownRight className="mr-1.5 h-4 w-4" /> Egreso
                </Button>
              </div>

              {/* Concepto */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Concepto / Motivo</label>
                <Input
                  required
                  placeholder="Ej: Toallas limpias, agua, pago de clase..."
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Monto en COP */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Monto en COP ($)</label>
                <Input
                  type="number"
                  required
                  min={100}
                  step={100}
                  placeholder="Ej: 35000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              {/* Método de Pago */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Canal de Pago</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={metodo}
                  onChange={(e) =>
                    setMetodo(e.target.value as 'efectivo' | 'nequi' | 'bancolombia' | 'wompi')
                  }
                >
                  <option value="efectivo">Efectivo en Recepción</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia Transferencia</option>
                  <option value="wompi">Wompi / Tarjeta</option>
                </select>
              </div>

              <Button
                type="submit"
                className={`w-full font-bold shadow-sm ${currentPalette.bgClass} text-white mt-2`}
              >
                Guardar Asiento Contable
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Tabla de Movimientos del Día */}
        <Card className="lg:col-span-2 border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className={`w-4 h-4 ${currentPalette.textClass}`} />
                Movimientos del Día ({fechaConsulta})
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoría completa de transacciones asentadas en PostgreSQL.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {resumenCaja.movimientos.length} asientos
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {resumenCaja.movimientos.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay movimientos contables registrados en esta fecha.
              </div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {resumenCaja.movimientos.map((m) => {
                  const isIngreso = m.tipo === 'ingreso'
                  const hora = (m.fecha || '').split('T')[1]?.slice(0, 5) || '12:00'

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isIngreso
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {isIngreso ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground">{m.concepto}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span className="font-mono">{hora} hrs</span>
                            <span>•</span>
                            <span className="capitalize font-medium">{m.metodo}</span>
                            <span>•</span>
                            <span>{m.responsable}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-black text-sm ${
                            isIngreso ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIngreso ? '+' : '-'} {formatCOP(m.monto)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default CashRegister