# Revisión 3.9.4 — Acceso administrador / beneficiario y navegación inmediata

Fecha: 25/10/2026

## Objetivo
Habilitar definitivamente el acceso de las empresas al módulo Difusión de Beneficios sin entregarles la clave administrativa, permitir que TECNO LOGISTI-K SA pueda auditarse desde los dos roles y corregir la navegación que en algunos recorridos requería refrescar manualmente la pantalla.

## Cambios
- Nueva pantalla inicial de Difusión con dos caminos: **Como administrador** y **Como beneficiario**.
- El modo administrador conserva `ADMIN_PASSWORD` y todas las herramientas privadas.
- El modo beneficiario no utiliza `ADMIN_PASSWORD`; muestra el directorio, registro, ingreso y recuperación propios de cada empresa.
- Al entrar como beneficiario se cierra una eventual sesión administrativa para que la prueba represente permisos reales de empresa.
- TECNO LOGISTI-K SA puede utilizar ambos roles por separado.
- Guía de registro ampliada y visible antes del directorio, con instrucciones de alta inicial, correo registrado, código temporal, contraseña, recuperación y falta de correo.
- Se mantiene la validación estricta: el correo escrito debe coincidir con un correo previamente autorizado para la empresa.
- Navegación SPA reforzada mediante evento interno `uic:navigate`; se elimina la creación manual de `PopStateEvent` para actualizar rutas.
- Botón **Cambiar tipo de acceso** disponible dentro de los paneles de Difusión.
- No se habilita el padrón masivo general. TECNO LOGISTI-K SA continúa como destino piloto permanente mientras `DIFFUSION_MASS_SEND_ENABLED=false`.
