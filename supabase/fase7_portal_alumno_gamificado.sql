-- ==============================================================================
-- FASE 7: PORTAL MÓVIL GAMIFICADO DEL ALUMNO (PERFIL EXTENDIDO Y PREMIOS DE LIGA)
-- Migración idempotente para PostgreSQL / Supabase
-- ==============================================================================

-- 1. CAMPOS DE PERFIL EN public.perfiles
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS contacto_emergencia VARCHAR(255);
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS objetivos_entrenamiento TEXT;

-- 2. TABLA: public.premios_plan (Premios de Liga por Plan)
CREATE TABLE IF NOT EXISTS public.premios_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.planes(id) ON DELETE CASCADE,
    puesto INTEGER NOT NULL, -- 1, 2, 3
    premio VARCHAR(255) NOT NULL, -- Ej: '1 Mes Gratis', 'Camiseta Oficial + Termo', '5 Clases Extra'
    icono VARCHAR(50) DEFAULT 'trophy',
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para optimizar rendimiento multi-tenant
CREATE INDEX IF NOT EXISTS idx_premios_plan_empresa ON public.premios_plan (empresa_id);
CREATE INDEX IF NOT EXISTS idx_premios_plan_plan_id ON public.premios_plan (plan_id);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.premios_plan ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA public.premios_plan
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
