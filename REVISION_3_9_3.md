# Revisión 3.9.3 — Difusión segura, registro de empresas y control de envíos

Fecha: 25/10/2026

## Alcance

La v3.9.3 convierte el módulo Difusión de Beneficios en un circuito de autogestión controlada para empresas, manteniendo las herramientas sensibles bajo administración UIC.

## Cambios principales

- Registro e ingreso de empresas con contraseña propia y correo previamente asociado.
- Recuperación de contraseña mediante código temporal de 6 dígitos.
- Correos no expuestos en el directorio público y rechazo silencioso de correos no coincidentes.
- `Ver como empresa` para auditoría administrativa de la experiencia sin conocer la contraseña.
- Prueba obligatoria antes de solicitar validación.
- Código aleatorio de 6 dígitos enviado en cada prueba; una nueva prueba invalida el código anterior.
- Solicitud de validación sólo después de verificar el código.
- Validación administrativa independiente de la empresa.
- Control `Habilitar envío de mails masivos` con confirmación escrita `HABILITAR`.
- TECNO LOGISTI-K SA permanece como destino piloto/control cuando el padrón general está apagado.
- Deduplicación por correo normalizado antes de cualquier distribución.
- Firma automática del originador y enlace de baja en cada correo final.
- Estado `Deshabilitado por el destinatario` y rehabilitación sólo manual por administrador.
- Hasta 4 imágenes embebidas JPG/PNG y hasta 3 adjuntos JPG/PNG/PDF.
- Remitente y validación provisional: `tesoreria@uic-campana.com.ar`; futuro: `beneficios@uic-campana.com.ar`.
- Se conserva la navegación instantánea entre pestañas administrativas implementada en v3.9.2.

## Seguridad

El correo institucional general UIC se excluye de la lista de direcciones aptas para registrar empresas. Contraseñas y códigos no se almacenan en texto. Los códigos vencen y se validan mediante hashes. Las empresas no pueden acceder a Destinatarios, Validaciones ni Correo emisor.

## Estado del padrón

- 113 empresas.
- 117 contactos.
- 111 correos únicos.
- 94 socios UIC.
- 19 empresas con convenio/no socias.
- 4 empresas sin correo habilitado permanecen visibles pero no pueden registrarse hasta ser corregidas por Administración UIC.
