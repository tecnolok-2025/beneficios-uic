# Beneficios UIC v4.0.4

Generación: `BENEFICIOS_UIC_4040`

## Objetivo
Mejorar la experiencia de ingreso de empresas y beneficiarios sin alterar el circuito de seguridad ni el Monitor de envíos.

## Cambios v4.0.4
- En la pantalla "Elegí tu empresa", el buscador y listado de empresas aparecen inmediatamente después del encabezado.
- Se elimina el bloque extenso de instrucciones previo al listado.
- Las instrucciones se conservan al final de la pantalla dentro de un acordeón cerrado por defecto: "Ayuda e instrucciones de acceso".
- El usuario habitual puede buscar su empresa, seleccionarla e iniciar sesión sin desplazamiento innecesario.
- El usuario nuevo puede desplegar la ayuda cuando la necesita y volver a cerrarla.
- Se mantiene el acceso público "Monitor de envíos" y el acceso directo posterior a la autenticación.
- Se mantiene el aislamiento por sesión: la empresa sólo consulta sus propias campañas y métricas agregadas.
- El Monitor administrativo no se modifica.
- Manual integrado actualizado a v4.0.4.
- Anticaché actualizado a generación 404 y `boot-recovery.js?v=4040`.

## Datos
No requiere migración de Neon. No modifica padrón, beneficios, campañas ni trazabilidad existente.
