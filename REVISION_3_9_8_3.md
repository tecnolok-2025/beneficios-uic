# Beneficios UIC · Revisión v3.9.8.3

Fecha: 26/10/2026
Generación: BENEFICIOS_UIC_3983

## Objetivo
Esta revisión es acumulativa sobre v3.9.8.1. Incluye todo lo previsto en v3.9.8.2 y agrega recuperación/administración de publicaciones guardadas para el beneficiario.

## 1. Modo PRUEBA reforzado
- Modo PRUEBA activo por defecto y fail-closed.
- Lista blanca exclusiva de distribución: Unión Industrial de Campana, INDUSVAR GROUP y TECNO LOGISTI-K SA.
- El servidor valida la lista blanca al construir la cola y nuevamente antes de cada envío SMTP.
- El padrón general no puede habilitarse mientras Modo PRUEBA siga activo.
- Salir de prueba exige escribir SALIR DE PRUEBA; habilitar padrón general exige luego HABILITAR.

## 2. Aviso rojo permanente en Administración
Mientras Modo PRUEBA esté activo, el panel administrador muestra una banda roja fija/sticky con el texto MODO PRUEBA ACTIVO y la advertencia de que el padrón general permanece bloqueado.

## 3. Doble confirmación antes de envíos administrativos
- Validación final de una campaña: primer cuadro de confirmación + segunda confirmación escrita VALIDAR o ENVIAR según el modo.
- Prueba técnica SMTP desde Correo emisor: primer cuadro de confirmación + escritura de PROBAR.
- El servidor exige también ambas confirmaciones, de modo que no depende sólo de la interfaz.

## 4. Archivo de publicaciones guardadas
El panel de beneficiario incorpora una sección visible: Mis publicaciones guardadas.

Cada publicación muestra:
- estado;
- beneficio;
- asunto;
- última modificación;
- plantilla utilizada;
- cantidad de archivos asociados.

Acciones disponibles:
- Abrir y continuar: recupera textos, plantilla, franja, nombre visible, imágenes y adjuntos.
- Duplicar: crea una nueva copia editable sin heredar validaciones ni pruebas anteriores.
- Eliminar: disponible sólo para borradores o publicaciones devueltas/bloqueadas.

Las publicaciones que ya están en validación, cola o envío permanecen en historial y se siguen desde el Monitor.

## 5. Guardado no destructivo
A partir de esta versión, crear un nuevo borrador para un mismo beneficio no elimina automáticamente borradores anteriores. Cada trabajo queda guardado hasta que el usuario lo elimina expresamente.

## 6. Edición de un borrador recuperado
Al abrir una publicación guardada, el sistema recupera desde Neon el layout y los archivos binarios asociados, reconstruye las imágenes/adjuntos en el constructor y permite guardar sobre el mismo registro mediante Actualizar borrador.

Toda modificación invalida la prueba previa y obliga a repetir el circuito prueba → código de 6 dígitos → validación UIC.

## 7. Cambios heredados de v3.9.8.2
- botón Difusión de Beneficios más destacado;
- ojito mostrar/ocultar en todos los campos de clave;
- Modo PRUEBA con los tres destinatarios autorizados;
- protección fail-closed y bloqueo de padrón general.

## 8. Compatibilidad de datos
No se incorpora ninguna migración destructiva. Esta revisión reutiliza las tablas existentes de campañas y archivos. Los borradores guardados con v3.9.8.1 pueden recuperarse siempre que su contenido no haya sido eliminado por haber finalizado un envío.

## 9. Validación
- npm test: 97/97 aprobados.
- node --check server/index.js: aprobado.
- Parseo JSX/TypeScript sin emisión: aprobado.
- npm ci/npm run build: no completado localmente por timeout de instalación de dependencias; Render realizará la instalación normal en el deploy.
