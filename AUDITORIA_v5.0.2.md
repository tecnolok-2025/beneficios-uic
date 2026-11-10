# Auditoría v5.0.2

- Versión: 5.0.2
- Generación: BENEFICIOS_UIC_5020
- Catálogo base: 51 beneficios.
- Nuevos filtros públicos: 2.
- Máximo de beneficios recientes: 4.
- Máximo de empresas difundidas: 4 distintas.
- Exclusión obligatoria: Tecno Logisti-K / clave `tecno-logisti-k-sa`.
- Fuente de empresas difundidas: `diffusion_campaigns` con estado `sent` y al menos un destinatario enviado.
- Deduplicación: por `company_key`.
- Acceso: se resuelve contra un beneficio publicado existente antes de mostrarse.
- No se exponen destinatarios, emails ni métricas privadas en el endpoint público.
- QA: 145/145.
