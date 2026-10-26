# Auditoría técnica v3.9.8.1

- Versión: 3.9.8.1
- Generación: BENEFICIOS_UIC_3981
- Migraciones: sólo `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` e índice adicional; no se eliminan tablas ni registros.
- Cola: intervalo efectivo mínimo 45 segundos.
- Trazabilidad: token HMAC individual por destinatario/campaña; endpoint de píxel devuelve GIF 1×1 y registra aperturas detectadas.
- Baja: token HMAC individual asociado a campaña, cola y destinatario; mantiene compatibilidad con enlaces de baja anteriores.
- Padrón: la baja actualiza `enabled=FALSE` y `opted_out_at`; futuras campañas excluyen ese correo.
- Privacidad: métricas agregadas para beneficiario; detalle por correo sólo en endpoint administrador.
- Identidad: logo Beneficios UIC embebido por CID, evitando depender de una imagen externa.
- Prueba: botón de baja visible pero inactivo para evitar una exclusión accidental durante desarrollo.
- Validación automática: 87/87 pruebas Node aprobadas; `node --check server/index.js` aprobado; parseo JSX con TypeScript aprobado.
- Build local: `npm ci --include=dev --ignore-scripts` no finalizó dentro del límite del entorno, por lo que `npm run build` no se declara ejecutado localmente. Render debe instalar dependencias y compilar normalmente.
