# Auditoría técnica v3.9.7 — Constructor Visual UIC

## Resultado

**APROBACIÓN DE CÓDIGO CON SALVEDAD DE BUILD LOCAL**

## Verificaciones realizadas

- Versión de paquete: `3.9.7`.
- Generación: `BENEFICIOS_UIC_397`.
- Catálogo preservado: 51 beneficios / 16 categorías.
- `node --check server/index.js`: correcto.
- `node --check public/boot-recovery.js`: correcto.
- Pruebas automáticas: **81/81 aprobadas**.
- Constructor: 8 plantillas definidas.
- Máximo de imágenes: 4.
- Adjuntos: hasta 3, separados del cuerpo.
- Reducción previa de imágenes implementada en navegador.
- Persistencia estructurada `template_id` + `layout_json` incorporada de forma aditiva.
- Fallback para campañas históricas sin `layout_json` estructurado.
- Sanitización servidor de HTML enriquecido.
- Render de correo mediante tablas HTML / estilos inline.
- El render servidor del correo no usa `display:grid`.
- Vista previa escritorio/celular incorporada.
- Seguridad de registro, prueba, validación, cola y monitor preservada.

## Migración Neon

La migración agrega solamente:

```sql
ALTER TABLE diffusion_campaigns ADD COLUMN IF NOT EXISTS template_id TEXT NOT NULL DEFAULT 'institutional';
ALTER TABLE diffusion_campaigns ADD COLUMN IF NOT EXISTS layout_json JSONB NOT NULL DEFAULT '{}'::jsonb;
```

No borra campañas ni modifica el padrón.

## Build local

Se intentó `npm ci --include=dev --no-audit --no-fund`, pero el entorno de trabajo no pudo resolver/descargar todas las dependencias antes del timeout. Por ese motivo no se declara `npm run build` como comprobado localmente. Render conserva su instalación normal de dependencias durante el despliegue.

## Riesgo residual a revisar en prueba real

Los clientes de correo interpretan HTML de manera diferente. El nuevo render usa tablas e inline styles para maximizar compatibilidad, pero la prueba real debe realizarse al menos en:

- Outlook escritorio;
- Gmail web;
- Gmail/Apple Mail en teléfono.

El modo prueba existente permite hacer esta comprobación sin consumir el ciclo mensual.
