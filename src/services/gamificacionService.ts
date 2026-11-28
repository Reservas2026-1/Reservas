import { supabase } from '../lib/supabase'
import type {
  Tables,
  ReglasXpRow,
  ReglasXpInsert,
  ReglasXpUpdate,
  MetricasGamificacionRow,
  PremiosPlanRow,
} from '../types/database'

export interface ReglaXPSeed {
  criterio: string
  puntos_xp: number
  descripcion: string
}

export const REGLAS_XP_DEFAULT: ReglaXPSeed[] = [
  { criterio: 'Asistencia', puntos_xp: 100, descripcion: 'Por asistir a la clase puntualmente' },
  { criterio: 'Puntualidad', puntos_xp: 30, descripcion: 'Llegada antes del inicio de la sesión' },
  { criterio: 'Plan cumplido', puntos_xp: 150, descripcion: 'Bono al completar el 100% de clases de tu plan' },
  { criterio: 'Calorías', puntos_xp: 20, descripcion: 'Rendimiento calórico en sesión' },
  { criterio: 'Frecuencia cardíaca', puntos_xp: 25, descripcion: 'Zona de entrenamiento óptima' },
  { criterio: 'Constancia', puntos_xp: 50, descripcion: 'Asistir 3 o más días consecutivos' },
  { criterio: 'Retos', puntos_xp: 100, descripcion: 'Superar reto semanal del estudio' },
  { criterio: 'Referidos', puntos_xp: 200, descripcion: 'Por invitar a un amigo que se inscriba' },
]

export interface CrearReglaXPParams {
  empresaId: string
  criterio: string
  puntosXp: number
  descripcion?: string
  activo?: boolean
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface ProgresoGamificacionUsuario {
  puntos_acumulados: number
  dias_programados: number
  dias_cumplidos: number
  porcentaje: number
  bono_plan_otorgado: boolean
  plan_nombre: string | null
  nivel: number
  potencia_promedio_watts?: number
  ranking_clase?: number
}

export interface AlumnoGamificacionResumen {
  id: string // id del alumno/perfil
  usuario_id: string
  nombre_completo: string
  email: string
  telefono?: string
  avatar_url?: string
  codigo_qr?: string
  plan_id: string | null
  plan_nombre: string | null
  tiquetera_id: string | null
  dias_cumplidos: number
  dias_programados: number
  porcentaje: number
  xp_ciclo: number
  puntos_acumulados: number
  nivel: number
  racha_semanas: number
  premio_entregado: boolean
  ranking: number
  bono_plan_otorgado?: boolean
  documento?: string | null
}

export interface GuardarPremioPlanParams {
  id?: string
  empresaId: string
  planId?: string | null
  puesto: number
  premio: string
  icono?: string
  activo?: boolean
}

export interface XpOtorgadosDetalle {
  asistencia: number
  puntualidad: number
  bonoPlan: number
  total: number
}

export interface ProcesarAsistenciaParams {
  usuarioId: string
  empresaId: string
  reservaId: string
  fechaInicioClase: string
  tiqueteraId?: string | null
}

export interface ProcesarAsistenciaResult {
  xpOtorgados: XpOtorgadosDetalle
  progresoPlan: {
    dias_programados: number
    dias_cumplidos: number
    porcentaje: number
    bonoOtorgado: boolean
  }
}

export interface RankingPlanItem {
  posicion: number
  medalla?: string
  usuario_id: string
  nombre: string
  avatar_url: string | null
  puntos_xp: number
  nivel: number
  dias_cumplidos: number
  dias_programados: number
  porcentaje: number
  es_usuario_actual: boolean
}

export interface RankingPorPlanResult {
  ranking: RankingPlanItem[]
  miPosicion: number
  totalParticipantes: number
  data?: RankingPlanItem[]
  error?: string | null
}

export interface PremioPlanPodio {
  id?: string
  puesto: number
  premio: string
  icono: string
  plan_id?: string | null
}

export interface InsigniaUsuario {
  id: string
  titulo: string
  descripcion: string
  icono: string
  desbloqueada: boolean
  fecha_desbloqueo?: string
}

export interface HistorialAsistenciaItem {
  id: string
  reserva_id: string
  clase_id: string | null
  clase_titulo: string
  instructor_nombre: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  bicicleta_numero: number
  puntos_xp: number
  asistencia_confirmada: boolean
  estado: string
}


/**
 * Calcula el nivel y progreso de un usuario a partir de sus puntos XP.
 * Cada 300 puntos equivale a 1 nivel de maestría.
 */
export function calcularNivelUsuario(puntos: number): {
  nivel: number
  puntosEnNivel: number
  puntosParaProximoNivel: number
  porcentajeNivel: number
} {
  const puntosPorNivel = 300
  const puntosValidos = Math.max(0, Math.floor(puntos || 0))
  const nivel = Math.floor(puntosValidos / puntosPorNivel) + 1
  const puntosEnNivel = puntosValidos % puntosPorNivel
  const puntosParaProximoNivel = puntosPorNivel - puntosEnNivel
  const porcentajeNivel = Math.round((puntosEnNivel / puntosPorNivel) * 100)

  return {
    nivel,
    puntosEnNivel,
    puntosParaProximoNivel,
    porcentajeNivel,
  }
}

/**
 * Servicio de Gamificación, Reglas de XP, Progreso de Planes y Asistencia
 */
export const gamificacionService = {
  /**
   * Consulta las reglas de XP de una empresa.
   * Si la empresa aún no tiene reglas configuradas, realiza un seed automático
   * con las 8 reglas comerciales predeterminadas.
   */
  async obtenerReglasXP(empresaId: string): Promise<ServiceResponse<ReglasXpRow[]>> {
    try {
      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es requerido' }
      }

      // 1. Consultar reglas existentes
      const { data: reglasExistentes, error: queryError } = await supabase
        .from('reglas_xp')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('puntos_xp', { ascending: false })

      if (queryError) {
        return { data: null, error: queryError.message }
      }

      if (reglasExistentes && reglasExistentes.length > 0) {
        return { data: reglasExistentes, error: null }
      }

      // 2. Si no hay reglas, sembrar las 8 reglas por defecto de manera atómica
      const reglasSeedPayload: ReglasXpInsert[] = REGLAS_XP_DEFAULT.map((regla) => ({
        empresa_id: empresaId,
        criterio: regla.criterio,
        puntos_xp: regla.puntos_xp,
        descripcion: regla.descripcion,
        activo: true,
      }))

      const { data: reglasCreadas, error: seedError } = await supabase
        .from('reglas_xp')
        .insert(reglasSeedPayload)
        .select('*')
        .order('puntos_xp', { ascending: false })

      if (seedError) {
        return { data: null, error: seedError.message }
      }

      return { data: reglasCreadas || [], error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al obtener reglas de XP'
      return { data: null, error: message }
    }
  },

  /**
   * Crea una nueva regla de XP personalizada para una empresa.
   */
  async crearReglaXP(params: CrearReglaXPParams): Promise<ServiceResponse<ReglasXpRow>> {
    try {
      const { empresaId, criterio, puntosXp, descripcion, activo = true } = params

      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es obligatorio' }
      }
      if (!criterio?.trim()) {
        return { data: null, error: 'El criterio de la regla es obligatorio' }
      }
      if (typeof puntosXp !== 'number' || isNaN(puntosXp) || puntosXp < 0) {
        return { data: null, error: 'puntosXp debe ser un número entero mayor o igual a 0' }
      }

      const payload: ReglasXpInsert = {
        empresa_id: empresaId.trim(),
        criterio: criterio.trim(),
        puntos_xp: Math.floor(puntosXp),
        descripcion: descripcion?.trim() || null,
        activo,
      }

      const { data, error } = await supabase
        .from('reglas_xp')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al crear regla de XP'
      return { data: null, error: message }
    }
  },

  /**
   * Actualiza una regla de XP existente de la empresa.
   */
  async actualizarReglaXP(
    id: string,
    empresaId: string,
    updates: Partial<ReglasXpUpdate>
  ): Promise<ServiceResponse<ReglasXpRow>> {
    try {
      if (!id?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'id y empresaId son obligatorios' }
      }

      const payload: ReglasXpUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('reglas_xp')
        .update(payload)
        .eq('id', id.trim())
        .eq('empresa_id', empresaId.trim())
        .select('*')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al actualizar regla de XP'
      return { data: null, error: message }
    }
  },

  /**
   * Elimina una regla de XP de la empresa.
   */
  async eliminarReglaXP(id: string, empresaId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!id?.trim() || !empresaId?.trim()) {
        return { success: false, error: 'id y empresaId son obligatorios' }
      }

      const { error } = await supabase
        .from('reglas_xp')
        .delete()
        .eq('id', id.trim())
        .eq('empresa_id', empresaId.trim())

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar regla de XP'
      return { success: false, error: message }
    }
  },

  /**
   * Activa o desactiva una regla de XP.
   */
  async cambiarEstadoReglaXP(
    id: string,
    empresaId: string,
    activo: boolean
  ): Promise<ServiceResponse<ReglasXpRow>> {
    return this.actualizarReglaXP(id, empresaId, { activo })
  },

  /**
   * Evalúa y obtiene el progreso de gamificación de un alumno:
   * - Consulta la tiquetera/plan activo (o la más reciente).
   * - Cuenta las clases completadas (`asistencia_confirmada = true` o `estado = 'finalizada'`).
   * - Calcula `dias_programados`, `dias_cumplidos` y `porcentaje` (ej. 2/5 días = 40%).
   * - Si cumplió el 100% (`dias_cumplidos >= dias_programados`) y no se ha otorgado el bono de plan:
   *   Otorga automáticamente los XP de 'Plan cumplido' y marca `bono_plan_otorgado = true`.
   * - Persiste y sincroniza en `public.metricas_gamificacion`.
   */
  async obtenerProgresoGamificacion(
    usuarioId: string,
    empresaId: string
  ): Promise<ServiceResponse<ProgresoGamificacionUsuario>> {
    try {
      if (!usuarioId?.trim() || !empresaId?.trim()) {
        return { data: null, error: 'usuarioId y empresaId son obligatorios' }
      }

      const cleanUserId = usuarioId.trim()
      const cleanEmpresaId = empresaId.trim()

      // 1. Obtener la tiquetera activa o más reciente del usuario
      const { data: tiqueteras, error: tiqueteraError } = await supabase
        .from('tiqueteras')
        .select(`
          *,
          plan:planes!tiqueteras_plan_id_fkey(*)
        `)
        .eq('cliente_id', cleanUserId)
        .eq('empresa_id', cleanEmpresaId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (tiqueteraError) {
        return { data: null, error: tiqueteraError.message }
      }

      const tiqueteraActual = tiqueteras && tiqueteras.length > 0 ? tiqueteras[0] : null
      const planActual = tiqueteraActual?.plan as unknown as Tables<'planes'> | null
      const planNombre = planActual?.nombre || (tiqueteraActual ? 'Plan Personalizado' : null)

      // Total de clases programadas en el plan
      const diasProgramados = tiqueteraActual?.creditos_totales || 0

      // 2. Contar reservas asistidas / confirmadas asociadas
      let queryReservas = supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', cleanUserId)
        .eq('empresa_id', cleanEmpresaId)
        .or('asistencia_confirmada.eq.true,estado.eq.finalizada')

      if (tiqueteraActual?.id) {
        queryReservas = queryReservas.eq('tiquetera_id', tiqueteraActual.id)
      }

      const { count: conteoAsistidas, error: countError } = await queryReservas
      if (countError) {
        return { data: null, error: countError.message }
      }

      const diasCumplidos = conteoAsistidas || 0
      const porcentaje =
        diasProgramados > 0
          ? Math.min(100, Math.round((diasCumplidos / diasProgramados) * 100))
          : 0

      // 3. Consultar métricas de gamificación existentes del usuario
      const { data: metricaExistente, error: metricaError } = await supabase
        .from('metricas_gamificacion')
        .select('*')
        .eq('usuario_id', cleanUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (metricaError) {
        return { data: null, error: metricaError.message }
      }

      let puntosAcumulados = metricaExistente?.puntos_acumulados || 0
      let bonoPlanOtorgado = metricaExistente?.bono_plan_otorgado || false

      // 4. Evaluar bono por plan cumplido (100% de clases alcanzado)
      if (diasProgramados > 0 && diasCumplidos >= diasProgramados && !bonoPlanOtorgado) {
        // Consultar puntos configurados para la regla 'Plan cumplido'
        const { data: reglas } = await this.obtenerReglasXP(cleanEmpresaId)
        const reglaBono = (reglas || []).find(
          (r) => r.criterio.toLowerCase().includes('plan') && r.activo
        )
        const puntosBono = reglaBono ? reglaBono.puntos_xp : 150

        puntosAcumulados += puntosBono
        bonoPlanOtorgado = true
      }

      // 5. Persistir o actualizar en public.metricas_gamificacion
      const nowIso = new Date().toISOString()
      if (metricaExistente?.id) {
        await supabase
          .from('metricas_gamificacion')
          .update({
            empresa_id: cleanEmpresaId,
            tiquetera_id: tiqueteraActual?.id || null,
            puntos_acumulados: puntosAcumulados,
            dias_programados: diasProgramados,
            dias_cumplidos: diasCumplidos,
            bono_plan_otorgado: bonoPlanOtorgado,
            updated_at: nowIso,
          })
          .eq('id', metricaExistente.id)
      } else {
        await supabase.from('metricas_gamificacion').insert({
          usuario_id: cleanUserId,
          empresa_id: cleanEmpresaId,
          tiquetera_id: tiqueteraActual?.id || null,
          puntos_acumulados: puntosAcumulados,
          dias_programados: diasProgramados,
          dias_cumplidos: diasCumplidos,
          bono_plan_otorgado: bonoPlanOtorgado,
          potencia_promedio_watts: 0,
          ranking_clase: 0,
          created_at: nowIso,
          updated_at: nowIso,
        })
      }

      const { nivel } = calcularNivelUsuario(puntosAcumulados)

      return {
        data: {
          puntos_acumulados: puntosAcumulados,
          dias_programados: diasProgramados,
          dias_cumplidos: diasCumplidos,
          porcentaje,
          bono_plan_otorgado: bonoPlanOtorgado,
          plan_nombre: planNombre,
          nivel,
          potencia_promedio_watts: metricaExistente?.potencia_promedio_watts || 0,
          ranking_clase: metricaExistente?.ranking_clase || 0,
        },
        error: null,
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al obtener progreso de gamificación'
      return { data: null, error: message }
    }
  },

  /**
   * Procesa la gamificación al tomar asistencia:
   * 1. Determina puntos por Asistencia y Puntualidad.
   * 2. Suma los XP y valida el progreso del plan.
   */
  async procesarAsistenciaGamificacion(
    params: ProcesarAsistenciaParams
  ): Promise<ServiceResponse<ProcesarAsistenciaResult>> {
    try {
      const { usuarioId, empresaId, fechaInicioClase } = params

      // 1. Consultar reglas de XP activas de la empresa
      const reglasRes = await this.obtenerReglasXP(empresaId)
      const reglas = reglasRes.data || []

      const reglaAsistencia = reglas.find(
        (r) => r.criterio.toLowerCase().includes('asistencia') && r.activo
      )
      const reglaPuntualidad = reglas.find(
        (r) => r.criterio.toLowerCase().includes('puntualidad') && r.activo
      )

      const xpAsistencia = reglaAsistencia ? reglaAsistencia.puntos_xp : 100
      let xpPuntualidad = 0

      // Validar ventana de puntualidad: dentro de 15 min antes del inicio o hasta 5 min después
      if (fechaInicioClase) {
        const horaInicio = new Date(fechaInicioClase).getTime()
        const ahora = Date.now()
        const diffMinutos = (ahora - horaInicio) / (1000 * 60)

        // diffMinutos entre -15 (15 min antes) y +5 (5 min después)
        if (diffMinutos >= -15 && diffMinutos <= 5) {
          xpPuntualidad = reglaPuntualidad ? reglaPuntualidad.puntos_xp : 30
        }
      }

      const totalXpInmediato = xpAsistencia + xpPuntualidad

      // 2. Sumar puntos inmediatos en la tabla metricas_gamificacion
      const { data: metricaPrevia } = await supabase
        .from('metricas_gamificacion')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nuevoTotalPuntos = (metricaPrevia?.puntos_acumulados || 0) + totalXpInmediato
      const nowIso = new Date().toISOString()

      if (metricaPrevia?.id) {
        await supabase
          .from('metricas_gamificacion')
          .update({
            empresa_id: empresaId,
            puntos_acumulados: nuevoTotalPuntos,
            updated_at: nowIso,
          })
          .eq('id', metricaPrevia.id)
      } else {
        await supabase.from('metricas_gamificacion').insert({
          usuario_id: usuarioId,
          empresa_id: empresaId,
          puntos_acumulados: nuevoTotalPuntos,
          dias_programados: 0,
          dias_cumplidos: 1,
          bono_plan_otorgado: false,
          created_at: nowIso,
          updated_at: nowIso,
        })
      }

      // 3. Ejecutar progreso general del plan (esto puede otorgar el bono de Plan cumplido)
      const progresoRes = await this.obtenerProgresoGamificacion(usuarioId, empresaId)
      const progreso = progresoRes.data

      const bonoPlanOtorgadoAhora =
        progreso &&
        progreso.bono_plan_otorgado &&
        (!metricaPrevia || !metricaPrevia.bono_plan_otorgado)

      const reglaBonoPlan = reglas.find(
        (r) => r.criterio.toLowerCase().includes('plan') && r.activo
      )
      const xpBonoPlan = bonoPlanOtorgadoAhora ? (reglaBonoPlan ? reglaBonoPlan.puntos_xp : 150) : 0

      const xpOtorga: XpOtorgadosDetalle = {
        asistencia: xpAsistencia,
        puntualidad: xpPuntualidad,
        bonoPlan: xpBonoPlan,
        total: totalXpInmediato + xpBonoPlan,
      }

      return {
        data: {
          xpOtorgados: xpOtorga,
          progresoPlan: {
            dias_programados: progreso?.dias_programados || 0,
            dias_cumplidos: progreso?.dias_cumplidos || 0,
            porcentaje: progreso?.porcentaje || 0,
            bonoOtorgado: progreso?.bono_plan_otorgado || false,
          },
        },
        error: null,
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al procesar gamificación de asistencia'
      return { data: null, error: message }
    }
  },

  /**
   * Obtiene el resumen de gamificación y ranking de los alumnos de una empresa,
   * segmentando por plan activo, días programados/cumplidos y porcentaje de avance.
   */
  async obtenerResumenGamificacionEmpresa(
    empresaId: string
  ): Promise<ServiceResponse<AlumnoGamificacionResumen[]>> {
    try {
      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es requerido' }
      }

      const cleanEmpresaId = empresaId.trim()

      // 1. Obtener alumnos clientes activos de la empresa
      const { data: perfiles, error: perfilesError } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email, documento, telefono, avatar_url, codigo_qr')
        .eq('empresa_id', cleanEmpresaId)
        .eq('rol', 'cliente')
        .eq('activo', true)

      if (perfilesError) {
        return { data: null, error: perfilesError.message }
      }

      // 2. Obtener tiqueteras activas de la empresa cruzando con planes
      const { data: tiqueteras, error: tiqueterasError } = await supabase
        .from('tiqueteras')
        .select(`
          id,
          cliente_id,
          plan_id,
          creditos_totales,
          creditos_disponibles,
          premio_entregado,
          created_at,
          plan:planes!tiqueteras_plan_id_fkey(id, nombre)
        `)
        .eq('empresa_id', cleanEmpresaId)
        .eq('estado', 'activa')
        .order('created_at', { ascending: false })

      if (tiqueterasError) {
        return { data: null, error: tiqueterasError.message }
      }

      // Mapear la tiquetera activa más reciente por cliente
      type TiqueteraConPlanInfo = NonNullable<typeof tiqueteras>[number]
      const tiqueterasMap = new Map<string, TiqueteraConPlanInfo>()
      for (const t of tiqueteras || []) {
        if (!tiqueterasMap.has(t.cliente_id)) {
          tiqueterasMap.set(t.cliente_id, t)
        }
      }

      // 3. Obtener métricas acumuladas de la empresa
      const { data: metricas, error: metricasError } = await supabase
        .from('metricas_gamificacion')
        .select('*')
        .eq('empresa_id', cleanEmpresaId)

      if (metricasError) {
        return { data: null, error: metricasError.message }
      }

      const metricasMap = new Map<string, MetricasGamificacionRow>()
      for (const m of metricas || []) {
        metricasMap.set(m.usuario_id, m)
      }

      // 4. Mapear alumnos con segmentación de plan, progreso y métricas
      const alumnosResumen: AlumnoGamificacionResumen[] = (perfiles || []).map((p) => {
        const t = tiqueterasMap.get(p.id)
        const m = metricasMap.get(p.id)

        let planId: string | null = null
        let planNombre: string | null = 'Sin Plan'
        let tiqueteraId: string | null = null
        let diasProgramados = 0
        let diasCumplidos = 0

        if (t) {
          tiqueteraId = t.id
          planId = t.plan_id || null
          const planData = t.plan as unknown as { id: string; nombre: string } | null
          planNombre = planData?.nombre || 'Plan Personalizado'
          diasProgramados = t.creditos_totales || m?.dias_programados || 0
          const consumidos = Math.max(0, (t.creditos_totales || 0) - (t.creditos_disponibles || 0))
          diasCumplidos = consumidos > 0 ? consumidos : (m?.dias_cumplidos || 0)
        } else if (m) {
          diasProgramados = m.dias_programados || 0
          diasCumplidos = m.dias_cumplidos || 0
          tiqueteraId = m.tiquetera_id || null
        }

        const porcentaje =
          diasProgramados > 0
            ? Math.min(100, Math.round((diasCumplidos / diasProgramados) * 100))
            : 0

        const puntos = m?.puntos_acumulados || 0
        const { nivel } = calcularNivelUsuario(puntos)
        const premioEntregado = Boolean(m?.premio_entregado || t?.premio_entregado)
        const rachaSemanas =
          diasCumplidos > 0 ? Math.min(12, Math.max(1, Math.floor(diasCumplidos / 2))) : 0

        return {
          id: p.id,
          usuario_id: p.id,
          nombre_completo: p.nombre_completo,
          email: p.email || '',
          telefono: p.telefono || undefined,
          avatar_url: p.avatar_url || undefined,
          codigo_qr: p.codigo_qr || `RESERLY-${p.id.slice(0, 8).toUpperCase()}`,
          plan_id: planId,
          plan_nombre: planNombre,
          tiquetera_id: tiqueteraId,
          dias_cumplidos: diasCumplidos,
          dias_programados: diasProgramados,
          porcentaje,
          xp_ciclo: puntos,
          puntos_acumulados: puntos,
          nivel,
          racha_semanas: rachaSemanas,
          premio_entregado: premioEntregado,
          ranking: 0,
          bono_plan_otorgado: m?.bono_plan_otorgado || false,
          documento: p.documento,
        }
      })

      // Ordenar por porcentaje DESC y luego por puntos_acumulados DESC para asignar ranking relativo
      alumnosResumen.sort((a, b) => {
        if (b.porcentaje !== a.porcentaje) {
          return b.porcentaje - a.porcentaje
        }
        return b.puntos_acumulados - a.puntos_acumulados
      })
      alumnosResumen.forEach((alumno, index) => {
        alumno.ranking = index + 1
      })

      return { data: alumnosResumen, error: null }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al obtener resumen de gamificación'
      return { data: null, error: message }
    }
  },

  /**
   * Consulta el ranking de alumnos de la empresa (filtrado por plan activo si planId se provee, o global).
   * Ordena por puntos_acumulados DESC, asigna posición y medallas (🥇, 🥈, 🥉),
   * e identifica la posición del alumno consultado.
   */
  async obtenerRankingPorPlan(
    empresaId: string,
    planId?: string,
    usuarioId?: string
  ): Promise<RankingPorPlanResult> {
    try {
      if (!empresaId?.trim()) {
        return {
          ranking: [],
          miPosicion: 0,
          totalParticipantes: 0,
          data: [],
          error: 'empresaId es requerido',
        }
      }

      const cleanEmpresaId = empresaId.trim()
      let allowedClientIds: Set<string> | null = null

      // Si se especifica un plan, buscar qué clientes tienen tiquetera asociada a ese plan
      if (planId && planId !== 'todos' && planId !== 'global') {
        const { data: tiqueteras, error: errTiqueteras } = await supabase
          .from('tiqueteras')
          .select('cliente_id')
          .eq('empresa_id', cleanEmpresaId)
          .eq('plan_id', planId.trim())

        if (errTiqueteras) {
          return {
            ranking: [],
            miPosicion: 0,
            totalParticipantes: 0,
            data: [],
            error: errTiqueteras.message,
          }
        }

        allowedClientIds = new Set((tiqueteras || []).map((t) => t.cliente_id))
        if (allowedClientIds.size === 0) {
          return {
            ranking: [],
            miPosicion: 0,
            totalParticipantes: 0,
            data: [],
            error: null,
          }
        }
      }

      // Obtener perfiles de clientes de la empresa
      const { data: perfiles, error: perfilesError } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, avatar_url')
        .eq('empresa_id', cleanEmpresaId)
        .eq('rol', 'cliente')
        .eq('activo', true)

      if (perfilesError) {
        return {
          ranking: [],
          miPosicion: 0,
          totalParticipantes: 0,
          data: [],
          error: perfilesError.message,
        }
      }

      // Filtrar clientes si hay restricción por plan
      const perfilesFiltrados = allowedClientIds
        ? (perfiles || []).filter((p) => allowedClientIds!.has(p.id))
        : perfiles || []

      // Obtener métricas acumuladas de la empresa
      const { data: metricas, error: metricasError } = await supabase
        .from('metricas_gamificacion')
        .select('*')
        .eq('empresa_id', cleanEmpresaId)

      if (metricasError) {
        return {
          ranking: [],
          miPosicion: 0,
          totalParticipantes: 0,
          data: [],
          error: metricasError.message,
        }
      }

      const metricasMap = new Map<string, MetricasGamificacionRow>()
      for (const m of metricas || []) {
        metricasMap.set(m.usuario_id, m)
      }

      // Mapear ranking
      const items: RankingPlanItem[] = perfilesFiltrados.map((p) => {
        const m = metricasMap.get(p.id)
        const puntos = m?.puntos_acumulados || 0
        const { nivel } = calcularNivelUsuario(puntos)
        const diasProgramados = m?.dias_programados || 0
        const diasCumplidos = m?.dias_cumplidos || 0
        const porcentaje =
          diasProgramados > 0
            ? Math.min(100, Math.round((diasCumplidos / diasProgramados) * 100))
            : 0

        return {
          posicion: 0,
          medalla: '',
          usuario_id: p.id,
          nombre: p.nombre_completo,
          avatar_url: p.avatar_url,
          puntos_xp: puntos,
          nivel,
          dias_cumplidos: diasCumplidos,
          dias_programados: diasProgramados,
          porcentaje,
          es_usuario_actual: Boolean(usuarioId && p.id === usuarioId),
        }
      })

      // Ordenar por puntos XP descendente
      items.sort((a, b) => b.puntos_xp - a.puntos_xp)

      // Asignar posición y medalla
      items.forEach((item, index) => {
        item.posicion = index + 1
        if (index === 0) item.medalla = '🥇'
        else if (index === 1) item.medalla = '🥈'
        else if (index === 2) item.medalla = '🥉'
        else item.medalla = ''
      })

      let miPosicion = 0
      if (usuarioId) {
        const foundIdx = items.findIndex((item) => item.usuario_id === usuarioId)
        if (foundIdx !== -1) {
          miPosicion = foundIdx + 1
        }
      }

      return {
        ranking: items,
        miPosicion,
        totalParticipantes: items.length,
        data: items,
        error: null,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener ranking por plan'
      return {
        ranking: [],
        miPosicion: 0,
        totalParticipantes: 0,
        data: [],
        error: message,
      }
    }
  },

  /**
   * Consulta los premios configurados para el podio del plan.
   * Si no hay registros en public.premios_plan, retorna los 3 premios por defecto.
   */
  async obtenerPremiosPlan(
    empresaId: string,
    planId?: string
  ): Promise<PremioPlanPodio[] & { data: PremioPlanPodio[]; error: string | null }> {
    const premiosDefault: PremioPlanPodio[] = [
      { puesto: 1, premio: '1 Mes Gratis de Clases Ilimitadas', icono: 'trophy' },
      { puesto: 2, premio: 'Camiseta Oficial + Termo del Estudio', icono: 'award' },
      { puesto: 3, premio: '3 Clases Extra de Cortesía', icono: 'medal' },
    ]

    try {
      if (!empresaId?.trim()) {
        return Object.assign([...premiosDefault], { data: premiosDefault, error: null })
      }

      let query = supabase
        .from('premios_plan')
        .select('*')
        .eq('empresa_id', empresaId.trim())
        .eq('activo', true)

      if (planId && planId !== 'todos' && planId !== 'global') {
        query = query.or(`plan_id.eq.${planId.trim()},plan_id.is.null`)
      }

      const { data, error } = await query.order('puesto', { ascending: true })

      if (error || !data || data.length === 0) {
        return Object.assign([...premiosDefault], { data: premiosDefault, error: null })
      }

      const mapeados: PremioPlanPodio[] = data.map((p) => ({
        id: p.id,
        puesto: p.puesto,
        premio: p.premio,
        icono: p.icono || (p.puesto === 1 ? 'trophy' : p.puesto === 2 ? 'award' : 'medal'),
        plan_id: p.plan_id,
      }))

      return Object.assign(mapeados, { data: mapeados, error: null })
    } catch {
      return Object.assign([...premiosDefault], { data: premiosDefault, error: null })
    }
  },

  /**
   * Consulta public.premios_plan filtrando por empresa_id y opcionalmente por plan_id.
   * Si planId no se pasa, devuelve todos los premios activos de la empresa ordenados por puesto ASC.
   */
  async obtenerPremiosPorPlan(
    empresaId: string,
    planId?: string | null
  ): Promise<ServiceResponse<PremiosPlanRow[]>> {
    try {
      if (!empresaId?.trim()) {
        return { data: [], error: 'empresaId es requerido' }
      }

      let query = supabase
        .from('premios_plan')
        .select('*')
        .eq('empresa_id', empresaId.trim())
        .eq('activo', true)

      if (planId !== undefined && planId !== null && planId !== 'todos') {
        if (planId === 'global') {
          query = query.is('plan_id', null)
        } else {
          query = query.eq('plan_id', planId.trim())
        }
      }

      const { data, error } = await query.order('puesto', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Error al obtener premios por plan',
      }
    }
  },

  /**
   * Inserta o actualiza un premio en public.premios_plan.
   * Si ya existe un registro para (empresa_id, plan_id, puesto), lo actualiza; caso contrario inserta.
   */
  async guardarPremioPlan(
    params: GuardarPremioPlanParams
  ): Promise<ServiceResponse<PremiosPlanRow>> {
    try {
      const { id, empresaId, planId, puesto, premio, icono, activo } = params

      if (!empresaId?.trim()) {
        return { data: null, error: 'empresaId es requerido' }
      }
      if (!premio?.trim()) {
        return { data: null, error: 'El nombre o descripción del premio es obligatorio' }
      }
      if (![1, 2, 3].includes(puesto)) {
        return { data: null, error: 'El puesto debe ser 1, 2 o 3' }
      }

      const cleanEmpresaId = empresaId.trim()
      const cleanPlanId =
        planId && planId.trim() !== '' && planId !== 'todos' && planId !== 'global'
          ? planId.trim()
          : null
      const iconoVal = icono?.trim() || (puesto === 1 ? '🥇' : puesto === 2 ? '🥈' : '🥉')
      const activoVal = activo !== undefined ? activo : true

      // 1. Si viene con id explícito, actualizar directamente
      if (id && id.trim()) {
        const { data, error } = await supabase
          .from('premios_plan')
          .update({
            plan_id: cleanPlanId,
            puesto,
            premio: premio.trim(),
            icono: iconoVal,
            activo: activoVal,
          })
          .eq('id', id.trim())
          .eq('empresa_id', cleanEmpresaId)
          .select()
          .single()

        if (error) {
          return { data: null, error: error.message }
        }
        return { data, error: null }
      }

      // 2. Si no viene id, verificar si ya existe registro para (empresa_id, plan_id, puesto)
      let checkQuery = supabase
        .from('premios_plan')
        .select('*')
        .eq('empresa_id', cleanEmpresaId)
        .eq('puesto', puesto)

      if (cleanPlanId) {
        checkQuery = checkQuery.eq('plan_id', cleanPlanId)
      } else {
        checkQuery = checkQuery.is('plan_id', null)
      }

      const { data: existente, error: checkError } = await checkQuery.maybeSingle()

      if (checkError) {
        return { data: null, error: checkError.message }
      }

      if (existente?.id) {
        const { data, error } = await supabase
          .from('premios_plan')
          .update({
            premio: premio.trim(),
            icono: iconoVal,
            activo: activoVal,
          })
          .eq('id', existente.id)
          .select()
          .single()

        if (error) {
          return { data: null, error: error.message }
        }
        return { data, error: null }
      }

      // 3. Crear nuevo registro
      const { data, error } = await supabase
        .from('premios_plan')
        .insert({
          empresa_id: cleanEmpresaId,
          plan_id: cleanPlanId,
          puesto,
          premio: premio.trim(),
          icono: iconoVal,
          activo: activoVal,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Error al guardar premio del plan',
      }
    }
  },

  /**
   * Elimina o desactiva (activo = false) el premio en public.premios_plan.
   */
  async eliminarPremioPlan(
    id: string,
    empresaId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      if (!id?.trim() || !empresaId?.trim()) {
        return { data: false, error: 'id y empresaId son requeridos' }
      }

      const cleanId = id.trim()
      const cleanEmpresaId = empresaId.trim()

      const { error: deleteError } = await supabase
        .from('premios_plan')
        .delete()
        .eq('id', cleanId)
        .eq('empresa_id', cleanEmpresaId)

      if (deleteError) {
        // En caso de restricción o fallo, fallback a soft-delete
        const { error: updateError } = await supabase
          .from('premios_plan')
          .update({ activo: false })
          .eq('id', cleanId)
          .eq('empresa_id', cleanEmpresaId)

        if (updateError) {
          return { data: false, error: updateError.message }
        }
      }

      return { data: true, error: null }
    } catch (err) {
      return {
        data: false,
        error: err instanceof Error ? err.message : 'Error al eliminar premio',
      }
    }
  },

  /**
   * Actualiza premio_entregado = true en public.metricas_gamificacion para usuario_id
   * y opcionalmente en public.tiqueteras si se provee tiqueteraId.
   */
  async marcarPremioEntregado(
    usuarioId: string,
    tiqueteraId?: string | null,
    empresaId?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      if (!usuarioId?.trim()) {
        return { data: false, error: 'usuarioId es requerido' }
      }

      const cleanUserId = usuarioId.trim()
      const nowIso = new Date().toISOString()

      // 1. Actualizar en public.metricas_gamificacion
      let metricaQuery = supabase
        .from('metricas_gamificacion')
        .update({
          premio_entregado: true,
          updated_at: nowIso,
        })
        .eq('usuario_id', cleanUserId)

      if (empresaId && empresaId.trim()) {
        metricaQuery = metricaQuery.eq('empresa_id', empresaId.trim())
      }

      const { error: metricaError } = await metricaQuery
      if (metricaError) {
        return { data: false, error: metricaError.message }
      }

      // 2. Si se provee tiqueteraId, actualizar también en public.tiqueteras
      if (tiqueteraId && tiqueteraId.trim()) {
        let tiqueteraQuery = supabase
          .from('tiqueteras')
          .update({
            premio_entregado: true,
            updated_at: nowIso,
          })
          .eq('id', tiqueteraId.trim())

        if (empresaId && empresaId.trim()) {
          tiqueteraQuery = tiqueteraQuery.eq('empresa_id', empresaId.trim())
        }

        const { error: tiqueteraError } = await tiqueteraQuery
        if (tiqueteraError) {
          return { data: false, error: tiqueteraError.message }
        }
      }

      return { data: true, error: null }
    } catch (err) {
      return {
        data: false,
        error: err instanceof Error ? err.message : 'Error al marcar premio entregado',
      }
    }
  },

  /**
   * Evalúa las 5 insignias de gamificación del alumno:
   * 1. Primera Pedalada: asistencias >= 1 (icono: 'bike')
   * 2. A Tiempo: asistencias puntuales >= 3 (icono: 'clock')
   * 3. Constancia: asistencias >= 5 (icono: 'flame')
   * 4. Energía: XP total >= 1,000 (icono: 'zap')
   * 5. Referente: completó el 100% de un plan (icono: 'crown')
   */
  async obtenerInsigniasUsuario(
    usuarioId: string,
    empresaId: string
  ): Promise<InsigniaUsuario[] & { data: InsigniaUsuario[]; error: string | null }> {
    try {
      if (!usuarioId?.trim() || !empresaId?.trim()) {
        const vacio: InsigniaUsuario[] = []
        return Object.assign(vacio, { data: vacio, error: 'usuarioId y empresaId son obligatorios' })
      }

      const cleanUserId = usuarioId.trim()
      const cleanEmpresaId = empresaId.trim()

      // 1. Consultar reservas confirmadas o finalizadas del alumno
      const { data: reservas } = await supabase
        .from('reservas')
        .select('id, fecha_inicio, updated_at, asistencia_confirmada, estado')
        .eq('cliente_id', cleanUserId)
        .eq('empresa_id', cleanEmpresaId)
        .or('asistencia_confirmada.eq.true,estado.eq.finalizada')
        .order('fecha_inicio', { ascending: true })

      const totalAsistencias = reservas?.length || 0

      // Evaluar asistencias puntuales
      let asistenciasPuntuales = 0
      let fechaTerceraPuntual: string | undefined = undefined

      for (const r of reservas || []) {
        let esPuntual = false
        if (r.fecha_inicio && r.updated_at) {
          const diffMin = (new Date(r.updated_at).getTime() - new Date(r.fecha_inicio).getTime()) / 60000
          if (diffMin >= -30 && diffMin <= 10) {
            esPuntual = true
          }
        }
        if (esPuntual || r.asistencia_confirmada) {
          asistenciasPuntuales++
          if (asistenciasPuntuales === 3) {
            fechaTerceraPuntual = r.updated_at || r.fecha_inicio
          }
        }
      }

      // 2. Consultar métricas de gamificación del alumno
      const { data: metrica } = await supabase
        .from('metricas_gamificacion')
        .select('*')
        .eq('usuario_id', cleanUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const puntosTotales = metrica?.puntos_acumulados || 0
      const planCompletado = Boolean(
        metrica?.bono_plan_otorgado ||
          (metrica?.dias_programados &&
            metrica.dias_cumplidos >= metrica.dias_programados &&
            metrica.dias_programados > 0)
      )

      const fechaPrimeraAsistencia =
        reservas && reservas.length > 0 ? reservas[0].updated_at || reservas[0].fecha_inicio : undefined
      const fechaQuintaAsistencia =
        reservas && reservas.length >= 5 ? reservas[4].updated_at || reservas[4].fecha_inicio : undefined
      const fechaMetrica = metrica?.updated_at || metrica?.created_at || new Date().toISOString()

      const insignias: InsigniaUsuario[] = [
        {
          id: 'primera-pedalada',
          titulo: 'Primera Pedalada',
          descripcion: 'Completa tu primera clase en el estudio',
          icono: 'bike',
          desbloqueada: totalAsistencias >= 1,
          fecha_desbloqueo: totalAsistencias >= 1 ? fechaPrimeraAsistencia : undefined,
        },
        {
          id: 'a-tiempo',
          titulo: 'A Tiempo',
          descripcion: 'Llega puntual a 3 o más clases',
          icono: 'clock',
          desbloqueada: asistenciasPuntuales >= 3,
          fecha_desbloqueo: asistenciasPuntuales >= 3 ? fechaTerceraPuntual : undefined,
        },
        {
          id: 'constancia',
          titulo: 'Constancia',
          descripcion: 'Asiste a 5 o más clases en el estudio',
          icono: 'flame',
          desbloqueada: totalAsistencias >= 5,
          fecha_desbloqueo: totalAsistencias >= 5 ? fechaQuintaAsistencia : undefined,
        },
        {
          id: 'energia',
          titulo: 'Energía',
          descripcion: 'Acumula más de 1,000 puntos de XP en total',
          icono: 'zap',
          desbloqueada: puntosTotales >= 1000,
          fecha_desbloqueo: puntosTotales >= 1000 ? fechaMetrica : undefined,
        },
        {
          id: 'referente',
          titulo: 'Referente',
          descripcion: 'Completa el 100% de las clases programadas en tu plan',
          icono: 'crown',
          desbloqueada: planCompletado,
          fecha_desbloqueo: planCompletado ? fechaMetrica : undefined,
        },
      ]

      return Object.assign(insignias, { data: insignias, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener insignias'
      const vacio: InsigniaUsuario[] = []
      return Object.assign(vacio, { data: vacio, error: message })
    }
  },

  /**
   * Consulta las reservas del alumno con asistencia_confirmada = true o estado = 'finalizada'
   * ordenadas por fecha descendente, con clase, hora, puesto/bici y XP ganados.
   */
  async obtenerHistorialAsistencias(
    usuarioId: string,
    empresaId: string
  ): Promise<HistorialAsistenciaItem[] & { data: HistorialAsistenciaItem[]; error: string | null }> {
    try {
      if (!usuarioId?.trim() || !empresaId?.trim()) {
        const vacio: HistorialAsistenciaItem[] = []
        return Object.assign(vacio, { data: vacio, error: 'usuarioId y empresaId son obligatorios' })
      }

      const cleanUserId = usuarioId.trim()
      const cleanEmpresaId = empresaId.trim()

      const { data, error } = await supabase
        .from('reservas')
        .select(`
          id,
          empresa_id,
          clase_id,
          bicicleta_id,
          cliente_id,
          fecha_reserva,
          fecha_inicio,
          fecha_fin,
          estado,
          asistencia_confirmada,
          updated_at,
          clase:clases!reservas_clase_id_fkey(
            id,
            titulo,
            fecha,
            hora_inicio,
            hora_fin,
            instructor:perfiles!clases_instructor_id_fkey(id, nombre_completo)
          ),
          bicicleta:bicicletas!reservas_bicicleta_id_fkey(id, numero)
        `)
        .eq('cliente_id', cleanUserId)
        .eq('empresa_id', cleanEmpresaId)
        .or('asistencia_confirmada.eq.true,estado.eq.finalizada')
        .order('fecha_inicio', { ascending: false })

      if (error) {
        const vacio: HistorialAsistenciaItem[] = []
        return Object.assign(vacio, { data: vacio, error: error.message })
      }

      const historial: HistorialAsistenciaItem[] = (data || []).map((r) => {
        const claseData = r.clase as unknown as {
          id: string
          titulo: string
          fecha: string
          hora_inicio: string
          hora_fin: string
          instructor: { id: string; nombre_completo: string } | null
        } | null

        const biciData = r.bicicleta as unknown as { id: string; numero: number } | null

        // Calcular XP ganados: 100 asistencia base + 30 puntualidad si aplica
        let xpGanados = 100
        if (r.fecha_inicio && r.updated_at) {
          const diffMin = (new Date(r.updated_at).getTime() - new Date(r.fecha_inicio).getTime()) / 60000
          if (diffMin >= -30 && diffMin <= 10) {
            xpGanados += 30
          }
        }

        return {
          id: r.id,
          reserva_id: r.id,
          clase_id: r.clase_id,
          clase_titulo: claseData?.titulo || 'Sesión Indoor Cycling',
          instructor_nombre: claseData?.instructor?.nombre_completo || 'Instructor',
          fecha: claseData?.fecha || r.fecha_reserva || (r.fecha_inicio ? r.fecha_inicio.split('T')[0] : ''),
          hora_inicio: claseData?.hora_inicio || (r.fecha_inicio ? r.fecha_inicio.split('T')[1]?.substring(0, 5) : '00:00'),
          hora_fin: claseData?.hora_fin || (r.fecha_fin ? r.fecha_fin.split('T')[1]?.substring(0, 5) : '00:00'),
          bicicleta_numero: biciData?.numero || 0,
          puntos_xp: xpGanados,
          asistencia_confirmada: r.asistencia_confirmada,
          estado: r.estado,
        }
      })

      return Object.assign(historial, { data: historial, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener historial de asistencias'
      const vacio: HistorialAsistenciaItem[] = []
      return Object.assign(vacio, { data: vacio, error: message })
    }
  },
}

export const obtenerResumenGamificacionEmpresa = gamificacionService.obtenerResumenGamificacionEmpresa.bind(gamificacionService)
export const obtenerRankingPorPlan = gamificacionService.obtenerRankingPorPlan.bind(gamificacionService)
export const obtenerPremiosPlan = gamificacionService.obtenerPremiosPlan.bind(gamificacionService)
export const obtenerPremiosPorPlan = gamificacionService.obtenerPremiosPorPlan.bind(gamificacionService)
export const guardarPremioPlan = gamificacionService.guardarPremioPlan.bind(gamificacionService)
export const eliminarPremioPlan = gamificacionService.eliminarPremioPlan.bind(gamificacionService)
export const marcarPremioEntregado = gamificacionService.marcarPremioEntregado.bind(gamificacionService)
export const obtenerInsigniasUsuario = gamificacionService.obtenerInsigniasUsuario.bind(gamificacionService)
export const obtenerHistorialAsistencias = gamificacionService.obtenerHistorialAsistencias.bind(gamificacionService)

