# AUDITORÍA v3.9.9.0

Base de origen: v3.9.8.8 · BENEFICIOS_UIC_3988
Nueva generación: BENEFICIOS_UIC_3990

Controles:
- 215 contactos Mailchimp recibidos.
- 13 e-mails ya presentes: no se incorporan nuevamente.
- 202 e-mails nuevos clasificados como `socio_confirmar`.
- Los registros existentes no se pisan ni se renombran.
- El envío masivo sigue deduplicando por e-mail.
- La clasificación `Socio a confirmar` es administrativa y no se expone al destinatario.
- Estos contactos no amplían el universo de empresas habilitadas para registrarse como beneficiarias.
- Se agrega bloqueo preventivo de duplicados en altas y ediciones administrativas.
