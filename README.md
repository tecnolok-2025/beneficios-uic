> **Revisión actual: v3.4.0 · BENEFICIOS_UIC_340 · buscador flexible + diseño industrial premium**

# Beneficios UIC — proyecto 3.2.2

Portal de beneficios de la Unión Industrial de Campana.

## Qué conserva

- La base PostgreSQL existente de Neon.
- Los 26 beneficios y 10 rubros del catálogo base.
- Los textos, contactos, flyers y ediciones administrativas guardados en Neon.
- Alta, edición, publicación, eliminación y carga de flyers.
- Control anticaché y compatibilidad con estructuras heredadas de la tabla `flyers`.

## Revisión 3.2.2

- Buscador en la parte superior del listado de Administración por beneficio, empresa, rubro o palabra clave.
- Logo institucional UIC provisto para esta revisión en la cabecera.
- Mayor jerarquía visual del nombre de la empresa/prestador.
- Correcciones de robustez detectadas en la auditoría general.
- Llamado de asociación unificado como **Hacete socio**.

La generación se identifica como `BENEFICIOS_UIC_322`. El servidor no arranca si el frontend compilado no contiene esa marca.

El catálogo local es solamente un respaldo. Si `data/catalog.json` faltara, el servidor continúa utilizando Neon.

La entrega está preparada para sustituir los archivos del GitHub ya conectado al servicio `beneficios-uic` de Render, sin crear otro servicio ni cambiar la base.

## Desarrollo

```bash
npm ci --include=dev
npm run build
npm test
npm start
```
## v3.5.1

Ajuste de nomenclatura solicitado: la categoría **Seguros** pasa a denominarse **Broker de seguros**. Affinity Broker permanece como la única ficha del rubro en esta revisión. No se modifican beneficios, contactos, imágenes, enlaces ni estructura de Neon. Total: 32 beneficios / 13 rubros.

## v3.5.0
Se incorporan 6 nuevas fichas: Affinity Broker, App UIC, Talento PyME, Requerimientos Institucionales/CPF, Portal de Beneficios UIC y Convenio Marco UIC–ADERPE. Se agregan los rubros Seguros, Beneficios digitales y Acuerdos institucionales. Total: 32 beneficios / 13 rubros.
