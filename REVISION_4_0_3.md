# Beneficios UIC v4.0.3

Generación: `BENEFICIOS_UIC_4030`

## Auditoría previa

1. Render desplegó correctamente v4.0.2, por lo que el problema no era el número de versión.
2. `server/index.js` sirve el frontend compilado desde `dist/`; `src/` no se sirve directamente en producción.
3. La v4.0.2 tenía el Monitor dentro del circuito autenticado de beneficiario, pero no existía un botón Monitor visible en la portada pública mostrada en los PDF de control.
4. El deep link `modo=beneficiario` no era interpretado por `DiffusionPage`, por lo que un acceso directo al Monitor no podía saltar correctamente al flujo beneficiario.
5. `boot-recovery.js` conservaba la generación histórica `396`, debilitando el control de actualización de interfaz.
6. El endpoint `/api/difusion/company/monitor` ya estaba correctamente aislado por `req.companySession.companyKey`.

## Correcciones v4.0.3

- Botón **Monitor de envíos** visible en la portada pública, junto a Difusión de Beneficios.
- Acceso Monitor también en menú móvil.
- Deep link `/difusion?modo=beneficiario&vista=monitor` abre directamente el flujo de beneficiario.
- Botón **Ingresar al Monitor de envíos** en la empresa seleccionada antes de autenticarse.
- Después del login, el panel de empresa abre en Monitor por defecto.
- Monitor de empresa muestra sólo campañas de la sesión: estados, enviados, pendientes, errores, aperturas agregadas, bajas e historial.
- Trazabilidad individual y cancelación continúan reservadas al administrador.
- Anticaché actualizado a generación 403 y `boot-recovery.js?v=4030`.
- Manual integrado actualizado a v4.0.3.
- Sin migración de Neon ni alteración de campañas existentes.
