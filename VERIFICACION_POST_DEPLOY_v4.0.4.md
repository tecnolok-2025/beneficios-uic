# Verificación post deploy v4.0.4

## Logs esperados
- `beneficios-uic@4.0.4`
- `BENEFICIOS_UIC_4040`

## Control visual prioritario
1. Abrir `Difusión de Beneficios` o `Monitor de envíos`.
2. Elegir acceso como beneficiario si corresponde.
3. En la pantalla `Elegí tu empresa`, el buscador y el listado deben aparecer inmediatamente después del encabezado.
4. No debe aparecer el instructivo largo antes de las empresas.
5. Al final debe verse `Ayuda e instrucciones de acceso` cerrado por defecto.
6. Al abrirlo, debe aparecer el instructivo completo; al cerrarlo, debe volver a ocupar sólo una línea compacta.
7. Seleccionar empresa e iniciar sesión: el Monitor conserva campañas, estados, enviados, pendientes, errores e historial propios.

## Seguridad
No se modifican permisos administrativos ni aislamiento por sesión de empresa.
