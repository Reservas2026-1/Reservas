import { supabase } from '../lib/supabase'
import { ensureBicicletasForEmpresa } from './clasesService'
import { authService, crearEstudioConAdmin } from './authService'
import type { CrearEstudioConAdminParams, RegisterStudioResult, AuthResponse } from './authService'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export interface EstudioActivo {
  id: string
  nombre: string
  slug: string | null
  tipo_negocio?: string | null
  logo_url: string | null
  portada_url?: string | null
  color_primario: string | null
  color_secundario: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  capacidad_sala: number
  activo: boolean
}

export interface ActualizarConfiguracionEstudioParams {
  nombre?: string
  color_primario?: string
  color_secundario?: string
  capacidad_sala?: number
  logo_url?: string
  portada_url?: string | null
  direccion?: string
  telefono?: string
  email?: string
}

export interface ActualizarEmpresaParams {
  nombre?: string
  slug?: string
  tipo_negocio?: string | null
  color_primario?: string | null
  color_secundario?: string | null
  capacidad_sala?: number
  logo_url?: string | null
  portada_url?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  activo?: boolean
}

export interface RegistrarEstudioParams {
  nombre: string
  slug?: string
  tipo_negocio?: string | null
  email: string
  telefono?: string
  direccion?: string
  color_primario?: string
  color_secundario?: string
  capacidad_sala?: number
  logo_url?: string | null
  portada_url?: string | null
}

export interface SubirLogoResponse {
  success: boolean
  url: string | null
  path: string | null
  error: string | null
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Servicio SaaS para administración de Sedes, Marca Blanca y Logos de Estudios
 */
export const empresasService = {
  /**
   * Lista todos los estudios/gimnasios activos en la plataforma SaaS desde Supabase.
   */
  async getEstudiosActivos(): Promise<ServiceResponse<EstudioActivo[]>> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, slug, tipo_negocio, logo_url, portada_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: (data || []) as EstudioActivo[], error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red consultando estudios activos'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene la configuración de un estudio a partir de su slug único (ej: "studio-cycling-bogota").
   */
  async getEstudioBySlug(slug: string): Promise<ServiceResponse<EstudioActivo>> {
    try {
      const cleanSlug = slug.trim().toLowerCase()
      if (!cleanSlug) {
        return { data: null, error: 'El slug del estudio es obligatorio' }
      }

      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, slug, tipo_negocio, logo_url, portada_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
        .eq('slug', cleanSlug)
        .eq('activo', true)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Estudio no encontrado' }
      }

      return { data: data as EstudioActivo, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al consultar el estudio por slug'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene un estudio por su ID único desde Supabase.
   */
  async getEstudioById(empresaId: string): Promise<ServiceResponse<EstudioActivo>> {
    try {
      const idLimpio = empresaId.trim()
      if (!idLimpio) {
        return { data: null, error: 'El identificador del estudio es obligatorio' }
      }

      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, slug, tipo_negocio, logo_url, portada_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
        .eq('id', idLimpio)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Estudio no encontrado' }
      }

      return { data: data as EstudioActivo, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al consultar el estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Sube un archivo de imagen al bucket público 'logos-empresas' de Supabase Storage.
   * Retorna la URL pública directa para uso en la interfaz web y móvil.
   */
  async subirLogoEstudio(file: File, empresaId: string): Promise<SubirLogoResponse> {
    try {
      // 1. Validaciones previas de formato y tamaño (max 2MB)
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
      if (!allowedMimes.includes(file.type)) {
        return {
          success: false,
          url: null,
          path: null,
          error: 'Formato no permitido. Solo se aceptan archivos PNG, JPG, WEBP o SVG.',
        }
      }

      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        return {
          success: false,
          url: null,
          path: null,
          error: 'El archivo supera el tamaño máximo permitido de 2MB.',
        }
      }

      // 2. Limpieza de nombre de archivo y estructuración de ruta multi-tenant
      const extension = file.name.split('.').pop() || 'png'
      const sanitizedName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase()
      const filePath = `${empresaId}/${Date.now()}_${sanitizedName}.${extension}`

      // 3. Subir archivo a Supabase Storage bucket 'logos-empresas'
      const { error: uploadError } = await supabase.storage
        .from('logos-empresas')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) {
        return {
          success: false,
          url: null,
          path: null,
          error: uploadError.message,
        }
      }

      // 4. Obtener URL pública directa
      const { data: publicData } = supabase.storage
        .from('logos-empresas')
        .getPublicUrl(filePath)

      return {
        success: true,
        url: publicData.publicUrl,
        path: filePath,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al subir el logo'
      return {
        success: false,
        url: null,
        path: null,
        error: message,
      }
    }
  },

  /**
   * Actualiza la configuración de marca blanca (colores, capacidad, logo, datos de contacto)
   * de una empresa en la base de datos.
   */
  async actualizarConfiguracionEstudio(
    empresaId: string,
    data: ActualizarConfiguracionEstudioParams
  ): Promise<ServiceResponse<Tables<'empresas'>>> {
    try {
      const updatePayload: TablesUpdate<'empresas'> = {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...(data.color_primario !== undefined && { color_primario: data.color_primario.trim() }),
        ...(data.color_secundario !== undefined && { color_secundario: data.color_secundario.trim() }),
        ...(data.capacidad_sala !== undefined && { capacidad_sala: data.capacidad_sala }),
        ...(data.logo_url !== undefined && { logo_url: data.logo_url ? data.logo_url.trim() : null }),
        ...(data.portada_url !== undefined && { portada_url: data.portada_url ? data.portada_url.trim() : null }),
        ...(data.direccion !== undefined && { direccion: data.direccion.trim() }),
        ...(data.telefono !== undefined && { telefono: data.telefono.trim() }),
        ...(data.email !== undefined && { email: data.email.trim().toLowerCase() }),
        updated_at: new Date().toISOString(),
      }

      const { data: empresaActualizada, error } = await supabase
        .from('empresas')
        .update(updatePayload)
        .eq('id', empresaId)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      if (data.capacidad_sala !== undefined && data.capacidad_sala > 0) {
        const capacidadObjetivo = empresaActualizada.capacidad_sala || data.capacidad_sala
        const bicisRes = await ensureBicicletasForEmpresa(empresaId, capacidadObjetivo)
        if (bicisRes.error) {
          console.warn('No se pudieron sincronizar las bicicletas del estudio:', bicisRes.error)
        }
      }

      return { data: empresaActualizada, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al actualizar el estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Actualiza los datos y configuración de una empresa en `public.empresas`.
   * Admite campos como `portada_url?: string | null`, colores, capacidad, logo, etc.
   */
  async actualizarEmpresa(
    empresaId: string,
    cambios: ActualizarEmpresaParams
  ): Promise<ServiceResponse<Tables<'empresas'>>> {
    return actualizarEmpresa(empresaId, cambios)
  },

  /**
   * Sube el logo corporativo de la empresa al bucket 'logos-empresas' y actualiza la BD.
   */
  async subirLogoEmpresa(empresaId: string, file: File): Promise<string> {
    return subirLogoEmpresa(empresaId, file)
  },

  /**
   * Sube la portada o banner de la empresa al bucket 'logos-empresas' y actualiza la BD.
   */
  async subirPortadaEmpresa(empresaId: string, file: File): Promise<string> {
    return subirPortadaEmpresa(empresaId, file)
  },

  /**
   * Registra una nueva sede o estudio en la plataforma SaaS multi-tenant.
   */
  async registrarEstudio(
    data: RegistrarEstudioParams
  ): Promise<ServiceResponse<Tables<'empresas'>>> {
    try {
      const baseSlug = data.slug && data.slug.trim()
        ? data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
        : data.nombre.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-')

      const insertPayload: TablesInsert<'empresas'> = {
        nombre: data.nombre.trim(),
        slug: baseSlug,
        tipo_negocio: data.tipo_negocio ? data.tipo_negocio.trim() : null,
        email: data.email.trim().toLowerCase(),
        telefono: data.telefono ? data.telefono.trim() : null,
        direccion: data.direccion ? data.direccion.trim() : null,
        color_primario: data.color_primario || '#DC2626',
        color_secundario: data.color_secundario || '#991B1B',
        capacidad_sala: data.capacidad_sala || 15,
        logo_url: data.logo_url || null,
        portada_url: data.portada_url || null,
        activo: true,
      }

      const { data: nuevaEmpresa, error } = await supabase
        .from('empresas')
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      const capacidadEstudio = nuevaEmpresa.capacidad_sala || data.capacidad_sala || 15
      const bicisRes = await ensureBicicletasForEmpresa(nuevaEmpresa.id, capacidadEstudio)
      if (bicisRes.error) {
        console.warn('No se pudieron inicializar las bicicletas del estudio:', bicisRes.error)
      }

      return { data: nuevaEmpresa, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al registrar el estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene la lista de estudios/empresas donde el usuario tiene rol de administrador o acceso.
   */
  async getEstudiosUsuario(usuarioId: string): Promise<ServiceResponse<EstudioActivo[]>> {
    return getEstudiosUsuario(usuarioId)
  },

  /**
   * Crea un estudio en 2 pasos con identidad visual inmediata y administrador inicial.
   */
  async crearEstudioConAdmin(params: CrearEstudioConAdminParams): Promise<AuthResponse<RegisterStudioResult>> {
    return authService.crearEstudioConAdmin(params)
  },
}

/**
 * Actualiza los datos y configuración de una empresa en `public.empresas`.
 * Admite campos como `portada_url?: string | null`, colores, capacidad, logo, etc.
 */
export async function actualizarEmpresa(
  empresaId: string,
  cambios: ActualizarEmpresaParams
): Promise<ServiceResponse<Tables<'empresas'>>> {
  try {
    const updatePayload: TablesUpdate<'empresas'> = {
      ...(cambios.nombre !== undefined && { nombre: cambios.nombre.trim() }),
      ...(cambios.slug !== undefined && { slug: cambios.slug.trim().toLowerCase() }),
      ...(cambios.tipo_negocio !== undefined && { tipo_negocio: cambios.tipo_negocio }),
      ...(cambios.color_primario !== undefined && { color_primario: cambios.color_primario ? cambios.color_primario.trim() : null }),
      ...(cambios.color_secundario !== undefined && { color_secundario: cambios.color_secundario ? cambios.color_secundario.trim() : null }),
      ...(cambios.capacidad_sala !== undefined && { capacidad_sala: cambios.capacidad_sala }),
      ...(cambios.logo_url !== undefined && { logo_url: cambios.logo_url ? cambios.logo_url.trim() : null }),
      ...(cambios.portada_url !== undefined && { portada_url: cambios.portada_url ? cambios.portada_url.trim() : null }),
      ...(cambios.direccion !== undefined && { direccion: cambios.direccion ? cambios.direccion.trim() : null }),
      ...(cambios.telefono !== undefined && { telefono: cambios.telefono ? cambios.telefono.trim() : null }),
      ...(cambios.email !== undefined && { email: cambios.email ? cambios.email.trim().toLowerCase() : null }),
      ...(cambios.activo !== undefined && { activo: cambios.activo }),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('empresas')
      .update(updatePayload)
      .eq('id', empresaId)
      .select('*')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    if (cambios.capacidad_sala !== undefined && cambios.capacidad_sala > 0) {
      const capacidadObjetivo = data.capacidad_sala || cambios.capacidad_sala
      const bicisRes = await ensureBicicletasForEmpresa(empresaId, capacidadObjetivo)
      if (bicisRes.error) {
        console.warn('No se pudieron sincronizar las bicicletas del estudio:', bicisRes.error)
      }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado al actualizar la empresa'
    return { data: null, error: message }
  }
}

/**
 * Sube el logotipo de la empresa al bucket 'logos-empresas' en la ruta `${empresaId}/logo-${Date.now()}.${extension}`,
 * actualiza `logo_url` en la tabla `empresas` y retorna la URL pública.
 */
export async function subirLogoEmpresa(empresaId: string, file: File): Promise<string> {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedMimes.includes(file.type)) {
    throw new Error('Formato no permitido. Solo se aceptan archivos PNG, JPG, WEBP o SVG.')
  }

  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    throw new Error('El archivo supera el tamaño máximo permitido de 2MB.')
  }

  const extension = file.name.split('.').pop() || 'png'
  const filePath = `${empresaId}/logo-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('logos-empresas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Error al subir el logo: ${uploadError.message}`)
  }

  const { data: publicData } = supabase.storage
    .from('logos-empresas')
    .getPublicUrl(filePath)

  const publicUrl = publicData.publicUrl

  const { error: dbError } = await supabase
    .from('empresas')
    .update({
      logo_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', empresaId)

  if (dbError) {
    throw new Error(`Error al actualizar logo_url en base de datos: ${dbError.message}`)
  }

  return publicUrl
}

/**
 * Sube la imagen de portada / banner del estudio al bucket 'logos-empresas'
 * en la ruta `${empresaId}/portada-${Date.now()}.${extension}`,
 * actualiza `portada_url` en la tabla `empresas` y retorna la URL pública.
 */
export async function subirPortadaEmpresa(empresaId: string, file: File): Promise<string> {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedMimes.includes(file.type)) {
    throw new Error('Formato no permitido. Solo se aceptan archivos PNG, JPG, WEBP o SVG.')
  }

  const maxSize = 5 * 1024 * 1024 // 5MB para imágenes de portada / banner
  if (file.size > maxSize) {
    throw new Error('El archivo supera el tamaño máximo permitido de 5MB.')
  }

  const extension = file.name.split('.').pop() || 'png'
  const filePath = `${empresaId}/portada-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('logos-empresas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Error al subir la imagen de portada: ${uploadError.message}`)
  }

  const { data: publicData } = supabase.storage
    .from('logos-empresas')
    .getPublicUrl(filePath)

  const publicUrl = publicData.publicUrl

  const { error: dbError } = await supabase
    .from('empresas')
    .update({
      portada_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', empresaId)

  if (dbError) {
    throw new Error(`Error al actualizar portada_url en base de datos: ${dbError.message}`)
  }

  return publicUrl
}

/**
 * Obtiene la lista de empresas / estudios donde el usuario tiene rol de administrador o acceso.
 * - Si el usuario tiene rol 'superadmin', retorna todos los estudios activos del SaaS.
 * - Si es 'admin' o afín, consulta la empresa asignada a su perfil y las empresas registradas
 *   con el mismo correo del usuario (permitiendo gestionar múltiples sedes/estudios).
 */
export async function getEstudiosUsuario(usuarioId: string): Promise<ServiceResponse<EstudioActivo[]>> {
  try {
    const cleanId = usuarioId?.trim()
    if (!cleanId) {
      return { data: null, error: 'El identificador de usuario es obligatorio' }
    }

    // 1. Consultar perfil del usuario
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('id, email, empresa_id, rol')
      .eq('id', cleanId)
      .maybeSingle()

    if (perfilError) {
      return { data: null, error: perfilError.message }
    }

    // Si el usuario es superadmin, tiene acceso a todos los estudios activos
    if (perfil?.rol === 'superadmin') {
      return await empresasService.getEstudiosActivos()
    }

    const empresaIds = new Set<string>()

    if (perfil?.empresa_id) {
      empresaIds.add(perfil.empresa_id)
    }

    // Si el perfil tiene email, buscar empresas registradas con ese mismo correo de contacto
    if (perfil?.email) {
      const { data: empresasPorEmail } = await supabase
        .from('empresas')
        .select('id')
        .eq('email', perfil.email.trim().toLowerCase())

      if (empresasPorEmail) {
        empresasPorEmail.forEach((e) => empresaIds.add(e.id))
      }
    }

    // Fallback con metadata de auth.getUser si el perfil no tenía empresa asignada
    if (empresaIds.size === 0) {
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser?.user && authUser.user.id === cleanId) {
        const metaEmpresaId = authUser.user.user_metadata?.empresa_id
        if (metaEmpresaId) {
          empresaIds.add(metaEmpresaId)
        }
        if (authUser.user.email) {
          const { data: empresasPorAuthEmail } = await supabase
            .from('empresas')
            .select('id')
            .eq('email', authUser.user.email.trim().toLowerCase())
          if (empresasPorAuthEmail) {
            empresasPorAuthEmail.forEach((e) => empresaIds.add(e.id))
          }
        }
      }
    }

    if (empresaIds.size === 0) {
      return { data: [], error: null }
    }

    const { data: estudios, error: estudiosError } = await supabase
      .from('empresas')
      .select('id, nombre, slug, tipo_negocio, logo_url, portada_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
      .in('id', Array.from(empresaIds))
      .order('nombre', { ascending: true })

    if (estudiosError) {
      return { data: null, error: estudiosError.message }
    }

    return { data: (estudios || []) as EstudioActivo[], error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado al consultar los estudios del usuario'
    return { data: null, error: message }
  }
}

export const registrarEstudio = empresasService.registrarEstudio.bind(empresasService)
export { crearEstudioConAdmin }
