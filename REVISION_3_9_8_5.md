# Beneficios UIC · Revisión v3.9.8.5

Fecha: 26/10/2026

## Objetivo

Eliminar Neon como repositorio de borradores de los beneficiarios. A partir de esta revisión el trabajo previo a la prueba queda exclusivamente en archivos locales `.uicpub` guardados por cada usuario en su computadora.

## Flujo nuevo

1. El beneficiario entra a **Crear una nueva publicación**.
2. Puede iniciar una publicación nueva o elegir **Abrir archivo local**.
3. Edita modelo, textos, imágenes, adjuntos y firma.
4. Usa **Guardar archivo en mi PC** para descargar un `.uicpub` autosuficiente.
5. Puede guardar todas las versiones locales que desee sin usar Neon.
6. Neon interviene recién al pulsar **Enviar correo de prueba**. Esa instancia es operativa y existe para prueba, código de 6 dígitos, validación, cola y monitor.

## Protección de recursos Neon

- El servidor rechaza las solicitudes antiguas que intenten crear/actualizar un borrador remoto sin `operationMode=test`.
- Antes de crear una nueva instancia operativa se borra cualquier `draft/blocked` anterior del mismo `company_key + benefit_slug + originator_email`.
- En el primer arranque de v3.9.8.5 se eliminan los `draft/blocked` heredados que aún no habían ingresado a validación.
- Al rechazar una campaña se conserva metadata, pero se purgan cuerpo, layout e archivos binarios.
- Las campañas ya ingresadas al circuito y la trazabilidad no se eliminan.

## Archivo `.uicpub`

Incluye:
- empresa y beneficio;
- modelo y tipografía;
- todos los bloques de texto;
- franja institucional y nombre visible;
- hasta 4 imágenes del cuerpo;
- hasta 3 adjuntos JPG/PNG/PDF;
- firma editable;
- fecha y versión del formato.

Al abrirlo se valida que pertenezca a la empresa autenticada. La lectura se realiza en el navegador y no llama a `/api/` ni a Neon.

## Firma editable

Se incorporaron campos para editar nombre, cargo/función, correo visible y teléfono visible. La firma se guarda dentro del `layout_json` y se utiliza tanto en vista previa como en el HTML final del correo. El correo registrado de autenticación permanece separado y sigue siendo el único destino de la prueba de identidad.

## Acumulación de v3.9.8.4

Esta entrega incluye también:
- acceso público de beneficiarios por convenio;
- eliminación de empresas `testMode` del listado público;
- aviso público destacado y animado;
- mantenimiento de la empresa piloto únicamente en la lógica privada de control.

## Validación

- 102/102 pruebas automáticas aprobadas.
- `node --check server/index.js`: aprobado.
