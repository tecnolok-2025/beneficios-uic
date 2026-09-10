> **Revisión actual: v3.5.2 · BENEFICIOS_UIC_352 · 32 beneficios · 13 categorías**

# Beneficios UIC — Portal institucional de beneficios

Portal de beneficios de la **Unión Industrial de Campana (UIC)**.

## Estado actual

- **32 beneficios activos** en el catálogo base.
- **13 categorías** disponibles.
- Base PostgreSQL existente en **Neon** preservada.
- Alta, edición, publicación, eliminación y carga de flyers desde Administración.
- Imágenes institucionales de respaldo, manteniendo prioridad para los flyers cargados por Administración.
- Buscador flexible por nombre, fragmentos, categoría, texto, contacto y palabras clave, con normalización de tildes y tolerancia a pequeñas variaciones.
- Presentación visual industrial premium y responsive para escritorio y celular.

## Categorías incorporadas en la etapa 3.5

- **Broker de seguros** — Affinity Broker / Provincia Seguros / UIPBA.
- **Beneficios digitales** — App UIC, Talento PyME, Requerimientos Institucionales / CPF y Portal de Beneficios UIC.
- **Acuerdos institucionales** — Convenio Marco UIC–ADERPE.

## Seguridad de actualización

La actualización mantiene la misma conexión a Neon. El catálogo local (`data/catalog.json`) funciona como respaldo e inicialización controlada; no reemplaza destructivamente la información existente. Las incorporaciones de la serie 3.5 utilizan nuevos `slug` y la corrección de Affinity se realiza de manera no destructiva.

## Identificación técnica

- **Versión:** `3.5.2`
- **Generación:** `BENEFICIOS_UIC_352`
- **Total de beneficios:** 32
- **Total de categorías:** 13

El servidor valida que el frontend compilado corresponda a la misma generación antes de iniciar.

## Desarrollo / validación

```bash
npm ci --include=dev
npm run build
npm test
npm start
```

## Historial reciente

### v3.5.2
Revisión de limpieza documental y coherencia de versión. Se actualizan README, identificación visible, metadatos y pruebas para evitar referencias obsoletas. No cambia el contenido funcional de los 32 beneficios ni la estructura de Neon.

### v3.5.1
La categoría **Seguros** pasa a denominarse **Broker de seguros**. Affinity Broker permanece como ficha de ese rubro.

### v3.5.0
Se incorporan seis fichas: Affinity Broker, App UIC, Talento PyME, Requerimientos Institucionales / CPF, Portal de Beneficios UIC y Convenio Marco UIC–ADERPE.

### v3.4.0
Buscador flexible y rediseño visual industrial premium.
