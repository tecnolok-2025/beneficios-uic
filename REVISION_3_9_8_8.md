# REVISIÓN v3.9.8.8

## Recuperación local .uicpub

- Se refuerza la apertura de archivos `.uicpub` generados por v3.9.8.5, v3.9.8.6, v3.9.8.7 y v3.9.8.8.
- Las imágenes, logo y adjuntos embebidos se reconstruyen en memoria local mediante decodificación directa de Data URL. Ya no se usa `fetch(dataUrl)` para recuperar un archivo guardado en la PC.
- La lectura del JSON utiliza `File.text()` con fallback a `FileReader`.
- En Chrome/Edge se utiliza el selector nativo `showOpenFilePicker` cuando está disponible; se conserva el selector HTML como fallback.
- Los errores de apertura aparecen junto al panel `Abrir archivo local`, indicando expresamente que el archivo no se envía a Neon ni al servidor.
- Para empresas internas de prueba con un único beneficio se admite compatibilidad con respaldos anteriores aunque el slug técnico haya cambiado.

## Seguridad y persistencia

La recuperación de un `.uicpub` continúa siendo 100% local. Neon sólo interviene al iniciar el circuito operativo de prueba/envío.
