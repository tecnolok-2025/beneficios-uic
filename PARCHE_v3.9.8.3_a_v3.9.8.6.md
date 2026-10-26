# Parche acumulativo v3.9.8.3 → v3.9.8.6

Este parche se instala **directamente sobre v3.9.8.3**. No requiere instalar v3.9.8.4 ni v3.9.8.5 previamente.

Incluye v3.9.8.4:
- acceso beneficiario por convenio sin clave administrativa;
- ocultamiento público de empresas internas `testMode`;
- aviso público destacado.

Incluye v3.9.8.5:
- borradores exclusivamente locales `.uicpub`;
- apertura de archivo local dentro de Crear una nueva publicación;
- eliminación de almacenamiento remoto de borradores;
- Neon sólo desde Enviar correo de prueba;
- firma editable sin alterar el correo de autenticación.

Agrega v3.9.8.6:
- página web y logo editable en la firma;
- selector de ubicación/nombre al guardar `.uicpub` en navegadores compatibles;
- validación UIC destacada visualmente cuando corresponde;
- flujo explícito de dos pasos para salir de Modo PRUEBA y habilitar padrón general;
- datos completos del firmante en la pantalla de validación;
- baja de correo con confirmación escrita `BAJA`;
- renderer responsive de emails para evitar superposición de imágenes en celular;
- monitor de ciclo completo desde prueba hasta finalización;
- actualización adaptativa para reducir consultas a Neon;
- conservación tras reinicio de instancias que ya tengan prueba enviada/verificada.

Archivos principales modificados: `src/App.jsx`, `src/styles.css`, `server/index.js`, `package.json`, `package-lock.json`, `index.html`, `README.md`, `INSTALACION_REPOSITORIO_ACTUAL.md` y `tests/rebuild.test.js`.
