export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RolUsuario = 'superadmin' | 'admin' | 'instructor' | 'cliente'
export type TipoBicicleta = 'indoor' | 'urbana' | 'montaña' | 'electrica' | 'ruta' | 'infantil'
export type EstadoBicicleta = 'disponible' | 'reservada' | 'mantenimiento' | 'baja'
export type EstadoClase = 'programada' | 'en_curso' | 'completada' | 'cancelada'
export type EstadoTiquetera = 'activa' | 'agotada' | 'vencida' | 'cancelada'
export type EstadoReserva = 'pendiente' | 'confirmada' | 'en_curso' | 'finalizada' | 'cancelada'
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'nequi' | 'bancolombia' | 'wompi' | 'yape' | 'plin' | 'otro'
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado'
export type TipoMovimiento = 'ingreso' | 'egreso'
export type EstadoListaEspera = 'esperando' | 'notificado' | 'asignado'

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nombre: string
          slug: string | null
          ruc_o_identificacion: string | null
          telefono: string | null
          email: string | null
          direccion: string | null
          logo_url: string | null
          color_primario: string | null
          color_secundario: string | null
          capacidad_sala: number
          activo: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          nombre: string
          slug?: string | null
          ruc_o_identificacion?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          logo_url?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          capacidad_sala?: number
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string | null
          ruc_o_identificacion?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          logo_url?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          capacidad_sala?: number
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          id: string
          empresa_id: string | null
          email: string
          nombre_completo: string
          documento: string | null
          telefono: string | null
          rol: RolUsuario
          avatar_url: string | null
          activo: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          empresa_id?: string | null
          email: string
          nombre_completo: string
          documento?: string | null
          telefono?: string | null
          rol?: RolUsuario
          avatar_url?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string | null
          email?: string
          nombre_completo?: string
          documento?: string | null
          telefono?: string | null
          rol?: RolUsuario
          avatar_url?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'perfiles_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      planes: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          precio: number
          creditos: number
          dias_vigencia: number
          duracion_horas: number | null
          activo: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          descripcion?: string | null
          precio: number
          creditos?: number
          dias_vigencia?: number
          duracion_horas?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          descripcion?: string | null
          precio?: number
          creditos?: number
          dias_vigencia?: number
          duracion_horas?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'planes_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      tiqueteras: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string
          plan_id: string | null
          creditos_totales: number
          creditos_disponibles: number
          fecha_adquisicion: string
          fecha_vencimiento: string
          estado: EstadoTiquetera
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id: string
          plan_id?: string | null
          creditos_totales: number
          creditos_disponibles: number
          fecha_adquisicion?: string
          fecha_vencimiento: string
          estado?: EstadoTiquetera
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string
          plan_id?: string | null
          creditos_totales?: number
          creditos_disponibles?: number
          fecha_adquisicion?: string
          fecha_vencimiento?: string
          estado?: EstadoTiquetera
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tiqueteras_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tiqueteras_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tiqueteras_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'planes'
            referencedColumns: ['id']
          }
        ]
      }
      bicicletas: {
        Row: {
          id: string
          empresa_id: string
          numero: number
          codigo: string
          modelo: string
          fila: number
          columna: number
          tipo: TipoBicicleta
          estado: EstadoBicicleta
          latitud: number | null
          longitud: number | null
          bateria_porcentaje: number | null
          tarifa_hora: number | null
          activo: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          numero: number
          codigo: string
          modelo?: string
          fila?: number
          columna?: number
          tipo?: TipoBicicleta
          estado?: EstadoBicicleta
          latitud?: number | null
          longitud?: number | null
          bateria_porcentaje?: number | null
          tarifa_hora?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          numero?: number
          codigo?: string
          modelo?: string
          fila?: number
          columna?: number
          tipo?: TipoBicicleta
          estado?: EstadoBicicleta
          latitud?: number | null
          longitud?: number | null
          bateria_porcentaje?: number | null
          tarifa_hora?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bicicletas_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      clases: {
        Row: {
          id: string
          empresa_id: string
          instructor_id: string | null
          titulo: string
          descripcion: string | null
          fecha: string
          hora_inicio: string
          hora_fin: string
          capacidad: number
          estado: EstadoClase
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          instructor_id?: string | null
          titulo: string
          descripcion?: string | null
          fecha: string
          hora_inicio: string
          hora_fin: string
          capacidad?: number
          estado?: EstadoClase
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          instructor_id?: string | null
          titulo?: string
          descripcion?: string | null
          fecha?: string
          hora_inicio?: string
          hora_fin?: string
          capacidad?: number
          estado?: EstadoClase
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clases_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clases_instructor_id_fkey'
            columns: ['instructor_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          }
        ]
      }
      reservas: {
        Row: {
          id: string
          empresa_id: string
          clase_id: string | null
          bicicleta_id: string
          cliente_id: string | null
          tiquetera_id: string | null
          plan_id: string | null
          cliente_nombre: string
          cliente_documento: string
          cliente_telefono: string
          cliente_email: string | null
          fecha_reserva: string
          fecha_inicio: string
          fecha_fin: string
          estado: EstadoReserva
          total: number
          notas: string | null
          codigo_qr: string | null
          asistencia_confirmada: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          clase_id?: string | null
          bicicleta_id: string
          cliente_id?: string | null
          tiquetera_id?: string | null
          plan_id?: string | null
          cliente_nombre: string
          cliente_documento: string
          cliente_telefono: string
          cliente_email?: string | null
          fecha_reserva?: string
          fecha_inicio: string
          fecha_fin: string
          estado?: EstadoReserva
          total?: number
          notas?: string | null
          codigo_qr?: string | null
          asistencia_confirmada?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          clase_id?: string | null
          bicicleta_id?: string
          cliente_id?: string | null
          tiquetera_id?: string | null
          plan_id?: string | null
          cliente_nombre?: string
          cliente_documento?: string
          cliente_telefono?: string
          cliente_email?: string | null
          fecha_reserva?: string
          fecha_inicio?: string
          fecha_fin?: string
          estado?: EstadoReserva
          total?: number
          notas?: string | null
          codigo_qr?: string | null
          asistencia_confirmada?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reservas_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_clase_id_fkey'
            columns: ['clase_id']
            isOneToOne: false
            referencedRelation: 'clases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_bicicleta_id_fkey'
            columns: ['bicicleta_id']
            isOneToOne: false
            referencedRelation: 'bicicletas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_tiquetera_id_fkey'
            columns: ['tiquetera_id']
            isOneToOne: false
            referencedRelation: 'tiqueteras'
            referencedColumns: ['id']
          }
        ]
      }
      pagos: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string | null
          reserva_id: string | null
          tiquetera_id: string | null
          plan_id: string | null
          monto: number
          metodo: MetodoPago
          estado: EstadoPago
          referencia_transaccion: string | null
          comprobante_url: string | null
          validado_por: string | null
          notas: string | null
          fecha_pago: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id?: string | null
          reserva_id?: string | null
          tiquetera_id?: string | null
          plan_id?: string | null
          monto: number
          metodo: MetodoPago
          estado?: EstadoPago
          referencia_transaccion?: string | null
          comprobante_url?: string | null
          validado_por?: string | null
          notas?: string | null
          fecha_pago?: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string | null
          reserva_id?: string | null
          tiquetera_id?: string | null
          plan_id?: string | null
          monto?: number
          metodo?: MetodoPago
          estado?: EstadoPago
          referencia_transaccion?: string | null
          comprobante_url?: string | null
          validado_por?: string | null
          notas?: string | null
          fecha_pago?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_reserva_id_fkey'
            columns: ['reserva_id']
            isOneToOne: false
            referencedRelation: 'reservas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'planes'
            referencedColumns: ['id']
          }
        ]
      }
      movimientos_caja: {
        Row: {
          id: string
          empresa_id: string
          usuario_id: string | null
          tipo: TipoMovimiento
          concepto: string
          monto: number
          metodo: MetodoPago
          reserva_id: string | null
          pago_id: string | null
          responsable: string
          fecha: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          usuario_id?: string | null
          tipo: TipoMovimiento
          concepto: string
          monto: number
          metodo?: MetodoPago
          reserva_id?: string | null
          pago_id?: string | null
          responsable: string
          fecha?: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          usuario_id?: string | null
          tipo?: TipoMovimiento
          concepto?: string
          monto?: number
          metodo?: MetodoPago
          reserva_id?: string | null
          pago_id?: string | null
          responsable?: string
          fecha?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'movimientos_caja_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      lista_espera: {
        Row: {
          id: string
          empresa_id: string
          clase_id: string
          usuario_id: string
          estado: EstadoListaEspera
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          clase_id: string
          usuario_id: string
          estado?: EstadoListaEspera
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          clase_id?: string
          usuario_id?: string
          estado?: EstadoListaEspera
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lista_espera_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lista_espera_clase_id_fkey'
            columns: ['clase_id']
            isOneToOne: false
            referencedRelation: 'clases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lista_espera_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_reserva_segura: {
        Args: {
          p_empresa_id: string
          p_clase_id: string
          p_bicicleta_id: string
          p_cliente_id: string | null
          p_cliente_nombre: string
          p_cliente_documento: string
          p_cliente_telefono: string
          p_cliente_email?: string | null
          p_tiquetera_id?: string | null
        }
        Returns: Json
      }
      cancelar_reserva_segura: {
        Args: {
          p_reserva_id: string
          p_cliente_id?: string | null
        }
        Returns: Json
      }
      aprobar_pago_y_activar_plan: {
        Args: {
          p_pago_id: string
          p_admin_id: string
        }
        Returns: Json
      }
      inscribir_lista_espera: {
        Args: {
          p_clase_id: string
          p_usuario_id?: string | null
        }
        Returns: Json
      }
      get_auth_empresa_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      get_auth_role: {
        Args: Record<PropertyKey, never>
        Returns: RolUsuario | null
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_of_empresa: {
        Args: {
          check_empresa_id: string
        }
        Returns: boolean
      }
      is_staff_of_empresa: {
        Args: {
          check_empresa_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      rol_usuario: RolUsuario
      tipo_bicicleta: TipoBicicleta
      estado_bicicleta: EstadoBicicleta
      estado_clase: EstadoClase
      estado_tiquetera: EstadoTiquetera
      estado_reserva: EstadoReserva
      metodo_pago: MetodoPago
      estado_pago: EstadoPago
      tipo_movimiento: TipoMovimiento
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helpers para tipos de filas, inserts y updates
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Tipos específicos para la función RPC crear_reserva_segura
export type CrearReservaSeguraArgs = Database['public']['Functions']['crear_reserva_segura']['Args']

export interface CrearReservaSeguraResponse {
  success: boolean
  reserva_id?: string
  codigo_qr?: string
  bicicleta_numero?: number
  creditos_restantes?: number
  mensaje?: string
  error?: string
}

// Tipos específicos para la función RPC cancelar_reserva_segura
export type CancelarReservaSeguraArgs = Database['public']['Functions']['cancelar_reserva_segura']['Args']

export interface CancelarReservaSeguraResponse {
  success: boolean
  reserva_id?: string
  creditos_reintegrados: boolean
  nuevo_saldo?: number | null
  mensaje: string
  error?: string
  cupo_liberado?: boolean
  lista_espera_notificada?: boolean
  usuario_notificado_id?: string | null
  lista_espera_id?: string | null
}

// Tipos específicos para la función RPC aprobar_pago_y_activar_plan
export type AprobarPagoYActivarPlanArgs = Database['public']['Functions']['aprobar_pago_y_activar_plan']['Args']

export interface AprobarPagoYActivarPlanResponse {
  success: boolean
  pago_id?: string
  tiquetera_id?: string
  cliente_id?: string
  creditos_otorgados?: number
  fecha_vencimiento?: string
  mensaje: string
  error?: string
}

// Tipos específicos para la función RPC inscribir_lista_espera
export type InscribirListaEsperaArgs = Database['public']['Functions']['inscribir_lista_espera']['Args']

export interface InscribirListaEsperaResponse {
  success: boolean
  id?: string
  turno?: number
  mensaje?: string
  error?: string
}

// Helpers tipados para lista_espera
export type ListaEsperaRow = Tables<'lista_espera'>
export type ListaEsperaInsert = TablesInsert<'lista_espera'>
export type ListaEsperaUpdate = TablesUpdate<'lista_espera'>

