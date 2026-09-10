# Auditoría Beneficios UIC v3.5.0

**Base:** v3.4.0 BUSCADOR PREMIUM  
**Objetivo:** incorporar seis nuevas fichas y tres categorías ampliables sin afectar Neon ni los 26 beneficios existentes.

## Resultado
- Total catálogo: **32 beneficios**.
- Total categorías: **13**.
- Nuevas categorías: **Seguros**, **Beneficios digitales**, **Acuerdos institucionales**.
- Nuevas fichas: Affinity Broker, App UIC, Talento PyME, Requerimientos Institucionales / CPF, Portal de Beneficios UIC y Convenio Marco UIC–ADERPE.
- Las imágenes suministradas por el usuario se incorporaron como archivos locales del proyecto y actúan como respaldo visual.
- Los nuevos slugs se insertan en Neon al iniciar la nueva versión. Los registros existentes continúan bajo la lógica no destructiva `ON CONFLICT` ya utilizada por el proyecto.
- El contador de portada pasa a ser dinámico: beneficios y rubros se calculan desde el catálogo cargado.
- El buscador v3.4.0 se conserva y se amplían sinónimos para seguros, plataformas digitales, talento, requerimientos y acuerdos institucionales.

## Enlaces incorporados
- Affinity Broker: publicación UIC suministrada por el usuario.
- App UIC: acceso directo `https://uic-campana-app.onrender.com` y publicación institucional UIC.
- Talento PyME: acceso directo `https://talento-pyme.onrender.com` y publicación institucional CNP/UIC.
- Requerimientos Institucionales / CPF: acceso directo `https://cpf-web.onrender.com/` y referencia institucional UIC.
- Portal de Beneficios UIC: `https://beneficios-uic.onrender.com`.
- ADERPE–UIC: publicación institucional suministrada y PDF del convenio marco.

## QA
- `npm test`: **28/28 OK**.
- `node --check server/index.js`: **OK**.
- JSON: 32 slugs únicos / 13 categorías: **OK**.
- Existencia de imágenes referenciadas: **OK**.
- `npm run build`: no ejecutado en esta carpeta porque el ZIP fuente no contiene `node_modules`; Render instala dependencias mediante `npm ci --include=dev` antes del build.

## Seguridad de datos
No se elimina ni reinicializa la base Neon. Las seis altas nuevas se sincronizan por slug y las ediciones existentes continúan protegidas por la estrategia aditiva del inicializador.
