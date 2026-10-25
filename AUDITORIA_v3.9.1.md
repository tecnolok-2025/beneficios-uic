# Auditoría v3.9.1 · Difusión de Beneficios UIC

Fecha: 24/10/2026
Versión: `3.9.1`
Generación: `BENEFICIOS_UIC_391`

## Resultado

- Catálogo público preservado: **51 beneficios / 16 categorías**.
- Padrón privado de difusión: **113 empresas**.
  - **94 socios UIC**.
  - **19 empresas con convenio / no socias**.
- Contactos cargados: **117** (algunas empresas poseen más de un contacto).
- Empresas actualmente habilitadas por correo válido: **109**.
- Empresas destildadas por falta de correo válido: **SWA/NEUCO**, **C-Forma**, **MB Gestión del Capital Humano** y **SYGSA S.A. · Paseo Gavazzi**.
- TIBEST se conserva como **BULLETBABA SRL - TIBEST** en el padrón societario.

## Correcciones confirmadas

- TECMACO INTEGRAL SA: `info@tecnodealer.com.ar`.
- MONTAJES INTERACERO SA: `info@montajesinteracero.com.ar`.
- PLAZA HOTEL CAMPANA SA: `martin@eraina.com.ar`.
- SWA: nombre actualizado a **SWA/NEUCO**; correo pendiente y envío deshabilitado.

## Control por empresa

La UI agrupa contactos por empresa. Cada empresa posee una única casilla **Recibe comunicaciones**. Al destildar una empresa se deshabilitan todos sus contactos; al habilitarla se habilitan sólo los contactos con correo válido. Los datos permanecen editables y no se borran.

## Empresa piloto

- **TECNO LOGISTI-K SA**.
- Responsable: Néstor Manucci.
- Cargo: Director.
- El resto de las empresas continúa sin acceso público al editor.

## Secuencia de seguridad de correo

1. Borrador.
2. Control automático inicial.
3. Correo de prueba sólo al originador; no consume cupo.
4. Solicitud de validación a UIC.
5. Aprobación administrativa con confirmación explícita `ENVIAR`.
6. Primer correo final al originador.
7. Si el primer envío fue satisfactorio, distribución en CCO al padrón habilitado.
8. Se inicia el plazo mensual después del envío final.
9. Se eliminan cuerpo y adjuntos de la campaña después del envío, conservando trazabilidad mínima.

## Base de datos / Neon

Las tablas de Difusión se crean aditivamente con `CREATE TABLE IF NOT EXISTS`. El catálogo de beneficios no se borra ni se reemplaza. Las cuatro correcciones de padrón confirmadas por UIC utilizan actualizaciones dirigidas sólo contra los valores antiguos/incompletos para evitar pisar futuras ediciones manuales.

## Mantenimiento

Ante indisponibilidad de Neon, el módulo de Difusión presenta una pantalla institucional de mantenimiento con contacto de Administración UIC y no expone errores técnicos. Una caída completa de Render requiere, para mostrar una pantalla aun con el servicio apagado, un fallback externo (por ejemplo Cloudflare), que no forma parte de este ZIP.

## QA

- `npm test`: **50/50 PASS**.
- `node --check server/index.js`: PASS.
- JSON de catálogo, configuración y padrón: válido.
- Conteos de padrón y correcciones: verificados.
- `nodemailer` declarado en `package.json` y `package-lock.json` para SMTP.
- El entorno de trabajo no pudo descargar paquetes desde npm por restricción DNS, por lo que no se ejecutó aquí un `npm ci`/build completo. Render deberá instalar dependencias durante el despliegue antes de activar el correo.

## Regla de activación

Mantener `DIFFUSION_SEND_ENABLED=false` hasta que la cuenta emisora SMTP esté configurada, el padrón haya sido revisado y se haya realizado una prueba controlada con TECNO LOGISTI-K SA.
