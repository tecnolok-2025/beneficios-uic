# Beneficios UIC · Revisión 3.9.0

**Fecha:** 23/10/2026  
**Generación:** `BENEFICIOS_UIC_390`  
**Base:** v3.8.0 completa Render/Neon

## Objeto

Primera implementación del futuro módulo **Difusión de Beneficios**, manteniéndolo cerrado al público durante su construcción.

## Implementado

- Botón **Difusión de Beneficios** visible en la portada.
- Ruta `/difusion`.
- Protección temporal con la misma autenticación administrativa ya existente.
- Reutilización de `ADMIN_PASSWORD`, cookie HttpOnly y sesión administrativa actual; no se crea una segunda clave.
- Directorio buscable de empresas/prestadores a partir de los beneficios existentes.
- Agrupación automática de todos los beneficios de cada empresa.
- Vista de construcción de cupo individual por beneficio.
- Registro público, recuperación de contraseña y envío deshabilitados deliberadamente.
- Botón explícito **Volver al Portal de Beneficios** antes y después del acceso.
- Diseño responsive para escritorio y móvil.

## Seguridad de esta etapa

No se incorporaron endpoints públicos de cuentas de empresa. Una persona que conozca `/difusion` no puede ver el directorio ni los beneficios agrupados sin una sesión administrativa válida. El módulo consulta `/api/admin/me` y `/api/admin/beneficios`, por lo que conserva la misma barrera que el panel administrativo existente.

## Datos y Neon

Esta revisión no crea tablas nuevas ni modifica datos de empresas, convenios o campañas. El catálogo permanece en 51 beneficios y 16 categorías.
