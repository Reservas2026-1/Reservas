-- ==============================================================================
-- FASE 5: CRUD COMPLETO ADMIN, RLS MULTI-TENANT, PERMISOS Y CAPACIDAD POR DEFECTO
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- 1. CAPACIDAD DE SALA POR DEFECTO = 15 BICICLETAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS capacidad_sala INTEGER DEFAULT 15;

UPDATE public.empresas
SET capacidad_sala = 15
WHERE capacidad_sala IS NULL OR capacidad_sala <= 0;

ALTER TABLE public.empresas
    ALTER COLUMN capacidad_sala SET DEFAULT 15,
    ALTER COLUMN capacidad_sala SET NOT NULL;

UPDATE public.clases
SET capacidad = 15
WHERE capacidad IS NULL OR capacidad <= 0;

ALTER TABLE public.clases
    ALTER COLUMN capacidad SET DEFAULT 15,
    ALTER COLUMN capacidad SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. CREAR TABLA FALTANTE: suscripciones_cliente (si aún no existe)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suscripciones_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.planes(id) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    clases_restantes INTEGER NOT NULL DEFAULT 0,
    estado VARCHAR(30) NOT NULL DEFAULT 'activa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_cliente_empresa
    ON public.suscripciones_cliente(empresa_id, cliente_id, estado);

-- ----------------------------------------------------------------------------
-- 3. PERMISOS DE TABLA (GRANT SELECT, INSERT, UPDATE, DELETE) PARA AUTHENTICATED
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_base TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planificaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suscripciones_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos_caja TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS REQUERIDAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS RLS PARA ADMIN POR EMPRESA (SELECT, INSERT, UPDATE, DELETE)
--    Reutiliza public.is_admin_of_empresa(empresa_id) definida en rls_policies.sql
-- ------------------------------------------------------------------------------

-- A. PLANES
DROP POLICY IF EXISTS "Admin gestiona planes de su empresa (SELECT)" ON public.planes;
CREATE POLICY "Admin gestiona planes de su empresa (SELECT)"
ON public.planes FOR SELECT TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona planes (INSERT)" ON public.planes;
CREATE POLICY "Admin de empresa gestiona planes (INSERT)"
ON public.planes FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona planes (UPDATE)" ON public.planes;
CREATE POLICY "Admin de empresa gestiona planes (UPDATE)"
ON public.planes FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona planes (DELETE)" ON public.planes;
CREATE POLICY "Admin de empresa gestiona planes (DELETE)"
ON public.planes FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- B. PERFILES
DROP POLICY IF EXISTS "Admin ve perfiles de su empresa (SELECT)" ON public.perfiles;
CREATE POLICY "Admin ve perfiles de su empresa (SELECT)"
ON public.perfiles FOR SELECT TO authenticated
USING (public.is_admin_of_empresa(empresa_id) OR id = auth.uid());

DROP POLICY IF EXISTS "Usuarios insertan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios insertan su propio perfil"
ON public.perfiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Usuarios editan su perfil o admin de empresa" ON public.perfiles;
CREATE POLICY "Usuarios editan su perfil o admin de empresa"
ON public.perfiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin_of_empresa(empresa_id))
WITH CHECK (id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa elimina perfiles de su tenant" ON public.perfiles;
CREATE POLICY "Admin de empresa elimina perfiles de su tenant"
ON public.perfiles FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- C. CLASES
DROP POLICY IF EXISTS "Admin ve clases de su empresa (SELECT)" ON public.clases;
CREATE POLICY "Admin ve clases de su empresa (SELECT)"
ON public.clases FOR SELECT TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa crea clases (INSERT)" ON public.clases;
CREATE POLICY "Admin de empresa crea clases (INSERT)"
ON public.clases FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa actualiza clases (UPDATE)" ON public.clases;
CREATE POLICY "Admin de empresa actualiza clases (UPDATE)"
ON public.clases FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa elimina clases" ON public.clases;
CREATE POLICY "Admin de empresa elimina clases"
ON public.clases FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- D. HORARIOS_BASE (FALTANTE COMPLETAMENTE)
DROP POLICY IF EXISTS "Admin ve horarios_base de su empresa (SELECT)" ON public.horarios_base;
CREATE POLICY "Admin ve horarios_base de su empresa (SELECT)"
ON public.horarios_base FOR SELECT TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin crea horarios_base de su empresa (INSERT)" ON public.horarios_base;
CREATE POLICY "Admin crea horarios_base de su empresa (INSERT)"
ON public.horarios_base FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin actualiza horarios_base de su empresa (UPDATE)" ON public.horarios_base;
CREATE POLICY "Admin actualiza horarios_base de su empresa (UPDATE)"
ON public.horarios_base FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin elimina horarios_base de su empresa (DELETE)" ON public.horarios_base;
CREATE POLICY "Admin elimina horarios_base de su empresa (DELETE)"
ON public.horarios_base FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- E. PLANIFICACIONES (FALTANTE COMPLETAMENTE)
DROP POLICY IF EXISTS "Admin ve planificaciones de su empresa (SELECT)" ON public.planificaciones;
CREATE POLICY "Admin ve planificaciones de su empresa (SELECT)"
ON public.planificaciones FOR SELECT TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin crea planificaciones de su empresa (INSERT)" ON public.planificaciones;
CREATE POLICY "Admin crea planificaciones de su empresa (INSERT)"
ON public.planificaciones FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin actualiza planificaciones de su empresa (UPDATE)" ON public.planificaciones;
CREATE POLICY "Admin actualiza planificaciones de su empresa (UPDATE)"
ON public.planificaciones FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin elimina planificaciones de su empresa (DELETE)" ON public.planificaciones;
CREATE POLICY "Admin elimina planificaciones de su empresa (DELETE)"
ON public.planificaciones FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- F. SUSCRIPCIONES_CLIENTE (FALTANTE COMPLETAMENTE)
DROP POLICY IF EXISTS "Admin o cliente ve suscripciones_cliente (SELECT)" ON public.suscripciones_cliente;
CREATE POLICY "Admin o cliente ve suscripciones_cliente (SELECT)"
ON public.suscripciones_cliente FOR SELECT TO authenticated
USING (cliente_id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin crea suscripciones_cliente de su empresa (INSERT)" ON public.suscripciones_cliente;
CREATE POLICY "Admin crea suscripciones_cliente de su empresa (INSERT)"
ON public.suscripciones_cliente FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin actualiza suscripciones_cliente de su empresa (UPDATE)" ON public.suscripciones_cliente;
CREATE POLICY "Admin actualiza suscripciones_cliente de su empresa (UPDATE)"
ON public.suscripciones_cliente FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin elimina suscripciones_cliente de su empresa (DELETE)" ON public.suscripciones_cliente;
CREATE POLICY "Admin elimina suscripciones_cliente de su empresa (DELETE)"
ON public.suscripciones_cliente FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- G. PAGOS
DROP POLICY IF EXISTS "Lectura de pagos por cliente o admin de empresa" ON public.pagos;
CREATE POLICY "Lectura de pagos por cliente o admin de empresa"
ON public.pagos FOR SELECT TO authenticated
USING (cliente_id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa registra pagos (INSERT)" ON public.pagos;
CREATE POLICY "Admin de empresa registra pagos (INSERT)"
ON public.pagos FOR INSERT TO authenticated
WITH CHECK (cliente_id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa valida y actualiza pagos" ON public.pagos;
CREATE POLICY "Admin de empresa valida y actualiza pagos"
ON public.pagos FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa elimina pagos" ON public.pagos;
CREATE POLICY "Admin de empresa elimina pagos"
ON public.pagos FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

-- H. MOVIMIENTOS_CAJA
DROP POLICY IF EXISTS "Admin accede a movimientos de caja de su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin accede a movimientos de caja de su empresa"
ON public.movimientos_caja FOR SELECT TO authenticated
USING (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin registra movimientos de caja en su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin registra movimientos de caja en su empresa"
ON public.movimientos_caja FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin edita movimientos de caja en su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin edita movimientos de caja en su empresa"
ON public.movimientos_caja FOR UPDATE TO authenticated
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin elimina movimientos de caja en su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin elimina movimientos de caja en su empresa"
ON public.movimientos_caja FOR DELETE TO authenticated
USING (public.is_admin_of_empresa(empresa_id));
