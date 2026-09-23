# Diagnóstico Render — servicio suspendido por crashes

La captura del 23/09/2026 muestra el servicio `beneficios-uic` suspendido por Render después de varias caídas durante 24 horas. El commit visible es `e5df475`, correspondiente a la revisión previa desplegada.

## Riesgos técnicos detectados en la revisión previa

1. El `pg.Pool` no tenía manejador del evento `error`. Una desconexión de un cliente inactivo de PostgreSQL/Neon puede emitir ese evento; sin listener, Node puede finalizar el proceso.
2. La tabla `benefits` utiliza `start_date` y `end_date`, pero una base preexistente podía no recibir esas columnas porque `CREATE TABLE IF NOT EXISTS` no altera una tabla ya creada. Faltaban migraciones `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para esos campos.
3. El arranque dependía completamente de que Neon respondiera. Una falla transitoria durante la inicialización podía impedir que el servidor quedara escuchando el puerto de Render.
4. El health check dependía de Neon. Una indisponibilidad temporal podía devolver 503 repetidamente.

## Corrección v3.7.1

- Agrega las migraciones aditivas faltantes.
- Maneja errores del pool PostgreSQL sin finalizar Node.
- Permite arrancar con catálogo local de respaldo si Neon no responde temporalmente.
- Permite que el health check siga respondiendo desde el catálogo local durante una falla temporal de Neon.
- No borra ni reemplaza datos de Neon.
