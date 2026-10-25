# Revisión 3.9.5 — Monitor, cola cancelable y calendario mensual fijo

Fecha: 25/10/2026  
Versión: `3.9.5`  
Generación: `BENEFICIOS_UIC_395`

## Objeto

Agregar al módulo **Difusión de Beneficios** un sistema persistente de cola y monitoreo para que cada empresa pueda conocer el estado real de sus comunicaciones, estimar cuándo comenzarán y finalizarán, y cancelar trabajos pendientes o en curso. Al mismo tiempo, se redefine el cupo de difusión como una oportunidad mensual fija por beneficio, no acumulativa y anclada a la fecha de la primera autorización.

## Monitor de envíos

Cada beneficiario dispone en su panel de un **Monitor de envíos**. La misma vista puede ser inspeccionada por el administrador mediante **Ver como empresa**.

Estados principales:

- `EN COLA`: aprobado, esperando a los trabajos anteriores.
- `ENVIANDO`: distribución activa.
- `FINALIZADO`: no quedan destinatarios pendientes.
- `CANCELADO`: se detuvo el trabajo por decisión de la empresa o del administrador actuando como empresa.

Por campaña se muestran:

- beneficio;
- fecha/hora de autorización;
- enviados / total;
- pendientes;
- fallidos;
- posición de cola;
- inicio estimado;
- finalización estimada;
- próxima oportunidad mensual.

La pantalla consulta el estado nuevamente cada 5 segundos mientras está visible.

## Cola persistente

La aprobación administrativa ya no dispara todo el padrón dentro de una única petición HTTP. En cambio:

1. se envía la copia final al originador;
2. se fija/consume la oportunidad mensual;
3. se crea una fotografía deduplicada de los destinatarios habilitados;
4. la campaña queda `queued`;
5. un worker procesa un destinatario por vez;
6. cada resultado queda almacenado individualmente en Neon.

Tabla nueva: `diffusion_campaign_queue_recipients`.

Esto permite saber exactamente qué correos ya salieron y cuáles siguen pendientes.

## Cancelación

Un trabajo `queued` puede cancelarse inmediatamente.

Un trabajo `sending` registra `cancel_requested_at`; el worker detiene la campaña antes de iniciar el siguiente destinatario.

Los correos que ya fueron enviados no se intentan retirar ni repetir. Si justo había un SMTP en curso al momento de cancelar, ese único correo puede completar técnicamente su transmisión; después no se inicia ningún destinatario adicional.

Al cancelar:

- se conservan los contadores de enviados/fallidos;
- los pendientes pasan a cancelados;
- se elimina el cuerpo/adjuntos de la campaña igual que al finalizar;
- el cupo mensual ya utilizado **no se recupera**.

## Calendario mensual fijo

Tabla nueva: `diffusion_benefit_schedules`.

La primera aprobación de un beneficio establece `anchor_date`.

Ejemplo: aprobación inicial `05/10/2026`.

- 05/10 → 05/11: una oportunidad.
- 05/11 → 05/12: una oportunidad.
- 05/12 → 05/01: una oportunidad.

Si el trabajo autorizado el 05/10 empieza o termina el 20/10, el siguiente ciclo sigue abriendo el 05/11.

Si se cancela el 20/10, también sigue abriendo el 05/11.

Si noviembre no se utiliza, diciembre ofrece una sola oportunidad. **No existe acumulación.**

Para anclas 29/30/31, los meses cortos utilizan el último día disponible y el calendario recupera luego el día original.

## Estimaciones

Variable opcional:

`DIFFUSION_SEND_INTERVAL_MS=5000`

El monitor calcula la estimación según los destinatarios restantes de los trabajos anteriores y el intervalo configurado. La estimación es orientativa porque la latencia del SMTP puede variar.

## Recuperación ante reinicio

Al iniciar el servidor:

- un destinatario que hubiera quedado `sending` se marca como fallido/indeterminado y no se reintenta automáticamente para evitar duplicados;
- una campaña `sending` vuelve a `queued` y continúa con los pendientes;
- si ya existía una cancelación solicitada, la campaña queda cancelada.

No se borra la cola ni se vuelve a generar desde cero.

## Modo piloto

Con `DIFFUSION_MASS_SEND_ENABLED=false`, la cola se crea solamente con TECNO LOGISTI-K SA como destino de control. Esto permite probar monitor, tiempos, cancelación y calendario sin abrir el padrón general.

## Compatibilidad

La migración es aditiva. No elimina:

- beneficios;
- padrón de destinatarios;
- cuentas de empresa;
- configuraciones SMTP;
- campañas anteriores.
