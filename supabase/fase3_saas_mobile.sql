-- ==============================================================================
-- FASE 3: MARCA BLANCA SAAS, LISTA DE ESPERA Y ALMACENAMIENTO DE LOGOS
-- Reservas-Trabajo-Conjunto (Indoor Cycling & Studio Multi-tenant)
-- ==============================================================================

-- ==============================================================================
-- 1. SOPORTE DE MARCA BLANCA EN EMPRESAS
-- Asegura columnas de identidad visual, personalización y capacidad de sala
-- ==============================================================================

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS color_primario VARCHAR(20) DEFAULT '#DC2626';

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS capacidad_sala INTEGER DEFAULT 15;

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Garantizar valor por defecto de marca blanca (#DC2626 - Rojo dinámico)
ALTER TABLE public.empresas 
ALTER COLUMN color_primario SET DEFAULT '#DC2626';

CREATE INDEX IF NOT EXISTS idx_empresas_slug ON public.empresas(slug);


-- ==============================================================================
-- 2. TABLA: LISTA DE ESPERA (Waitlist para clases con cupos agotados)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.lista_espera (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'esperando' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_lista_espera_estado CHECK (estado IN ('esperando', 'notificado', 'asignado'))
);

-- Índices optimizados para consulta cronológica de turnos y filtrado por clase
CREATE INDEX IF NOT EXISTS idx_lista_espera_clase_estado_fecha 
ON public.lista_espera(clase_id, estado, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_lista_espera_usuario 
ON public.lista_espera(usuario_id);

CREATE INDEX IF NOT EXISTS idx_lista_espera_empresa 
ON public.lista_espera(empresa_id);

-- Restricción de unicidad: un usuario solo puede estar una vez en la lista de espera
-- de una misma clase mientras su estado esté 'esperando' o 'notificado'
CREATE UNIQUE INDEX IF NOT EXISTS uq_lista_espera_activa 
ON public.lista_espera (clase_id, usuario_id) 
WHERE estado IN ('esperando', 'notificado');


-- ==============================================================================
-- 3. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS) PARA LISTA DE ESPERA
-- ==============================================================================

ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;

-- Lectura: clientes pueden ver sus propios turnos; instructores y admins de la empresa ven la lista completa
DROP POLICY IF EXISTS "Lectura de lista de espera por usuario o admin" ON public.lista_espera;
CREATE POLICY "Lectura de lista de espera por usuario o admin"
ON public.lista_espera FOR SELECT
TO authenticated
USING (
    usuario_id = auth.uid()
    OR public.is_staff_of_empresa(empresa_id)
    OR public.is_superadmin()
);

-- Inserción: clientes pueden inscribirse a sí mismos en la lista de espera de su empresa
DROP POLICY IF EXISTS "Inscripción en lista de espera" ON public.lista_espera;
CREATE POLICY "Inscripción en lista de espera"
ON public.lista_espera FOR INSERT
TO authenticated
WITH CHECK (
    (
        usuario_id = auth.uid() 
        AND (
            empresa_id = public.get_auth_empresa_id() 
            OR EXISTS (SELECT 1 FROM public.clases c WHERE c.id = clase_id AND c.empresa_id = empresa_id)
        )
    )
    OR public.is_staff_of_empresa(empresa_id)
    OR public.is_superadmin()
);

-- Actualización: clientes pueden cancelar su registro; staff/admin pueden gestionar turnos y transiciones
DROP POLICY IF EXISTS "Actualización de lista de espera" ON public.lista_espera;
CREATE POLICY "Actualización de lista de espera"
ON public.lista_espera FOR UPDATE
TO authenticated
USING (
    usuario_id = auth.uid()
    OR public.is_staff_of_empresa(empresa_id)
    OR public.is_superadmin()
)
WITH CHECK (
    usuario_id = auth.uid()
    OR public.is_staff_of_empresa(empresa_id)
    OR public.is_superadmin()
);

-- Eliminación: clientes pueden salir de la lista de espera o administradores depurar
DROP POLICY IF EXISTS "Eliminación de lista de espera" ON public.lista_espera;
CREATE POLICY "Eliminación de lista de espera"
ON public.lista_espera FOR DELETE
TO authenticated
USING (
    usuario_id = auth.uid()
    OR public.is_staff_of_empresa(empresa_id)
    OR public.is_superadmin()
);


-- ==============================================================================
-- 4. ACTUALIZACIÓN DE CANCELAR_RESERVA_SEGURA CON GESTIÓN DE LISTA DE ESPERA
-- Al cancelarse una reserva de clase, notifica de forma atómica al primer usuario en espera
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cancelar_reserva_segura(
    p_reserva_id UUID,
    p_cliente_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reserva RECORD;
    v_tiquetera RECORD;
    v_tiempo_restante INTERVAL;
    v_reintegra BOOLEAN := false;
    v_nuevo_saldo INTEGER := NULL;
    v_mensaje TEXT;
    v_auth_user UUID;
    v_siguiente_en_espera RECORD;
    v_usuario_notificado_id UUID := NULL;
    v_lista_espera_id UUID := NULL;
BEGIN
    v_auth_user := auth.uid();

    -- 1. Bloquear y obtener la reserva
    SELECT * INTO v_reserva
    FROM public.reservas
    WHERE id = p_reserva_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'creditos_reintegrados', false,
            'error', 'La reserva especificada no existe.',
            'mensaje', 'Reserva no encontrada'
        );
    END IF;

    -- 2. Validaciones de estado previo
    IF v_reserva.estado = 'cancelada' THEN
        RETURN jsonb_build_object(
            'success', false,
            'creditos_reintegrados', false,
            'error', 'La reserva ya se encuentra cancelada.',
            'mensaje', 'Esta reserva ya había sido cancelada previamente'
        );
    END IF;

    IF v_reserva.estado = 'finalizada' THEN
        RETURN jsonb_build_object(
            'success', false,
            'creditos_reintegrados', false,
            'error', 'No se puede cancelar una sesión o reserva que ya ha finalizado.',
            'mensaje', 'La clase o reserva ya concluyó'
        );
    END IF;

    -- 3. Validación de permisos
    IF p_cliente_id IS NOT NULL AND v_reserva.cliente_id IS NOT NULL AND v_reserva.cliente_id != p_cliente_id THEN
        IF NOT (
            public.is_staff_of_empresa(v_reserva.empresa_id) 
            OR public.is_superadmin() 
            OR (v_auth_user IS NOT NULL AND v_auth_user = v_reserva.cliente_id)
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'creditos_reintegrados', false,
                'error', 'No tiene permisos suficientes para cancelar esta reserva.',
                'mensaje', 'Permiso denegado'
            );
        END IF;
    END IF;

    -- 4. Evaluar regla de negocio: reintegro de créditos solo con > 2 horas de anticipación
    v_tiempo_restante := v_reserva.fecha_inicio - NOW();

    IF v_reserva.tiquetera_id IS NOT NULL THEN
        -- Bloquear la tiquetera vinculada para evitar carreras en el saldo
        SELECT * INTO v_tiquetera
        FROM public.tiqueteras
        WHERE id = v_reserva.tiquetera_id
        FOR UPDATE;

        IF FOUND THEN
            IF v_tiempo_restante > INTERVAL '2 hours' THEN
                -- Reintegro procedente: devolver 1 crédito
                v_reintegra := true;
                v_nuevo_saldo := v_tiquetera.creditos_disponibles + 1;

                UPDATE public.tiqueteras
                SET creditos_disponibles = v_nuevo_saldo,
                    estado = CASE 
                        WHEN estado = 'agotada' THEN 'activa'::public.estado_tiquetera 
                        ELSE estado 
                    END,
                    updated_at = NOW()
                WHERE id = v_tiquetera.id;

                v_mensaje := 'Reserva cancelada exitosamente. Se ha reintegrado 1 crédito a tu tiquetera (Saldo: ' || v_nuevo_saldo || ').';
            ELSE
                -- Menos de 2 horas o clase pasada: cancelación sin reintegro
                v_reintegra := false;
                v_nuevo_saldo := v_tiquetera.creditos_disponibles;
                v_mensaje := 'Reserva cancelada sin reintegro de crédito. La política exige cancelar con al menos 2 horas de anticipación.';
            END IF;
        ELSE
            v_mensaje := 'Reserva cancelada exitosamente.';
        END IF;
    ELSE
        -- Reserva sin tiquetera vinculada (pago por sesión o express)
        v_mensaje := 'Reserva cancelada exitosamente.';
    END IF;

    -- 5. Cambiar el estado de la reserva a 'cancelada'
    UPDATE public.reservas
    SET estado = 'cancelada',
        updated_at = NOW()
    WHERE id = p_reserva_id;

    -- 6. Liberación de cupo y notificación de lista de espera
    -- Si la reserva cancelada correspondía a una clase específica, verificar si hay interesados en espera
    IF v_reserva.clase_id IS NOT NULL THEN
        SELECT * INTO v_siguiente_en_espera
        FROM public.lista_espera
        WHERE clase_id = v_reserva.clase_id
          AND estado = 'esperando'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF FOUND THEN
            UPDATE public.lista_espera
            SET estado = 'notificado'
            WHERE id = v_siguiente_en_espera.id;

            v_usuario_notificado_id := v_siguiente_en_espera.usuario_id;
            v_lista_espera_id := v_siguiente_en_espera.id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reserva_id', p_reserva_id,
        'creditos_reintegrados', v_reintegra,
        'mensaje', v_mensaje,
        'nuevo_saldo', v_nuevo_saldo,
        'cupo_liberado', true,
        'lista_espera_notificada', (v_usuario_notificado_id IS NOT NULL),
        'usuario_notificado_id', v_usuario_notificado_id,
        'lista_espera_id', v_lista_espera_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'creditos_reintegrados', false,
            'error', 'Error en la transacción de cancelación: ' || SQLERRM,
            'mensaje', 'Ocurrió un error inesperado al procesar la cancelación.'
        );
END;
$$;


-- ==============================================================================
-- 5. CONFIGURACIÓN DEL BUCKET SUPABASE STORAGE: 'logos-empresas'
-- Bucket público para identidades de marca blanca (PNG, JPG, WEBP, SVG max 2MB)
-- ==============================================================================

-- A. Crear bucket público si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos-empresas',
    'logos-empresas',
    true, -- Acceso público para renderizado en clientes web y móvil
    2097152, -- 2 Megabytes límite por logo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- B. Políticas RLS para storage.objects en bucket 'logos-empresas'

-- 1. Lectura pública para cualquier usuario (anónimo o autenticado)
DROP POLICY IF EXISTS "Lectura pública de logos de empresas" ON storage.objects;
CREATE POLICY "Lectura pública de logos de empresas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos-empresas');

-- 2. Inserción: Administradores de la empresa o superadmin
-- Los archivos se organizan por carpeta: logos-empresas/<empresa_id>/logo.png
DROP POLICY IF EXISTS "Administradores suben logo de su empresa" ON storage.objects;
CREATE POLICY "Administradores suben logo de su empresa"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'logos-empresas'
    AND (
        public.is_superadmin()
        OR public.is_admin_of_empresa(
            CASE 
                WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' 
                THEN ((storage.foldername(name))[1])::uuid 
                ELSE NULL 
            END
        )
        OR (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfiles WHERE id = auth.uid())
    )
);

-- 3. Edición / Reemplazo de logo
DROP POLICY IF EXISTS "Administradores editan logo de su empresa" ON storage.objects;
CREATE POLICY "Administradores editan logo de su empresa"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'logos-empresas'
    AND (
        public.is_superadmin()
        OR public.is_admin_of_empresa(
            CASE 
                WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' 
                THEN ((storage.foldername(name))[1])::uuid 
                ELSE NULL 
            END
        )
    )
);

-- 4. Eliminación de logo
DROP POLICY IF EXISTS "Administradores eliminan logo de su empresa" ON storage.objects;
CREATE POLICY "Administradores eliminan logo de su empresa"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'logos-empresas'
    AND (
        public.is_superadmin()
        OR public.is_admin_of_empresa(
            CASE 
                WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' 
                THEN ((storage.foldername(name))[1])::uuid 
                ELSE NULL 
            END
        )
    )
);


-- ==============================================================================
-- 6. RPC AUXILIAR: INSCRIBIRSE EN LISTA DE ESPERA
-- Operación atómica con validación de reservas previas y cálculo de posición
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.inscribir_lista_espera(
    p_clase_id UUID,
    p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id UUID;
    v_clase RECORD;
    v_turno INTEGER;
    v_nuevo_id UUID;
BEGIN
    v_usuario_id := COALESCE(p_usuario_id, auth.uid());
    IF v_usuario_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuario no identificado');
    END IF;

    SELECT * INTO v_clase FROM public.clases WHERE id = p_clase_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'La clase no existe');
    END IF;

    -- Verificar si ya tiene una reserva activa para esta clase
    IF EXISTS (
        SELECT 1 FROM public.reservas 
        WHERE clase_id = p_clase_id 
          AND cliente_id = v_usuario_id 
          AND estado != 'cancelada'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ya tienes una bicicleta reservada en esta clase');
    END IF;

    -- Verificar si ya está en lista de espera activa
    IF EXISTS (
        SELECT 1 FROM public.lista_espera 
        WHERE clase_id = p_clase_id 
          AND usuario_id = v_usuario_id 
          AND estado IN ('esperando', 'notificado')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ya te encuentras registrado en la lista de espera para esta clase');
    END IF;

    -- Insertar en la lista de espera
    INSERT INTO public.lista_espera (empresa_id, clase_id, usuario_id, estado)
    VALUES (v_clase.empresa_id, p_clase_id, v_usuario_id, 'esperando')
    RETURNING id INTO v_nuevo_id;

    -- Calcular turno en la cola
    SELECT COUNT(*) INTO v_turno 
    FROM public.lista_espera 
    WHERE clase_id = p_clase_id AND estado IN ('esperando', 'notificado');

    RETURN jsonb_build_object(
        'success', true,
        'id', v_nuevo_id,
        'turno', v_turno,
        'mensaje', 'Inscrito exitosamente en la lista de espera (Posición #' || v_turno || ').'
    );
END;
$$;

