// Centralización de Servicios Backend de Negocio
export { authService } from './authService'
export type {
  SignUpParams,
  SignInParams,
  AuthResponse,
  AuthSessionData,
} from './authService'

export { clasesService } from './clasesService'
export type {
  BicicletaOcupacion,
  ClaseConOcupacion,
} from './clasesService'

export { reservasService } from './reservasService'
export type {
  CrearReservaParams,
  ReservaDetallada,
  AsistenciaQRResponse,
  InscribirListaEsperaResult,
  EstadoListaEsperaUsuario,
  AlumnoEnEspera,
} from './reservasService'

export { tiqueterasService } from './tiqueterasService'
export type {
  TiqueteraConPlan,
  SolicitudCompraPlanParams,
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
  ClienteConTiqueteraResumen,
  DesgloseMetodoPago,
  CierreCajaResumen,
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
