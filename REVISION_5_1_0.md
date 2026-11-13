# Revisión v5.1.0 · 12/11/2026

## Registro público para recibir beneficios
- Quinto acceso de portada: **Recibir beneficios**.
- Formulario con nombre, apellido, empresa, CUIT opcional, teléfono opcional, correo + repetición, socio UIC sí/no y actividad Fabricación / Logística / Servicios / Ninguna.
- El formulario no incorpora contactos automáticamente: crea una solicitud pendiente en Neon.
- El email normalizado es la clave para evitar duplicados; un email diferente se considera otro contacto.

## Doble seguridad humana
- Honeypot silencioso contra automatismos básicos.
- Confirmación obligatoria **Estoy seguro**.
- Escritura obligatoria de la palabra **REGISTRARME**.
- Ambas validaciones se controlan en frontend y también en servidor.
- Rate limit público conservado.

## Nuevos contactos · aprobación administrativa
- Nueva pestaña privada **Nuevos contactos**.
- Cada solicitud tiene una única decisión: **Aprobar** o **Rechazar**.
- Botón único **Guardar decisiones**.
- Aprobar crea un contacto nuevo o completa sólo campos vacíos si el email ya existe.
- Una baja vigente nunca se reactiva automáticamente.
- Rechazar elimina definitivamente la solicitud pendiente de `diffusion_contact_requests` tras confirmación administrativa.
- Acciones masivas: Aprobar todos, Rechazar todos y Limpiar decisiones.

## Datos estructurados
- `activity_type` queda guardado en el padrón para futura segmentación.
- Nueva tabla `diffusion_contact_requests` para solicitudes pendientes.

## QA
- 153 pruebas aprobadas, 0 fallidas.
- `node --check server/index.js`: aprobado.
- Build Vite local no ejecutable en este entorno porque `vite` no está instalado en node_modules; Render mantiene instalación/build en deploy.
