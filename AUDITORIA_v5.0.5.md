# Auditoría v5.0.5

## Corrección validada
- El buscador público es global: al escribir pasa automáticamente a `Todos`.
- Al elegir cualquier categoría se limpia la búsqueda previa.
- Al elegir `Todos` se eliminan búsqueda y filtros y se muestran los 51 beneficios.
- Los accesos rápidos DNV, CEOP, TIBEST y Praxis ejecutan búsqueda global.
- `Praxis` devuelve sólo la ficha de Praxis Finanzas.
- La tolerancia difusa conserva errores útiles como `Dalmnie` -> Dálmine, pero evita falsos positivos amplios como `Praxis` -> SanCor Salud.
- No se modifican Neon, padrón, campañas, monitor ni datos de convenios.
- Generación: BENEFICIOS_UIC_5050.
- QA: 147 pruebas aprobadas, 0 fallidas.
