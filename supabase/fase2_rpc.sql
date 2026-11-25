-- ==============================================================================
-- FASE 2: RPC TRANSACCIONALES, MÓDULO DE PAGOS Y SUPABASE STORAGE
-- Reservas-Trabajo-Conjunto (SaaS Multi-tenant Indoor Cycling)
-- ==============================================================================

-- 0. EXTENSIÓN Y MIGRACIÓN DEL ESQUEMA
-- Agregar columna plan_id a la tabla pagos si no existe para vincular compras directas de planes
ALTER TABLE public.pagos 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.planes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_plan_id ON public.pagos(plan_id);


-- ==============================================================================
-- 1. FUNCIÓN RPC: CANCELAR RESERVA SEGURA
-- Atomicidad, concurrencia (FOR UPDATE), política de cancelación y reintegro
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
    -- Permitir si:
    --   - p_cliente_id coincide con el cliente de la reserva
    --   - o el usuario autenticado es staff/admin de la empresa
    --   - o el usuario autenticado es el titular de la reserva
    --   - o es superadmin
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

    RETURN jsonb_build_object(
        'success', true,
        'reserva_id', p_reserva_id,
        'creditos_reintegrados', v_reintegra,
        'mensaje', v_mensaje,
        'nuevo_saldo', v_nuevo_saldo
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
-- 2. FUNCIÓN RPC: APROBAR PAGO Y ACTIVAR PLAN / TIQUETERA
-- Atomicidad, conciliación de caja, activación de créditos multi-tenant
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.aprobar_pago_y_activar_plan(
    p_pago_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pago RECORD;
    v_reserva RECORD;
    v_plan RECORD;
    v_admin RECORD;
    v_plan_id UUID;
    v_cliente_id UUID;
    v_tiquetera_id UUID;
    v_admin_nombre VARCHAR(150);
    v_nuevo_saldo INTEGER;
    v_fecha_vencimiento TIMESTAMPTZ;
BEGIN
    -- 1. Bloquear y validar el pago
    SELECT * INTO v_pago
    FROM public.pagos
    WHERE id = p_pago_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El registro de pago no existe.',
            'mensaje', 'Pago no encontrado'
        );
    END IF;

    IF v_pago.estado = 'aprobado' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El pago ya se encuentra en estado aprobado.',
            'mensaje', 'Este pago ya fue validado previamente'
        );
    END IF;

    -- 2. Validar perfil y permisos del administrador
    SELECT * INTO v_admin
    FROM public.perfiles
    WHERE id = p_admin_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El identificador del administrador no es válido.',
            'mensaje', 'Usuario administrador no registrado'
        );
    END IF;

    IF NOT (public.is_admin_of_empresa(v_pago.empresa_id) OR public.is_superadmin() OR v_admin.rol IN ('admin', 'superadmin')) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No tiene permisos de administrador para validar pagos en esta empresa.',
            'mensaje', 'Permiso denegado'
        );
    END IF;

    v_admin_nombre := COALESCE(v_admin.nombre_completo, 'Administrador');

    -- 3. Identificar el cliente asignado
    v_cliente_id := v_pago.cliente_id;

    IF v_cliente_id IS NULL AND v_pago.reserva_id IS NOT NULL THEN
        SELECT cliente_id INTO v_cliente_id
        FROM public.reservas
        WHERE id = v_pago.reserva_id;
    END IF;

    IF v_cliente_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se puede asociar una tiquetera porque el pago no cuenta con cliente identificado.',
            'mensaje', 'Cliente no identificado en el pago'
        );
    END IF;

    -- 4. Determinar el plan asociado (desde pagos.plan_id, reservas.plan_id o tiqueteras.plan_id)
    v_plan_id := v_pago.plan_id;

    IF v_plan_id IS NULL AND v_pago.reserva_id IS NOT NULL THEN
        SELECT plan_id INTO v_plan_id
        FROM public.reservas
        WHERE id = v_pago.reserva_id;
    END IF;

    IF v_plan_id IS NULL AND v_pago.tiquetera_id IS NOT NULL THEN
        SELECT plan_id INTO v_plan_id
        FROM public.tiqueteras
        WHERE id = v_pago.tiquetera_id;
    END IF;

    -- Fallback: Buscar plan activo con el monto exacto en la misma empresa si no fue especificado
    IF v_plan_id IS NULL THEN
        SELECT id INTO v_plan_id
        FROM public.planes
        WHERE empresa_id = v_pago.empresa_id
          AND precio = v_pago.monto
          AND activo = true
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_plan_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se encontró un plan correspondiente para asignar los créditos.',
            'mensaje', 'Plan de créditos no especificado o inexistente'
        );
    END IF;

    -- 5. Obtener los detalles del plan
    SELECT * INTO v_plan
    FROM public.planes
    WHERE id = v_plan_id AND empresa_id = v_pago.empresa_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El plan especificado no pertenece a la empresa correspondiente.',
            'mensaje', 'Plan no válido para esta empresa'
        );
    END IF;

    -- 6. Crear o activar la tiquetera
    v_fecha_vencimiento := CURRENT_DATE + (v_plan.dias_vigencia || ' days')::INTERVAL;
    v_tiquetera_id := v_pago.tiquetera_id;

    IF v_tiquetera_id IS NOT NULL THEN
        -- Si ya tenía una tiquetera preasignada (en espera de pago), la activamos
        UPDATE public.tiqueteras
        SET creditos_totales = v_plan.creditos,
            creditos_disponibles = v_plan.creditos,
            fecha_adquisicion = NOW(),
            fecha_vencimiento = v_fecha_vencimiento,
            estado = 'activa',
            updated_at = NOW()
        WHERE id = v_tiquetera_id;
    ELSE
        -- Insertar nueva tiquetera para el cliente
        INSERT INTO public.tiqueteras (
            empresa_id,
            cliente_id,
            plan_id,
            creditos_totales,
            creditos_disponibles,
            fecha_adquisicion,
            fecha_vencimiento,
            estado
        ) VALUES (
            v_pago.empresa_id,
            v_cliente_id,
            v_plan.id,
            v_plan.creditos,
            v_plan.creditos,
            NOW(),
            v_fecha_vencimiento,
            'activa'
        ) RETURNING id INTO v_tiquetera_id;
    END IF;

    -- 7. Actualizar el pago a 'aprobado'
    UPDATE public.pagos
    SET estado = 'aprobado',
        validado_por = p_admin_id,
        fecha_pago = NOW(),
        tiquetera_id = v_tiquetera_id,
        plan_id = v_plan.id
    WHERE id = p_pago_id;

    -- 8. Si había reserva ligada, vincular la tiquetera y confirmar si estaba pendiente
    IF v_pago.reserva_id IS NOT NULL THEN
        UPDATE public.reservas
        SET tiquetera_id = COALESCE(tiquetera_id, v_tiquetera_id),
            plan_id = COALESCE(plan_id, v_plan.id),
            estado = CASE WHEN estado = 'pendiente' THEN 'confirmada'::public.estado_reserva ELSE estado END,
            updated_at = NOW()
        WHERE id = v_pago.reserva_id;
    END IF;

    -- 9. Registrar el movimiento en movimientos_caja (Auditoría contable)
    INSERT INTO public.movimientos_caja (
        empresa_id,
        usuario_id,
        tipo,
        concepto,
        monto,
        metodo,
        reserva_id,
        pago_id,
        responsable,
        fecha
    ) VALUES (
        v_pago.empresa_id,
        p_admin_id,
        'ingreso',
        'Pago aprobado - Plan: ' || v_plan.nombre,
        v_pago.monto,
        v_pago.metodo,
        v_pago.reserva_id,
        p_pago_id,
        v_admin_nombre,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'pago_id', p_pago_id,
        'tiquetera_id', v_tiquetera_id,
        'cliente_id', v_cliente_id,
        'creditos_otorgados', v_plan.creditos,
        'fecha_vencimiento', v_fecha_vencimiento,
        'mensaje', 'Pago aprobado exitosamente y ' || v_plan.creditos || ' créditos activados.'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Error al procesar la aprobación del pago: ' || SQLERRM,
            'mensaje', 'Ocurrió un error inesperado al aprobar el pago.'
        );
END;
$$;


-- ==============================================================================
-- 3. BUCKET DE SUPABASE STORAGE Y POLÍTICAS RLS PARA COMPROBANTES
-- Almacenamiento seguro de comprobantes (Nequi, Bancolombia, etc.)
-- ==============================================================================

-- A. Crear el bucket 'comprobantes' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'comprobantes',
    'comprobantes',
    false, -- Privado: requiere RLS para descarga y lectura
    5242880, -- 5 Megabytes límite por comprobante
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- B. Asegurar RLS habilitado en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- C. Políticas RLS para storage.objects en el bucket 'comprobantes'

-- Inserción / Carga de comprobantes:
-- Clientes autenticados pueden subir archivos a comprobantes/<empresa_id>/...
DROP POLICY IF EXISTS "Clientes y administradores suben comprobantes" ON storage.objects;
CREATE POLICY "Clientes y administradores suben comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'comprobantes'
    AND (
        -- Subir dentro de la carpeta de la empresa del usuario
        (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfiles WHERE id = auth.uid())
        OR public.is_superadmin()
        OR public.is_staff_of_empresa(
            CASE 
                WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' 
                THEN ((storage.foldername(name))[1])::uuid 
                ELSE NULL 
            END
        )
    )
);

-- Lectura / Descarga de comprobantes:
-- El cliente propietario (owner) o los administradores de la misma empresa o superadmin
DROP POLICY IF EXISTS "Lectura de comprobantes por titular o admin" ON storage.objects;
CREATE POLICY "Lectura de comprobantes por titular o admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'comprobantes'
    AND (
        auth.uid() = owner
        OR public.is_superadmin()
        OR public.is_admin_of_empresa(
            CASE 
                WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' 
                THEN ((storage.foldername(name))[1])::uuid 
                ELSE NULL 
            END
        )
    )
);

-- Modificación de comprobantes:
DROP POLICY IF EXISTS "Edición de comprobantes por titular o admin" ON storage.objects;
CREATE POLICY "Edición de comprobantes por titular o admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'comprobantes'
    AND (
        auth.uid() = owner
        OR public.is_superadmin()
        OR public.is_admin_of_empresa(
            CASE 
                WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' 
                THEN ((storage.foldername(name))[1])::uuid 
                ELSE NULL 
            END
        )
    )
);

-- Eliminación de comprobantes:
DROP POLICY IF EXISTS "Eliminación de comprobantes solo admin de empresa" ON storage.objects;
CREATE POLICY "Eliminación de comprobantes solo admin de empresa"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'comprobantes'
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
