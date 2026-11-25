# Reglas Específicas de BACKEND

1. **Ubicación y Estructura de Servicios**:
   - Toda la lógica de conexión con Supabase debe residir en `src/services/` (ej: `reservasService.ts`, `pagosService.ts`, `tiqueterasService.ts`).
   - Exportar funciones asíncronas con tipado estricto retornando `Promise<{ data: T | null; error: string | null }>`.

2. **Integración de Pagos y Tiqueteras**:
   - Validar siempre que una tiquetera tenga saldo antes de confirmar el descuento de horas.
   - En integraciones con Wompi, verificar la firma criptográfica de los eventos de webhook antes de actualizar el estado de los pagos.
   - Almacenar los comprobantes de Nequi/Bancolombia en el bucket correspondiente de Supabase Storage con nombres aleatorios no predecibles (`uuidv4`).

3. **Generación de Códigos QR**:
   - Los códigos QR de reserva deben codificar únicamente un token seguro o ID de reserva verificable, nunca datos sensibles del cliente en texto plano.
