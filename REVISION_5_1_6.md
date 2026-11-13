# Revisión 5.1.6 — corrección integral del calendario mensual

## Objetivo
Corregir la regresión que podía consumir el cupo mensual por una aprobación en Modo PRUEBA o por una distribución limitada a destinatarios internos.

## Cambios
1. Tecno Logisti-K S.A. queda como única empresa piloto con oportunidades ilimitadas.
2. Las campañas de prueba/control no crean ni actualizan el calendario mensual.
3. Sólo una distribución general habilitada al padrón consume el cupo.
4. Los rechazos continúan sin consumir cupo.
5. Las cancelaciones distinguen campañas generales de campañas de control.
6. El monitor informa expresamente cuando una campaña de prueba/control no consumió el cupo.
7. Al desplegar, se reparan bloqueos históricos demostrablemente originados por destinatarios internos de control, sin tocar campañas generales legítimas.
8. Se agregan `distribution_mode` y `quota_consumed_at` para trazabilidad futura.

## Seguridad de la reparación
La migración es conservadora: si no puede demostrarse que un bloqueo provino sólo de una campaña de control, no lo elimina automáticamente.
