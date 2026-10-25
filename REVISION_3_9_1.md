# Revisión 3.9.1 · Difusión de Beneficios UIC

Fecha: 24/10/2026
Generación: `BENEFICIOS_UIC_391`

## Alcance

La v3.9.1 desarrolla el piloto administrativo del módulo **Difusión de Beneficios** manteniendo el acceso público bloqueado. El módulo continúa utilizando la misma autenticación administrativa existente del Portal de Beneficios.

## Padrón privado de destinatarios

- 94 empresas socias provenientes del padrón UIC 2026.
- 19 empresas con convenio que no figuran como socias, con 23 contactos totales.
- Alta manual de nuevos destinatarios desde el panel privado.
- Buscador por empresa, contacto o correo.
- Una casilla **Recibe comunicaciones** por empresa.
- Destildar no borra datos; sólo excluye a la empresa de próximos envíos.
- Si una empresa posee dos contactos, una sola habilitación empresarial gobierna todos los contactos válidos.

## Correcciones confirmadas por UIC

- TECMACO INTEGRAL SA → `info@tecnodealer.com.ar`.
- MONTAJES INTERACERO SA → `info@montajesinteracero.com.ar`.
- PLAZA HOTEL CAMPANA SA → `martin@eraina.com.ar`.
- SWA pasa a denominarse **SWA/NEUCO**; se mantiene destildada hasta confirmar un correo.
- TIBEST se identifica en el padrón como **BULLETBABA SRL - TIBEST**.

## Empresa piloto

Se agrega un canal privado de prueba para:

- Empresa: **TECNO LOGISTI-K SA**.
- Responsable: **Néstor Manucci**.
- Cargo: **Director**.

Las demás empresas continúan sin acceso de edición/envío en esta etapa.

## Circuito protegido de comunicación

1. Guardar borrador.
2. Control automático inicial del contenido y archivos.
3. Enviar correo de prueba únicamente al responsable de la empresa. Este correo no consume el cupo mensual.
4. Solicitar validación a `uic@uic-campana.com.ar`.
5. La comunicación queda pendiente hasta aprobación administrativa.
6. La aprobación final exige escribir `ENVIAR` para reducir riesgo de clic accidental.
7. El primer correo final se envía siempre al responsable/originador.
8. Sólo si ese primer envío fue satisfactorio, se distribuye por CCO al padrón habilitado.
9. El plazo mensual comienza después del envío final aprobado.
10. Luego del envío se elimina del servidor el cuerpo de campaña y sus adjuntos; se conserva únicamente la trazabilidad mínima.

## Mantenimiento

Si Neon no se encuentra disponible, la zona de Difusión muestra un mensaje institucional de mantenimiento con contacto de Administración UIC. No se exponen mensajes técnicos de base de datos al usuario.

## Correo

El envío real permanece apagado por defecto mediante `DIFFUSION_SEND_ENABLED=false`. La cuenta SMTP y su contraseña deben configurarse únicamente como variables secretas de Render. Se incorpora `nodemailer` como dependencia de servidor.
