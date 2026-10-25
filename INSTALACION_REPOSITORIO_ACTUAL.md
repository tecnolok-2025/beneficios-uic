# Instalación v3.9.1 en el repositorio y Render actuales

Esta entrega reemplaza el código del repositorio actual, pero conserva el servicio Render, su URL, las variables de entorno y la base Neon.

## GitHub

1. Abrir el repositorio actual conectado a `beneficios-uic.onrender.com`.
2. Reemplazar los archivos del repositorio por el contenido de esta entrega.
3. Subir **el contenido descomprimido** directamente a la raíz. No subir el ZIP ni una carpeta exterior.
4. Verificar que en la raíz estén `package.json`, `render.yaml`, `server`, `src`, `public` y `data`.
5. Confirmar los cambios en la misma rama que utiliza Render, normalmente `main`.

## Render

No crear otro servicio y no cambiar la base Neon.

Los comandos deben continuar siendo:

```text
npm ci --include=dev && npm run build
npm start
```

El log de arranque debe incluir `Beneficios UIC NUEVO v3.9.1 · BENEFICIOS_UIC_391`.

La ruta `/api/health` debe informar `"version":"3.9.1"`, `"generation":"BENEFICIOS_UIC_391"` y, en producción, `"catalogSource":"neon"`.

## Verificación funcional

- En la portada debe aparecer el botón **Difusión de Beneficios**.
- Al ingresar a `/difusion`, un visitante sin sesión debe ver la pantalla de acceso temporal restringido.
- La misma clave administrativa de `Agregar beneficio` debe permitir el ingreso.
- Dentro de Difusión debe verse el directorio buscable de empresas y la agrupación de sus beneficios.
- Registro público de empresas y recuperación de contraseña deben permanecer deshabilitados en esta revisión.
- El administrador debe poder abrir **Destinatarios**, ver socios y convenios/no socios, editar datos y destildar/habilitar cada empresa.
- Sólo **TECNO LOGISTI-K SA** debe poder abrir el editor de difusión en esta etapa.
- El envío real debe permanecer bloqueado mientras `DIFFUSION_SEND_ENABLED=false`.
- Debe existir **Volver al Portal de Beneficios** tanto en el login como dentro del módulo.

- El portal debe mostrar **51 beneficios** y **16 categorías**.
- CEOP debe figurar en **Acuerdos institucionales** con Hugo López y Sandra Rodríguez.
- TIBEST debe figurar en **Broker de seguros**.
- Praxis debe aparecer una sola vez, en **Gestión empresarial**, como Departamento de Finanzas Corporativas UIC – Praxis Finanzas.
- DNV debe figurar en **Certificación y calidad**.
- El buscador debe encontrar `CEOP`, `TIBEST`, `Praxis`, `DNV`, `ISO` y `certificación`.
- El resto del catálogo, estados y beneficios UIPBA deben conservarse.

## Base de datos

No borrar Neon, `DATABASE_URL` ni las demás variables existentes. El arranque inserta los tres slugs nuevos y actualiza exclusivamente la ficha existente de Praxis. No elimina otros beneficios ni flyers cargados desde Administración.

## Variables nuevas de Difusión v3.9.1

Mantener inicialmente:

```text
DIFFUSION_SEND_ENABLED=false
DIFFUSION_FROM_EMAIL=beneficios_campana@gmail.com
DIFFUSION_APPROVAL_EMAIL=uic@uic-campana.com.ar
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
```

No colocar la contraseña real de Gmail en GitHub. `SMTP_PASS` debe cargarse como secreto en Render. El envío sólo debe activarse después de probar la casilla emisora y revisar el padrón.
