> **Revisión actual: v3.8.0 · BENEFICIOS_UIC_380 · 51 beneficios · 16 categorías**

# Beneficios UIC — Portal institucional de beneficios

Portal de beneficios de la **Unión Industrial de Campana (UIC)**.

## Revisión v3.8.0 · 23/10/2026

- Catálogo final: **51 beneficios** y **16 categorías**.
- Nuevas fichas: **CEOP Internacional**, **TIBEST Broker de Seguros** y **DNV Business Assurance**.
- **Praxis Finanzas** se actualiza sobre su ficha existente; no se duplica.
- Categorías: CEOP → `Acuerdos institucionales`; TIBEST → `Broker de seguros`; Praxis → `Gestión empresarial`; DNV → `Certificación y calidad`.
- CEOP: por instrucción UIC, los referentes se cargan como **Hugo López** y **Sandra Rodríguez**.
- Imágenes: extraídas de los documentos fuente suministrados por UIC.
- Neon: inserción aditiva de tres slugs nuevos y actualización dirigida exclusivamente a la ficha Praxis existente; no se eliminan otros beneficios ni flyers administrativos.

## Estado actual

- **51 beneficios** en el catálogo base.
- **43 beneficios activos** y **8 beneficios UIPBA a chequear validación**.
- **16 categorías** disponibles.
- Base PostgreSQL existente en **Neon** preservada.
- Alta, edición, publicación, eliminación y carga de flyers desde Administración.
- Imágenes institucionales de respaldo, manteniendo prioridad para los flyers cargados por Administración.
- Buscador flexible por nombre, fragmentos, categoría, texto, contacto y palabras clave.
- Presentación visual industrial premium y responsive para escritorio y celular.

## Incorporaciones v3.8.0

### CEOP Internacional
Acuerdo institucional de formación, liderazgo y desarrollo humano. Se publica 50% de bonificación sobre matrícula anual y se deja la bonificación sobre aranceles sujeta a confirmación con CEOP porque el documento fuente contiene una inconsistencia interna en ese porcentaje.

### TIBEST · Broker de Seguros
Canal UIC con asesoramiento especializado, comparación multi-compañía cuando corresponda, condiciones diferenciales según riesgo/aseguradora, contratación directa y acompañamiento en siniestros.

### DNV Argentina · Business Assurance
Nueva categoría `Certificación y calidad`: 12% de descuento en auditorías iniciales de certificación, 10% en emisión de certificados acreditados y 10% en cursos de sistemas de gestión, además de herramientas digitales cuando apliquen.

### Praxis Finanzas
Se consolida la ficha existente como **Departamento de Finanzas Corporativas UIC – Praxis Finanzas**, manteniendo el mismo slug para evitar duplicados y actualizar la información en Neon de forma dirigida.

## Seguridad de actualización

La actualización mantiene la misma conexión a Neon. El catálogo local (`data/catalog.json`) funciona como respaldo e inicialización controlada. Los tres beneficios nuevos utilizan slugs propios y se incorporan mediante `INSERT ... ON CONFLICT`. Praxis ya existía: se actualiza solamente ese slug, sin borrar otros beneficios ni los flyers administrativos cargados en su ficha.

## Identificación técnica

- **Versión:** `3.8.0`
- **Generación:** `BENEFICIOS_UIC_380`
- **Total de beneficios:** 51
- **Beneficios activos:** 43
- **A chequear validación:** 8
- **Total de categorías:** 16

El servidor valida que el frontend compilado corresponda a la misma generación antes de iniciar.

## Desarrollo / validación

```bash
npm ci --include=dev
npm test
npm run build
npm start
```

## Historial reciente

### v3.8.0
Incorpora CEOP Internacional, TIBEST Broker de Seguros y DNV Business Assurance; actualiza Praxis Finanzas sin duplicarlo; crea la categoría Certificación y calidad; mantiene la arquitectura Neon/Render.

### v3.7.1
Hotfix de robustez Render/Neon sobre el catálogo de 48 beneficios y 15 categorías.

### v3.7.0
Incorporó RED SUMMA Education, CADEMA BUREAU y Expo GlobalPorts 2026, junto con vencimiento automático para beneficios temporales.

### v3.6.0
Incorporó 13 fichas provenientes de UIPBA, con cinco activas y ocho identificadas para revalidación.
