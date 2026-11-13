# Auditoría v5.1.5

## Objetivo
Restablecer un acceso robusto de beneficiario para TECNO LOGISTI-K SA sin debilitar la seguridad del resto de las empresas.

## Controles
- Empresa piloto sigue definida con key `tecno-logisti-k-sa`.
- Registro exige coincidencia exacta con un correo autorizado.
- Una cuenta piloto previamente verificada puede solicitar un nuevo código de registro para redefinir contraseña.
- Empresas no piloto siguen recibiendo `ALREADY_REGISTERED` si intentan registrarse nuevamente.
- La sesión de beneficiario continúa separada de la sesión administrativa.
- El modo prueba de TECNO LOGISTI-K sigue limitado por servidor a los tres destinos de control.
- Se preservan los 8 modelos profesionales y el almacenamiento local `.uicpub` restaurados en v5.1.4.
