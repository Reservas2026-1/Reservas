// Centralización de Servicios Backend de Negocio
export { authService } from './authService'
export type {
  SignUpParams,
  SignInParams,
  AuthResponse,
  AuthSessionData,
} from './authService'

export {
  clasesService,
  generarProgramacionMasiva,
  crearClaseEspecial,
} from './clasesService'
export type {
  BicicletaOcupacion,
  ClaseConOcupacion,
  ActualizarClaseParams,
  CrearHorarioBaseParams,
  ActualizarHorarioBaseParams,
} from './clasesService'

export {
  reservasService,
  tiquetesService,
  crearReservasLote,
  cancelarReservaRapida,
} from './reservasService'
export type {
  CrearReservaParams,
  ReservaDetallada,
  AsistenciaQRResponse,
  InscribirListaEsperaResult,
  EstadoListaEsperaUsuario,
  AlumnoEnEspera,
  DeduccionTiqueteraItem,
  DeducirCreditosResponse,
  ReembolsarCreditosResponse,
  CrearReservasLoteData,
  CrearReservasLoteResponse,
  CancelarReservaRapidaResponse,
} from './reservasService'

export { tiqueterasService } from './tiqueterasService'
export type {
  TiqueteraConPlan,
  SolicitudCompraPlanParams,
  CrearPlanParams,
  ActualizarPlanParams,
  AsignarTiqueteraManualParams,
  ActualizarTiqueteraParams,
} from './tiqueterasService'

export { pagosService } from './pagosService'
export type {
  RegistrarPagoParams,
  PagoPendienteDetallado,
  SubirComprobanteResponse,
} from './pagosService'

export { adminService } from './adminService'
export type {
  DashboardMetricas,
  AlumnoInscrito,
  ClaseAdminDetalle,
  CrearClaseParams,
  ActualizarClienteParams,
  RegistrarMovimientoCajaParams,
  ClienteConTiqueteraResumen,
  DesgloseMetodoPago,
  CierreCajaResumen,
  PeriodoEstadisticas,
  GranularidadEstadisticas,
  PuntoEstadisticaIngresos,
  EstadisticasIngresosResumen,
  PagosFiltros,
  PagoFiltradoDetallado,
} from './adminService'

export { empresasService } from './empresasService'
export type {
  EstudioActivo,
  ActualizarConfiguracionEstudioParams,
  RegistrarEstudioParams,
  SubirLogoResponse,
} from './empresasService'

export { offlineService } from './offlineService'
export type {
  ReservaPaseOffline,
} from './offlineService'

export { metricasService, obtenerMetricasUsuario } from './metricasService'
export type { MetricasUsuario } from './metricasService'
