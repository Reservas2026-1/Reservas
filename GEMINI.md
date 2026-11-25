# Reglas del Proyecto Reservas-Trabajo-Conjunto

@[Resumen de Agentes](file:///E:/Reservas-Trabajo-Conjunto/AGENTS.md)

Este repositorio opera bajo una arquitectura de 5 agentes especializados:
1. **ORQUESTADOR**: Planifica, delega y reporta. Jamás edita código directamente.
2. **FRONTEND**: Construye la UI en React + Tailwind + Shadcn UI. No hace consultas directas a Supabase ni escribe SQL.
3. **BACKEND**: Lógica de negocio en TS, servicios de Supabase, Wompi, tiqueteras, QR. No maqueta ni toca CSS.
4. **DATABASE_MOBILE**: Esquema SQL, RLS multi-tenant, RPC transaccional anti-colisión y Capacitor Android.
5. **QA**: Audita, prueba y reporta errores. Jamás edita código.
