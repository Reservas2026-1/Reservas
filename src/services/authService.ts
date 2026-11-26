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

export interface RegisterStudioParams {
  nombreNegocio: string
  tipoNegocio?: string
  nombreAdmin: string
  email: string
  password: string
  telefono?: string
}

export interface EmpresaActiva {
  id: string
  nombre: string
  tipo_negocio: string | null
  logo_url: string | null
}

export interface RegisterStudioResult {
  user: User | null
  session: Session | null
  perfil: Tables<'perfiles'> | null
  empresa: Tables<'empresas'> | null
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
 * Función utilitaria para generar slugs URL-friendly a partir de un nombre de negocio.
 */
export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return base || `studio-${Date.now().toString(36)}`
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
   * Registro completo de un nuevo estudio / negocio y su administrador inicial.
   * 1. Inserta la empresa en public.empresas.
   * 2. Registra el usuario administrador en supabase.auth.signUp vinculándolo con empresa_id.
   * 3. Asegura el perfil administrador en public.perfiles.
   */
  async registerStudio(params: RegisterStudioParams): Promise<AuthResponse<RegisterStudioResult>> {
    try {
      const { nombreNegocio, tipoNegocio, nombreAdmin, email, password, telefono } = params

      if (!nombreNegocio || !nombreNegocio.trim()) {
        return { data: null, error: 'El nombre del negocio o estudio es obligatorio' }
      }
      if (!email || !email.trim()) {
        return { data: null, error: 'El correo electrónico es obligatorio' }
      }
      if (!password || password.length < 6) {
        return { data: null, error: 'La contraseña debe tener al menos 6 caracteres' }
      }
      if (!nombreAdmin || !nombreAdmin.trim()) {
        return { data: null, error: 'El nombre del administrador es obligatorio' }
      }

      // a) Inserta en la tabla empresas el nuevo negocio
      const slug = generateSlug(nombreNegocio)
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nombre: nombreNegocio.trim(),
          tipo_negocio: tipoNegocio?.trim() || null,
          activo: true,
          slug,
        })
        .select()
        .single()

      if (empresaError || !empresaData) {
        return {
          data: null,
          error: empresaError?.message || 'Error al crear la empresa en el sistema',
        }
      }

      // b) Con el empresa.id resultante, realiza supabase.auth.signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            nombre_completo: nombreAdmin.trim(),
            empresa_id: empresaData.id,
            rol: 'admin',
            telefono: telefono?.trim() || null,
          },
        },
      })

      if (authError) {
        // Rollback defensivo: limpiar empresa creada si el registro auth falla
        await supabase.from('empresas').delete().eq('id', empresaData.id)
        return { data: null, error: authError.message }
      }

      // c) Si Supabase devuelve usuario o sesión, consulta o genera el perfil admin
      let perfil: Tables<'perfiles'> | null = null

      if (authData.user) {
        const perfilRes = await this.getProfileById(authData.user.id)
        if (perfilRes.data) {
          perfil = perfilRes.data
        } else {
          // Si el trigger de BD aún no se ha ejecutado o hay latencia, upsert manual
          const { data: nuevoPerfil, error: perfilInsertErr } = await supabase
            .from('perfiles')
            .upsert({
              id: authData.user.id,
              empresa_id: empresaData.id,
              email: email.trim().toLowerCase(),
              nombre_completo: nombreAdmin.trim(),
              telefono: telefono?.trim() || null,
              rol: 'admin',
              activo: true,
            })
            .select()
            .maybeSingle()

          if (!perfilInsertErr && nuevoPerfil) {
            perfil = nuevoPerfil
          } else {
            // Fallback en memoria si RLS bloquea insert directo desde cliente
            perfil = {
              id: authData.user.id,
              empresa_id: empresaData.id,
              email: email.trim().toLowerCase(),
              nombre_completo: nombreAdmin.trim(),
              documento: null,
              telefono: telefono?.trim() || null,
              rol: 'admin',
              avatar_url: null,
              activo: true,
              created_at: new Date().toISOString(),
              updated_at: null,
            }
          }
        }
      }

      // d) Retorna datos estructurados
      return {
        data: {
          user: authData.user,
          session: authData.session,
          perfil,
          empresa: empresaData,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el registro del estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene la lista de empresas / estudios activos en la plataforma.
   */
  async getActiveEmpresas(): Promise<AuthResponse<EmpresaActiva[]>> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, tipo_negocio, logo_url')
        .eq('activo', true)
        .order('nombre')

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: (data || []) as EmpresaActiva[],
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar empresas activas'
      return { data: null, error: message }
    }
  },

  /**
   * Inicio de sesión con correo y contraseña.
   * Asegura que devuelva el perfil del usuario obtenido de public.perfiles
   * (con fallback seguro en user_metadata) para que el frontend pueda comprobar de inmediato perfil.rol.
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
      let perfil = perfilRes.data

      // Fallback seguro: si el perfil aún no se sincronizó en la tabla, reconstruir con user_metadata
      if (!perfil && data.user) {
        const meta = data.user.user_metadata || {}
        perfil = {
          id: data.user.id,
          empresa_id: meta.empresa_id || null,
          email: data.user.email || email,
          nombre_completo: meta.nombre_completo || data.user.email?.split('@')[0] || 'Usuario',
          documento: meta.documento || null,
          telefono: meta.telefono || null,
          rol: (meta.rol as RolUsuario) || 'cliente',
          avatar_url: meta.avatar_url || null,
          activo: true,
          created_at: data.user.created_at,
          updated_at: null,
        }
      }

      return {
        data: {
          user: data.user,
          session: data.session,
          perfil,
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

      const perfilRes = await this.getProfileById(userRes.data.id)
      if (perfilRes.data) {
        return perfilRes
      }

      // Fallback seguro con metadata del usuario
      const meta = userRes.data.user_metadata || {}
      const fallbackPerfil: Tables<'perfiles'> = {
        id: userRes.data.id,
        empresa_id: meta.empresa_id || null,
        email: userRes.data.email || '',
        nombre_completo: meta.nombre_completo || userRes.data.email?.split('@')[0] || 'Usuario',
        documento: meta.documento || null,
        telefono: meta.telefono || null,
        rol: (meta.rol as RolUsuario) || 'cliente',
        avatar_url: meta.avatar_url || null,
        activo: true,
        created_at: userRes.data.created_at,
        updated_at: null,
      }

      return { data: fallbackPerfil, error: null }
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
