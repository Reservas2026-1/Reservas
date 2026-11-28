export type EstadoReserva = 'pendiente' | 'confirmada' | 'en_curso' | 'finalizada' | 'cancelada'
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado'
export type MetodoPago =
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta'
  | 'nequi'
  | 'bancolombia'
  | 'wompi'
  | 'yape'
  | 'plin'
  | 'otro'
export type EstadoBicicleta = 'disponible' | 'reservada' | 'mantenimiento' | 'baja'
export type TipoBicicleta = 'urbana' | 'montaña' | 'electrica' | 'ruta' | 'infantil'

export interface Empresa {
  id: string
  nombre: string
  slug?: string
  tipo_negocio?: string
  ruc_o_identificacion?: string
  telefono?: string
  email?: string
  direccion?: string
  logo_url?: string
  portada_url?: string | null
  color_primario?: string
  color_secundario?: string
  activo: boolean
  created_at: string
  updated_at?: string
}

export interface Plan {
  id: string
  empresa_id: string
  nombre: string
  descripcion?: string
  precio: number
  duracion_horas: number
  activo: boolean
  created_at: string
}

export interface Bicicleta {
  id: string
  empresa_id: string
  codigo: string
  modelo: string
  tipo: TipoBicicleta
  estado: EstadoBicicleta
  latitud?: number
  longitud?: number
  bateria_porcentaje?: number
  tarifa_hora?: number
  created_at: string
}

export interface Reserva {
  id: string
  empresa_id: string
  plan_id?: string
  bicicleta_id: string
  cliente_nombre: string
  cliente_documento: string
  cliente_telefono: string
  cliente_email?: string
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoReserva
  total: number
  notas?: string
  created_at: string
  updated_at?: string
  plan?: Plan
  bicicleta?: Bicicleta
  pagos?: Pago[]
}

export interface Pago {
  id: string
  empresa_id?: string
  cliente_id?: string
  reserva_id?: string
  tiquetera_id?: string
  plan_id?: string
  monto: number
  metodo: MetodoPago
  estado: EstadoPago
  comprobante_url?: string
  referencia_transaccion?: string
  validado_por?: string
  notas?: string
  fecha_pago: string
  created_at: string
}

export interface MovimientoCaja {
  id: string
  empresa_id: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
  metodo: MetodoPago
  reserva_id?: string
  responsable: string
  fecha: string
  created_at: string
}

export interface PremioPlan {
  id: string
  empresa_id: string
  plan_id?: string | null
  puesto: number
  premio: string
  icono?: string | null
  activo: boolean
  created_at: string
}

export interface MetricasGamificacion {
  id: string
  usuario_id: string
  empresa_id?: string | null
  tiquetera_id?: string | null
  puntos_acumulados: number
  potencia_promedio_watts: number
  ranking_clase: number
  dias_programados: number
  dias_cumplidos: number
  bono_plan_otorgado: boolean
  premio_entregado: boolean
  created_at: string
  updated_at?: string | null
}

export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  RolUsuario,
  EstadoClase,
  EstadoTiquetera,
  TiqueteraRow,
  TiqueteraInsert,
  TiqueteraUpdate,
  CrearReservaSeguraArgs,
  CrearReservaSeguraResponse,
  CancelarReservaSeguraArgs,
  CancelarReservaSeguraResponse,
  AprobarPagoYActivarPlanArgs,
  AprobarPagoYActivarPlanResponse,
  InscribirListaEsperaArgs,
  InscribirListaEsperaResponse,
  EstadoListaEspera,
  ListaEsperaRow,
  ListaEsperaInsert,
  ReglasXpRow,
  ReglasXpInsert,
  ReglasXpUpdate,
  MetricasGamificacionRow,
  MetricasGamificacionInsert,
  MetricasGamificacionUpdate,
  PremiosPlanRow,
  PremiosPlanInsert,
  PremiosPlanUpdate,
  EmpresaRow,
  EmpresaInsert,
  EmpresaUpdate,
} from './database'

