# Beneficios UIC v4.0.1 — Auditoría y corrección general del Monitor

Fecha: 07/11/2026
Generación: `BENEFICIOS_UIC_4010`
Base: v4.0.0

## Auditoría realizada

Se revisó el circuito completo de Difusión de Beneficios: autorización administrativa, cola, monitor, trazabilidad, permisos de administrador y beneficiario, estados visuales y recuperación de campañas.

### Hallazgos de v4.0.0
1. El backend sí conservaba campañas y trazabilidad.
2. El monitor administrativo sólo podía consultarse entrando en `Empresas → Ver como empresa`; no existía una vista global.
3. La autorización de una campaña la retiraba de Validaciones, pero no ofrecía un acceso directo al seguimiento.
4. El beneficiario tenía el monitor embebido dentro de su panel, pero no un botón claramente separado de la creación de publicaciones.
5. El mismo componente dejaba disponible la cancelación también al beneficiario, aunque la trazabilidad individual ya estaba correctamente restringida al administrador.
6. Los nombres y colores de estados no coincidían exactamente con la definición operativa acordada posteriormente.

## Correcciones v4.0.1

### Administrador
- Nueva pestaña permanente **Monitor**.
- Vista general de campañas de todas las empresas.
- Buscador por empresa/beneficio y filtro por estado.
- Indicadores superiores: Enviando, En cola, Esperando validación y Finalizados.
- Trazabilidad detallada por destinatario y correo.
- Cancelación de campañas en cola o en curso reservada al administrador.
- Al aprobar una campaña en Validaciones, se abre el Monitor y se enfoca la campaña recién autorizada.
- Desde la ficha de una empresa existe acceso directo al Monitor general.

### Beneficiario
- Botón permanente **Monitor de envíos**.
- Botón separado **Crear / gestionar publicaciones**.
- Sólo ve campañas pertenecientes a su empresa.
- Ve métricas agregadas: enviados/total, pendientes, errores, aperturas detectadas, tasa detectada, bajas, tiempos y próxima oportunidad.
- No ve direcciones individuales de destinatarios.
- No puede cancelar una distribución.

### Estados y colores
- Borrador — gris `#6B7280`.
- Prueba enviada — azul `#2563EB`.
- Código verificado — celeste `#0EA5E9`.
- Esperando validación UIC — amarillo `#D97706`.
- Requiere corrección — rojo `#DC2626`.
- Autorizado / En cola — azul oscuro `#1D4ED8`.
- Enviando — azul `#0284C7`.
- Finalizado — verde `#16A34A`.
- Cancelado — gris oscuro `#4B5563`.
- Bloqueado — rojo oscuro `#B91C1C`.

## Base de datos
No se incorporan tablas ni columnas nuevas. No hay migración de Neon. La corrección utiliza las tablas y datos ya existentes.

## Compatibilidad
El parche se aplica directamente sobre **Beneficios UIC v4.0.0**. También se entrega un ZIP completo v4.0.1.

## Validación
`npm test`: **129/129 pruebas aprobadas**.

## Acceso directo para validación desde Tesorería
- El correo enviado a Tesorería cuando una empresa solicita validación incluye acceso directo a la ficha pública del beneficio y acceso directo a la pantalla administrativa de Validaciones.
- El enlace administrativo conserva la campaña como foco; si la sesión no está iniciada, solicita la clave y luego abre Validaciones.
- Cada tarjeta de Validaciones incorpora **Ver beneficio publicado**, abriendo la ficha pública en una pestaña nueva sin perder el trabajo administrativo.
- No se modifican campañas, padrón, datos de Neon ni reglas de autorización.

