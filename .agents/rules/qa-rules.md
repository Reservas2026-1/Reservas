# Reglas Específicas de QA

1. **Validación de Compilación Obligatoria**:
   - Siempre correr `npm run build` (que incluye `tsc -b && vite build`) en el entorno de desarrollo para validar que no haya regresiones de TypeScript.

2. **Checklist de Verificación por Flujo**:
   - **Reserva de 15 bicis**: Verificar que el mapa no permita seleccionar bicicletas en estado `mantenimiento` o `reservada`.
   - **Tiqueteras**: Verificar que al expirar la fecha de vigencia de la tiquetera, el sistema no permita canjear horas.
   - **Caja Chica**: Verificar que los montos de cobro por reserva sumen correctamente al saldo de caja en efectivo.
   - **Multi-empresa**: Revisar en las queries y schemas que ningún dato de Empresa A sea accesible por Empresa B.

3. **Formato de Entrega de Reporte**:
   - Toda respuesta de QA debe tener:
     1. Estado general (APROBADO / RECHAZADO).
     2. Lista de pruebas ejecutadas.
     3. Lista de errores o vulnerabilidades detectadas con severidad (P0, P1, P2) y archivo exacto donde ocurren.
     4. Recomendación técnica para el subagente responsable.
