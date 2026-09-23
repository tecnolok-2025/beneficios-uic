# Beneficios UIC v3.7.1 — Hotfix de estabilidad Render / Neon

## Objetivo
Mantener íntegramente los 48 beneficios y las 15 categorías de la v3.7.0, incorporando una corrección técnica para evitar suspensiones del servicio ante fallas transitorias o diferencias de esquema en Neon.

## Correcciones
- Migración aditiva explícita para `start_date`, `end_date` y `analysis_warnings` en instalaciones con tablas Neon preexistentes.
- Manejo del evento `error` del pool PostgreSQL para evitar que una desconexión inactiva termine el proceso Node.
- Arranque tolerante: si Neon no responde durante la inicialización, el servidor queda activo y utiliza el catálogo local como respaldo.
- Lectura pública tolerante: ante una falla temporal de Neon, `/api/beneficios` y `/api/health` pueden responder desde el catálogo local.
- `/api/health` informa si Neon está configurado, si está disponible y si el origen efectivo es `neon`, `local-fallback` o `local`.

## Datos
No se borra ni se reemplaza información de Neon. Las migraciones son exclusivamente `ADD COLUMN IF NOT EXISTS`.

## Contenido funcional
Se conserva sin cambios la incorporación de RED SUMMA Education, CADEMA BUREAU – Barrancas de Campana y Expo GlobalPorts 2026, incluido el vencimiento automático de GlobalPorts luego del 04/11/2026.
