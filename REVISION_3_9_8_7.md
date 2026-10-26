# Beneficios UIC · Revisión v3.9.8.7

Fecha: 26/10/2026

## Convivencia de empresas reales y Modo PRUEBA

- Se restauran como empresas de prueba permanentes los tres destinos de control: UNIÓN INDUSTRIAL DE CAMPANA, INDUSVAR GROUP y TECNO LOGISTI-K SA.
- Las tres aparecen en el selector de empresas junto con las empresas reales y se identifican visualmente como **MODO PRUEBA**.
- Ya no se ocultan del selector público de beneficiarios; el acceso continúa protegido por coincidencia exacta del correo registrado y contraseña.
- La mención particular de TECNO LOGISTI-K sigue fuera de la portada pública de acceso: allí no se expone ninguna empresa privada como ejemplo.
- Protección fail-safe adicional: cualquier campaña cuyo `company_key` corresponda a una de las tres empresas de prueba queda forzada a la lista blanca de 3 destinos, aun si Modo PRUEBA global estuviera desactivado y el padrón general habilitado.
- El correo institucional de UIC puede utilizarse en la empresa interna de prueba, sin habilitarlo como correo registrable de empresas reales.

## Acumulación

Esta revisión conserva íntegramente v3.9.8.4, v3.9.8.5 y v3.9.8.6: acceso por convenio, archivos locales `.uicpub`, firma editable, logo/web, selector de guardado, seguridad de padrón, baja confirmada, correo móvil responsive y monitor/trazabilidad de ciclo completo.
