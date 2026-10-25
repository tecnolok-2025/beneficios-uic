# Auditoría técnica v3.9.5 — Cola, monitor y calendario mensual

Fecha: 25/10/2026  
Versión: `3.9.5`  
Generación: `BENEFICIOS_UIC_395`

## Alcance auditado

1. Persistencia de la cola en Neon.
2. Registro individual de cada destinatario.
3. Monitor exclusivo de la empresa y vista administrativa equivalente.
4. Posición y estimaciones de cola.
5. Cancelación antes y durante la distribución.
6. Preservación de correos ya enviados.
7. Calendario mensual anclado a la primera autorización.
8. No acumulación de oportunidades no utilizadas.
9. Persistencia de la fecha mensual aun cuando el envío se demore o cancele.
10. Recuperación después de reinicio.
11. Conservación del piloto TECNO LOGISTI-K SA.

## Estructura de datos

Se agregan de forma aditiva:

- columnas de avance/cancelación en `diffusion_campaigns`;
- `diffusion_campaign_queue_recipients`;
- `diffusion_benefit_schedules`.

No se ejecutan `DROP`, truncados ni reemplazos destructivos de tablas existentes.

## Comportamiento de cancelación

- `queued`: cancelación inmediata.
- `sending`: se registra solicitud y el worker se detiene antes de iniciar el próximo destinatario.
- enviados: permanecen enviados.
- pendientes: pasan a cancelados.
- próxima fecha: se conserva la fecha mensual fijada al autorizar.

## Regla mensual verificada

Se probó el algoritmo con anclas normales y de fin de mes:

- ancla 05/10 → ciclo 05/10–05/11;
- ancla 05/10 y fecha 20/12 → ciclo 05/12–05/01;
- ancla 31/01 → 28/02 y luego recupera 31/03;
- ancla 31/01 → 30/04 cuando abril es el ciclo correspondiente.

## Controles ejecutados

- `npm test`: **70/70 aprobadas**.
- `node --check server/index.js`: aprobado.
- Parseo de `src/App.jsx` con TypeScript, `jsx: preserve`, `noEmit`: aprobado.
- Prueba del algoritmo de calendario con casos 5, 28, 30 y 31: aprobada.

## Build local

Se intentó `npm ci --include=dev --ignore-scripts`, pero el proceso volvió a superar el tiempo disponible antes de instalar Vite. Por ese motivo `npm run build` local no pudo ejecutarse (`vite: not found`). No se marca el build como aprobado. Render conserva el comando de instalación/build habitual y debe realizar la compilación durante el despliegue.

## Observación operativa

El monitor utiliza una estimación basada en `DIFFUSION_SEND_INTERVAL_MS` y cantidad de destinatarios pendientes. La respuesta efectiva del SMTP puede hacer variar el horario real.
