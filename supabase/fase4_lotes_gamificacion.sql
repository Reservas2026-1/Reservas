-- fase4_lotes_gamificacion.sql
-- Migration for gamification batch reservations and metrics
-- ------------------------------------------------------------

-- 1. Table metricas_gamificacion
CREATE TABLE IF NOT EXISTS metricas_gamificacion (
    usuario_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puntos_acumulados integer NOT NULL DEFAULT 0,
    potencia_promedio_watts double precision NOT NULL DEFAULT 0,
    ranking_clase integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookup per user
CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_usuario_id
    ON metricas_gamificacion (usuario_id);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION trg_metricas_gamificacion_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_timestamp_metricas_gamificacion ON metricas_gamificacion;
CREATE TRIGGER set_timestamp_metricas_gamificacion
    BEFORE UPDATE ON metricas_gamificacion
    FOR EACH ROW EXECUTE FUNCTION trg_metricas_gamificacion_timestamp();

-- 2. RLS policies for metricas_gamificacion (users see only their rows)
ALTER TABLE metricas_gamificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_metricas" ON metricas_gamificacion
    FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "insert_own_metricas" ON metricas_gamificacion
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "update_own_metricas" ON metricas_gamificacion
    FOR UPDATE USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

-- 3. RPC: crear_reservas_lote
-- Parameters:
--   p_class_ids uuid[]  – list of class (clase) IDs to reserve
--   p_usuario_id uuid   – the user creating the reservations (must match auth.uid())
--   p_asignar_automatica boolean DEFAULT false – if true, the system automatically picks a seat/slot

CREATE OR REPLACE FUNCTION public.crear_reservas_lote(
    p_class_ids uuid[],
    p_usuario_id uuid,
    p_asignar_automatica boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_class_id uuid;
    v_creditos_necesarios integer;
    v_creditos_actuales integer;
    v_plan_id uuid;
    v_reserva_id uuid;
    v_asiento_asignado integer;
BEGIN
    -- Ensure caller is the same user (or an admin with proper rights)
    IF auth.uid() <> p_usuario_id THEN
        RAISE EXCEPTION 'Unauthorized: auth.uid() does not match provided usuario_id';
    END IF;

    -- Lock the user's credit balance row (assuming a table usuarios_creditos exists)
    -- Adjust this to the actual schema; using usuarios_creditos(usuario_id, balance)
    SELECT balance INTO v_creditos_actuales
    FROM usuarios_creditos
    WHERE usuario_id = p_usuario_id
    FOR UPDATE;

    -- Calculate total credits needed for the batch
    SELECT SUM(c.costo_creditos) INTO v_creditos_necesarios
    FROM clases c
    WHERE c.id = ANY(p_class_ids);

    IF v_creditos_necesarios IS NULL THEN
        RAISE EXCEPTION 'No valid classes provided';
    END IF;

    IF v_creditos_actuales < v_creditos_necesarios THEN
        RAISE EXCEPTION 'Insufficient credits: have %, need %', v_creditos_actuales, v_creditos_necesarios;
    END IF;

    -- Deduct credits once for the whole batch
    UPDATE usuarios_creditos
    SET balance = balance - v_creditos_necesarios,
        updated_at = now()
    WHERE usuario_id = p_usuario_id;

    -- Iterate and create each reservation
    FOREACH v_class_id IN ARRAY p_class_ids LOOP
        -- Optional automatic seat assignment logic (simple example)
        IF p_asignar_automatica THEN
            SELECT MIN(s.numero)
            INTO v_asiento_asignado
            FROM asientos s
            LEFT JOIN reservas r ON r.asiento_id = s.id AND r.clase_id = v_class_id
            WHERE r.id IS NULL;
        END IF;

        INSERT INTO reservas (
            id,
            clase_id,
            usuario_id,
            asiento_id,
            estado,
            creado_en
        ) VALUES (
            gen_random_uuid(),
            v_class_id,
            p_usuario_id,
            CASE WHEN p_asignar_automatica THEN v_asiento_asignado ELSE NULL END,
            'pendiente',
            now()
        );
    END LOOP;
END;
$$;

-- Grant execution to authenticated role
GRANT EXECUTE ON FUNCTION public.crear_reservas_lote(uuid[], uuid, boolean) TO anon, authenticated;

-- 4. Indexes for reservation performance (if not already present)
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_id ON reservas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_clase_id ON reservas (clase_id);

-- End of fase4_lotes_gamificacion migration
