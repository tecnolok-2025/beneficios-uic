# Beneficios UIC v4.0.2

Revisión integral orientada a hacer inequívoco el acceso al Monitor de envíos para empresas/beneficiarios y consolidar en una sola entrega las mejoras ya incorporadas en el circuito de Difusión de Beneficios.

## Monitor de empresa
- El Monitor de envíos es la vista inicial después de autenticar la empresa.
- Antes del login se informa expresamente que el Monitor está disponible para la empresa seleccionada.
- En el panel autenticado se agrega un bloque destacado "Monitor de envíos" con botón "Abrir Monitor de envíos".
- Se mantienen campañas, estados, enviados, pendientes, errores, aperturas detectadas, bajas, tiempos e historial.
- El endpoint de empresa resuelve el `companyKey` exclusivamente desde la sesión autenticada; no acepta un identificador de otra empresa desde el cliente.
- La trazabilidad individual por destinatario y la cancelación continúan reservadas al administrador.

## Monitor administrativo y validaciones
- Se conserva la pestaña administrativa Monitor con vista global.
- Se conserva el acceso al Monitor después de aprobar una campaña.
- Se conservan los accesos directos "Ver beneficio publicado" y "Abrir Validación UIC" en el circuito de validación/Tesorería.

## Ajustes visuales
- La línea de tiempo del Monitor pasa a seis columnas para coincidir con las seis etapas: Prueba, Código, Validación UIC, Cola, Envío y Finalizado.

## Manual integrado
- Manual actualizado a `Beneficios UIC v4.0.2.pdf`.
- Enlaces de escritorio y móvil actualizados a v4.0.2.
- Se documenta el nuevo recorrido visible del usuario/empresa.

## Versión
- Aplicación: 4.0.2
- Generación: `BENEFICIOS_UIC_4020`
