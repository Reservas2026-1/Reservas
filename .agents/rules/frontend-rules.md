# Reglas Específicas de FRONTEND

1. **Stack Visual**:
   - Usar React 19, TypeScript, Tailwind CSS v4, Lucide React y componentes base de `src/components/ui/`.
   - Utilizar la función `cn()` de `@/lib/utils` para combinar clases de Tailwind.

2. **Aislamiento de Datos**:
   - Prohibido importar `@/lib/supabase` directamente en componentes de presentación.
   - Consumir siempre servicios tipados de `@/services/` o recibir props/mocks.
   - Mantener componentes puros y desacoplados del origen de datos.

3. **Responsividad y Temas**:
   - Todos los componentes deben ser totalmente responsivos (mobile-first con soporte para pantallas táctiles).
   - Toda la paleta de colores debe basarse en variables CSS (`bg-primary`, `text-foreground`, `border-border`, etc.) para permitir personalización de marca blanca por empresa y cambio fluido entre temas claro y oscuro.
