# Revisión v3.9.7 — Constructor Visual UIC

Fecha de revisión: 25/10/2026
Generación: `BENEFICIOS_UIC_397`

## Objetivo

Reemplazar el editor lineal de Difusión de Beneficios por un constructor visual de correos basado en plantillas, inspirado conceptualmente en los creadores de campañas profesionales, pero acotado a las necesidades de UIC: consistencia institucional, simplicidad, máximo cuatro imágenes, control de seguridad y buena lectura en escritorio y móvil.

## Cambios principales

### 1. Constructor por plantillas
Se incorporan ocho modelos predefinidos:

1. Institucional.
2. Galería 4.
3. Dos protagonistas.
4. Imagen + texto.
5. Texto + imagen.
6. Intercalado.
7. Láminas verticales.
8. Editorial premium.

Cambiar de modelo no elimina el texto ya escrito.

### 2. Edición visual por bloques
Cada zona de texto se edita donde conceptualmente aparecerá en el correo. Los bloques admiten negrita, cursiva, subrayado, listas, enlaces y limpieza de formato.

Al pegar contenido desde Word, ChatGPT, una página web o un correo, se sanea antes de insertarse: conserva negrita, cursiva, subrayado, listas y enlaces simples, pero elimina tipografías, tamaños, colores y estilos ocultos que puedan deformar el correo.

### 3. Imágenes controladas
Cada modelo define entre uno y cuatro espacios de imagen. Las imágenes:

- admiten JPG y PNG;
- se reducen en el navegador cuando exceden dimensiones/peso razonables;
- se limitan a 900 × 1200 px como referencia máxima de preparación;
- conservan la proporción;
- nunca se insertan en el correo a tamaño original sin límites;
- continúan separadas de los archivos adjuntos.

### 4. Vista previa
El editor incorpora vista previa de Escritorio y Celular. La vista se actualiza mientras se trabaja y muestra la franja institucional, empresa, texto, imágenes, firma y pie.

### 5. Asistente de composición UIC
Se incorpora un asistente de composición que analiza cantidad de imágenes y extensión del texto para sugerir el modelo más apropiado. También puede tomar la información base del beneficio para iniciar la redacción.

Este asistente es de composición y reglas editoriales. No se presenta como IA generativa externa: una futura reescritura generativa requerirá conectar de forma explícita un proveedor/API de IA.

### 6. Render de email compatible
El correo final deja de utilizar CSS Grid para las imágenes. El servidor genera maquetación con tablas HTML y estilos inline, más reglas responsive complementarias, para mejorar compatibilidad con Outlook, Gmail y clientes móviles.

### 7. Persistencia estructurada
Neon incorpora, mediante migración aditiva:

- `diffusion_campaigns.template_id`
- `diffusion_campaigns.layout_json`

No se elimina ninguna columna anterior. Las campañas creadas con versiones previas conservan fallback al contenido histórico `body_markup`.

### 8. Seguridad
El HTML enriquecido se vuelve a sanear en el servidor. Sólo se preservan elementos básicos de presentación (párrafos, negrita, cursiva, subrayado, listas, títulos y enlaces HTTP/HTTPS o mailto). Scripts, iframes, objetos y estilos arbitrarios se descartan.

## Funciones que permanecen sin cambios

- registro de empresa;
- recuperación de contraseña;
- código de 6 dígitos del modo prueba;
- validación UIC;
- padrón y deduplicación;
- baja del destinatario;
- piloto TECNO LOGISTI-K SA;
- cola persistente;
- monitor de envíos;
- cancelación;
- calendario mensual no acumulativo;
- recuperación ante pantalla blanca de v3.9.6.

## Estado del envío masivo

La revisión no habilita el padrón general por sí sola. La política continúa dependiendo de `DIFFUSION_MASS_SEND_ENABLED` y del control administrativo existente.
