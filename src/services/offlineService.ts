import { Preferences } from '@capacitor/preferences'

export interface ReservaPaseOffline {
  reservaId: string
  codigoQR: string
  clienteNombre: string
  clienteDocumento?: string | null
  claseTitulo: string
  instructorNombre?: string | null
  bicicletaNumero: number
  fecha: string
  horaInicio: string
  horaFin: string
  estudioNombre: string
  colorPrimario?: string | null
  guardadoEn: string
}

const OFFLINE_PASS_KEY = 'rtc_reserva_pase_offline'

/**
 * Helper interno para interactuar de forma segura con Capacitor Preferences
 * tanto en compilación móvil como con fallback automático a localStorage en web estándar.
 */
function getPreferencesPlugin() {
  if (typeof window !== 'undefined') {
    const win = window as unknown as {
      Capacitor?: {
        Plugins?: {
          Preferences?: typeof Preferences
        }
      }
    }
    if (win.Capacitor?.Plugins?.Preferences) {
      return win.Capacitor.Plugins.Preferences
    }
  }
  return typeof Preferences !== 'undefined' ? Preferences : null
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    const plugin = getPreferencesPlugin()
    if (plugin && typeof plugin.set === 'function') {
      await plugin.set({ key, value })
      return
    }
  } catch {
    // Continuar a fallback
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value)
  }
}

async function storageGet(key: string): Promise<string | null> {
  try {
    const plugin = getPreferencesPlugin()
    if (plugin && typeof plugin.get === 'function') {
      const res = await plugin.get({ key })
      if (res && res.value !== null && res.value !== undefined) {
        return res.value
      }
    }
  } catch {
    // Continuar a fallback
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key)
  }

  return null
}

async function storageRemove(key: string): Promise<void> {
  try {
    const plugin = getPreferencesPlugin()
    if (plugin && typeof plugin.remove === 'function') {
      await plugin.remove({ key })
      return
    }
  } catch {
    // Continuar a fallback
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key)
  }
}

/**
 * Servicio de Acceso Offline para Ciclistas y Alumnos
 * Permite persistir y recuperar el pase de acceso y código QR de su próxima clase
 * en el almacenamiento seguro del dispositivo móvil (Android/iOS) o navegador.
 */
export const offlineService = {
  /**
   * Almacena localmente los datos esenciales de la próxima reserva confirmada.
   * Permite que el ciclista acceda al estudio aún sin conexión de datos o en subterráneos.
   */
  async guardarPaseOffline(reserva: ReservaPaseOffline): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!reserva.reservaId || !reserva.codigoQR) {
        return { success: false, error: 'Datos de reserva o código QR incompletos' }
      }

      const payloadConTimestamp: ReservaPaseOffline = {
        ...reserva,
        guardadoEn: reserva.guardadoEn || new Date().toISOString(),
      }

      const jsonString = JSON.stringify(payloadConTimestamp)
      await storageSet(OFFLINE_PASS_KEY, jsonString)

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar el pase offline'
      return { success: false, error: message }
    }
  },

  /**
   * Obtiene el pase offline de la última reserva activa guardada en el dispositivo.
   * Retorna null si no hay ningún pase almacenado o si los datos locales están corruptos.
   */
  async getPaseOffline(): Promise<ReservaPaseOffline | null> {
    try {
      const stored = await storageGet(OFFLINE_PASS_KEY)
      if (!stored) {
        return null
      }

      const parsed = JSON.parse(stored) as ReservaPaseOffline
      if (!parsed.reservaId || !parsed.codigoQR) {
        return null
      }

      return parsed
    } catch {
      return null
    }
  },

  /**
   * Borra el pase offline almacenado una vez que la clase fue asistida, finalizada o cancelada.
   */
  async limpiarPaseOffline(): Promise<{ success: boolean; error: string | null }> {
    try {
      await storageRemove(OFFLINE_PASS_KEY)
      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el pase offline'
      return { success: false, error: message }
    }
  },

  /**
   * Valida si un pase offline sigue vigente en relación con la fecha actual.
   * Considera una holgura de 4 horas post fin de clase.
   */
  esPaseVigente(pase: ReservaPaseOffline): boolean {
    try {
      if (!pase.fecha) return false
      const fechaClaseFin = new Date(`${pase.fecha}T${pase.horaFin || '23:59:59'}`)
      const ahora = new Date()
      return ahora.getTime() <= fechaClaseFin.getTime() + 4 * 60 * 60 * 1000
    } catch {
      return true
    }
  },
}
