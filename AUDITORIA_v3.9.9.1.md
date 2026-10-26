# Auditoría v3.9.9.1

Fecha: 26/10/2026

## Corrección crítica
- Se detectó que la tabla Neon `diffusion_recipients` conservaba el CHECK histórico que sólo admitía `socio`, `convenio` y `manual`.
- Por ese motivo la interfaz v3.9.9.0 podía mostrar la categoría **Socio a confirmar**, pero los 202 registros nuevos no podían insertarse en la tabla viva.
- v3.9.9.1 migra automáticamente el CHECK para admitir `socio_confirmar` antes de ejecutar la sincronización del padrón.
- Se conserva la regla de deduplicación por e-mail: si la casilla ya existe, prevalece el registro histórico y no se crea otro.
- Los contactos `socio_confirmar` sí participan de los envíos masivos cuando están habilitados y con correo válido; no obtienen acceso como beneficiarios de convenio.
