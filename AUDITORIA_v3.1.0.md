# Auditoría general — Beneficios UIC v3.1.0

Fecha de revisión: 03/09/2026.

## Resultado general

El proyecto presenta una arquitectura simple y adecuada para el volumen actual: React/Vite en frontend, Express en backend y PostgreSQL/Neon para persistencia. La base existente se preserva mediante migraciones aditivas y carga inicial con `ON CONFLICT (slug) DO NOTHING`, por lo que el despliegue de esta revisión no debe borrar ni reemplazar ediciones ya guardadas en Neon.

## Verificaciones realizadas

1. Estructura del repositorio, scripts, configuración de Render y versión de Node.
2. Flujo público: catálogo, filtros, búsqueda, detalle, contactos, flyers y trazabilidad.
3. Flujo administrativo: autenticación, CRUD, contactos de empresa, publicación y carga de imágenes.
4. Persistencia y migraciones de Neon.
5. Control de caché y neutralización de Service Workers heredados.
6. Pruebas automatizadas y coherencia de versión/generación.
7. Responsive principal y legibilidad de tarjetas y panel administrativo.

## Hallazgos y acciones

### Corregido en 3.1.0

- El listado administrativo no tenía buscador y se volvía poco escalable a medida que aumentaban los beneficios.
- El logotipo central de UIC era una representación tipográfica y no el logo institucional provisto.
- La empresa/prestador tenía jerarquía visual insuficiente, especialmente en el listado administrativo.
- El respaldo local podía mostrar elementos no publicados si Neon estaba configurado pero vacío.
- La creación admitía, en un caso límite, un título incapaz de generar un slug válido.
- La eliminación administrativa no distinguía un registro inexistente y la interfaz no capturaba el error.
- Persistían rótulos “Consultar asociación”; se unificaron como “Hacete socio”.

### Correcto y conservado

- `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` e `IP_HASH_SALT` siguen siendo variables externas; no se incorporan secretos al repositorio.
- La sesión administrativa utiliza cookie `httpOnly`, `secure` en producción y `sameSite=strict`.
- El acceso administrativo tiene limitación de intentos.
- Las cargas de imágenes están limitadas a 12 MB por archivo y 10 archivos por operación.
- Los datos iniciales sólo se insertan si el slug no existe; no hay actualización masiva destructiva sobre Neon.
- Los assets compilados usan cache inmutable y el HTML/API mantienen estrategia anticaché.
- `.node-version` mantiene Node 24.14.1 y `package.json` limita el motor a Node 22–24.

## Riesgos no bloqueantes

- El detalle de un beneficio obtiene actualmente el catálogo completo y luego filtra por slug. Para 25–100 beneficios el impacto es bajo; si el catálogo crece mucho convendría consultar directamente por slug en PostgreSQL.
- Los flyers se guardan como `BYTEA` en Neon. Es práctico para el volumen actual, pero un crecimiento fuerte de material visual podría justificar almacenamiento de objetos externo.
- La trazabilidad registra hash y máscara de IP además del user-agent. Conviene mantener una política institucional de retención y privacidad acorde al uso real de esos datos.

## Conclusión

La revisión es apta para reemplazar el código del repositorio actual conectado a Render, manteniendo el mismo servicio y la misma base Neon. No requiere crear otro proyecto ni otra base de datos.
