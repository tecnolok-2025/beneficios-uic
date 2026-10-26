# Revisión 3.9.8.2 — Modo PRUEBA de seguridad y visibilidad de claves

Fecha: 26/10/2026

## Objetivo

Reducir al mínimo el riesgo de una distribución accidental al padrón real mientras el módulo Difusión de Beneficios continúa en desarrollo y prueba.

## Modo PRUEBA

El administrador ve, apenas ingresa a Difusión, un bloque de seguridad destacado con un tilde **MODO PRUEBA ACTIVADO**.

La migración agrega a `diffusion_mail_settings`:

```sql
test_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE
```

Por lo tanto, incluso una base Neon existente recibe el nuevo campo en estado seguro.

Mientras el tilde está activo, la lista blanca de distribución contiene únicamente:

1. **UNIÓN INDUSTRIAL DE CAMPANA** — `uic@uic-campana.com.ar` — María José Godoy (Majo) — `3489 65 0104`.
2. **INDUSVAR GROUP** — `nestor.manucci@gmail.com` — Néstor Manucci — `11 6681 2532`.
3. **TECNO LOGISTI-K SA** — `nestor.manucci@tecnolok.com.ar` — Néstor Manucci — `011 66812532`.

La protección se aplica en dos niveles:

- al crear la cola de destinatarios;
- nuevamente justo antes de cada envío SMTP.

De este modo, una fila antigua que hubiera quedado pendiente para un correo externo se bloquea antes del envío si Modo PRUEBA está activo.

## Doble llave para habilitar el padrón

Salir de Modo PRUEBA no habilita automáticamente el padrón general.

1. Para desactivar Modo PRUEBA hay que escribir **SALIR DE PRUEBA**.
2. Luego, para habilitar el padrón general, hay que activar el control de Validaciones y escribir **HABILITAR**.

Al volver a activar Modo PRUEBA, `mass_send_enabled` se fuerza a `FALSE`.

## Correos de prueba del beneficiario

El correo de prueba individual que un beneficiario se envía a sí mismo antes de solicitar validación continúa funcionando porque forma parte de la verificación de identidad. No utiliza el padrón. La protección de lista blanca actúa sobre la **distribución autorizada**.

## Claves visibles bajo demanda

Todos los campos de contraseña visibles incorporan un botón con ojo para mostrar u ocultar lo escrito:

- contraseña administrativa;
- ingreso de beneficiario;
- creación de contraseña;
- nueva contraseña por recuperación;
- contraseña / clave de aplicación SMTP.

El botón sólo cambia la visualización local del valor escrito. La contraseña SMTP ya guardada continúa cifrada y no se recupera desde Neon para mostrarla.

## Botón Difusión de Beneficios

Se conserva en el mismo lugar de la portada pero aumenta su jerarquía mediante:

- mayor tamaño;
- borde naranja institucional;
- mayor contraste azul;
- icono más grande;
- sombra y separación visual.

## Compatibilidad

No se modifican:

- catálogo de 51 beneficios;
- cuentas existentes;
- padrón;
- campañas anteriores;
- trazabilidad;
- bajas;
- constructor visual;
- cola durable;
- calendario mensual;
- intervalo mínimo de 45 segundos.
