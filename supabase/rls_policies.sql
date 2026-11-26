-- ==============================================================================
-- Políticas de Seguridad RLS (Row Level Security) Multi-Tenant
-- Sistema SaaS Indoor Cycling / Reservas de Bicicletas
-- ==============================================================================

-- 1. FUNCIONES AUXILIARES PARA VERIFICACIÓN DE IDENTIDAD Y MULTI-TENANCY
-- Se marcan como STABLE y SECURITY DEFINER para evitar recursión en consultas RLS

CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT empresa_id 
    FROM public.perfiles 
    WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.rol_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol 
    FROM public.perfiles 
    WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.perfiles 
        WHERE id = auth.uid() AND rol = 'superadmin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_empresa(check_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.perfiles 
        WHERE id = auth.uid() 
          AND (
            rol = 'superadmin' 
            OR (rol = 'admin' AND empresa_id = check_empresa_id)
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_of_empresa(check_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.perfiles 
        WHERE id = auth.uid() 
          AND (
            rol = 'superadmin' 
            OR (rol IN ('admin', 'instructor') AND empresa_id = check_empresa_id)
          )
    );
$$;

-- 2. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bicicletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiqueteras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS: EMPRESAS
-- ==============================================================================
DROP POLICY IF EXISTS "Lectura pública de empresas activas" ON public.empresas;
CREATE POLICY "Lectura pública de empresas activas" 
ON public.empresas FOR SELECT 
USING (activo = true OR public.is_admin_of_empresa(id));

DROP POLICY IF EXISTS "Solo superadmin crea empresas" ON public.empresas;
DROP POLICY IF EXISTS "Permitir crear empresas en autoservicio o por superadmin" ON public.empresas;
CREATE POLICY "Permitir crear empresas en autoservicio o por superadmin" 
ON public.empresas FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin actualiza su empresa o superadmin" ON public.empresas;
CREATE POLICY "Admin actualiza su empresa o superadmin" 
ON public.empresas FOR UPDATE 
USING (public.is_admin_of_empresa(id))
WITH CHECK (public.is_admin_of_empresa(id));

DROP POLICY IF EXISTS "Solo superadmin elimina empresas" ON public.empresas;
CREATE POLICY "Solo superadmin elimina empresas" 
ON public.empresas FOR DELETE 
USING (public.is_superadmin());

-- ==============================================================================
-- POLÍTICAS: PERFILES
-- ==============================================================================
DROP POLICY IF EXISTS "Ver propio perfil o administradores de la empresa" ON public.perfiles;
CREATE POLICY "Ver propio perfil o administradores de la empresa" 
ON public.perfiles FOR SELECT 
USING (
    id = auth.uid() 
    OR public.is_staff_of_empresa(empresa_id) 
    OR public.is_superadmin()
);

DROP POLICY IF EXISTS "Usuarios insertan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios insertan su propio perfil" 
ON public.perfiles FOR INSERT 
WITH CHECK (id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Usuarios editan su perfil o admin de empresa" ON public.perfiles;
CREATE POLICY "Usuarios editan su perfil o admin de empresa" 
ON public.perfiles FOR UPDATE 
USING (id = auth.uid() OR public.is_admin_of_empresa(empresa_id))
WITH CHECK (id = auth.uid() OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa elimina perfiles de su tenant" ON public.perfiles;
CREATE POLICY "Admin de empresa elimina perfiles de su tenant" 
ON public.perfiles FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: PLANES (PAQUETES / CRÉDITOS)
-- ==============================================================================
DROP POLICY IF EXISTS "Lectura pública de planes activos" ON public.planes;
CREATE POLICY "Lectura pública de planes activos" 
ON public.planes FOR SELECT 
USING (activo = true OR public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona planes (INSERT)" ON public.planes;
CREATE POLICY "Admin de empresa gestiona planes (INSERT)" 
ON public.planes FOR INSERT 
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona planes (UPDATE)" ON public.planes;
CREATE POLICY "Admin de empresa gestiona planes (UPDATE)" 
ON public.planes FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa gestiona planes (DELETE)" ON public.planes;
CREATE POLICY "Admin de empresa gestiona planes (DELETE)" 
ON public.planes FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: BICICLETAS (FLOTA / ESTUDIO 1-15)
-- ==============================================================================
DROP POLICY IF EXISTS "Lectura pública de bicicletas activas" ON public.bicicletas;
CREATE POLICY "Lectura pública de bicicletas activas" 
ON public.bicicletas FOR SELECT 
USING (activo = true OR public.is_staff_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin gestiona bicicletas (INSERT)" ON public.bicicletas;
CREATE POLICY "Admin gestiona bicicletas (INSERT)" 
ON public.bicicletas FOR INSERT 
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin gestiona bicicletas (UPDATE)" ON public.bicicletas;
CREATE POLICY "Admin gestiona bicicletas (UPDATE)" 
ON public.bicicletas FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin gestiona bicicletas (DELETE)" ON public.bicicletas;
CREATE POLICY "Admin gestiona bicicletas (DELETE)" 
ON public.bicicletas FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: CLASES / SESIONES
-- ==============================================================================
DROP POLICY IF EXISTS "Lectura pública de clases programadas" ON public.clases;
CREATE POLICY "Lectura pública de clases programadas" 
ON public.clases FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Staff de empresa crea clases" ON public.clases;
CREATE POLICY "Staff de empresa crea clases" 
ON public.clases FOR INSERT 
WITH CHECK (public.is_staff_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Staff de empresa actualiza clases" ON public.clases;
CREATE POLICY "Staff de empresa actualiza clases" 
ON public.clases FOR UPDATE 
USING (public.is_staff_of_empresa(empresa_id))
WITH CHECK (public.is_staff_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa elimina clases" ON public.clases;
CREATE POLICY "Admin de empresa elimina clases" 
ON public.clases FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: TIQUETERAS (CRÉDITOS DE CLIENTE)
-- ==============================================================================
DROP POLICY IF EXISTS "Clientes ven sus tiqueteras o admin de empresa" ON public.tiqueteras;
CREATE POLICY "Clientes ven sus tiqueteras o admin de empresa" 
ON public.tiqueteras FOR SELECT 
USING (
    cliente_id = auth.uid() 
    OR public.is_admin_of_empresa(empresa_id)
);

DROP POLICY IF EXISTS "Admin gestiona tiqueteras (INSERT)" ON public.tiqueteras;
CREATE POLICY "Admin gestiona tiqueteras (INSERT)" 
ON public.tiqueteras FOR INSERT 
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin gestiona tiqueteras (UPDATE)" ON public.tiqueteras;
CREATE POLICY "Admin gestiona tiqueteras (UPDATE)" 
ON public.tiqueteras FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin gestiona tiqueteras (DELETE)" ON public.tiqueteras;
CREATE POLICY "Admin gestiona tiqueteras (DELETE)" 
ON public.tiqueteras FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: RESERVAS
-- ==============================================================================
DROP POLICY IF EXISTS "Lectura de reservas por cliente o staff de empresa" ON public.reservas;
CREATE POLICY "Lectura de reservas por cliente o staff de empresa" 
ON public.reservas FOR SELECT 
USING (
    cliente_id = auth.uid() 
    OR public.is_staff_of_empresa(empresa_id)
);

DROP POLICY IF EXISTS "Creación de reservas por cliente o staff" ON public.reservas;
CREATE POLICY "Creación de reservas por cliente o staff" 
ON public.reservas FOR INSERT 
WITH CHECK (
    cliente_id = auth.uid() 
    OR cliente_id IS NULL -- reserva express anónima por landing
    OR public.is_staff_of_empresa(empresa_id)
);

DROP POLICY IF EXISTS "Modificación de reservas por staff o cliente titular" ON public.reservas;
CREATE POLICY "Modificación de reservas por staff o cliente titular" 
ON public.reservas FOR UPDATE 
USING (
    cliente_id = auth.uid() 
    OR public.is_staff_of_empresa(empresa_id)
)
WITH CHECK (
    cliente_id = auth.uid() 
    OR public.is_staff_of_empresa(empresa_id)
);

DROP POLICY IF EXISTS "Eliminación de reservas solo por admin de empresa" ON public.reservas;
CREATE POLICY "Eliminación de reservas solo por admin de empresa" 
ON public.reservas FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: PAGOS
-- ==============================================================================
DROP POLICY IF EXISTS "Lectura de pagos por cliente o admin de empresa" ON public.pagos;
CREATE POLICY "Lectura de pagos por cliente o admin de empresa" 
ON public.pagos FOR SELECT 
USING (
    cliente_id = auth.uid() 
    OR public.is_admin_of_empresa(empresa_id)
);

DROP POLICY IF EXISTS "Inserción de pagos por cliente o staff" ON public.pagos;
CREATE POLICY "Inserción de pagos por cliente o staff" 
ON public.pagos FOR INSERT 
WITH CHECK (
    cliente_id = auth.uid() 
    OR cliente_id IS NULL 
    OR public.is_staff_of_empresa(empresa_id)
);

DROP POLICY IF EXISTS "Admin de empresa valida y actualiza pagos" ON public.pagos;
CREATE POLICY "Admin de empresa valida y actualiza pagos" 
ON public.pagos FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin de empresa elimina pagos" ON public.pagos;
CREATE POLICY "Admin de empresa elimina pagos" 
ON public.pagos FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));

-- ==============================================================================
-- POLÍTICAS: MOVIMIENTOS DE CAJA (AISLAMIENTO FINANCIERO TOTAL)
-- Los clientes y público no tienen acceso alguno a esta tabla
-- ==============================================================================
DROP POLICY IF EXISTS "Admin accede a movimientos de caja de su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin accede a movimientos de caja de su empresa" 
ON public.movimientos_caja FOR SELECT 
USING (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin registra movimientos de caja en su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin registra movimientos de caja en su empresa" 
ON public.movimientos_caja FOR INSERT 
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin edita movimientos de caja en su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin edita movimientos de caja en su empresa" 
ON public.movimientos_caja FOR UPDATE 
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admin elimina movimientos de caja en su empresa" ON public.movimientos_caja;
CREATE POLICY "Admin elimina movimientos de caja en su empresa" 
ON public.movimientos_caja FOR DELETE 
USING (public.is_admin_of_empresa(empresa_id));
