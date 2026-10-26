# Parche acumulativo v3.9.8.3 → v3.9.8.5

Este parche está pensado para instalarse **directamente sobre v3.9.8.3**. No requiere instalar v3.9.8.4 previamente.

Incluye íntegramente v3.9.8.4:
- acceso beneficiario por convenio sin clave administrativa;
- ocultamiento público de empresas internas `testMode`;
- aviso público destacado.

Y agrega v3.9.8.5:
- borradores en archivos locales `.uicpub`, no en Neon;
- apertura del archivo local dentro de **Crear una nueva publicación** y dentro del constructor;
- eliminación de **Mis publicaciones guardadas**, **Duplicar** y **Eliminar** del flujo beneficiario;
- Neon sólo a partir de **Enviar correo de prueba**;
- bloqueo servidor de guardado remoto de borradores;
- limpieza de borradores remotos heredados y prevención de acumulación;
- firma totalmente editable sin alterar el correo registrado de autenticación/prueba;
- purga del contenido binario/textual de campañas rechazadas, conservando metadata.

Archivos principales modificados: `src/App.jsx`, `src/styles.css`, `server/index.js`, `package.json`, `package-lock.json`, `index.html`, `README.md`, `INSTALACION_REPOSITORIO_ACTUAL.md` y pruebas.
