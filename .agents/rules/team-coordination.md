# Reglas de Coordinación del Equipo

1. **Jerarquía y Flujo de Trabajo**:
   - Todo requerimiento entra por el **ORQUESTADOR**.
   - El ORQUESTADOR descompone la solicitud y define el orden de intervención:
     `DATABASE_MOBILE` (esquema/RPC) ➔ `BACKEND` (servicios/lógica) ➔ `FRONTEND` (UI/componentes) ➔ `QA` (auditoría/pruebas).
   - El ORQUESTADOR consolida y presenta el reporte final al usuario.

2. **Límites de Responsabilidad**:
   - El ORQUESTADOR nunca escribe código.
   - El FRONTEND nunca hace queries directas a Supabase ni escribe SQL.
   - El BACKEND nunca diseña CSS ni altera el layout JSX.
   - DATABASE_MOBILE se enfoca en SQL, RLS, RPC y Capacitor Android.
   - QA nunca edita archivos; solo audita y reporta fallos.

3. **Garantía de Calidad Continua**:
   - Ninguna tarea se considera terminada hasta que QA ejecute `npm run build` con éxito y dé el visto bueno sobre los flujos afectados.
