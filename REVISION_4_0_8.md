# Revisión 4.0.8 — Incorporación depurada de contactos industriales

Fecha: 09/11/2026

## Alcance

- Se incorporan **32 contactos** depurados contra la exportación real de `diffusion_recipients` de Neon.
- Todos los nuevos contactos se clasifican como `socio`.
- Se preservan íntegramente los correos vigentes ya existentes.
- Un correo existente **no se reemplaza** por una casilla alternativa salvo una corrección futura y explícita motivada por error real de envío/rebote.
- Si al momento del deploy uno de los 32 emails ya existe, no se duplica: sólo se completan `company_name`, `contact_name`, `phone` o `notes` cuando estén vacíos.
- No se fuerza `enabled` ni `email_valid` sobre registros preexistentes.
- Las categorías Fabricación / Logística / Servicios se conservan en `notes` para trazabilidad.
- GlobalPorts conserva todos sus contactos vigentes; Ariel Armero se incorpora como contacto adicional si su email aún no existe.

## Generación

`BENEFICIOS_UIC_4080`
