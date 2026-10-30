# Revisión v3.9.9.2 — sesión administrativa segura

## Motivo
Se detectó un caso real en el que el Portal permaneció abierto durante más de 8 horas. La cookie administrativa había vencido, pero la interfaz seguía mostrando el panel como si la sesión continuara activa. Al intentar una operación administrativa, el servidor respondió 401 y la interfaz no recuperó correctamente el acceso.

## Corrección
- La sesión administrativa sigue teniendo una ventana de 8 horas, pero ahora se renueva con cada operación administrativa válida.
- Si la sesión venció, todas las rutas protegidas devuelven `ADMIN_SESSION_EXPIRED`.
- El frontend intercepta ese 401 y vuelve al formulario de acceso sin dejar React en un estado intermedio.
- Se informa expresamente que la operación intentada no fue guardada.
- La pantalla general de recuperación incorpora `Reiniciar acceso administrador`, que cierra cualquier cookie residual y vuelve a `/difusion`.
- No se modifica el padrón, los 202 contactos importados, campañas, beneficios ni configuración de envío.

## Seguridad
El servidor continúa validando la sesión antes de ejecutar cualquier alta, edición o eliminación administrativa. Por lo tanto, una petición recibida con sesión vencida no entra al handler que modifica Neon.
