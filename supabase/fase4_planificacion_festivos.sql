-- fase4_planificacion_festivos.sql
-- ------------------------------------------------------------
-- 1. Tabla horarios_base: plantillas de horarios recurrentes por empresa
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios_base (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Monday … 6=Sunday
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para búsquedas rápidas por empresa y día de la semana
CREATE INDEX IF NOT EXISTS idx_horarios_base_empresa_dia ON horarios_base (empresa_id, dia_semana);

-- ------------------------------------------------------------
-- 2. Tabla planificaciones: horarios generados en batch a partir de horarios_base
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planificaciones (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    horario_base_id  UUID NOT NULL REFERENCES horarios_base(id) ON DELETE CASCADE,
    fecha            DATE NOT NULL,
    es_clase_especial BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (empresa_id, fecha, horario_base_id)
);

-- Índice para consultas por fecha y empresa
CREATE INDEX IF NOT EXISTS idx_planificaciones_empresa_fecha ON planificaciones (empresa_id, fecha);

-- ------------------------------------------------------------
-- 3. Alteración de la tabla clases – marca de clase especial (domingo / festivo)
-- ------------------------------------------------------------
ALTER TABLE clases
ADD COLUMN IF NOT EXISTS es_clase_especial BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 4. Función RPC: calcular fecha de vencimiento de un plan de suscripción
--    - Sólo cuenta días hábiles (Lunes‑Sábado)
--    - Excluye domingos y festivos colombianos (tabla festivos)
-- ------------------------------------------------------------
-- Se asume la existencia de:
--   * tabla planes (id UUID PK, duracion_dias INTEGER)
--   * tabla festivos (fecha DATE PK) – contiene los festivos nacionales de Colombia
--
-- La función recibe el UUID del plan y la fecha de inicio y devuelve la fecha de vencimiento.
--
CREATE OR REPLACE FUNCTION public.calcular_fecha_vencimiento(
    p_plan_id   UUID,
    p_fecha_inicio DATE
) RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_duracion INTEGER;           -- número total de días a contar (incluye fines de semana)
    v_contador INTEGER := 0;       -- días hábiles contabilizados
    v_fecha    DATE := p_fecha_inicio;
BEGIN
    -- Obtener duración del plan (en días calendario)
    SELECT duracion_dias INTO v_duracion FROM planes WHERE id = p_plan_id;
    IF v_duracion IS NULL THEN
        RAISE EXCEPTION 'Plan % no encontrado o sin duración definida', p_plan_id;
    END IF;

    -- Avanzar día a día hasta completar v_duracion días hábiles
    WHILE v_contador < v_duracion LOOP
        v_fecha := v_fecha + INTERVAL '1 day';
        -- Verificar si es domingo (dow = 0 en PostgreSQL) o festivo
        IF EXTRACT(DOW FROM v_fecha) = 0 THEN
            CONTINUE; -- domingo, no cuenta
        END IF;
        IF EXISTS (SELECT 1 FROM festivos WHERE fecha = v_fecha) THEN
            CONTINUE; -- festivo, no cuenta
        END IF;
        -- Día hábil encontrado
        v_contador := v_contador + 1;
    END LOOP;

    RETURN v_fecha;
END;
$$;

-- Permitir que el cliente RPC invoque la función
GRANT EXECUTE ON FUNCTION public.calcular_fecha_vencimiento(UUID, DATE) TO anon, authenticated;

-- ------------------------------------------------------------
-- Fin del script fase4_planificacion_festivos.sql
-- ------------------------------------------------------------