# Parche v3.7.1 → v3.8.0

Este parche contiene únicamente los archivos nuevos o modificados de la revisión 3.8.0. Debe copiarse **sobre la raíz** de un repositorio que esté efectivamente en v3.7.1, conservando el resto de los archivos.

El parche no contiene `node_modules` ni `dist`. Render debe continuar usando `npm ci --include=dev && npm run build` y `npm start`. Mantener sin cambios las variables de entorno actuales, especialmente `DATABASE_URL` y la clave de administración.

La sincronización no borra Neon: inserta tres slugs nuevos y refresca únicamente la ficha de Praxis, cuyo slug ya existía. Los flyers administrativos de Praxis no se eliminan.
