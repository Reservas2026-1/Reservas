import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export interface EstudioActivo {
  id: string
  nombre: string
  slug: string | null
  logo_url: string | null
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
  direccion?: string
  telefono?: string
  email?: string
}

export interface RegistrarEstudioParams {
  nombre: string
  slug: string
  email: string
  telefono?: string
  direccion?: string
  color_primario?: string
  color_secundario?: string
  capacidad_sala?: number
  logo_url?: string
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
        .select('id, nombre, slug, logo_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
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
        .select('id, nombre, slug, logo_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
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
        .select('id, nombre, slug, logo_url, color_primario, color_secundario, direccion, telefono, email, capacidad_sala, activo')
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
        ...(data.logo_url !== undefined && { logo_url: data.logo_url.trim() }),
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

      return { data: empresaActualizada, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al actualizar el estudio'
      return { data: null, error: message }
    }
  },

  /**
   * Registra una nueva sede o estudio en la plataforma SaaS multi-tenant.
   */
  async registrarEstudio(
    data: RegistrarEstudioParams
  ): Promise<ServiceResponse<Tables<'empresas'>>> {
    try {
      const insertPayload: TablesInsert<'empresas'> = {
        nombre: data.nombre.trim(),
        slug: data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        email: data.email.trim().toLowerCase(),
        telefono: data.telefono ? data.telefono.trim() : null,
        direccion: data.direccion ? data.direccion.trim() : null,
        color_primario: data.color_primario || '#DC2626',
        color_secundario: data.color_secundario || '#991B1B',
        capacidad_sala: data.capacidad_sala || 15,
        logo_url: data.logo_url || null,
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

      return { data: nuevaEmpresa, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al registrar el estudio'
      return { data: null, error: message }
    }
  },
}
