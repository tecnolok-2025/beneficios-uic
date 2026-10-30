# Auditoría v3.9.9.2

- Alcance: autenticación administrativa y recuperación de sesión.
- Padrón: sin modificaciones respecto de v3.9.9.1.
- Sesión: 8 horas, renovable por actividad administrativa válida.
- Operación con sesión vencida: HTTP 401 + `ADMIN_SESSION_EXPIRED`; no modifica Neon.
- Frontend: captura global del vencimiento y retorno controlado al login.
- Recuperación: botón para cerrar sesión residual y volver a Difusión.
