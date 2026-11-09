# AUDITORÍA v4.0.7

## Alcance
Cambio limitado al Monitor de envíos y a la optimización de consultas a Neon.

## Resultado
- Nueva celda: **Aperturas totales**.
- La métrica `total_opens` NO se calcula al abrir el Monitor.
- Al abrir el Monitor se devuelve `total_opens = null`, visualizado como `—`.
- Sólo al presionar **Actualizar** / **Actualizar estado** se envía `refreshMetrics=1`.
- Con `refreshMetrics=1` el backend ejecuta una única consulta agregada `SUM(open_count)` para las campañas visibles.
- Eliminado el polling automático del frontend (15 s / 45 s).
- No se crean tablas nuevas ni se persisten agregados nuevos en Neon.
- La cola de envío SMTP sigue funcionando normalmente; no se modificó su temporizador interno.
- Se mantienen los 50 contactos corporativos validados de v4.0.6 sin cambios.
- Generación: `BENEFICIOS_UIC_4070`.

## Verificación
- Pruebas automatizadas: **140 aprobadas / 0 fallidas**.
- `src/App.jsx`: sin `setInterval`.
- `server/index.js`: `total_opens` se carga sólo bajo `refreshMetrics=1`.
- `index.html`: `BENEFICIOS_UIC_4070` y `/boot-recovery.js?v=4070`.
- Build Vite: no pudo ejecutarse en este entorno porque la reinstalación de dependencias agotó el tiempo antes de instalar Vite; no hubo error de compilación detectado.
