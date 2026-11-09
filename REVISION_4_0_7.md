# REVISIÓN v4.0.7

- Monitor: nueva métrica **Aperturas totales**.
- La métrica se calcula únicamente cuando el operador presiona manualmente **Actualizar** / **Actualizar estado**.
- Al abrir el Monitor, Aperturas totales muestra `—` hasta realizar la actualización manual.
- Eliminado el polling automático de 15/45 segundos del Monitor administrativo y de empresa.
- No se agregan tablas ni métricas persistidas nuevas en Neon.
- El total se obtiene con una única consulta agregada `SUM(open_count)` para las campañas visibles cuando se solicita manualmente.
- Generación: `BENEFICIOS_UIC_4070`.
