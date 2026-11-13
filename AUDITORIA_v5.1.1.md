# AUDITORÍA v5.1.1 · 13/11/2026

## Privacidad de trazabilidad
- El monitor de empresa exige sesión autenticada de empresa (`requireCompany`).
- El backend usa exclusivamente `req.companySession.companyKey`; el beneficiario no puede enviar un `companyKey` externo para consultar otra entidad.
- El monitor de empresa devuelve métricas agregadas de campañas propias, no la tabla de destinatarios.
- La ruta de trazabilidad individual por empresa/correo exige `requireAdmin`.
- La interfaz de empresa no expone Destinatarios, Validaciones, Correo emisor ni calificaciones individuales.

## Calificación administrativa de interés
- Se calcula al consultar el padrón; no agrega almacenamiento persistente innecesario a Neon.
- Base: aperturas detectadas acumuladas de envíos efectivamente enviados al contacto.
- 5 estrellas = mayor cantidad de aperturas detectadas del padrón; 1–4 estrellas = escala proporcional; 0 estrellas = recibió envíos pero no tiene aperturas detectadas.
- `SIN ENVÍOS` = todavía no tuvo exposición, por lo que no se lo penaliza con 0 estrellas.
- Administración visualiza envíos, campañas con apertura, aperturas totales y tasa detectada.
- Administración puede filtrar por 0–5 estrellas y por contactos sin envíos.
- No existe eliminación automática por calificación.

## Limitación técnica de la métrica
Las aperturas son orientativas. Algunos clientes de correo bloquean imágenes de seguimiento, otros precargan imágenes o aplican protección de privacidad. Por eso una ausencia de apertura detectada no prueba por sí sola que el correo no haya sido leído.

## QA
- 155 pruebas aprobadas, 0 fallidas.
- `node --check server/index.js`: aprobado.
- Build Vite local no ejecutable porque `vite` no está instalado en `node_modules` del entorno; Render mantiene el proceso de instalación/build habitual.
