# Parche v3.9.0 → v3.9.1

Aplicar sobre una instalación exacta de v3.9.0.

Incluye el piloto administrativo de Difusión, padrón privado de socios y convenios/no socios, empresa piloto Tecno Logisti-K SA, circuito prueba/validación/envío, modo mantenimiento, correcciones del padrón y controles por empresa.

No elimina beneficios ni modifica las 51 fichas del catálogo. Las tablas nuevas de Difusión se crean con `CREATE TABLE IF NOT EXISTS` y las correcciones del padrón se aplican de manera dirigida para no pisar posteriores ediciones administrativas.

Mantener `DIFFUSION_SEND_ENABLED=false` hasta completar la configuración y prueba de SMTP.
