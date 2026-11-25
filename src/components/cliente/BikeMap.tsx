import React, { useState } from 'react'
import { Bike, Battery, MapPin, Zap, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Bicicleta } from '@/types'

interface BikeMapProps {
  bicicletas?: Bicicleta[]
  onSelectBike?: (bike: Bicicleta) => void
  selectedBikeId?: string
}

const mockBicicletas: Bicicleta[] = [
  {
    id: 'bike-1',
    empresa_id: 'emp-1',
    codigo: 'ECO-01',
    modelo: 'Trek FX 3 Disc',
    tipo: 'urbana',
    estado: 'disponible',
    latitud: -12.1215,
    longitud: -77.0298,
    tarifa_hora: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bike-2',
    empresa_id: 'emp-1',
    codigo: 'VOLT-02',
    modelo: 'Specialized Turbo Vado',
    tipo: 'electrica',
    estado: 'disponible',
    latitud: -12.1235,
    longitud: -77.0315,
    bateria_porcentaje: 88,
    tarifa_hora: 25,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bike-3',
    empresa_id: 'emp-1',
    codigo: 'MTB-03',
    modelo: 'Giant Talon 1',
    tipo: 'montaña',
    estado: 'disponible',
    latitud: -12.1198,
    longitud: -77.0274,
    tarifa_hora: 18,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bike-4',
    empresa_id: 'emp-1',
    codigo: 'VOLT-04',
    modelo: 'Cannondale Quick Neo',
    tipo: 'electrica',
    estado: 'reservada',
    latitud: -12.1245,
    longitud: -77.0289,
    bateria_porcentaje: 45,
    tarifa_hora: 25,
    created_at: new Date().toISOString(),
  },
]

export const BikeMap: React.FC<BikeMapProps> = ({
  bicicletas = mockBicicletas,
  onSelectBike,
  selectedBikeId,
}) => {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  const bicisFiltradas = bicicletas.filter((b) => {
    if (filtroTipo === 'todos') return true
    return b.tipo === filtroTipo
  })

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Estación Principal Miraflores</span>
          <Badge variant="outline" className="text-xs">
            {bicicletas.filter((b) => b.estado === 'disponible').length} disponibles
          </Badge>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['todos', 'urbana', 'electrica', 'montaña'].map((tipo) => (
            <Button
              key={tipo}
              size="sm"
              variant={filtroTipo === tipo ? 'default' : 'outline'}
              className="capitalize text-xs h-7"
              onClick={() => setFiltroTipo(tipo)}
            >
              {tipo}
            </Button>
          ))}
        </div>
      </div>

      {/* Representación visual de mapa / estaciones */}
      <div className="relative w-full h-64 md:h-80 bg-slate-100 dark:bg-slate-900 rounded-xl border overflow-hidden flex flex-col justify-between p-4 shadow-inner">
        {/* Marcadores decorativos estilo mapa */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="flex justify-between items-start z-10">
          <div className="bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-sm border text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Mapa en tiempo real
          </div>
          <div className="text-xs bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-md border text-muted-foreground">
            Coordenadas: -12.1215, -77.0298
          </div>
        </div>

        {/* Puntos de bicicletas en el mapa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 z-10 my-auto">
          {bicisFiltradas.map((bici) => {
            const isSelected = selectedBikeId === bici.id
            const isAvailable = bici.estado === 'disponible'

            return (
              <div
                key={bici.id}
                onClick={() => isAvailable && onSelectBike?.(bici)}
                className={`p-3 rounded-lg border text-left transition-all backdrop-blur-md cursor-pointer ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary bg-primary/10 shadow-md'
                    : isAvailable
                    ? 'bg-background/95 hover:border-primary/50 hover:shadow-sm'
                    : 'bg-muted/60 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">{bici.codigo}</span>
                  <Badge
                    variant={isAvailable ? 'success' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {bici.estado}
                  </Badge>
                </div>
                <div className="text-xs font-medium truncate mb-1">{bici.modelo}</div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="capitalize">{bici.tipo}</span>
                  {bici.bateria_porcentaje !== undefined && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                      <Zap className="w-3 h-3" />
                      {bici.bateria_porcentaje}%
                    </span>
                  )}
                </div>
                <div className="mt-2 pt-1.5 border-t flex justify-between items-center text-xs">
                  <span className="font-semibold text-primary">S/. {bici.tarifa_hora}/h</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-[11px] text-muted-foreground z-10 text-center">
          Haz clic en una bicicleta disponible para seleccionarla en tu reserva
        </div>
      </div>

      {/* Listado de unidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bicisFiltradas.map((bike) => (
          <Card
            key={bike.id}
            className={`transition-all ${
              selectedBikeId === bike.id ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bike className="w-4 h-4 text-primary" />
                    {bike.codigo}
                  </CardTitle>
                  <CardDescription className="text-xs">{bike.modelo}</CardDescription>
                </div>
                <Badge variant={bike.estado === 'disponible' ? 'success' : 'secondary'}>
                  {bike.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span className="capitalize">Tipo: {bike.tipo}</span>
                {bike.bateria_porcentaje && (
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Battery className="w-3.5 h-3.5" /> {bike.bateria_porcentaje}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">
                  S/. {bike.tarifa_hora ?? 15}{' '}
                  <span className="text-xs font-normal text-muted-foreground">/ hora</span>
                </span>
                <Button
                  size="sm"
                  disabled={bike.estado !== 'disponible'}
                  variant={selectedBikeId === bike.id ? 'secondary' : 'default'}
                  onClick={() => onSelectBike?.(bike)}
                >
                  {selectedBikeId === bike.id ? 'Seleccionada' : 'Seleccionar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
