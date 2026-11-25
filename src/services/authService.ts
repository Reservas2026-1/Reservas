import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate, RolUsuario } from '../types/database'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export interface SignUpParams {
  email: string
  password: string
  nombreCompleto: string
  documento?: string
  telefono?: string
  empresaId?: string
  rol?: RolUsuario
  avatarUrl?: string
}

export interface SignInParams {
  email: string
  password: string
}

export interface AuthResponse<T = unknown> {
  data: T | null
  error: string | null
}

export interface AuthSessionData {
  user: User | null
  session: Session | null
  perfil: Tables<'perfiles'> | null
}

/**
 * Servicio de Autenticación y Gestión de Perfiles
 */
export const authService = {
  /**
   * Registro de un nuevo usuario / cliente.
   * Supabase Auth ejecuta el trigger handle_new_user() que inserta automáticamente
   * en la tabla public.perfiles con la metadata enviada.
   */
  async signUp(params: SignUpParams): Promise<AuthResponse<{ user: User | null; session: Session | null }>> {
    try {
      const { email, password, nombreCompleto, documento, telefono, empresaId, rol = 'cliente', avatarUrl } = params

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: nombreCompleto,
            documento: documento || null,
            telefono: telefono || null,
            empresa_id: empresaId || null,
            rol,
            avatar_url: avatarUrl || null,
          },
        },
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          user: data.user,
          session: data.session,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el registro'
      return { data: null, error: message }
    }
  },

  /**
   * Inicio de sesión con correo y contraseña.
   */
  async signIn(params: SignInParams): Promise<AuthResponse<AuthSessionData>> {
    try {
      const { email, password } = params
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data.user) {
        return { data: null, error: 'No se obtuvo información del usuario' }
      }

      // Obtener el perfil asociado en la tabla public.perfiles
      const perfilRes = await this.getProfileById(data.user.id)

      return {
        data: {
          user: data.user,
          session: data.session,
          perfil: perfilRes.data,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el inicio de sesión'
      return { data: null, error: message }
    }
  },

  /**
   * Cierre de sesión del usuario actual.
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { error: error.message }
      }
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cerrar sesión'
      return { error: message }
    }
  },

  /**
   * Obtiene la sesión activa desde el almacenamiento local.
   */
  async getSession(): Promise<AuthResponse<Session | null>> {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        return { data: null, error: error.message }
      }
      return { data: data.session, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar la sesión'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene el usuario autenticado actualmente validado contra el servidor de Supabase.
   */
  async getCurrentUser(): Promise<AuthResponse<User | null>> {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        return { data: null, error: error.message }
      }
      return { data: data.user, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar el usuario actual'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene el perfil completo del usuario autenticado actualmente.
   */
  async getCurrentProfile(): Promise<AuthResponse<Tables<'perfiles'> | null>> {
    try {
      const userRes = await this.getCurrentUser()
      if (userRes.error || !userRes.data) {
        return { data: null, error: userRes.error || 'No hay usuario autenticado' }
      }

      return await this.getProfileById(userRes.data.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener el perfil actual'
      return { data: null, error: message }
    }
  },

  /**
   * Consulta el registro de un perfil por su ID de usuario (UUID).
   */
  async getProfileById(userId: string): Promise<AuthResponse<Tables<'perfiles'> | null>> {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar el perfil'
      return { data: null, error: message }
    }
  },

  /**
   * Actualiza los datos del perfil del usuario logueado.
   */
  async updateCurrentProfile(updates: Partial<TablesUpdate<'perfiles'>>): Promise<AuthResponse<Tables<'perfiles'> | null>> {
    try {
      const userRes = await this.getCurrentUser()
      if (userRes.error || !userRes.data) {
        return { data: null, error: 'No hay usuario autenticado para actualizar su perfil' }
      }

      const { data, error } = await supabase
        .from('perfiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userRes.data.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el perfil'
      return { data: null, error: message }
    }
  },

  /**
   * Suscribe a cambios en el estado de autenticación (login, logout, token refresh).
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  },
}
