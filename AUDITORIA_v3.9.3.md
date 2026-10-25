# Auditoría técnica v3.9.3 — Difusión de Beneficios UIC

Fecha: 25/10/2026
Generación: `BENEFICIOS_UIC_393`

## Resultado general

**APROBADA para despliegue controlado/piloto**, manteniendo el envío masivo general deshabilitado hasta completar pruebas SMTP y validación funcional en Render.

## Pruebas automáticas

- `node --test tests/rebuild.test.js`: **63/63 aprobadas**.
- `node --check server/index.js`: **aprobado**.
- Parseo/transpilación de `src/App.jsx` con TypeScript JSX: **0 diagnósticos**.
- No se pudo completar `npm ci --include=dev --ignore-scripts` en el entorno de trabajo por timeout de acceso a dependencias; por ese motivo **no se declara `npm run build` como probado localmente**. Render conserva el proceso normal `npm ci --include=dev && npm run build`.

## Catálogo y padrón preservados

- 51 beneficios.
- 16 categorías.
- 113 empresas en el padrón de difusión.
- 117 contactos.
- 111 correos únicos.
- 94 socios UIC.
- 19 empresas de convenio/no socias.
- 4 empresas permanecen sin correo habilitado y no pueden registrarse hasta ser corregidas por Administración UIC.

## Registro y autenticación de empresas

- Directorio público de empresas sin exposición de correos.
- Registro sólo contra un correo previamente asociado a la empresa.
- Si la empresa no posee correo: alta bloqueada y derivación a Administración UIC.
- Si el correo no coincide: alta rechazada sin revelar el correo válido.
- `uic@uic-campana.com.ar` queda excluido expresamente como dirección apta para registrar empresas.
- Registro y recuperación utilizan códigos aleatorios de 6 dígitos con vencimiento.
- Contraseñas almacenadas con hash `scrypt`.
- Sesión de empresa separada de la sesión administrativa.
- El administrador puede utilizar **Ver como empresa** sin conocer ni modificar la contraseña del usuario.

## Permisos

Empresa:
- puede ver únicamente sus beneficios;
- preparar y guardar borradores;
- enviar prueba a su correo;
- verificar el código de 6 dígitos;
- solicitar validación UIC.

Empresa NO puede acceder a:
- Destinatarios;
- Validaciones;
- Correo emisor;
- configuración de masivos;
- administración de beneficios.

Administrador:
- conserva acceso completo;
- puede ver como empresa;
- administra destinatarios, validaciones, correo y modo masivo.

## Flujo de prueba y validación

1. Guardar borrador.
2. Enviar prueba al correo registrado del originador.
3. Cada prueba genera un código aleatorio de 6 dígitos, válido 30 minutos.
4. Una nueva prueba invalida el código anterior.
5. Sin código verificado no puede solicitarse validación.
6. La solicitud de validación se dirige a `tesoreria@uic-campana.com.ar` durante la etapa provisoria.
7. El administrador aprueba/rechaza desde Validaciones.
8. Al aprobar, el originador recibe primero la versión final como confirmación.

## Envío masivo y piloto

- El estado del modo masivo se controla desde Validaciones.
- Para habilitar masivos se exige escribir `HABILITAR`.
- Con masivos deshabilitados, TECNO LOGISTI-K SA queda como único destino piloto/control.
- TECNO LOGISTI-K SA no puede ser deshabilitada desde el padrón ni desde el enlace de baja.
- Con masivos habilitados se usa el padrón activo.
- La selección final se deduplica por correo normalizado antes de enviar.
- Los 117 contactos actuales contienen 111 correos únicos; los duplicados no generan doble envío.
- El plazo mensual se registra sólo tras una distribución real al padrón, no por pruebas ni validaciones piloto.

## Formato del correo

- Asunto fijo del servidor: `Nuevo beneficio exclusivo UIC · [EMPRESA]`.
- La empresa no puede editar el asunto.
- Cuerpo de texto editable con formato controlado.
- Hasta 4 imágenes JPG/PNG embebidas en el cuerpo, con recomendación vertical.
- Hasta 3 archivos adjuntos JPG/PNG/PDF.
- Firma automática con nombre, función, correo y teléfono del originador cuando estén disponibles.
- Enlace de baja en cada correo final individual.

## Baja del destinatario

- El enlace de baja pone `enabled=false`.
- Registra fecha y motivo.
- El panel muestra **Deshabilitado por el destinatario**.
- La reactivación requiere acción manual explícita del administrador.
- La baja no debe ser revertida por una importación automática del padrón.

## Correo emisor y privacidad

Configuración provisoria:
- emisor: `tesoreria@uic-campana.com.ar`;
- validación: `tesoreria@uic-campana.com.ar`;
- futuro previsto: `beneficios@uic-campana.com.ar`.

La contraseña SMTP se cifra con `DIFFUSION_MAIL_SECRET` antes de almacenarse. El secreto debe permanecer fuera de GitHub y estable mientras exista una clave SMTP guardada.

## Navegación y mantenimiento

- Empresas / Destinatarios / Validaciones / Correo emisor permanecen montadas en segundo plano para evitar la demora de recarga observada en v3.9.1.
- Neon indisponible con Render activo: pantalla institucional de mantenimiento.
- Caída completa de Render: requiere fallback externo posterior en Cloudflare; se mantiene la página estática de mantenimiento como base para esa configuración.

## Observación de despliegue

Antes de cualquier prueba real:

```text
DIFFUSION_MASS_SEND_ENABLED=false
DIFFUSION_SEND_ENABLED=false
DIFFUSION_APPROVAL_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_MAIL_SECRET=<secreto estable y privado>
```

Configurar SMTP desde **Difusión > Correo emisor**, probar primero contra una casilla controlada y recién después recorrer el flujo TECNO LOGISTI-K SA.
