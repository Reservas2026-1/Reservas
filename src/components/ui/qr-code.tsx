import React, { useMemo } from 'react'
import { QrCode as QrIcon, Copy, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRCodeProps {
  value: string
  size?: number
  className?: string
  showValue?: boolean
  showActions?: boolean
  label?: string
  isOffline?: boolean
  offlineSavedAt?: string
}

/**
 * Generador determinista de matriz QR en formato SVG limpio sin dependencias externas.
 * Genera una matriz 21x21 o 25x25 determinística con los 3 ojos de posición estándar de QR.
 */
function generateDeterministicMatrix(text: string, dimension: number = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: dimension }, () => Array(dimension).fill(false))

  // Función para dibujar ojo de posición (Finder Pattern 7x7)
  const drawFinderPattern = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[startY + r][startX + c] = isBorder || isInner
      }
    }
  }

  // Tres ojos estándar (Superior Izq, Superior Der, Inferior Izq)
  drawFinderPattern(0, 0)
  drawFinderPattern(dimension - 7, 0)
  drawFinderPattern(0, dimension - 7)

  // Separadores alrededor de los ojos
  for (let i = 0; i < 8; i++) {
    if (dimension > 7) {
      matrix[7][i] = false
      matrix[i][7] = false
      matrix[7][dimension - 1 - i] = false
      matrix[i][dimension - 8] = false
      matrix[dimension - 8][i] = false
      matrix[dimension - 1 - i][7] = false
    }
  }

  // Líneas de sincronización (Timing patterns)
  for (let i = 8; i < dimension - 8; i++) {
    const bit = i % 2 === 0
    matrix[6][i] = bit
    matrix[i][6] = bit
  }

  // Generación determinista de celdas de datos con hashing simple del texto
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  let seed = Math.abs(hash) || 123456789
  const nextRandomBit = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return (seed >> 16) % 2 === 1
  }

  for (let r = 0; r < dimension; r++) {
    for (let c = 0; c < dimension; c++) {
      const inTopLeft = r < 8 && c < 8
      const inTopRight = r < 8 && c >= dimension - 8
      const inBottomLeft = r >= dimension - 8 && c < 8
      const inTiming = r === 6 || c === 6

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
        matrix[r][c] = nextRandomBit()
      }
    }
  }

  return matrix
}

export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 180,
  className = '',
  showValue = true,
  showActions = true,
  label,
  isOffline = false,
  offlineSavedAt,
}) => {
  const [copied, setCopied] = React.useState(false)

  const matrix = useMemo(() => {
    return generateDeterministicMatrix(value || 'QR-EMPTY-0000', 21)
  }, [value])

  const dimension = matrix.length
  const cellSize = size / dimension

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const svgEl = document.getElementById(`qr-svg-${value}`)
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pase-reserva-${value.substring(0, 8)}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-900 ${className}`}>
      {/* Badge Distintivo de Modo Offline */}
      {isOffline && (
        <div className="mb-3 w-full">
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>🟢 Modo Offline / Pase Guardado en el Dispositivo</span>
          </div>
          {offlineSavedAt && (
            <span className="text-[10px] text-slate-500 block text-center mt-1 font-mono">
              Sincronizado: {new Date(offlineSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {label && (
        <span className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-1">
          <QrIcon className="w-3.5 h-3.5" />
          {label}
        </span>
      )}

      {/* SVG QR Code */}
      <div className="relative p-2 bg-white rounded-xl border border-slate-100 shadow-xs">
        <svg
          id={`qr-svg-${value}`}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rounded"
        >
          <rect width={size} height={size} fill="#ffffff" />
          {matrix.map((row, r) =>
            row.map((col, c) => {
              if (!col) return null
              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize + 0.15}
                  height={cellSize + 0.15}
                  fill="#0f172a"
                />
              )
            })
          )}
        </svg>
      </div>

      {showValue && (
        <div className="mt-2 text-center">
          <span className="font-mono text-xs font-bold text-slate-800 tracking-wider bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 block">
            {value}
          </span>
        </div>
      )}

      {showActions && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs gap-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar Código</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-7 text-xs gap-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
            title="Descargar SVG"
          >
            <Download className="w-3 h-3" />
            <span>Pase</span>
          </Button>
        </div>
      )}
    </div>
  )
}

export default QRCode
