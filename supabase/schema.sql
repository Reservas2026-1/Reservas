-- ==============================================================================
-- Schema SQL para Sistema SaaS de Reservas de Bicicletas Indoor / Cycling
-- Multi-tenant (Multi-empresa / Multi-gimnasio) con Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS Y ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
        CREATE TYPE public.rol_usuario AS ENUM ('superadmin', 'admin', 'instructor', 'cliente');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_bicicleta') THEN
        CREATE TYPE public.tipo_bicicleta AS ENUM ('indoor', 'urbana', 'montaña', 'electrica', 'ruta', 'infantil');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_bicicleta') THEN
        CREATE TYPE public.estado_bicicleta AS ENUM ('disponible', 'reservada', 'mantenimiento', 'baja');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_clase') THEN
        CREATE TYPE public.estado_clase AS ENUM ('programada', 'en_curso', 'completada', 'cancelada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_tiquetera') THEN
        CREATE TYPE public.estado_tiquetera AS ENUM ('activa', 'agotada', 'vencida', 'cancelada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_reserva') THEN
        CREATE TYPE public.estado_reserva AS ENUM ('pendiente', 'confirmada', 'en_curso', 'finalizada', 'cancelada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago') THEN
        CREATE TYPE public.metodo_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'nequi', 'bancolombia', 'wompi', 'yape', 'plin', 'otro');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pago') THEN
        CREATE TYPE public.estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
        CREATE TYPE public.tipo_movimiento AS ENUM ('ingreso', 'egreso');
    END IF;
END $$;

-- 3. TABLA: EMPRESAS (SaaS Multi-tenant)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    tipo_negocio VARCHAR(100),
    ruc_o_identificacion VARCHAR(50),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion TEXT,
    logo_url TEXT,
    portada_url TEXT,
    color_primario VARCHAR(20) DEFAULT '#0f766e',
    color_secundario VARCHAR(20) DEFAULT '#0d9488',
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: PERFILES (Usuarios vinculados a auth.users con rol y multi-tenancy)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    documento VARCHAR(50),
    telefono VARCHAR(50),
    rol public.rol_usuario DEFAULT 'cliente' NOT NULL,
    avatar_url TEXT,
    codigo_qr VARCHAR(100) UNIQUE,
    fecha_nacimiento DATE,
    contacto_emergencia VARCHAR(255),
    objetivos_entrenamiento TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: PLANES (Paquetes de créditos o alquiler disponibles para compra)
CREATE TABLE IF NOT EXISTS public.planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    creditos INTEGER NOT NULL DEFAULT 1,
    dias_vigencia INTEGER NOT NULL DEFAULT 30,
    duracion_horas INTEGER DEFAULT 1,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: TIQUETERAS (Créditos activos adquiridos por los clientes)
CREATE TABLE IF NOT EXISTS public.tiqueteras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.planes(id) ON DELETE SET NULL,
    creditos_totales INTEGER NOT NULL,
    creditos_disponibles INTEGER NOT NULL,
    fecha_adquisicion TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_vencimiento TIMESTAMPTZ NOT NULL,
    estado public.estado_tiquetera DEFAULT 'activa' NOT NULL,
    premio_entregado BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: BICICLETAS (15 bicicletas por estudio / sala indoor)
CREATE TABLE IF NOT EXISTS public.bicicletas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    modelo VARCHAR(150) DEFAULT 'Stage Indoor Bike SC3' NOT NULL,
    fila INTEGER NOT NULL DEFAULT 1,
    columna INTEGER NOT NULL DEFAULT 1,
    tipo public.tipo_bicicleta DEFAULT 'indoor' NOT NULL,
    estado public.estado_bicicleta DEFAULT 'disponible' NOT NULL,
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    bateria_porcentaje INTEGER,
    tarifa_hora NUMERIC(10, 2) DEFAULT 15.00,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_bicicleta_empresa_numero UNIQUE (empresa_id, numero)
);

-- 8. TABLA: CLASES / SESIONES (Indoor Cycling)
CREATE TABLE IF NOT EXISTS public.clases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    capacidad INTEGER NOT NULL DEFAULT 15,
    estado public.estado_clase DEFAULT 'programada' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA: RESERVAS
CREATE TABLE IF NOT EXISTS public.reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    clase_id UUID REFERENCES public.clases(id) ON DELETE CASCADE,
    bicicleta_id UUID NOT NULL REFERENCES public.bicicletas(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    tiquetera_id UUID REFERENCES public.tiqueteras(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.planes(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_documento VARCHAR(50) NOT NULL,
    cliente_telefono VARCHAR(50) NOT NULL,
    cliente_email VARCHAR(255),
    fecha_reserva DATE DEFAULT CURRENT_DATE NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado public.estado_reserva DEFAULT 'confirmada' NOT NULL,
    total NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    notas TEXT,
    codigo_qr TEXT,
    asistencia_confirmada BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice de unicidad para evitar que la misma bicicleta tenga dos reservas activas en la misma clase
CREATE UNIQUE INDEX IF NOT EXISTS uq_reserva_activa_clase_bici 
ON public.reservas (clase_id, bicicleta_id) 
WHERE (clase_id IS NOT NULL AND estado != 'cancelada');

-- 10. TABLA: PAGOS
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    tiquetera_id UUID REFERENCES public.tiqueteras(id) ON DELETE SET NULL,
    monto NUMERIC(10, 2) NOT NULL,
    metodo public.metodo_pago NOT NULL,
    estado public.estado_pago DEFAULT 'pendiente' NOT NULL,
    referencia_transaccion VARCHAR(150),
    comprobante_url TEXT,
    validado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    notas TEXT,
    fecha_pago TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. TABLA: MOVIMIENTOS DE CAJA
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    tipo public.tipo_movimiento NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto NUMERIC(10, 2) NOT NULL,
    metodo public.metodo_pago DEFAULT 'efectivo' NOT NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    pago_id UUID REFERENCES public.pagos(id) ON DELETE SET NULL,
    responsable VARCHAR(150) NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. TABLA: REGLAS XP (Gamificación y Criterios de Puntos Multi-tenant)
CREATE TABLE IF NOT EXISTS public.reglas_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    criterio VARCHAR(100) NOT NULL,
    puntos_xp INTEGER NOT NULL DEFAULT 100,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABLA: MÉTRICAS DE GAMIFICACIÓN (Progreso de Usuarios, Potencia y Hábitos)
CREATE TABLE IF NOT EXISTS public.metricas_gamificacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tiquetera_id UUID REFERENCES public.tiqueteras(id) ON DELETE SET NULL,
    puntos_acumulados INTEGER NOT NULL DEFAULT 0,
    potencia_promedio_watts DOUBLE PRECISION NOT NULL DEFAULT 0,
    ranking_clase INTEGER NOT NULL DEFAULT 0,
    dias_programados INTEGER NOT NULL DEFAULT 0,
    dias_cumplidos INTEGER NOT NULL DEFAULT 0,
    bono_plan_otorgado BOOLEAN NOT NULL DEFAULT false,
    premio_entregado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TABLA: PREMIOS PLAN (Premios de Liga por Plan / Gamificación)
CREATE TABLE IF NOT EXISTS public.premios_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.planes(id) ON DELETE CASCADE,
    puesto INTEGER NOT NULL CHECK (puesto IN (1, 2, 3)),
    premio TEXT NOT NULL,
    icono TEXT DEFAULT '🏆',
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- ÍNDICES OPTIMIZADOS PARA CONSULTAS MULTI-TENANT Y REPORTES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_perfiles_empresa_rol ON public.perfiles(empresa_id, rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_codigo_qr ON public.perfiles(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_planes_empresa_activo ON public.planes(empresa_id, activo);
CREATE INDEX IF NOT EXISTS idx_bicicletas_empresa_estado ON public.bicicletas(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_bicicletas_empresa_numero ON public.bicicletas(empresa_id, numero);
CREATE INDEX IF NOT EXISTS idx_clases_empresa_fecha ON public.clases(empresa_id, fecha, hora_inicio);
CREATE INDEX IF NOT EXISTS idx_tiqueteras_cliente_vigencia ON public.tiqueteras(cliente_id, empresa_id, estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_reservas_empresa_fecha ON public.reservas(empresa_id, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservas_clase ON public.reservas(clase_id);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa_estado ON public.pagos(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_empresa_fecha ON public.movimientos_caja(empresa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reglas_xp_empresa ON public.reglas_xp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_usuario ON public.metricas_gamificacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_empresa ON public.metricas_gamificacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_premio ON public.metricas_gamificacion(empresa_id, premio_entregado);
CREATE INDEX IF NOT EXISTS idx_tiqueteras_premio ON public.tiqueteras(empresa_id, premio_entregado);
CREATE UNIQUE INDEX IF NOT EXISTS uq_premios_plan_empresa_plan_puesto ON public.premios_plan (empresa_id, plan_id, puesto) WHERE plan_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_premios_plan_empresa_global_puesto ON public.premios_plan (empresa_id, puesto) WHERE plan_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_premios_plan_empresa ON public.premios_plan (empresa_id);
CREATE INDEX IF NOT EXISTS idx_premios_plan_plan_id ON public.premios_plan (plan_id);

-- ==============================================================================
-- TRIGGER PARA SINCRONIZAR AUTH.USERS CON PUBLIC.PERFILES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_empresa_id UUID;
    v_rol public.rol_usuario;
    v_nombre VARCHAR;
    v_codigo_qr VARCHAR;
BEGIN
    v_empresa_id := NULLIF(new.raw_user_meta_data->>'empresa_id', '')::UUID;
    v_rol := COALESCE(NULLIF(new.raw_user_meta_data->>'rol', '')::public.rol_usuario, 'cliente');
    v_nombre := COALESCE(NULLIF(new.raw_user_meta_data->>'nombre_completo', ''), new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    v_codigo_qr := COALESCE(NULLIF(new.raw_user_meta_data->>'codigo_qr', ''), 'RESERLY-' || UPPER(SUBSTRING(new.id::text, 1, 8)));

    INSERT INTO public.perfiles (id, empresa_id, email, nombre_completo, documento, telefono, rol, avatar_url, codigo_qr)
    VALUES (
        new.id,
        v_empresa_id,
        new.email,
        v_nombre,
        new.raw_user_meta_data->>'documento',
        new.raw_user_meta_data->>'telefono',
        v_rol,
        new.raw_user_meta_data->>'avatar_url',
        v_codigo_qr
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nombre_completo = EXCLUDED.nombre_completo,
        codigo_qr = COALESCE(public.perfiles.codigo_qr, EXCLUDED.codigo_qr),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- FUNCIÓN RPC TRANSACCIONAL ANTI-COLISIÓN: CREAR RESERVA SEGURA
-- Garantiza atomicidad, bloqueo con FOR UPDATE y descuento de tiquetera
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.crear_reserva_segura(
    p_empresa_id UUID,
    p_clase_id UUID,
    p_bicicleta_id UUID,
    p_cliente_id UUID,
    p_cliente_nombre VARCHAR,
    p_cliente_documento VARCHAR,
    p_cliente_telefono VARCHAR,
    p_cliente_email VARCHAR DEFAULT NULL,
    p_tiquetera_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clase RECORD;
    v_bici RECORD;
    v_tiquetera RECORD;
    v_reserva_existente RECORD;
    v_fecha_inicio TIMESTAMPTZ;
    v_fecha_fin TIMESTAMPTZ;
    v_nueva_reserva_id UUID;
    v_codigo_qr TEXT;
    v_creditos_restantes INTEGER := 0;
BEGIN
    -- 1. Verificar y bloquear la clase seleccionada
    SELECT * INTO v_clase 
    FROM public.clases 
    WHERE id = p_clase_id AND empresa_id = p_empresa_id 
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La clase especificada no existe o no pertenece a la empresa.'
        );
    END IF;

    IF v_clase.estado = 'cancelada' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No es posible reservar en una clase cancelada.'
        );
    END IF;

    -- 2. Verificar y bloquear la bicicleta para evitar concurrencia
    SELECT * INTO v_bici 
    FROM public.bicicletas 
    WHERE id = p_bicicleta_id AND empresa_id = p_empresa_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La bicicleta especificada no existe en esta empresa.'
        );
    END IF;

    IF v_bici.estado = 'mantenimiento' OR v_bici.estado = 'baja' OR v_bici.activo = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La bicicleta seleccionada no está disponible (mantenimiento o inactiva).'
        );
    END IF;

    -- 3. Verificar si la bicicleta ya está reservada para esta misma clase (Anti-colisión)
    SELECT id INTO v_reserva_existente 
    FROM public.reservas 
    WHERE clase_id = p_clase_id 
      AND bicicleta_id = p_bicicleta_id 
      AND estado != 'cancelada'
    FOR UPDATE;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La bicicleta #' || v_bici.numero || ' ya ha sido reservada por otro usuario para esta sesión.'
        );
    END IF;

    -- 4. Validar y descontar tiquetera si se requiere consumo de crédito
    IF p_cliente_id IS NOT NULL THEN
        IF p_tiquetera_id IS NOT NULL THEN
            SELECT * INTO v_tiquetera
            FROM public.tiqueteras
            WHERE id = p_tiquetera_id 
              AND cliente_id = p_cliente_id 
              AND empresa_id = p_empresa_id
            FOR UPDATE;
        ELSE
            -- Buscar tiquetera activa más próxima a vencer con créditos disponibles
            SELECT * INTO v_tiquetera
            FROM public.tiqueteras
            WHERE cliente_id = p_cliente_id 
              AND empresa_id = p_empresa_id
              AND estado = 'activa'
              AND creditos_disponibles > 0
              AND fecha_vencimiento >= CURRENT_DATE
            ORDER BY fecha_vencimiento ASC
            LIMIT 1
            FOR UPDATE;
        END IF;

        IF v_tiquetera.id IS NOT NULL THEN
            IF v_tiquetera.creditos_disponibles <= 0 OR v_tiquetera.fecha_vencimiento < CURRENT_DATE THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'La tiquetera no cuenta con créditos suficientes o ha vencido.'
                );
            END IF;

            -- Descontar crédito atómicamente
            v_creditos_restantes := v_tiquetera.creditos_disponibles - 1;

            UPDATE public.tiqueteras
            SET creditos_disponibles = v_creditos_restantes,
                estado = CASE WHEN v_creditos_restantes = 0 THEN 'agotada'::public.estado_tiquetera ELSE 'activa'::public.estado_tiquetera END,
                updated_at = NOW()
            WHERE id = v_tiquetera.id;
        END IF;
    END IF;

    -- 5. Calcular marcas de tiempo de inicio y fin
    v_fecha_inicio := (v_clase.fecha || ' ' || v_clase.hora_inicio)::TIMESTAMPTZ;
    v_fecha_fin := (v_clase.fecha || ' ' || v_clase.hora_fin)::TIMESTAMPTZ;
    v_codigo_qr := 'RES-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)) || '-' || v_bici.numero;

    -- 6. Insertar la reserva
    INSERT INTO public.reservas (
        empresa_id,
        clase_id,
        bicicleta_id,
        cliente_id,
        tiquetera_id,
        cliente_nombre,
        cliente_documento,
        cliente_telefono,
        cliente_email,
        fecha_reserva,
        fecha_inicio,
        fecha_fin,
        estado,
        total,
        codigo_qr
    ) VALUES (
        p_empresa_id,
        p_clase_id,
        p_bicicleta_id,
        p_cliente_id,
        v_tiquetera.id,
        p_cliente_nombre,
        p_cliente_documento,
        p_cliente_telefono,
        p_cliente_email,
        v_clase.fecha,
        v_fecha_inicio,
        v_fecha_fin,
        'confirmada',
        0.00,
        v_codigo_qr
    ) RETURNING id INTO v_nueva_reserva_id;

    RETURN jsonb_build_object(
        'success', true,
        'reserva_id', v_nueva_reserva_id,
        'codigo_qr', v_codigo_qr,
        'bicicleta_numero', v_bici.numero,
        'creditos_restantes', v_creditos_restantes,
        'mensaje', 'Reserva confirmada con éxito para la bicicleta #' || v_bici.numero
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conflicto de concurrencia: la bicicleta fue reservada en este instante.'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Error en la transacción: ' || SQLERRM
        );
END;
$$;
