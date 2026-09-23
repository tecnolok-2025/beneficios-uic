# Beneficios UIC v3.7.0 — RED SUMMA, CADEMA BUREAU y Expo GlobalPorts

## Objetivo
Auditar la v3.6.0 e incorporar tres beneficios solicitados sin borrar ni reemplazar la base Neon existente.

## Resultado
- Catálogo total: **48 beneficios**.
- Categorías: **15**.
- Estado al 23/09/2026: **40 activos** + **8 a chequear validación**.
- Nueva categoría: **Eventos y exposiciones**.
- Se conservan los 13 beneficios UIPBA sin modificaciones de estado.

## Altas
1. **RED SUMMA Education** — categoría `Acuerdos institucionales`.
   - Convenio institucional.
   - Diplomados: beca vigente + 8% adicional.
   - Grado/pregrado, especializaciones, maestrías y MBA: beca vigente + 5% adicional.
   - Campañas estacionales: hasta 60% o más según vigencia y programa.
   - Contacto RED SUMMA: Javier Arteaga, Director General.
   - Contacto UIC: María José Godoy (Majo).
   - Se incorpora la pieza gráfica adjunta.

2. **CADEMA · BUREAU – Barrancas de Campana** — categoría `Beneficios inmobiliarios`.
   - Convenio empresarial.
   - Bonificación de hasta 10%.
   - Atención prioritaria, preventa y cotización individual.
   - Esquema contractual: comisión total 4%, con 1 punto porcentual de gratificación institucional a UIC sin costo adicional para el adquirente.
   - Contacto comercial: Equipo CADEMA, +54 9 3489 36-8518, ventas@cademaprop.com.ar.
   - Se utiliza material visual del convenio adjunto.

3. **Expo GlobalPorts 2026** — categoría `Eventos y exposiciones`.
   - 10% de descuento sobre valores comerciales de participación para empresas socias UIC.
   - Si cinco empresas socias participan con stand, GlobalPorts otorga a UIC un stand institucional sin cargo.
   - Vigencia cargada hasta el **04/11/2026**.
   - Desde el **05/11/2026** el portal la muestra automáticamente como **FINALIZADO**.

## Ciclo de vida
Se incorpora un estado visual `FINALIZADO` y una regla automática basada en `endDate`. El registro no se elimina: queda visible como antecedente, en color gris, y puede reactivarse actualizando la fecha de fin o la edición desde Administración.

## Administración
Se agregan campos editables de **Fecha de inicio / publicación** y **Fecha de fin / vencimiento automático**, además del estado manual `Finalizado`.

## Neon
La migración continúa siendo aditiva y no destructiva. Los tres nuevos beneficios tienen slugs propios y se insertan mediante la inicialización existente sin borrar ni sobrescribir el catálogo administrado.
