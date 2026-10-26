# Auditoría técnica · Beneficios UIC v3.9.8.3

## Resultado
APROBADA para despliegue de prueba, con la salvedad de compilación local indicada al final.

## Seguridad de distribución
1. Modo PRUEBA se conserva fail-closed.
2. La lista blanca de distribución contiene únicamente UIC institucional, INDUSVAR GROUP y TECNO LOGISTI-K SA.
3. El worker vuelve a verificar cada destinatario justo antes del SMTP.
4. El padrón general requiere salir de Modo PRUEBA y luego habilitar masivo mediante confirmación independiente.
5. La aprobación administrativa exige doble confirmación tanto en UI como servidor.
6. La prueba SMTP administrativa exige doble confirmación tanto en UI como servidor.

## Recuperación de publicaciones
- Se agregó listado por empresa/cuenta.
- Un beneficiario sólo consulta publicaciones de su empresa y del correo autenticado.
- El administrador puede consultar desde Ver como empresa.
- La lectura de archivos binarios exige autenticación y propiedad de la campaña.
- La actualización de una campaña sólo está permitida para estados draft, blocked o rejected.
- Las campañas pending, queued, sending, sent o cancelled no se pueden sobrescribir.
- Duplicar crea un nuevo draft sin test/validación previa.
- Eliminar está restringido a campañas editables.

## Integridad de borradores
Se eliminó la limpieza automática que borraba drafts/pending/rejected/blocked del mismo beneficio al guardar uno nuevo. Esto evita pérdida silenciosa de trabajos anteriores.

## Pruebas
97 pruebas automáticas aprobadas.

## Sintaxis
- servidor: node --check aprobado.
- frontend JSX: parseo tsc --noEmit aprobado.

## Limitación de la auditoría local
npm ci superó el tiempo disponible del entorno y por ello npm run build no se marca como ejecutado. Esto no modifica el código ni la integridad de los ZIP; Render deberá ejecutar la instalación y build del repositorio durante el deploy.
