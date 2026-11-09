# Parche Beneficios UIC v4.0.8 → v5.0.0

## Cambio mayor

La v5.0.0 transforma Portal/Difusión a un modelo de almacenamiento de contenido exclusivamente textual en Neon.

### Al desplegar

1. Reemplazar los archivos incluidos en el parche respetando sus rutas.
2. Eliminar la carpeta heredada `public/benefits/` si todavía existe en el repositorio. El proyecto completo v5.0.0 ya no la contiene.
3. No ejecutar SQL manualmente: `server/schema.sql` realiza automáticamente la migración al iniciar.
4. Mantener `DATABASE_URL`, variables SMTP, secretos y configuración de Render existentes.
5. Render debe ejecutar el build habitual y luego `npm start`.
6. El arranque correcto debe anunciar `Beneficios UIC NUEVO v5.0.0 · BENEFICIOS_UIC_5000`.

## Efecto sobre Neon

Se eliminan:
- tabla `flyers`;
- tabla `diffusion_campaign_files`;
- columnas `benefits.external_image_url` y `benefits.external_image_alt`.

No se eliminan:
- beneficios ni sus textos;
- destinatarios;
- campañas/trazabilidad textual;
- bajas;
- configuración SMTP;
- cuentas de empresas;
- los 32 contactos incorporados en v4.0.8.
