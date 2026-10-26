# Auditoría técnica · Beneficios UIC v3.9.8.7

Fecha: 26/10/2026

- Verificación de versión/generación: 3.9.8.7 / BENEFICIOS_UIC_3987.
- Los tres destinos de prueba se materializan también como empresas `testMode`.
- El endpoint de selección devuelve empresas reales y de prueba, marcando `testMode`.
- UIC, INDUSVAR GROUP y TECNO LOGISTI-K SA mantienen autenticación por correo exacto.
- El servidor fuerza campañas de empresas `testMode` a la lista blanca cerrada de tres destinatarios, independientemente del estado global del padrón.
- La protección evita que una empresa de prueba pueda disparar una distribución general por error.
- Batería automática ampliada con controles específicos de convivencia y fail-safe.
