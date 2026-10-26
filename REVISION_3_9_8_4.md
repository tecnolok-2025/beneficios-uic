# Beneficios UIC · Revisión v3.9.8.4

Fecha: 26/10/2026

## Objetivo
Corregir la experiencia pública de ingreso a Difusión de Beneficios para que una empresa o institución que haya firmado un convenio con la UIC identifique claramente el acceso **Como beneficiario**, sin utilizar la clave privada administrativa.

## Cambios realizados
- Se reformuló la pantalla “¿Cómo querés ingresar?” para explicar el criterio de convenio.
- El acceso beneficiario indica que sirve para preparar y publicar promociones, beneficios y novedades.
- Se agregó una nota inferior de mayor tamaño con énfasis visual alternado para llamar la atención sin perder legibilidad.
- El listado público `/api/difusion/companies` excluye las entidades marcadas `testMode`.
- La guía pública dejó de nombrar empresas y destinatarios internos del Modo PRUEBA.
- La empresa piloto, los destinos de control y la lista blanca permanecen intactos en el circuito privado del administrador.

## Seguridad
No se eliminó la autenticación propia del beneficiario: la empresa continúa validándose por su correo registrado y, luego del alta, utiliza su credencial personal. Lo que no necesita es la clave privada administrativa de la UIC.
