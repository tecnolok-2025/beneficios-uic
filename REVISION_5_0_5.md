# Revisión v5.0.5

## Corrección de búsqueda y filtros del catálogo
- El buscador pasa automáticamente a `Todos` y busca sobre el catálogo completo.
- Al seleccionar cualquier categoría se limpia la búsqueda escrita.
- `Todos` siempre restablece el catálogo completo y elimina filtros previos.
- Los accesos rápidos DNV, CEOP, TIBEST y Praxis también ejecutan búsqueda global.
- Se reduce la tolerancia difusa para palabras de 4 a 8 caracteres a un solo error, evitando falsos positivos como `Praxis` → `Planes SanCor`.
- Se mantiene tolerancia de hasta dos errores sólo para términos de 9 o más caracteres.
- Generación técnica: BENEFICIOS_UIC_5050.
