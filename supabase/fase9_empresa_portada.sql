-- ==============================================================================
-- FASE 9: Migración para añadir portada_url en public.empresas
-- Permite personalizar la imagen de portada o banner de la empresa/gimnasio
-- ==============================================================================

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS portada_url TEXT;

COMMENT ON COLUMN public.empresas.portada_url IS 'URL de la imagen de portada o banner de la empresa/gimnasio para el portal de clientes';
