# Instalación en el repositorio y Render actuales

Esta entrega reemplaza completamente el código del repositorio actual, pero conserva el servicio Render, su URL, las variables de entorno y la base Neon.

## GitHub

1. Abrir el repositorio actual conectado a `beneficios-uic.onrender.com`.
2. Eliminar todos los archivos y carpetas de la versión anterior.
3. Descomprimir `Beneficios_UIC_v3.0.0_REPOSITORIO_ACTUAL.zip` en la computadora.
4. Subir **el contenido descomprimido** directamente a la raíz del repositorio. No subir el ZIP ni una carpeta exterior.
5. Antes de confirmar, verificar que en la raíz aparezcan `package.json`, `render.yaml`, `server`, `src` y `data`.
6. Entrar en `data` y confirmar que existan `catalog.json` e `initial-benefits.json`.
7. Confirmar los cambios en la misma rama que utiliza Render, normalmente `main`.

## Render

No crear otro servicio y no cambiar ninguna variable. El despliegue automático del servicio actual debe comenzar después del commit.

Los comandos actuales deben continuar siendo:

```text
npm ci --include=dev && npm run build
npm start
```

El log correcto mostrará:

```text
beneficios-uic-nuevo@3.0.0 start
Beneficios UIC NUEVO v3.0.0 · BENEFICIOS_UIC_NUEVO_300
```

La ruta `https://beneficios-uic.onrender.com/api/health` debe informar `"version":"3.0.0"`, `"generation":"BENEFICIOS_UIC_NUEVO_300"` y `"catalogSource":"neon"`.

## Verificación visual

La nueva portada comienza con **Tu empresa puede llegar más lejos**. En la cabecera aparecen **Actualizar versión** y `v3.0.0`. El botón **Consultar asociación** abre `https://uic-campana.com.ar/hacete-socio/`.

La aplicación no se detiene si faltara el catálogo local: registra el aviso y continúa utilizando Neon. No borrar Neon, `DATABASE_URL` ni las demás variables existentes.

La versión de Node queda fijada en 24.14.1 mediante `.node-version`, evitando que Render seleccione automáticamente Node 26.
