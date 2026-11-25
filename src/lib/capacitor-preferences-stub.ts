/**
 * Stub / Fallback para @capacitor/preferences en entornos web y bundling Vite.
 * En la app móvil nativa (Capacitor Android/iOS), window.Capacitor.Plugins.Preferences
 * toma precedencia automáticamente.
 */
export const Preferences = {
  async set(options: { key: string; value: string }): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(options.key, options.value)
    }
  },
  async get(options: { key: string }): Promise<{ value: string | null }> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return { value: window.localStorage.getItem(options.key) }
    }
    return { value: null }
  },
  async remove(options: { key: string }): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(options.key)
    }
  },
  async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  },
}

export default Preferences
