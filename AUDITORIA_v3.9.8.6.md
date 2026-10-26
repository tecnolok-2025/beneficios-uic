# Auditoría técnica · Beneficios UIC v3.9.8.6

Fecha: 26/10/2026

## Resultado

- `npm test`: **106/106 aprobadas**.
- `server/index.js`: sintaxis aprobada con `node --check`.
- `src/App.jsx`: parseo JSX aprobado con TypeScript 5.8.3 usando `jsx: preserve`, `noEmit`, `noResolve` y `typeRoots` vacío.
- La instalación local completa de dependencias no pudo finalizar dentro del entorno de trabajo; por eso no se utiliza `npm run build` como evidencia de esta auditoría. La batería propia del proyecto y los chequeos de sintaxis sí finalizaron correctamente.

## Puntos auditados

1. `.uicpub` continúa siendo respaldo local y no utiliza Neon para guardar borradores.
2. El selector de archivo utiliza File System Access API cuando está disponible y conserva fallback de descarga.
3. Página web y logo se integran a `layout_json.signature`; el logo viaja como medio `placement='logo'` sólo al iniciar el circuito operativo.
4. El padrón general conserva doble barrera: Modo PRUEBA + habilitación expresa.
5. La validación administrativa muestra los datos del firmante y accesos de contacto.
6. La baja exige POST y confirmación escrita `BAJA`; abrir el enlace no modifica el destinatario.
7. El renderer de correo contiene media query para apilar galerías y composiciones en móvil.
8. `monitorPayload()` incluye estados previos a la autorización (`draft` con prueba, `pending`, `rejected`, `blocked`) además de cola y cierre.
9. La trazabilidad detallada por destinatario permanece detrás del endpoint administrativo.
10. El polling del beneficiario es adaptativo: 15 s en cola/envío, 45 s en validación pendiente y 0 s en historial inactivo.
11. La limpieza de arranque conserva campañas con `test_sent_at` o `test_verified_at`.
