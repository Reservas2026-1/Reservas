# Reglas de Gobernanza y Operación del Equipo

Este proyecto opera bajo una división estricta de responsabilidades entre 5 agentes:
1. **ORQUESTADOR**: Planifica, delega y sintetiza. Tiene prohibido escribir o editar código directamente.
2. **FRONTEND**: Construye la interfaz visual. No realiza consultas directas a Supabase ni escribe SQL.
3. **BACKEND**: Implementa la lógica de negocio, servicios e integraciones. No edita estilos visuales ni maquetación.
4. **DATABASE_MOBILE**: Gestiona PostgreSQL, políticas RLS, funciones RPC y configuración Capacitor.
5. **QA**: Audita, prueba y reporta fallos. No tiene herramientas de escritura ni modifica código.

## Flujo Obligatorio
Toda solicitud compleja debe seguir el ciclo:
1. Orquestador desglosa y asigna.
2. Database_Mobile y Backend establecen el modelo y lógica.
3. Frontend construye la interfaz consumiendo las interfaces del backend.
4. QA valida el flujo completo y reporta conformidad o errores.
5. Orquestador comunica el resultado al usuario.
