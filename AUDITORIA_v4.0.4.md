# Auditoría - Beneficios UIC v4.0.4

## Observación de UX recibida
El instructivo de acceso ocupaba una gran altura antes del listado de empresas. Esto obligaba al usuario frecuente a desplazarse antes de poder localizar su empresa e iniciar sesión.

## Causa
`DiffusionGuide` se renderizaba antes de `neo-diffusion-workspace`, por lo que todo el instructivo completo antecedía al buscador y al listado de empresas.

## Corrección
- `neo-diffusion-workspace` se renderiza primero.
- `DiffusionGuide` se mueve debajo del workspace.
- `DiffusionGuide` se transforma en `<details>`/`<summary>` cerrado por defecto.
- La ayuda sigue completa, pero es secundaria y voluntaria.
- Se añade control automático que verifica el orden de renderizado y el acordeón.

## Seguridad y datos
Sin cambios en autenticación, sesiones, Neon, padrón, campañas, permisos administrativos o aislamiento del Monitor de empresa.
