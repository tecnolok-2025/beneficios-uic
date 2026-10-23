# Beneficios UIC · Revisión 3.8.0

**Fecha:** 23/10/2026  
**Generación:** `BENEFICIOS_UIC_380`  
**Base:** v3.7.1 HOTFIX Render/Neon

## Cambios

- Se incorporan tres beneficios nuevos: CEOP Internacional, TIBEST Broker de Seguros y DNV Business Assurance.
- Se actualiza la ficha ya existente de Praxis Finanzas con el convenio del Departamento de Finanzas Corporativas UIC, sin crear un duplicado.
- Total final: 51 beneficios / 16 categorías.
- Se crea la categoría `Certificación y calidad` para DNV.
- CEOP queda en `Acuerdos institucionales`; TIBEST en `Broker de seguros`; Praxis en `Gestión empresarial`.
- CEOP usa los referentes aprobados por UIC: Hugo López y Sandra Rodríguez.
- Se incorporan imágenes extraídas directamente de los cuatro documentos fuente.

## Nota CEOP

El documento fuente contiene una inconsistencia interna en el porcentaje de bonificación de aranceles formativos (aparecen referencias al 20% y al 10%). Para evitar publicar un dato dudoso, la ficha informa la bonificación de matrícula del 50% y señala que el porcentaje de arancel debe confirmarse con CEOP al momento de la inscripción.

## Neon

Las tres fichas nuevas se insertan por `slug`. La ficha de Praxis se actualiza de forma dirigida porque ya existía en v3.7.1. No se eliminan beneficios ni flyers cargados desde Administración.
