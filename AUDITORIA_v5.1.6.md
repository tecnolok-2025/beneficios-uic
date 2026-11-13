# Auditoría técnica v5.1.6 — cupos mensuales y empresa piloto

Fecha: 13/11/2026

## Hallazgo principal
La lógica introducida en revisiones recientes consumía `diffusion_benefit_schedules` al aprobar una campaña aun cuando la distribución estaba en Modo PRUEBA o limitada exclusivamente a los destinatarios internos de control. Eso podía dejar a empresas con convenio mostrando “Oportunidad utilizada” sin haber distribuido realmente al padrón general.

## Regla definitiva
- **Tecno Logisti-K S.A.**: única empresa piloto con oportunidades ilimitadas. Nunca conserva bloqueo mensual.
- **Prueba / control interno**: no consume oportunidad mensual.
- **Validación rechazada**: no consume oportunidad mensual y puede rehacerse inmediatamente.
- **Distribución general al padrón**: consume una oportunidad del ciclo mensual al aprobarse.
- **Cancelación de una campaña general ya aprobada**: el cupo queda consumido.
- **Cancelación de una campaña de prueba/control**: no consume cupo.

## Reparación de datos heredados
Al iniciar v5.1.6 se auditan los registros existentes en `diffusion_benefit_schedules`.
- Se eliminan siempre los schedules de Tecno Logisti-K S.A.
- Para otras empresas sólo se libera un schedule si la campaña que lo originó tuvo exclusivamente destinatarios pertenecientes a la lista blanca interna de control.
- Si la campaña tuvo distribución general real, el schedule se conserva.
- Ante datos históricos insuficientes o ambiguos, se adopta el criterio conservador y no se elimina el bloqueo.

## Refuerzo de trazabilidad
Se agregan a `diffusion_campaigns`:
- `distribution_mode`: `general`, `test_mode`, `control_only` o `legacy_control`.
- `quota_consumed_at`: fecha/hora en la que una campaña general consumió efectivamente su oportunidad.

Esto permite que monitor, cancelación y futuras auditorías distingan de forma explícita una prueba de una distribución general.

## Validación
- 160 pruebas automáticas aprobadas.
- 0 fallidas.
- `node --check server/index.js` aprobado.
- Se verificó que `diffusion_benefit_schedules` sólo se modifica desde la autorización general y desde la reparación controlada de registros heredados.
