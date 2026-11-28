// Centralización de Servicios Backend de Negocio
export {
  authService,
  generateSlug,
  registrarAlumno,
  registrarCliente,
  vincularEstudio,
  actualizarPerfil,
  subirAvatar,
  registerStudio,
  crearEstudioConAdmin,
} from './authService'
export type {
  SignUpParams,
  SignUpResult,
  RegistrarAlumnoParams,
  SignInParams,
  CrearEstudioConAdminParams,
  RegisterStudioParams,
  RegisterStudioResult,
  EmpresaActiva,
  AuthResponse,
  AuthSessionData,
  AlumnoBusqueda,
} from './authService'

export {
  clasesService,
  generarProgramacionMasiva,
  crearClaseEspecial,
  ensureBicicletasForEmpresa,
  getBicicletasByEmpresa,
  getBicicletasParaClase,
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
  crearReservaAdmin,
  cancelarReservaRapida,
  obtenerProximaReservaUsuario,
} from './reservasService'
export type {
  CrearReservaParams,
  CrearReservaAdminParams,
  CrearReservaAdminResponse,
  ReservaDetallada,
  ProximaReservaDetallada,
  AsistenciaQRResponse,
  XpOtorgados,
  ProgresoPlanGamificacion,
  AlumnoResumenQR,
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

export { adminService, obtenerMetricasDashboardEjecutivo } from './adminService'
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
  PeriodoDashboard,
  KpisDashboardEjecutivo,
  PuntoGraficaIngresosReservas,
  FranjaHoraPico,
  RendimientoPlanItem,
  DesgloseEstadosReservas,
  TopClienteItem,
  MetricasDashboardEjecutivo,
} from './adminService'

export {
  empresasService,
  actualizarEmpresa,
  subirLogoEmpresa,
  subirPortadaEmpresa,
  getEstudiosUsuario,
  registrarEstudio,
} from './empresasService'
export type {
  EstudioActivo,
  ActualizarConfiguracionEstudioParams,
  ActualizarEmpresaParams,
  RegistrarEstudioParams,
  SubirLogoResponse,
} from './empresasService'

export { offlineService } from './offlineService'
export type {
  ReservaPaseOffline,
} from './offlineService'

export { metricasService, obtenerMetricasUsuario } from './metricasService'
export type { MetricasUsuario } from './metricasService'

export {
  gamificacionService,
  REGLAS_XP_DEFAULT,
  calcularNivelUsuario,
  obtenerRankingPorPlan,
  obtenerPremiosPlan,
  obtenerPremiosPorPlan,
  guardarPremioPlan,
  eliminarPremioPlan,
  marcarPremioEntregado,
  obtenerResumenGamificacionEmpresa,
  obtenerInsigniasUsuario,
  obtenerHistorialAsistencias,
} from './gamificacionService'
export type {
  ReglaXPSeed,
  CrearReglaXPParams,
  ProgresoGamificacionUsuario,
  AlumnoGamificacionResumen,
  GuardarPremioPlanParams,
  XpOtorgadosDetalle,
  ProcesarAsistenciaParams,
  ProcesarAsistenciaResult,
  RankingPlanItem,
  RankingPorPlanResult,
  PremioPlanPodio,
  InsigniaUsuario,
  HistorialAsistenciaItem,
} from './gamificacionService'

export { bicicletasService } from './bicicletasService'
export type {
  CrearBicicletaParams,
  CrearBicicletasEnLoteParams,
  ObtenerBicicletasOptions,
  MetricasBicicletas,
  SincronizarCapacidadResponse,
  EliminarBicicletaResponse,
} from './bicicletasService'
