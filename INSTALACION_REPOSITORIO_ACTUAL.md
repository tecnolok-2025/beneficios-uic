# Instalación v3.2.1 en el repositorio y Render actuales

Esta entrega reemplaza el código del repositorio actual, pero conserva el servicio Render, su URL, las variables de entorno y la base Neon.

## GitHub

1. Abrir el repositorio actual conectado a `beneficios-uic.onrender.com`.
2. Reemplazar los archivos del repositorio por el contenido de esta entrega.
3. Subir **el contenido descomprimido** directamente a la raíz. No subir el ZIP ni una carpeta exterior.
4. Verificar que en la raíz estén `package.json`, `render.yaml`, `server`, `src`, `public` y `data`.
5. Confirmar que `public/logo-uic-oficial.jpeg` esté presente.
6. Confirmar los cambios en la misma rama que utiliza Render, normalmente `main`.

## Render

No crear otro servicio y no cambiar la base Neon.

Los comandos deben continuar siendo:

```text
npm ci --include=dev && npm run build
npm start
```

El log de arranque debe incluir:

```text
Beneficios UIC NUEVO v3.2.1 · BENEFICIOS_UIC_322
```

La ruta `/api/health` debe informar `"version":"3.2.1"`, `"generation":"BENEFICIOS_UIC_322"` y, en producción, `"catalogSource":"neon"`.

## Verificación visual

- En la cabecera debe verse el logo oficial de la Unión Industrial de Campana suministrado en esta revisión.
- En Administración, arriba del listado izquierdo debe aparecer **Buscar beneficio o empresa**.
- El nombre de la empresa/prestador debe verse destacado tanto en las tarjetas públicas como en el listado administrativo y el detalle.
- El acceso de asociación debe decir **Hacete socio**.

## Base de datos

No borrar Neon, `DATABASE_URL` ni las demás variables existentes. El arranque ejecuta migraciones aditivas y el catálogo base utiliza `ON CONFLICT (slug) DO NOTHING`, por lo que no reemplaza beneficios ya editados en la base.

La versión de Node queda fijada en 24.14.1 mediante `.node-version`.
