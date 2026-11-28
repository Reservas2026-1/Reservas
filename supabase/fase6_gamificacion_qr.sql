-- ==============================================================================
-- FASE 6: GAMIFICACIÓN (REGLAS XP, MÉTRICAS AVANZADAS) Y CÓDIGOS QR DE PERFILES
-- Migración idempotente para PostgreSQL / Supabase
-- ==============================================================================

-- 1. CAMPO codigo_qr EN TABLA public.perfiles
ALTER TABLE public.perfiles 
    ADD COLUMN IF NOT EXISTS codigo_qr VARCHAR(100) UNIQUE;

-- Backfill idempotente: autogenerar codigo_qr si existen registros con NULL
UPDATE public.perfiles 
SET codigo_qr = 'RESERLY-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE codigo_qr IS NULL;

-- Índice para búsqueda eficiente por QR de usuario
CREATE INDEX IF NOT EXISTS idx_perfiles_codigo_qr 
    ON public.perfiles(codigo_qr);

-- 2. TRIGGER public.handle_new_user() ACTUALIZADO
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

-- 3. TABLA: public.reglas_xp
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

CREATE INDEX IF NOT EXISTS idx_reglas_xp_empresa 
    ON public.reglas_xp(empresa_id);

-- 4. TABLA: public.metricas_gamificacion
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migraciones idempotentes sobre metricas_gamificacion si la tabla ya existía
ALTER TABLE public.metricas_gamificacion 
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();

ALTER TABLE public.metricas_gamificacion 
    ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.metricas_gamificacion 
    ADD COLUMN IF NOT EXISTS tiquetera_id UUID REFERENCES public.tiqueteras(id) ON DELETE SET NULL;

ALTER TABLE public.metricas_gamificacion 
    ADD COLUMN IF NOT EXISTS dias_programados INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.metricas_gamificacion 
    ADD COLUMN IF NOT EXISTS dias_cumplidos INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.metricas_gamificacion 
    ADD COLUMN IF NOT EXISTS bono_plan_otorgado BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_usuario 
    ON public.metricas_gamificacion(usuario_id);

CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_empresa 
    ON public.metricas_gamificacion(empresa_id);

-- 5. SEGURIDAD: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.reglas_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_gamificacion ENABLE ROW LEVEL SECURITY;

-- Políticas para public.reglas_xp
DROP POLICY IF EXISTS "Lectura de reglas xp activas o por tenant" ON public.reglas_xp;
CREATE POLICY "Lectura de reglas xp activas o por tenant" 
ON public.reglas_xp FOR SELECT 
USING (activo = true OR public.is_admin_of_empresa(empresa_id) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admin de empresa gestiona reglas_xp (INSERT)" ON public.reglas_xp;
CREATE POLICY "Admin de empresa gestiona reglas_xp (INSERT)" 
ON public.reglas_xp FOR INSERT 
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona reglas_xp (UPDATE)" ON public.reglas_xp;
CREATE POLICY "Admin de empresa gestiona reglas_xp (UPDATE)" 
ON public.reglas_xp FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona reglas_xp (DELETE)" ON public.reglas_xp;
CREATE POLICY "Admin de empresa gestiona reglas_xp (DELETE)" 
ON public.reglas_xp FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- Políticas para public.metricas_gamificacion
DROP POLICY IF EXISTS "Ver métricas propias o staff de empresa" ON public.metricas_gamificacion;
CREATE POLICY "Ver métricas propias o staff de empresa" 
ON public.metricas_gamificacion FOR SELECT 
USING (
    usuario_id = auth.uid() 
    OR (empresa_id IS NOT NULL AND public.is_staff_of_empresa(empresa_id))
    OR public.is_superadmin()
);

DROP POLICY IF EXISTS "Insertar métricas propias o staff de empresa" ON public.metricas_gamificacion;
CREATE POLICY "Insertar métricas propias o staff de empresa" 
ON public.metricas_gamificacion FOR INSERT 
WITH CHECK (
    usuario_id = auth.uid() 
    OR (empresa_id IS NOT NULL AND public.is_staff_of_empresa(empresa_id))
    OR public.is_superadmin()
);

DROP POLICY IF EXISTS "Actualizar métricas propias o staff de empresa" ON public.metricas_gamificacion;
CREATE POLICY "Actualizar métricas propias o staff de empresa" 
ON public.metricas_gamificacion FOR UPDATE 
USING (
    usuario_id = auth.uid() 
    OR (empresa_id IS NOT NULL AND public.is_staff_of_empresa(empresa_id))
    OR public.is_superadmin()
)
WITH CHECK (
    usuario_id = auth.uid() 
    OR (empresa_id IS NOT NULL AND public.is_staff_of_empresa(empresa_id))
    OR public.is_superadmin()
);

DROP POLICY IF EXISTS "Eliminar métricas admin de empresa" ON public.metricas_gamificacion;
CREATE POLICY "Eliminar métricas admin de empresa" 
ON public.metricas_gamificacion FOR DELETE 
USING (
    (empresa_id IS NOT NULL AND public.is_admin_of_empresa(empresa_id))
    OR public.is_superadmin()
);

-- 6. PERMISOS DE TABLA PARA ROLES
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reglas_xp TO authenticated;
GRANT SELECT ON public.reglas_xp TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metricas_gamificacion TO authenticated;
GRANT SELECT ON public.metricas_gamificacion TO anon;
