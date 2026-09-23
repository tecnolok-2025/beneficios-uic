> **Revisión actual: v3.7.1 · BENEFICIOS_UIC_371 · 48 beneficios · 15 categorías**

# Beneficios UIC — Portal institucional de beneficios

Portal de beneficios de la **Unión Industrial de Campana (UIC)**.

## Estado actual

- **48 beneficios** en el catálogo base.
- **40 beneficios activos** y **8 beneficios UIPBA a chequear validación** al 23/09/2026.
- **15 categorías** disponibles.
- Nueva categoría / botón **UIPBA**, que reúne beneficios, servicios y convenios provenientes de la entidad madre.
- Base PostgreSQL existente en **Neon** preservada.
- Alta, edición, publicación, eliminación y carga de flyers desde Administración.
- Imágenes institucionales de respaldo, manteniendo prioridad para los flyers cargados por Administración.
- Buscador flexible por nombre, fragmentos, categoría, texto, contacto y palabras clave.
- Presentación visual industrial premium y responsive para escritorio y celular.


## Incorporaciones v3.7.1 · nuevos convenios y evento

- **RED SUMMA Education** — acuerdo institucional con formación online y beneficios diferenciales.
- **CADEMA · BUREAU – Barrancas de Campana** — beneficio inmobiliario empresarial con bonificación de hasta 10%.
- **Expo GlobalPorts 2026** — nueva categoría **Eventos y exposiciones**, con 10% de descuento para socios UIC y vencimiento automático posterior al 04/11/2026.
- Nuevo estado visual **FINALIZADO** para beneficios temporales vencidos, sin borrar su antecedente.
- Administración permite editar fecha de inicio y fecha de fin.

## Incorporaciones v3.6.0 · UIPBA

### Activos / respaldados
- Open English Business — 80% OFF + 2 licencias a precio especial.
- Provincia Seguros — tarifas bonificadas para socios.
- Facultad de Ingeniería UNLP — 15% adicional en propuestas que publiquen el convenio UIPBA.
- Programa de Empresas Proveedoras — Energía, Minería y Oil & Gas.
- Asistencia PyME UIPBA.

### A chequear validación
- IRAM.
- Sancor Salud vía UIPBA.
- Movistar Negocios.
- Banco Nación.
- UCEMA.
- Softlanding.
- Centro Despachantes de Aduana (CDA).
- BVMW — Asociación Alemana de PyMEs.

Las fichas en duda se publican con `status: revalidacion` y el portal las identifica visiblemente como **A CHEQUEAR VALIDACIÓN**. La UIC debe confirmar vigencia y condiciones actuales con UIPBA antes de gestionarlas como beneficios activos.

## Imagen Open English

La ficha Open English Business usa como material visual local la pieza institucional entregada para esta revisión:

`/public/benefits/uipba-open-english-business.png`

## Seguridad de actualización

La actualización mantiene la misma conexión a Neon. El catálogo local (`data/catalog.json`) funciona como respaldo e inicialización controlada; no reemplaza destructivamente la información existente. Los 13 beneficios UIPBA y las 3 altas de v3.7.1 utilizan `slug` propios, por lo que se incorporan mediante `INSERT ... ON CONFLICT` sin borrar los 32 beneficios originales ni las ediciones administrativas existentes.

## Identificación técnica

- **Versión:** `3.7.1`
- **Generación:** `BENEFICIOS_UIC_371`
- **Total de beneficios:** 48
- **Beneficios activos:** 40
- **A chequear validación:** 8
- **Total de categorías:** 15

El servidor valida que el frontend compilado corresponda a la misma generación antes de iniciar.

## Desarrollo / validación

```bash
npm ci --include=dev
npm test
npm run build
npm start
```

## Historial reciente

### v3.7.1
Incorpora RED SUMMA Education, CADEMA BUREAU y Expo GlobalPorts 2026. Agrega la categoría Eventos y exposiciones, fechas editables y vencimiento automático con estado FINALIZADO.

### v3.6.0
Incorpora 13 fichas provenientes de UIPBA dentro de un botón/categoría propio. Cinco quedan activas y ocho claramente identificadas como pendientes de validación. Se integra la pieza original de Open English Business, se actualizan contadores y se conserva Neon sin operaciones destructivas.

### v3.5.2
Revisión de limpieza documental y coherencia de versión. Se preservaron 32 beneficios y 13 categorías.
