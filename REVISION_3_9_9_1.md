# Revisión 3.9.9.1 · Padrón ampliado efectivo en Neon

Esta revisión corrige la migración de la clasificación `socio_confirmar`. La base histórica de Neon tenía una restricción CHECK que impedía almacenar esa nueva categoría. Al iniciar la aplicación, la restricción se actualiza y luego se sincroniza el padrón local.

Resultado esperado sobre el estado mostrado antes de la corrección: 117 contactos registrados y 110 correos únicos habilitados + hasta 202 nuevas casillas no coincidentes. El valor final se calcula sobre Neon vivo y puede variar por bajas o modificaciones manuales.
