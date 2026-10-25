> **Revisión actual: v3.9.1 · BENEFICIOS_UIC_391 · 51 beneficios · 16 categorías**

# Beneficios UIC — Portal institucional de beneficios

Portal de beneficios de la **Unión Industrial de Campana (UIC)**.


## Revisión v3.9.1 · 24/10/2026

- Mantiene **Difusión de Beneficios** cerrada al público y accesible sólo con la misma sesión administrativa existente.
- Incorpora **TECNO LOGISTI-K SA** como empresa piloto privada: Néstor Manucci, Director.
- Agrega el padrón privado de difusión con **94 socios UIC** y **19 empresas con convenio no socias** (23 contactos en total para esas 19 empresas).
- La habilitación se controla **por empresa**, con una única casilla `Recibe comunicaciones`; si una empresa tiene dos contactos, la casilla gobierna a sus contactos válidos.
- Destildar una empresa no la elimina: sólo la excluye de los próximos envíos.
- Corrige datos confirmados por UIC: TECMACO → `info@tecnodealer.com.ar`; Montajes Interacero → `info@montajesinteracero.com.ar`; Plaza Hotel → `martin@eraina.com.ar`; SWA pasa a **SWA/NEUCO** y queda destildada hasta disponer de correo válido.
- TIBEST se identifica en el padrón societario como **BULLETBABA SRL - TIBEST**.
- Implementa circuito protegido: borrador → correo de prueba al originador → solicitud de validación a `uic@uic-campana.com.ar` → aprobación administrativa → primer correo final al originador → distribución en CCO al padrón habilitado.
- El correo de prueba **no consume** el plazo mensual. El plazo se inicia sólo después del envío final aprobado.
- Agrega modo mantenimiento institucional para indisponibilidad de Neon en el módulo de difusión.
- Declara `nodemailer` como dependencia del servidor para SMTP.

## Revisión v3.9.0 · 23/10/2026

- Incorpora el botón público **Difusión de Beneficios** en el Portal.
- Durante esta etapa el módulo permanece **cerrado a empresas y terceros**.
- El acceso temporal reutiliza exactamente la autenticación administrativa existente (`ADMIN_PASSWORD` + sesión segura del portal).
- Si el administrador ya inició sesión, puede entrar directamente; si no, se solicita la misma clave utilizada en **Agregar beneficio / Administración**.
- Dentro del módulo se incorpora un directorio de empresas/prestadores con buscador y agrupación automática de todos sus beneficios.
- Se deja visible la lógica futura: una sola cuenta por empresa y cupo mensual independiente por cada beneficio, pero sin activar aún registro, recuperación de contraseña ni envío de correos.
- Se agrega retorno explícito **Volver al Portal de Beneficios** en el acceso y dentro del nuevo módulo.
- No se modifica el catálogo, Neon, los convenios ni los 51 beneficios de v3.8.0.

## Revisión v3.8.0 · 23/10/2026

- Catálogo final: **51 beneficios** y **16 categorías**.
- Nuevas fichas: **CEOP Internacional**, **TIBEST Broker de Seguros** y **DNV Business Assurance**.
- **Praxis Finanzas** se actualiza sobre su ficha existente; no se duplica.
- Categorías: CEOP → `Acuerdos institucionales`; TIBEST → `Broker de seguros`; Praxis → `Gestión empresarial`; DNV → `Certificación y calidad`.
- CEOP: por instrucción UIC, los referentes se cargan como **Hugo López** y **Sandra Rodríguez**.
- Imágenes: extraídas de los documentos fuente suministrados por UIC.
- Neon: inserción aditiva de tres slugs nuevos y actualización dirigida exclusivamente a la ficha Praxis existente; no se eliminan otros beneficios ni flyers administrativos.

## Estado actual

- **51 beneficios** en el catálogo base.
- **43 beneficios activos** y **8 beneficios UIPBA a chequear validación**.
- **16 categorías** disponibles.
- Base PostgreSQL existente en **Neon** preservada.
- Alta, edición, publicación, eliminación y carga de flyers desde Administración.
- Imágenes institucionales de respaldo, manteniendo prioridad para los flyers cargados por Administración.
- Buscador flexible por nombre, fragmentos, categoría, texto, contacto y palabras clave.
- Presentación visual industrial premium y responsive para escritorio y celular.

## Incorporaciones v3.8.0

### CEOP Internacional
Acuerdo institucional de formación, liderazgo y desarrollo humano. Se publica 50% de bonificación sobre matrícula anual y se deja la bonificación sobre aranceles sujeta a confirmación con CEOP porque el documento fuente contiene una inconsistencia interna en ese porcentaje.

### TIBEST · Broker de Seguros
Canal UIC con asesoramiento especializado, comparación multi-compañía cuando corresponda, condiciones diferenciales según riesgo/aseguradora, contratación directa y acompañamiento en siniestros.

### DNV Argentina · Business Assurance
Nueva categoría `Certificación y calidad`: 12% de descuento en auditorías iniciales de certificación, 10% en emisión de certificados acreditados y 10% en cursos de sistemas de gestión, además de herramientas digitales cuando apliquen.

### Praxis Finanzas
Se consolida la ficha existente como **Departamento de Finanzas Corporativas UIC – Praxis Finanzas**, manteniendo el mismo slug para evitar duplicados y actualizar la información en Neon de forma dirigida.

## Seguridad de actualización

La actualización mantiene la misma conexión a Neon. El catálogo local (`data/catalog.json`) funciona como respaldo e inicialización controlada. Los tres beneficios nuevos utilizan slugs propios y se incorporan mediante `INSERT ... ON CONFLICT`. Praxis ya existía: se actualiza solamente ese slug, sin borrar otros beneficios ni los flyers administrativos cargados en su ficha.

## Identificación técnica

- **Versión:** `3.9.1`
- **Generación:** `BENEFICIOS_UIC_391`
- **Total de beneficios:** 51
- **Beneficios activos:** 43
- **A chequear validación:** 8
- **Total de categorías:** 16

El servidor valida que el frontend compilado corresponda a la misma generación antes de iniciar.

## Desarrollo / validación

```bash
npm ci --include=dev
npm test
npm run build
npm start
```

## Historial reciente

### v3.9.1
Agrega el padrón privado de destinatarios por empresa, empresa piloto Tecno Logisti-K SA y circuito prueba → validación → envío final.

### v3.9.0
Agrega el acceso **Difusión de Beneficios** en modo de construcción protegido exclusivamente por la misma autenticación administrativa existente, con buscador y agrupación de empresas y retorno explícito al Portal.

### v3.8.0
Incorpora CEOP Internacional, TIBEST Broker de Seguros y DNV Business Assurance; actualiza Praxis Finanzas sin duplicarlo; crea la categoría Certificación y calidad; mantiene la arquitectura Neon/Render.

### v3.7.1
Hotfix de robustez Render/Neon sobre el catálogo de 48 beneficios y 15 categorías.

### v3.7.0
Incorporó RED SUMMA Education, CADEMA BUREAU y Expo GlobalPorts 2026, junto con vencimiento automático para beneficios temporales.

### v3.6.0
Incorporó 13 fichas provenientes de UIPBA, con cinco activas y ocho identificadas para revalidación.
