# Correos de recuperación

La plantilla password-reset-template.json es una propuesta preparada, NO está desplegada.

El 2026-11-21 la API de Firebase rechazó tanto la plantilla completa como la edición solo de asunto/remitente con EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED. La plantilla activa sigue siendo la predeterminada.

El nombre visible del proyecto se ha cambiado de My Project a DEV3D Studio, sin alterar su ID. Falta comprobar qué nombre usa un correo real posterior al cambio.

La configuración actual indica que no se ha iniciado la verificación de un dominio de correo propio. Para personalizar el dominio remitente se necesita verificar los registros DNS indicados por Firebase. No se han modificado DNS ni enviado correos de prueba.

## Pantalla propia de acciones de cuenta

Publicada: https://www.dev3dstudio.es/cuenta-accion.html

Gestiona resetPassword, verifyEmail, verifyAndChangeEmail y recoverEmail. Las confirmaciones de correo requieren pulsar un botón; no se consumen códigos al abrir la página. No utiliza continueUrl externo.

www.dev3dstudio.es está autorizado en Firebase Authentication. El intento de actualizar notification.sendEmail.callbackUri a la URL propia fue rechazado con EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED. El gestor predeterminado sigue activo hasta que se cambie la URL de acción desde la consola o se resuelva la restricción del proyecto. No se ha enviado ningún correo de prueba ni modificado ninguna cuenta real.
