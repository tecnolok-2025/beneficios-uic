# Instalación v3.9.9.0 en el repositorio y Render actuales

Esta entrega puede aplicarse directamente sobre **v3.9.8.8** para ampliar el padrón de destinatarios con control estricto de duplicados. También se provee versión completa v3.9.9.0. Conserva acumulativamente todas las mejoras anteriores. Conserva el servicio Render, la URL y la base PostgreSQL/Neon existentes. No borra catálogo, padrón, cuentas, trazabilidad ni campañas autorizadas. Los borradores de trabajo continúan siendo exclusivamente locales `.uicpub`; la limpieza automática sólo purga `draft/blocked` que no tengan prueba enviada ni verificada.

## GitHub / Render

1. Si el repositorio desplegado está en **v3.9.8.8**, aplicar el parche `v3.9.8.8 → v3.9.9.0`. Si existe duda sobre el estado del repositorio, usar el ZIP completo.
2. Mantener `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `IP_HASH_SALT`, `DIFFUSION_MAIL_SECRET` y las demás variables de Difusión existentes.
3. No cambiar `DIFFUSION_MAIL_SECRET` si ya existe: protege la contraseña SMTP cifrada guardada en Neon.
4. Los comandos continúan siendo `npm ci --include=dev && npm run build` y `npm start`.
5. El arranque debe informar `Beneficios UIC NUEVO v3.9.9.0 · BENEFICIOS_UIC_3990`.
6. No crear un servicio nuevo de Render ni una base nueva de Neon.

## Variables de Difusión

Configuración recomendada durante el desarrollo:

```text
DIFFUSION_MASS_SEND_ENABLED=false
DIFFUSION_SEND_ENABLED=false
DIFFUSION_FROM_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_FROM_NAME=Unión Industrial de Campana · Beneficios
DIFFUSION_APPROVAL_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_MAIL_SECRET=<secreto estable, largo y privado>
DIFFUSION_SEND_INTERVAL_MS=45000
```

`DIFFUSION_SEND_INTERVAL_MS=45000` equivale a 45 segundos. La v3.9.8.3 aplica **45.000 ms como mínimo efectivo**, aunque una variable anterior conserve accidentalmente un valor menor.

## Modo PRUEBA — protección principal

La v3.9.8.7 conserva `test_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE` en Neon. Por lo tanto, después del primer arranque de esta versión el **Modo PRUEBA queda activado por defecto**.

Mientras está activo, la distribución autorizada puede dirigirse únicamente a estos tres correos de control:

1. **UNIÓN INDUSTRIAL DE CAMPANA** — `uic@uic-campana.com.ar` — María José Godoy (Majo) — `3489 65 0104`.
2. **INDUSVAR GROUP** — `nestor.manucci@gmail.com` — Néstor Manucci — `11 6681 2532`.
3. **TECNO LOGISTI-K SA** — `nestor.manucci@tecnolok.com.ar` — Néstor Manucci — `011 66812532`.

La seguridad es doble:

- al aprobar una campaña, el servidor construye la cola exclusivamente con esa lista blanca;
- inmediatamente antes de cada envío SMTP, el worker vuelve a validar la dirección. Si no pertenece a la lista, la marca como bloqueada/cancelada y no la envía.

Además, al activar Modo PRUEBA se fuerza `mass_send_enabled=FALSE` y se cancelan destinatarios pendientes ajenos a la lista blanca.

Para salir de Modo PRUEBA el administrador debe escribir exactamente `SALIR DE PRUEBA`. Aun después, el padrón general **no queda habilitado automáticamente**: para eso existe una segunda barrera independiente que exige `HABILITAR`.

> Importante: ningún sistema puede retirar un correo que ya haya sido aceptado por el servidor SMTP antes de activar nuevamente Modo PRUEBA. La protección evita nuevos envíos desde que el control está activo.

## Correos técnicos y de identidad

El Modo PRUEBA limita la **distribución de campañas autorizadas**. No bloquea los correos transaccionales necesarios para operar una cuenta, como códigos de registro/recuperación o la prueba obligatoria enviada al correo propio de la empresa beneficiaria. Estos mensajes nunca se envían al padrón general.

## Panel administrador

El estado de Modo PRUEBA aparece de forma visible en la administración junto con los tres destinatarios autorizados. Este control no aparece en el lado beneficiario.

También se mantiene la segunda protección de **Habilitar envío al padrón general**, que permanece bloqueada mientras Modo PRUEBA está activo.

## Claves visibles bajo demanda

Todos los campos de contraseña o clave visibles incorporan el ícono de ojo para mostrar/ocultar lo que se está escribiendo:

- clave administrativa;
- contraseña de beneficiario;
- creación de contraseña;
- recuperación/cambio de contraseña;
- contraseña SMTP.

El ojo no permite recuperar secretos previamente guardados. En particular, la contraseña SMTP almacenada sigue cifrada y no se devuelve al navegador.

## Difusión de Beneficios en portada

El acceso **Difusión de Beneficios** conserva su ubicación. En v3.9.8.7 la pantalla pública de ingreso destaca además el acceso de beneficiarios por convenio sin exponer empresas internas de prueba.


## Archivos de trabajo locales — sin consumo de Neon

La v3.9.8.7 conserva eliminado **Mis publicaciones guardadas** del panel beneficiario. El constructor trabaja con archivos locales `.uicpub`:

- **Guardar archivo en mi PC** descarga un archivo que contiene textos, diseño, imágenes, adjuntos y firma.
- **Abrir archivo local** reconstruye el trabajo directamente desde el disco del usuario y no consulta Neon.
- Se pueden conservar 5, 20, 100 o más versiones locales sin ocupar la base.
- Neon recién recibe una instancia cuando se pulsa **Enviar correo de prueba**, porque desde ese momento el contenido debe existir temporalmente en el servidor para prueba, código, validación y distribución.
- Antes de crear una instancia operativa nueva, el servidor elimina cualquier `draft/blocked` anterior del mismo beneficio y correo para impedir acumulación.
- Al arrancar esta versión se purgan los borradores remotos heredados de revisiones anteriores.
- Los envíos `pending`, `queued`, `sending`, `sent` o `cancelled` y su trazabilidad se conservan.

La extensión `.uicpub` es deliberadamente específica para que el usuario pueda identificar el archivo como una publicación de Beneficios UIC y volver a abrirlo desde el mismo constructor.

## Firma editable

Nombre, cargo/función, correo visible y teléfono visible de la firma pueden modificarse dentro del constructor. Estos cambios afectan únicamente la presentación del correo: la prueba de identidad continúa enviándose al **correo registrado de la empresa**.

## Aviso rojo y doble confirmación

Mientras Modo PRUEBA esté activo, Administración muestra una banda roja permanente. La autorización final de una campaña requiere dos pasos independientes. La prueba técnica SMTP también requiere dos pasos.

## Constructor, trazabilidad y bajas

Se mantienen íntegros los componentes de v3.9.8.1:

- Constructor Visual UIC con 8 modelos;
- máximo 4 imágenes y control de tamaño;
- vista previa escritorio/celular;
- franja institucional y logo de Beneficios;
- desuscripción visible y efectiva;
- trazabilidad de aperturas detectadas;
- resumen agregado para beneficiarios y detalle por empresa/correo para administración UIC;
- cola persistente, monitor, cancelación y calendario mensual fijo no acumulativo.


## Cambios operativos v3.9.8.7

- Firma editable: nombre, cargo, correo, teléfono, **web y logo**.
- En Chrome/Edge de PC, **Elegir dónde guardar `.uicpub`** permite seleccionar carpeta y nombre; otros navegadores usan Descargas.
- En Validaciones, la salida de Modo PRUEBA y la habilitación del padrón son dos acciones separadas y explícitas.
- La tarjeta pendiente muestra los datos del firmante y vínculos directos de contacto.
- La baja de email exige abrir una pantalla y escribir `BAJA`; visitar el enlace no ejecuta ninguna modificación.
- El HTML de los correos apila imágenes y columnas en pantallas móviles de hasta 600 px.
- El monitor sigue también los estados anteriores a la autorización: prueba, código y espera de validación.
- Para reducir consumo de Neon, el monitor actualiza cada 15 s sólo si hay cola/envío, cada 45 s si espera validación y no hace polling cuando sólo hay historial.

## Prueba recomendada después del deploy

1. Abrir el Portal y confirmar `v3.9.8.7`.
2. Verificar que **Difusión de Beneficios** esté destacado en la portada.
3. Ingresar **Como administrador**.
4. Confirmar visualmente **MODO PRUEBA ACTIVADO** y los tres destinatarios exactos.
5. Confirmar que el interruptor del padrón general figure bloqueado por Modo PRUEBA.
6. Probar los ojos de todas las claves.
7. Entrar como beneficiario de una empresa de prueba, crear una publicación, guardarla como `.uicpub`, cerrarla, volver a abrirla y confirmar que recupera textos, imágenes, adjuntos y firma.
8. Aprobarla desde administración y verificar que la cola contenga únicamente los tres destinos de prueba.
9. Revisar monitor y trazabilidad antes de considerar cualquier salida del Modo PRUEBA.

## Validaciones de entrega

- `npm test`: **106/106 pruebas aprobadas**.
- `node --check server/index.js`: aprobado.
- Parseo de `src/App.jsx` con TypeScript 5.8.3 (`jsx: preserve`, `noEmit`): aprobado.
- El parche acumulativo debe compararse con el ZIP completo antes de publicar la entrega final.
