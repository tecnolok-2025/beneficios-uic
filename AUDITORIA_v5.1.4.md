# Auditoría v5.1.4

Objetivo: restaurar el constructor original de 8 modelos sin volver a almacenar imágenes en las fichas de beneficios.

Controles:
- ocho plantillas activas: Institucional, Galería 4, Dos protagonistas, Imagen + texto, Texto + imagen, Intercalado, Láminas verticales y Editorial premium;
- `.uicpub` local recupera textos, diseño, imágenes, logo y adjuntos;
- fichas de beneficios/convenios continúan exclusivamente textuales;
- rechazo no modifica `diffusion_benefit_schedules`;
- el cupo mensual se consume únicamente en `authorizeBenefitSlot` al aprobar;
- medios operativos se eliminan en rechazo, cancelación y finalización;
- 158 pruebas aprobadas, 0 fallidas;
- `node --check server/index.js`: aprobado;
- build Vite local no disponible porque `vite` no está instalado en este entorno; Render mantiene el build habitual al desplegar.
