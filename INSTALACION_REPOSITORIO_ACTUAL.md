# Instalación v3.9.8.1 en el repositorio y Render actuales

Esta entrega reemplaza v3.9.4 y conserva el servicio Render, la URL y la base PostgreSQL/Neon actuales. La migración es **aditiva**: incorpora cola persistente, monitor de avance, cancelación y calendario mensual fijo por beneficio sin eliminar catálogo, padrón, cuentas ni campañas existentes.

## GitHub / Render

1. Reemplazar el contenido del repositorio por el ZIP completo o aplicar el parche **sólo sobre v3.9.4**.
2. Mantener `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `IP_HASH_SALT` y las variables de Difusión existentes.
3. Los comandos continúan siendo `npm ci --include=dev && npm run build` y `npm start`.
4. El arranque debe informar `Beneficios UIC NUEVO v3.9.8.1 · BENEFICIOS_UIC_3981`.
5. No crear un servicio nuevo de Render ni una base nueva de Neon.

## Variables de Difusión

Mantener durante el piloto:

```text
DIFFUSION_MASS_SEND_ENABLED=false
DIFFUSION_SEND_ENABLED=false
DIFFUSION_FROM_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_FROM_NAME=Unión Industrial de Campana · Beneficios
DIFFUSION_APPROVAL_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_MAIL_SECRET=<secreto estable, largo y privado>
DIFFUSION_SEND_INTERVAL_MS=5000
```

`DIFFUSION_SEND_INTERVAL_MS` es opcional. `5000` significa que la cola intenta iniciar como máximo un nuevo destinatario aproximadamente cada 5 segundos. El tiempo real puede variar por la respuesta del servidor SMTP; el monitor muestra una **estimación orientativa**, no una promesa exacta.

`DIFFUSION_MAIL_SECRET` cifra la clave SMTP almacenada desde **Difusión > Correo emisor**. No debe guardarse en GitHub y no debe cambiarse después de guardar la clave SMTP, salvo que se vuelva a cargar esa configuración.

La dirección provisional de emisión y validación es `tesoreria@uic-campana.com.ar`. Cuando exista `beneficios@uic-campana.com.ar`, puede reemplazarse desde la configuración y la variable de aprobación. El correo institucional general UIC no se utiliza para este circuito privado ni para identificar empresas.

## Flujo v3.9.5

1. La empresa ingresa con su cuenta propia.
2. Prepara el beneficio, guarda el borrador y envía la prueba obligatoria.
3. Verifica el código de 6 dígitos recibido en su correo.
4. Solicita validación UIC.
5. El administrador aprueba en **Validaciones**.
6. La empresa recibe primero la copia final que confirma la aprobación.
7. En ese momento la oportunidad mensual queda **consumida** y el envío entra en la cola persistente.
8. El beneficiario ve el trabajo en **Monitor de envíos**, con posición, avance y tiempos estimados.
9. La cola envía los destinatarios uno por uno y registra cada correo como enviado o fallido.
10. El beneficiario puede cancelar. Los ya enviados no se revierten y los pendientes se detienen.

## Calendario mensual fijo

La primera aprobación real de cada beneficio fija su **día de referencia**.

Ejemplo: primera aprobación `05/10/2026`.

- Ciclo 1: 05/10/2026 → 05/11/2026.
- Ciclo 2: 05/11/2026 → 05/12/2026.
- Ciclo 3: 05/12/2026 → 05/01/2027.

Si el correo aprobado el día 5 recién empieza a distribuirse el día 20 por estar en cola, la próxima oportunidad sigue siendo el día 5 del mes siguiente.

Si se cancela el envío el día 20 después de haber enviado parte del padrón, la próxima oportunidad también sigue siendo el día 5 del mes siguiente.

Si una empresa no utiliza la oportunidad de noviembre, **no obtiene dos oportunidades en diciembre**. Los meses no se acumulan.

Para referencias en días 29, 30 o 31, un mes más corto utiliza su último día válido y, cuando el calendario vuelve a permitirlo, recupera el día de referencia original.

## Monitor y cancelación

El monitor muestra por cada trabajo:

- `EN COLA`, `ENVIANDO`, `FINALIZADO` o `CANCELADO`;
- enviados / total;
- pendientes;
- correos con error;
- posición en la cola global;
- inicio estimado;
- finalización estimada;
- próxima oportunidad mensual.

La pantalla se actualiza automáticamente mientras permanece abierta.

Al cancelar un trabajo en curso puede existir **como máximo un correo que ya se encuentre técnicamente en transmisión** y que alcance a completarse. Después de la solicitud de cancelación no se inicia ningún nuevo destinatario.

## Persistencia y reinicios

La cola vive en Neon. Si Render se reinicia durante una campaña:

- el trabajo no se pierde;
- un destinatario que hubiera quedado exactamente en estado `sending` se marca como fallido/indeterminado y **no se reenvía automáticamente**, para evitar una copia duplicada si el SMTP alcanzó a aceptarlo antes del reinicio;
- la campaña retorna a cola y continúa con los destinatarios pendientes siguientes;
- no se reinicia desde cero la lista completa.

## Modo piloto

Con `DIFFUSION_MASS_SEND_ENABLED=false`, el padrón general continúa bloqueado y **TECNO LOGISTI-K SA** es el único destino de control masivo. La cola, el monitor, la cancelación y el calendario mensual pueden probarse sin habilitar el padrón completo.

## Prueba específica v3.9.5

1. Entrar en **Difusión de Beneficios > Como beneficiario** con TECNO LOGISTI-K SA.
2. Preparar una comunicación, enviar prueba y verificar código.
3. Entrar como administrador y aprobarla.
4. Volver como beneficiario y confirmar que aparece en **Monitor de envíos**.
5. Verificar estado `EN COLA` o `ENVIANDO`, avance y próxima oportunidad.
6. Para probar cancelación, utilizar un intervalo suficientemente amplio o un trabajo con varios destinatarios en un entorno controlado.
7. Confirmar que cancelar no modifica la próxima fecha mensual.
8. Confirmar que un mes no utilizado no genera un cupo adicional en el siguiente.

## Validaciones realizadas antes de entregar

- `npm test`: 70/70 pruebas aprobadas.
- `node --check server/index.js`: aprobado.
- Parseo JSX con TypeScript (`jsx: preserve`, sin emisión): aprobado.
- `npm run build`: no pudo completarse localmente porque `npm ci` volvió a interrumpirse por timeout antes de instalar Vite. Render continuará ejecutando su instalación y build normal durante el despliegue.

## Revisión 3.9.6 — navegación

Después del despliegue, verificar especialmente:
1. abrir `/`;
2. entrar a **Difusión de Beneficios**;
3. elegir Administrador o Beneficiario;
4. volver al Portal;
5. repetir usando el botón Atrás del navegador.

Ninguno de esos pasos debe requerir F5 ni Enter. Si un navegador conserva una interfaz anterior, la v3.9.6 ejecuta recuperación automática de caché/Service Worker.


## Revisión 3.9.7 — Constructor Visual UIC

No requiere variables nuevas de entorno. La migración Neon es aditiva y se aplica al iniciar el servidor.

Después del deploy verificar:

1. Entrar a `Difusión de Beneficios` como beneficiario o como administrador → `Ver como empresa`.
2. Abrir `Preparar difusión`.
3. Confirmar que aparecen 8 modelos visuales.
4. Probar el pegado de un texto con negritas: debe pegarse limpio y permitir aplicar formato desde la barra.
5. Cargar 1, 2, 3 y 4 imágenes y cambiar entre modelos.
6. Revisar `Escritorio` y `Celular`.
7. Guardar borrador y enviar correo de prueba.
8. Confirmar que las imágenes llegan con tamaño contenido y que la franja UIC se conserva.
9. Probar el mensaje en Outlook y en un teléfono antes de habilitar cualquier envío masivo.

El padrón general continúa sujeto al interruptor de Validaciones y a `DIFFUSION_MASS_SEND_ENABLED`.


## Revisión 3.9.8.1 — trazabilidad y terminación del mail
No requiere un servicio Render nuevo ni una base Neon nueva. La migración es aditiva. El intervalo de cola tiene un mínimo de 45 segundos aun si la variable de entorno conserva un valor menor. Se recomienda dejar `DIFFUSION_SEND_INTERVAL_MS=45000` para que la configuración visible coincida con el comportamiento efectivo.
