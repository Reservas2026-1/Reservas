import { supabase } from '../lib/supabase'
import { ensureBicicletasForEmpresa } from './clasesService'
import type { Tables, TablesInsert, TablesUpdate, RolUsuario } from '../types/database'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export interface SignUpParams {
  email: string
  password: string
  nombreCompleto: string
  documento?: string | null
  telefono?: string | null
  empresaId?: string | null
  rol?: RolUsuario
  avatarUrl?: string | null
}

export interface RegistrarAlumnoParams {
  nombreCompleto: string
  email: string
  password: string
  documento?: string | null
  telefono?: string | null
  empresaId?: string | null
  avatarUrl?: string | null
}

export interface SignUpResult {
  user: User | null
  session: Session | null
  perfil: Tables<'perfiles'> | null
}

export interface SignInParams {
  email: string
  password: string
}

export interface CrearEstudioConAdminParams {
  nombre?: string
  nombreNegocio?: string
  tipo_negocio?: string | null
  tipoNegocio?: string | null
  adminNombre?: string
  nombreAdmin?: string
  email: string
  password: string
  telefono?: string | null
  capacidadSala?: number
  capacidad_sala?: number
  color_primario?: string | null
  color_secundario?: string | null
  logo_url?: string | null
  portada_url?: string | null
  slug?: string | null
  direccion?: string | null
}

export type RegisterStudioParams = CrearEstudioConAdminParams

export interface EmpresaActiva {
  id: string
  nombre: string
  tipo_negocio: string | null
  logo_url: string | null
}

export interface RegisterStudioResult {
  user: User
  session: Session | null
  perfil: Tables<'perfiles'>
  empresa: Tables<'empresas'>
}

export interface AlumnoBusqueda {
  id: string
  nombre_completo: string
  email: string
  documento: string | null
  telefono: string | null
  codigo_qr: string
  avatar_url: string | null
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
   * Obtiene el ID del primer estudio/empresa activo configurado en el sistema.
   * Utilizado como fallback o asignación provisional en caso de restricciones de clave foránea.
   */
  async getDefaultActiveEmpresaId(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id')
        .eq('activo', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        return null
      }
      return data.id
    } catch {
      return null
    }
  },

  /**
   * Registro simplificado de usuario / alumno / cliente.
   * Permite el registro con solo 3 campos obligatorios: nombreCompleto, email y password.
   * Los campos documento, telefono y empresaId son opcionales.
   * Si empresa_id no se provee y la base de datos lo requiere, asigna provisionalmente
   * el primer estudio activo disponible.
   * Garantiza la inserción / existencia del perfil en public.perfiles con rol 'cliente'.
   */
  async signUp(params: SignUpParams): Promise<AuthResponse<SignUpResult>> {
    try {
      const {
        email,
        password,
        nombreCompleto,
        documento,
        telefono,
        empresaId,
        rol = 'cliente',
        avatarUrl,
      } = params

      if (!nombreCompleto || !nombreCompleto.trim()) {
        return { data: null, error: 'El nombre completo es obligatorio' }
      }
      if (!email || !email.trim()) {
        return { data: null, error: 'El correo electrónico es obligatorio' }
      }
      if (!password || password.length < 6) {
        return { data: null, error: 'La contraseña debe tener al menos 6 caracteres' }
      }

      const cleanNombre = nombreCompleto.trim()
      const cleanEmail = email.trim().toLowerCase()
      const cleanDocumento = documento?.trim() || null
      const cleanTelefono = telefono?.trim() || null
      const cleanAvatarUrl = avatarUrl?.trim() || null
      let targetEmpresaId = empresaId?.trim() || null

      // Registro principal en Supabase Auth
      let authResult = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            nombre_completo: cleanNombre,
            documento: cleanDocumento,
            telefono: cleanTelefono,
            empresa_id: targetEmpresaId,
            rol,
            avatar_url: cleanAvatarUrl,
          },
        },
      })

      // Si falla por restricción NOT NULL en empresa_id, buscar primera empresa activa y reintentar
      if (
        authResult.error &&
        !targetEmpresaId &&
        (authResult.error.message.toLowerCase().includes('empresa_id') ||
          authResult.error.message.toLowerCase().includes('not-null') ||
          authResult.error.message.toLowerCase().includes('null value in column "empresa_id"'))
      ) {
        const defaultEmpresaId = await this.getDefaultActiveEmpresaId()
        if (defaultEmpresaId) {
          targetEmpresaId = defaultEmpresaId
          authResult = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                nombre_completo: cleanNombre,
                documento: cleanDocumento,
                telefono: cleanTelefono,
                empresa_id: targetEmpresaId,
                rol,
                avatar_url: cleanAvatarUrl,
              },
            },
          })
        }
      }

      if (authResult.error) {
        return { data: null, error: authResult.error.message }
      }

      const user = authResult.data.user
      const session = authResult.data.session

      let perfil: Tables<'perfiles'> | null = null

      if (user) {
        const nowIso = new Date().toISOString()
        const codigoQr = `RESERLY-${user.id.slice(0, 8).toUpperCase()}`

        const perfilPayload: TablesInsert<'perfiles'> = {
          id: user.id,
          empresa_id: targetEmpresaId,
          email: cleanEmail,
          nombre_completo: cleanNombre,
          documento: cleanDocumento,
          telefono: cleanTelefono,
          rol,
          codigo_qr: codigoQr,
          avatar_url: cleanAvatarUrl,
          activo: true,
          created_at: user.created_at || nowIso,
          updated_at: nowIso,
        }

        // Asegurar que el perfil exista en public.perfiles
        const { data: upsertedPerfil, error: perfilUpsertErr } = await supabase
          .from('perfiles')
          .upsert(perfilPayload, { onConflict: 'id' })
          .select()
          .maybeSingle()

        if (!perfilUpsertErr && upsertedPerfil) {
          perfil = upsertedPerfil
        } else {
          // Si el upsert falló por RLS o ya fue creado por el trigger handle_new_user(), consultar el perfil
          const { data: existingPerfil } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (existingPerfil) {
            perfil = existingPerfil
          } else {
            // Fallback seguro en memoria para garantizar objeto completo
            perfil = {
              id: user.id,
              empresa_id: targetEmpresaId,
              email: cleanEmail,
              nombre_completo: cleanNombre,
              documento: cleanDocumento,
              telefono: cleanTelefono,
              rol,
              avatar_url: cleanAvatarUrl,
              codigo_qr: codigoQr,
              fecha_nacimiento: null,
              contacto_emergencia: null,
              objetivos_entrenamiento: null,
              activo: true,
              created_at: user.created_at || nowIso,
              updated_at: null,
            }
          }
        }
      }

      return {
        data: {
          user,
          session,
          perfil,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el registro'
      return { data: null, error: message }
    }
  },

  /**
   * Registro simplificado de alumno con solo 3 campos obligatorios:
   * nombreCompleto, email y password.
   * documento, telefono y empresaId son completamente opcionales.
   */
  async registrarAlumno(params: RegistrarAlumnoParams): Promise<AuthResponse<SignUpResult>> {
    return this.signUp({
      ...params,
      rol: 'cliente',
    })
  },

  /**
   * Alias de registrarAlumno para consistencia con la nomenclatura del sistema.
   */
  async registrarCliente(params: RegistrarAlumnoParams): Promise<AuthResponse<SignUpResult>> {
    return this.registrarAlumno(params)
  },

  /**
   * Asocia o actualiza el estudio/empresa de un alumno en su perfil.
   * Permite que alumnos registrados globalmente elijan su estudio en el directorio.
   */
  async vincularEstudio(usuarioId: string, empresaId: string): Promise<AuthResponse<Tables<'perfiles'> | null>> {
    try {
      if (!usuarioId?.trim()) {
        return { data: null, error: 'usuarioId es requerido' }
      }
      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es requerido' }
      }

      const { data, error } = await supabase
        .from('perfiles')
        .update({
          empresa_id: empresaId.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuarioId.trim())
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al vincular el estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Registro completo de un nuevo estudio / negocio y su administrador inicial.
   * Soporta identidad visual inmediata: color_primario, color_secundario, logo_url, portada_url, slug, tipo_negocio.
   * 1. Inserta la empresa en public.empresas con email, teléfono, slug, tipo_negocio y branding configurado.
   * 2. Registra el usuario administrador en supabase.auth.signUp vinculándolo con empresa_id.
   * 3. Crea o actualiza el perfil administrador en public.perfiles con rol 'admin'.
   */
  async registerStudio(params: RegisterStudioParams): Promise<AuthResponse<RegisterStudioResult>> {
    try {
      const nombreNegocio = (params.nombreNegocio || params.nombre || '').trim()
      const tipoNegocio = (params.tipo_negocio || params.tipoNegocio)?.trim() || null
      const nombreAdmin = (params.adminNombre || params.nombreAdmin || '').trim()
      const email = params.email?.trim().toLowerCase()
      const password = params.password
      const telefono = params.telefono?.trim() || null
      const direccion = params.direccion?.trim() || null
      const capacidad = params.capacidadSala || params.capacidad_sala || 15
      const colorPrimario = params.color_primario?.trim() || '#DC2626'
      const colorSecundario = params.color_secundario?.trim() || '#991B1B'
      const logoUrl = params.logo_url?.trim() || null
      const portadaUrl = params.portada_url?.trim() || null
      const customSlug = params.slug?.trim() || null

      if (!nombreNegocio) {
        return { data: null, error: 'El nombre del negocio o estudio es obligatorio' }
      }
      if (!email) {
        return { data: null, error: 'El correo electrónico es obligatorio' }
      }
      if (!password || password.length < 6) {
        return { data: null, error: 'La contraseña debe tener al menos 6 caracteres' }
      }
      if (!nombreAdmin) {
        return { data: null, error: 'El nombre del administrador es obligatorio' }
      }

      // a) Inserta en la tabla empresas el nuevo negocio con su identidad visual
      const baseSlug = customSlug ? generateSlug(customSlug) : generateSlug(nombreNegocio)
      const capacidadInicial = capacidad > 0 ? Math.floor(capacidad) : 15
      const empresaPayload: TablesInsert<'empresas'> = {
        nombre: nombreNegocio,
        slug: baseSlug,
        tipo_negocio: tipoNegocio,
        email,
        telefono,
        direccion,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
        logo_url: logoUrl,
        portada_url: portadaUrl,
        capacidad_sala: capacidadInicial,
        activo: true,
      }

      let { data: nuevaEmpresa, error: empresaError } = await supabase
        .from('empresas')
        .insert(empresaPayload)
        .select()
        .single()

      if (empresaError?.code === '23505' && empresaError.message.toLowerCase().includes('slug')) {
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        const retryEmpresa = await supabase
          .from('empresas')
          .insert({
            ...empresaPayload,
            slug: uniqueSlug,
          })
          .select()
          .single()

        nuevaEmpresa = retryEmpresa.data
        empresaError = retryEmpresa.error
      }

      if (empresaError || !nuevaEmpresa) {
        return {
          data: null,
          error: empresaError?.message || 'Error al crear la empresa en el sistema',
        }
      }

      // b) Con el nuevaEmpresa.id resultante, realiza supabase.auth.signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: nombreAdmin,
            empresa_id: nuevaEmpresa.id,
            rol: 'admin',
            telefono,
          },
        },
      })

      if (authError || !authData.user) {
        // Rollback defensivo: limpiar empresa creada si el registro auth falla
        await supabase.from('empresas').delete().eq('id', nuevaEmpresa.id)
        return {
          data: null,
          error: authError?.message || 'Error al registrar el usuario administrador',
        }
      }

      // c) Crea o actualiza el perfil administrador en public.perfiles
      const nowIso = new Date().toISOString()
      const codigoQrAdmin = `RESERLY-${authData.user.id.slice(0, 8).toUpperCase()}`
      const perfilDatos = {
        empresa_id: nuevaEmpresa.id,
        nombre_completo: nombreAdmin,
        email,
        telefono,
        rol: 'admin' as RolUsuario,
        codigo_qr: codigoQrAdmin,
        activo: true,
        updated_at: nowIso,
      }

      const perfilInsertPayload: TablesInsert<'perfiles'> = {
        id: authData.user.id,
        ...perfilDatos,
      }

      let perfil: Tables<'perfiles'> | null = null

      const { data: upsertedPerfil, error: perfilUpsertErr } = await supabase
        .from('perfiles')
        .upsert(perfilInsertPayload, { onConflict: 'id' })
        .select()
        .maybeSingle()

      if (!perfilUpsertErr && upsertedPerfil) {
        perfil = upsertedPerfil
      } else {
        // Si el upsert directo falló, intentamos consultar y actualizar el registro existente (ej. creado por trigger)
        const perfilRes = await this.getProfileById(authData.user.id)
        if (perfilRes.data) {
          const { data: updatedPerfil, error: perfilUpdateErr } = await supabase
            .from('perfiles')
            .update(perfilDatos)
            .eq('id', authData.user.id)
            .select()
            .maybeSingle()

          perfil = !perfilUpdateErr && updatedPerfil ? updatedPerfil : perfilRes.data
        }
      }

      // Fallback en memoria si RLS bloquea acceso directo desde cliente (ej. confirmación de correo pendiente)
      if (!perfil) {
        perfil = {
          id: authData.user.id,
          documento: null,
          avatar_url: null,
          created_at: authData.user.created_at || nowIso,
          ...perfilDatos,
        }
      }

      if (!perfil.codigo_qr) {
        perfil.codigo_qr = codigoQrAdmin
      }

      // d) Inicializa las bicicletas del estudio según su capacidad configurada
      const capacidadEstudio = nuevaEmpresa.capacidad_sala || capacidadInicial || 15
      const bicisRes = await ensureBicicletasForEmpresa(nuevaEmpresa.id, capacidadEstudio)
      if (bicisRes.error) {
        console.warn('No se pudieron inicializar las bicicletas del estudio:', bicisRes.error)
      }

      // e) Retorna datos estructurados con perfil, empresa y sesión
      return {
        data: {
          user: authData.user,
          session: authData.session,
          perfil,
          empresa: nuevaEmpresa,
        },
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el registro del estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Alias de registerStudio para creación de estudio en flujo de onboarding con identidad visual inmediata.
   */
  async crearEstudioConAdmin(params: CrearEstudioConAdminParams): Promise<AuthResponse<RegisterStudioResult>> {
    return this.registerStudio(params)
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
          codigo_qr: meta.codigo_qr || `RESERLY-${data.user.id.slice(0, 8).toUpperCase()}`,
          activo: true,
          created_at: data.user.created_at,
          updated_at: null,
        }
      } else if (perfil && !perfil.codigo_qr) {
        perfil.codigo_qr = `RESERLY-${perfil.id.slice(0, 8).toUpperCase()}`
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
        if (!perfilRes.data.codigo_qr) {
          perfilRes.data.codigo_qr = `RESERLY-${perfilRes.data.id.slice(0, 8).toUpperCase()}`
        }
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
        codigo_qr: meta.codigo_qr || `RESERLY-${userRes.data.id.slice(0, 8).toUpperCase()}`,
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
   * Garantiza que el perfil devuelto contenga siempre su codigo_qr único.
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

      if (data) {
        if (!data.codigo_qr) {
          data.codigo_qr = `RESERLY-${data.id.slice(0, 8).toUpperCase()}`
          // Sincronizar en segundo plano sin bloquear
          supabase
            .from('perfiles')
            .update({ codigo_qr: data.codigo_qr })
            .eq('id', data.id)
            .then()
        }
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
   * Busca alumnos de una empresa por coincidencia en nombre_completo, email o documento.
   * Retorna sus datos básicos incluyendo su codigo_qr único garantizado.
   */
  async buscarAlumnos(
    empresaId: string,
    query: string
  ): Promise<AuthResponse<AlumnoBusqueda[]>> {
    try {
      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es requerido' }
      }

      const cleanQuery = query?.trim() || ''

      let req = supabase
        .from('perfiles')
        .select('id, nombre_completo, email, documento, telefono, avatar_url, codigo_qr')
        .eq('empresa_id', empresaId.trim())
        .eq('rol', 'cliente')
        .eq('activo', true)

      if (cleanQuery) {
        req = req.or(
          `nombre_completo.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,documento.ilike.%${cleanQuery}%`
        )
      }

      const { data, error } = await req.order('nombre_completo').limit(50)

      if (error) {
        return { data: null, error: error.message }
      }

      const alumnos: AlumnoBusqueda[] = (data || []).map((p) => ({
        id: p.id,
        nombre_completo: p.nombre_completo,
        email: p.email,
        documento: p.documento,
        telefono: p.telefono,
        codigo_qr: p.codigo_qr || `RESERLY-${p.id.slice(0, 8).toUpperCase()}`,
        avatar_url: p.avatar_url,
      }))

      return { data: alumnos, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al buscar alumnos'
      return { data: null, error: message }
    }
  },

  /**
   * Actualiza el perfil de un usuario específico.
   * Campos: nombre_completo, telefono, documento, fecha_nacimiento, contacto_emergencia, objetivos_entrenamiento, avatar_url.
   */
  async actualizarPerfil(
    usuarioId: string,
    updates: Partial<TablesUpdate<'perfiles'>>
  ): Promise<AuthResponse<Tables<'perfiles'> | null>> {
    try {
      if (!usuarioId?.trim()) {
        return { data: null, error: 'usuarioId es requerido' }
      }

      const payload: Partial<TablesUpdate<'perfiles'>> = {
        updated_at: new Date().toISOString(),
      }

      if (updates.nombre_completo !== undefined) payload.nombre_completo = updates.nombre_completo
      if (updates.telefono !== undefined) payload.telefono = updates.telefono
      if (updates.documento !== undefined) payload.documento = updates.documento
      if (updates.fecha_nacimiento !== undefined) payload.fecha_nacimiento = updates.fecha_nacimiento
      if (updates.contacto_emergencia !== undefined) payload.contacto_emergencia = updates.contacto_emergencia
      if (updates.objetivos_entrenamiento !== undefined) payload.objetivos_entrenamiento = updates.objetivos_entrenamiento
      if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url

      const { data, error } = await supabase
        .from('perfiles')
        .update(payload)
        .eq('id', usuarioId.trim())
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil'
      return { data: null, error: message }
    }
  },

  /**
   * Actualiza la URL del avatar de un usuario en su perfil.
   */
  async subirAvatar(
    usuarioId: string,
    avatarUrl: string
  ): Promise<{ url: string; error: null } | { url: null; error: string }> {
    try {
      if (!usuarioId?.trim()) {
        return { url: null, error: 'usuarioId es requerido' }
      }
      if (!avatarUrl?.trim()) {
        return { url: null, error: 'avatarUrl es requerido' }
      }

      const { error } = await supabase
        .from('perfiles')
        .update({
          avatar_url: avatarUrl.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuarioId.trim())

      if (error) {
        return { url: null, error: error.message }
      }

      return { url: avatarUrl.trim(), error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar avatar'
      return { url: null, error: message }
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

export const registrarAlumno = authService.registrarAlumno.bind(authService)
export const registrarCliente = authService.registrarCliente.bind(authService)
export const vincularEstudio = authService.vincularEstudio.bind(authService)
export const actualizarPerfil = authService.actualizarPerfil.bind(authService)
export const subirAvatar = authService.subirAvatar.bind(authService)
export const registerStudio = authService.registerStudio.bind(authService)
export const crearEstudioConAdmin = authService.crearEstudioConAdmin.bind(authService)

