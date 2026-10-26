# REVISIÓN v3.9.9.0

Fecha: 26/10/2026

## Objetivo
Ampliar el padrón de Difusión de Beneficios incorporando contactos suscriptos de Mailchimp sin alterar ni duplicar los registros ya existentes.

## Resultado del cruce
- Contactos Mailchimp analizados: 215
- Coincidencias contra el padrón del Portal por e-mail normalizado: 13
- Coincidencias descartadas: 13
- Altas nuevas: 202
- Registros semilla finales: 319
- Correos únicos finales: 313

## Criterio de negocio
- El e-mail es la clave de deduplicación.
- Si el e-mail ya existe, no se incorpora el nuevo contacto.
- Prevalece íntegramente el registro que ya estaba en la base.
- Las nuevas altas se clasifican internamente como `Socio a confirmar`.
- La clasificación no aparece en los mensajes y no modifica el trato al destinatario.
- Todos los contactos habilitados participan del padrón general de envío en igualdad de condiciones.
- Una misma dirección recibe una sola copia por campaña.

## Seguridad adicional
- Alta manual: rechaza e-mail ya existente.
- Edición: impide cambiar un contacto a un e-mail utilizado por otro registro.
- `Socio a confirmar` no se usa para autorizar acceso como beneficiario de convenios.
- Se mantiene la deduplicación final antes de generar la cola de distribución.
