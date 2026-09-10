# Instalación v3.5.2 en el repositorio y Render actuales

Esta entrega reemplaza el código del repositorio actual, pero conserva el servicio Render, su URL, las variables de entorno y la base Neon.

## GitHub

1. Abrir el repositorio actual conectado a `beneficios-uic.onrender.com`.
2. Reemplazar los archivos del repositorio por el contenido de esta entrega.
3. Subir **el contenido descomprimido** directamente a la raíz. No subir el ZIP ni una carpeta exterior.
4. Verificar que en la raíz estén `package.json`, `render.yaml`, `server`, `src`, `public` y `data`.
5. Confirmar que `public/logo-uic-oficial.jpeg` y las imágenes de beneficios estén presentes.
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
Beneficios UIC v3.5.2 · BENEFICIOS_UIC_352
```

La ruta `/api/health` debe informar `"version":"3.5.2"`, `"generation":"BENEFICIOS_UIC_352"` y, en producción, `"catalogSource":"neon"`.

## Verificación funcional

- El portal debe mostrar **32 beneficios** y **13 categorías**.
- Affinity Broker debe figurar dentro de **Broker de seguros**.
- Deben figurar **Beneficios digitales** y **Acuerdos institucionales**.
- El buscador flexible debe encontrar nombres, fragmentos, categorías, contactos y palabras clave.
- El acceso de asociación debe decir **Hacete socio**.

## Base de datos

No borrar Neon, `DATABASE_URL` ni las demás variables existentes. El arranque conserva el esquema de actualización no destructivo y las ediciones administrativas existentes.
