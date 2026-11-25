import React, { useState } from 'react'
import { User, Phone, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BikeMap } from './BikeMap'
import type { Bicicleta, Plan } from '@/types'

const mockPlanes: Plan[] = [
  {
    id: 'plan-1',
    empresa_id: 'emp-1',
    nombre: 'Paseo Corto',
    descripcion: 'Ideal para desplazamientos rápidos o vueltas al parque.',
    precio: 20,
    duracion_horas: 1,
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan-2',
    empresa_id: 'emp-1',
    nombre: 'Medio Día Aventura',
    descripcion: 'Explora el malecón y zonas turísticas con tranquilidad.',
    precio: 50,
    duracion_horas: 4,
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan-3',
    empresa_id: 'emp-1',
    nombre: 'Full Day Libre',
    descripcion: 'Disfruta de la bicicleta todo el día sin preocupaciones.',
    precio: 85,
    duracion_horas: 10,
    activo: true,
    created_at: new Date().toISOString(),
  },
]

export const ClientBookingView: React.FC = () => {
  const [selectedBike, setSelectedBike] = useState<Bicicleta | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan>(mockPlanes[1])
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDocumento, setClienteDocumento] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [reservaExitosa, setReservaExitosa] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBike) {
      alert('Por favor selecciona una bicicleta en el mapa')
      return
    }
    setReservaExitosa(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reserva Tu Bicicleta</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ubica tu bici en el mapa interactivo, selecciona el plan ideal y confirma tu reserva al instante.
        </p>
      </div>

      {reservaExitosa ? (
        <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-center py-10">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              ¡Reserva Registrada con Éxito!
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Hola <span className="font-semibold text-foreground">{clienteNombre}</span>, tu bicicleta{' '}
              <span className="font-semibold text-foreground">{selectedBike?.codigo}</span> ha sido reservada con el{' '}
              <span className="font-semibold text-foreground">{selectedPlan.nombre}</span>.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setReservaExitosa(false)
                  setSelectedBike(null)
                  setClienteNombre('')
                  setClienteDocumento('')
                  setClienteTelefono('')
                }}
              >
                Hacer otra reserva
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lado izquierdo: Mapa y Selección de Bici */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Elige tu bicicleta en el mapa
              </h2>
              <BikeMap
                selectedBikeId={selectedBike?.id}
                onSelectBike={(bike) => setSelectedBike(bike)}
              />
            </div>

            {/* Selector de Planes */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Selecciona tu Plan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mockPlanes.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`cursor-pointer border rounded-lg p-4 transition-all ${
                      selectedPlan.id === plan.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                        : 'hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm">{plan.nombre}</span>
                      <Badge variant="secondary" className="text-xs">
                        {plan.duracion_horas}h
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{plan.descripcion}</p>
                    <div className="text-lg font-extrabold text-primary">S/. {plan.precio}.00</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lado derecho: Formulario de Checkout */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Resumen de Reserva
                </CardTitle>
                <CardDescription>Completa tus datos para confirmar</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {selectedBike ? (
                    <div className="bg-muted/50 p-3 rounded-lg border text-sm space-y-1">
                      <div className="font-medium flex justify-between">
                        <span>Bicicleta: {selectedBike.codigo}</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {selectedBike.tipo}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{selectedBike.modelo}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 dark:border-amber-900">
                      ⚠️ Selecciona una bicicleta del mapa para continuar.
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5" /> Nombre y Apellidos
                      </label>
                      <Input
                        required
                        placeholder="Ej. Carlos Mendoza"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> DNI / Pasaporte
                      </label>
                      <Input
                        required
                        placeholder="Ej. 72819203"
                        value={clienteDocumento}
                        onChange={(e) => setClienteDocumento(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5" /> Teléfono / WhatsApp
                      </label>
                      <Input
                        required
                        placeholder="Ej. 987 654 321"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Plan:</span>
                      <span className="font-medium text-foreground">{selectedPlan.nombre}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Duración:</span>
                      <span className="font-medium text-foreground">{selectedPlan.duracion_horas} horas</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-foreground border-t pt-2">
                      <span>Total a Pagar:</span>
                      <span className="text-primary">S/. {selectedPlan.precio}.00</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={!selectedBike}>
                    Confirmar Reserva
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
