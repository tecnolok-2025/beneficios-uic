# Beneficios UIC — proyecto 3.0.3

Reconstrucción completa del portal de beneficios. No reutiliza la portada, los componentes ni la hoja de estilos de las versiones anteriores.

## Qué conserva

- La base PostgreSQL existente de Neon.
- Los 24 beneficios, 10 rubros y 9 acuerdos nuevos.
- Los textos, contactos, flyers y ediciones administrativas guardados en Neon.
- Alta, edición, publicación, eliminación y carga de flyers.

## Qué reemplaza

- Toda la interfaz pública.
- Toda la navegación y arquitectura visual.
- El panel administrativo.
- El servidor de publicación y el control anticaché.

La generación se identifica como `BENEFICIOS_UIC_NUEVO_303`. El servidor no arranca si el frontend compilado no contiene esa marca.

El catálogo local es solamente un respaldo. Si `data/catalog.json` faltara, el servidor no se cae: continúa utilizando Neon.

La entrega `REPOSITORIO_ACTUAL` está preparada para sustituir todos los archivos del GitHub ya conectado al servicio `beneficios-uic` de Render, sin crear otro servicio ni cambiar la base.

## Desarrollo

```bash
npm install
npm run build
npm test
npm start
```


## Revisión 3.0.3
- “Actualizar versión” trabaja dentro del portal: limpia Service Workers/cachés y recarga la misma pantalla.
- Se elimina el filtro visible “Acuerdos nuevos”.
- Los 24 beneficios permanecen distribuidos en los 10 rubros.
- “Descubrir beneficios de nuevos acuerdos” abre el acuerdo más reciente: Escuela Técnica Roberto Rocca.
- Sólo ese acuerdo conserva la marca NUEVO.
- Se duplica la legibilidad de rubros, categorías y condiciones verdes de las tarjetas.


## Revisión 3.0.3
- 25 beneficios activos, manteniendo 10 rubros.
- Se incorpora Praxis Finanzas dentro de Gestión empresarial.
- El detalle de cada beneficio aumenta fuertemente la legibilidad de rótulos, textos de alcance y contactos.
- Se agrega al final de cada beneficio un directorio separado de contacto Empresa/Prestador y contacto UIC.
- Los contactos de la empresa son múltiples y totalmente editables desde Administración: nombre, cargo, teléfono y correo.
- Se incorpora un campo editable para link de información/convenio.
- La base Neon se conserva; la migración sólo agrega company_contacts y asegura agreement_url.
