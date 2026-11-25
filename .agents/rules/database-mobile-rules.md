# Reglas Específicas de DATABASE_MOBILE

1. **Multi-tenancy y RLS (Row Level Security)**:
   - Toda tabla nueva debe incluir `empresa_id UUID NOT NULL REFERENCES public.empresas(id)`.
   - Toda política RLS debe verificar que `empresa_id` coincida con la empresa a la que pertenece el usuario autenticado (`auth.jwt() ->> 'empresa_id'`).
   - Jamás permitir lecturas o escrituras entre diferentes empresas.

2. **Transacciones Anti-colisión de Bicicletas**:
   - Las reservas de bicicletas deben gestionarse a través de una función RPC en PostgreSQL con bloqueo de fila (`SELECT ... FOR UPDATE` o exclusión de rangos de tiempo).
   - Si la bicicleta ya está comprometida en ese horario, la función debe abortar la transacción lanzando una excepción clara.

3. **Capacitor y Android**:
   - Mantener `capacitor.config.ts` sincronizado con el ID de aplicación adecuado.
   - Configurar `AndroidManifest.xml` con permisos estrictamente necesarios: cámara (escaneo QR) y ubicación (si aplica para el mapa de flota).
