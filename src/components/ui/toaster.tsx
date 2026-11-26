import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import type { ToastOptions } from './use-toast'

interface ToastItem extends ToastOptions {
  id: string
}

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ToastOptions>
      const detail = customEvent.detail || {}
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev.slice(-3), { id, ...detail }])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4500)
    }

    window.addEventListener('app-toast', handler)
    return () => window.removeEventListener('app-toast', handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((item) => {
        const variant = item.variant || 'default'
        const isError = variant === 'destructive'
        const isSuccess = variant === 'success'

        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all text-xs ${
              isError
                ? 'bg-destructive/95 text-destructive-foreground border-destructive'
                : isSuccess
                ? 'bg-emerald-600/95 text-white border-emerald-500'
                : 'bg-card/95 text-card-foreground border-border'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            )}
            <div className="flex-1 min-w-0 space-y-0.5">
              {item.title && <p className="font-bold leading-tight">{item.title}</p>}
              {item.description && (
                <p className="opacity-90 leading-snug break-words">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== item.id))}
              className="opacity-70 hover:opacity-100 shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toaster
