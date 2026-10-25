# Auditoría técnica v3.9.4 — Acceso beneficiario y navegación

Fecha: 25/10/2026  
Versión: `3.9.4`  
Generación: `BENEFICIOS_UIC_394`

## Alcance auditado
- selector inicial **Como administrador / Como beneficiario**;
- acceso público al directorio de empresas sin exposición de correos;
- registro, ingreso y recuperación por correo previamente asociado;
- comportamiento de TECNO LOGISTI-K SA en rol administrador y rol beneficiario;
- exclusión de Destinatarios, Validaciones y Correo emisor del rol empresa;
- navegación Portal ↔ Difusión ↔ Administración ↔ Detalle sin refresco manual;
- conservación del piloto TLK y del bloqueo del padrón masivo general.

## Resultados
- `node --test`: **66/66 pruebas aprobadas**.
- `node --check server/index.js`: correcto.
- `node --check src/search.js`: correcto.
- `node --check src/status.js`: correcto.
- Catálogo: **51 beneficios / 16 categorías** sin cambios.
- Padrón: se conserva la base v3.9.3 sin modificaciones de destinatarios.
- El acceso empresa continúa validando el correo contra los contactos autorizados y excluye `uic@uic-campana.com.ar` como llave de identidad.
- Al elegir **Como beneficiario**, una sesión administrativa activa se cierra antes de comprobar la sesión de empresa. Esto permite auditar permisos reales de beneficiario y evita que las rutas de campañas interpreten al usuario como administrador.
- Al elegir **Como administrador**, se utiliza la misma sesión/clave `ADMIN_PASSWORD` del Portal.
- La navegación ya no genera manualmente `PopStateEvent`; usa el evento interno `uic:navigate` y mantiene el evento nativo `popstate` únicamente para Atrás/Adelante del navegador.

## Seguridad de envíos
La v3.9.4 no cambia la política de distribución de v3.9.3. Con `DIFFUSION_MASS_SEND_ENABLED=false`, el padrón general permanece bloqueado y TECNO LOGISTI-K SA continúa como destino piloto/control.

## Compilación frontend
Se intentó `npm ci --include=dev --prefer-offline --no-audit --no-fund`, pero el entorno de trabajo agotó el tiempo disponible antes de completar la descarga/instalación y no llegó a instalar el binario de Vite. Por ese motivo no se declara `npm run build` como ejecutado localmente. Render mantiene el proceso de instalación y build configurado en el despliegue.
