# Beneficios UIC · Revisión v5.0.2

Fecha: 10/11/2026
Generación: BENEFICIOS_UIC_5020

## Cambios
- Se agregan dos filtros especiales junto a **Todos**:
  - **Últimos beneficios**
  - **Últimas empresas que difundieron**
- Los tres filtros quedan en la misma grilla y conservan el diseño general de categorías.
- **Últimos beneficios** muestra hasta 4 beneficios publicados con la fecha más reciente disponible en el catálogo.
- **Últimas empresas que difundieron** consulta campañas finalizadas reales en Neon, agrupa por empresa y muestra hasta 4 empresas distintas.
- Tecno Logisti-K queda excluida expresamente del filtro de últimas empresas porque se utiliza como empresa de prueba.
- Si sólo existen 2 empresas válidas con difusión finalizada, se muestran únicamente esas 2.
- Cada empresa mostrada abre el beneficio/convenio correspondiente a su difusión más reciente.
- No se muestran números de orden ni contadores en estas tarjetas.
- No se altera el padrón de destinatarios, la lógica de envío ni los correos vigentes.

## QA
- 145 pruebas aprobadas, 0 fallidas.
- `node --check server/index.js`: aprobado.
- `npm run build` no pudo ejecutarse en este entorno porque `vite` no está instalado en `node_modules`; Render instalará dependencias y realizará el build durante el deploy habitual.
