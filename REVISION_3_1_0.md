# Beneficios UIC v3.1.0

Revisión funcional y técnica del repositorio actual `beneficios-uic`.

## Cambios solicitados

- Se incorpora un buscador fijo en la parte superior del listado de Administración.
- El buscador filtra por título del beneficio, empresa/prestador, rubro y resumen; ignora mayúsculas y acentos.
- Se agrega contador de resultados y estado “Sin coincidencias”.
- Se reemplaza el logotipo simplificado de la cabecera por el archivo oficial UIC provisto para esta revisión.
- Se jerarquiza el nombre de la empresa/prestador en tarjetas públicas, detalle del beneficio y listado administrativo.

## Ajustes surgidos de la auditoría

- Se mantiene Neon como fuente principal y el catálogo local sólo como respaldo, sin sobrescribir registros existentes.
- El respaldo local ahora respeta también el estado `published` cuando se usa en la vista pública.
- La creación de beneficios rechaza títulos que no puedan generar un slug válido.
- La eliminación administrativa informa correctamente si el beneficio ya no existe y la interfaz captura el error.
- Se conserva la corrección de carga de flyers sobre estructuras heredadas de Neon.
- Se conserva el control anticaché y la neutralización de Service Workers antiguos.
- Se alinea nuevamente el llamado de asociación con “Hacete socio”.

## Identificación de versión

- Aplicación: `3.1.0`
- Generación: `BENEFICIOS_UIC_310`
- Servicio Render: `beneficios-uic` (sin crear otro servicio)
- Base: Neon existente (sin borrar ni recrear)
