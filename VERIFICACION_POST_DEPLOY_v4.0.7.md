# VERIFICACIÓN POST DEPLOY v4.0.7

1. Confirmar `/api/health` con versión `4.0.7` y generación `BENEFICIOS_UIC_4070`.
2. Abrir Monitor: la celda **Aperturas totales** debe mostrar `—` antes de actualizar.
3. Esperar sin tocar nada: el Monitor no debe refrescarse por sí solo.
4. Presionar **Actualizar**.
5. Confirmar que **Aperturas totales** pase de `—` al valor numérico.
6. Confirmar que **Abrieron al menos una vez** y la tasa de apertura continúen visibles.
7. Verificar que campañas en cola o enviándose no provoquen polling automático del navegador.
8. Confirmar que el envío SMTP continúe avanzando normalmente mediante la cola del servidor.
