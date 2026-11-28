-- ==============================================================================
-- FASE 8: PREMIOS POR PLAN, SEGMENTACIÓN DE GAMIFICACIÓN Y ENTREGA DE PREMIOS
-- Migración idempotente para PostgreSQL / Supabase
-- ==============================================================================

-- 1. TABLA: public.premios_plan (Premios de Liga por Plan / Gamificación)
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

-- Asegurar constraints en caso de que la tabla ya existiese previamente
DO $$
BEGIN
    -- Validar restricción CHECK de puesto (1, 2, 3)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_premios_plan_puesto'
    ) THEN
        ALTER TABLE public.premios_plan 
        ADD CONSTRAINT chk_premios_plan_puesto CHECK (puesto IN (1, 2, 3));
    END IF;
END $$;

-- Asegurar unicidad (empresa_id, plan_id, puesto)
-- Cubre plan_id con valor específico y plan_id NULL (premios globales por empresa)
CREATE UNIQUE INDEX IF NOT EXISTS uq_premios_plan_empresa_plan_puesto 
ON public.premios_plan (empresa_id, plan_id, puesto) 
WHERE plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_premios_plan_empresa_global_puesto 
ON public.premios_plan (empresa_id, puesto) 
WHERE plan_id IS NULL;

-- Índices de consulta multi-tenant
CREATE INDEX IF NOT EXISTS idx_premios_plan_empresa ON public.premios_plan (empresa_id);
CREATE INDEX IF NOT EXISTS idx_premios_plan_plan_id ON public.premios_plan (plan_id);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS) EN premios_plan
ALTER TABLE public.premios_plan ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE RLS PARA public.premios_plan
DROP POLICY IF EXISTS "Lectura de premios_plan por empresa" ON public.premios_plan;
CREATE POLICY "Lectura de premios_plan por empresa" 
ON public.premios_plan FOR SELECT 
USING (activo = true OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona premios_plan (INSERT)" ON public.premios_plan;
CREATE POLICY "Admin de empresa gestiona premios_plan (INSERT)" 
ON public.premios_plan FOR INSERT 
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona premios_plan (UPDATE)" ON public.premios_plan;
CREATE POLICY "Admin de empresa gestiona premios_plan (UPDATE)" 
ON public.premios_plan FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona premios_plan (DELETE)" ON public.premios_plan;
CREATE POLICY "Admin de empresa gestiona premios_plan (DELETE)" 
ON public.premios_plan FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- 4. COLUMNAS DE ENTREGA DE PREMIOS EN GAMIFICACIÓN Y TIQUETERAS
-- En public.metricas_gamificacion:
ALTER TABLE public.metricas_gamificacion 
ADD COLUMN IF NOT EXISTS premio_entregado BOOLEAN DEFAULT false NOT NULL;

-- En public.tiqueteras (para auditoría y ciclo de vigencia):
ALTER TABLE public.tiqueteras 
ADD COLUMN IF NOT EXISTS premio_entregado BOOLEAN DEFAULT false NOT NULL;

-- Índices para búsqueda de premios pendientes/entregados
CREATE INDEX IF NOT EXISTS idx_metricas_gamificacion_premio 
ON public.metricas_gamificacion(empresa_id, premio_entregado);

CREATE INDEX IF NOT EXISTS idx_tiqueteras_premio 
ON public.tiqueteras(empresa_id, premio_entregado);
