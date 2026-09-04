# Revisión 3.2.2 — Sincronización garantizada de Villa Dálmine

Fecha: 04/09/2026

## Motivo
La v3.2.1 desplegaba correctamente, pero Villa Dálmine podía no aparecer si Neon ya contenía un registro con el mismo slug en estado no publicado o incompleto.

## Corrección
- Villa Dálmine se sincroniza mediante UPSERT específico.
- Si no existe, se inserta.
- Si existe, se completan sus campos y se fuerza `published=TRUE`.
- Los otros 25 beneficios conservan el comportamiento no destructivo `ON CONFLICT DO NOTHING`.
- Al arrancar, el servidor verifica que Villa Dálmine exista en Neon y escribe confirmación explícita en el log.
- `/api/health` informa `catalog.villaDalmine: true` cuando el beneficio está visible.
- Villa Dálmine se marca visualmente como NUEVO.

No se elimina ningún beneficio ni se reemplazan ediciones de los otros registros.
