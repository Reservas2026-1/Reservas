import React from 'react'
import { Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface QuickTimeSlot {
  label: string
  value24: string
}

export const QUICK_TIME_SLOTS: QuickTimeSlot[] = [
  { label: '05:00 AM', value24: '05:00' },
  { label: '06:00 AM', value24: '06:00' },
  { label: '07:00 AM', value24: '07:00' },
  { label: '08:00 AM', value24: '08:00' },
  { label: '05:00 PM', value24: '17:00' },
  { label: '06:00 PM', value24: '18:00' },
  { label: '07:00 PM', value24: '19:00' },
]

export function addMinutesToTime(hhmm: string, minutesToAdd: number): string {
  const [rawH, rawM] = hhmm.split(':').map((n) => Number.parseInt(n, 10))
  if (Number.isNaN(rawH) || Number.isNaN(rawM)) return hhmm
  const totalMinutes = (rawH * 60 + rawM + minutesToAdd + 1440) % 1440
  const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const endM = String(totalMinutes % 60).padStart(2, '0')
  return `${endH}:${endM}`
}

interface HybridHourSelectorProps {
  horaInicio: string
  horaFin: string
  onChange: (horaInicio: string, horaFin: string) => void
  accentClass?: string
  disabled?: boolean
}

export const HybridHourSelector: React.FC<HybridHourSelectorProps> = ({
  horaInicio,
  horaFin,
  onChange,
  accentClass = 'bg-primary text-primary-foreground',
  disabled = false,
}) => {
  const normalizedStart = horaInicio.slice(0, 5)
  const normalizedEnd = horaFin.slice(0, 5)

  const handleQuickSelect = (slotValue: string) => {
    const endCalculated = addMinutesToTime(slotValue, 45)
    onChange(slotValue, endCalculated)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Franjas Rápidas (+45 min automáticos)</span>
          </span>
          <span className="text-[10px] text-muted-foreground">Selección rápida o ajuste manual</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_TIME_SLOTS.map((slot) => {
            const isSelected = normalizedStart === slot.value24
            return (
              <Button
                key={slot.value24}
                type="button"
                size="sm"
                disabled={disabled}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => handleQuickSelect(slot.value24)}
                className={`h-7 px-2.5 text-[11px] font-semibold transition-all ${
                  isSelected ? `${accentClass} border-transparent shadow-xs` : 'hover:bg-muted'
                }`}
              >
                {slot.label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="font-bold text-foreground text-xs block">Hora Inicio (Manual)</label>
          <Input
            type="time"
            required
            disabled={disabled}
            value={normalizedStart}
            onChange={(e) => onChange(e.target.value, normalizedEnd)}
            className="text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-foreground text-xs block">Hora Fin (Manual)</label>
          <Input
            type="time"
            required
            disabled={disabled}
            value={normalizedEnd}
            onChange={(e) => onChange(normalizedStart, e.target.value)}
            className="text-xs font-mono"
          />
        </div>
      </div>
    </div>
  )
}

export default HybridHourSelector
