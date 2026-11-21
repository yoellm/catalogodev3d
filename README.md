# DEV3D Studio · Catálogo independiente

Proyecto estático listo para un repositorio propio. No importa archivos del inventario y no usa su base de datos. No necesita instalación de dependencias para funcionar; se sirve por HTTP/HTTPS.

## Estado de la nueva base de datos

La instancia remota aún NO está creada. La URL queda vacía intencionadamente; la aplicación muestra un aviso de configuración y no conecta con la base antigua. El script de configuración también rechaza esa base.

1. Abre Firebase Console, proyecto savvy-nature-200119, Realtime Database. Crea una nueva instancia (nombre sugerido: dev3dstudio-catalogo, sujeto a disponibilidad) en europe-west1, con reglas bloqueadas inicialmente. Crear instancias adicionales en el mismo proyecto requiere Blaze: https://firebase.google.com/docs/database/usage/sharding
2. Copia la URL REAL que devuelva Firebase. Con Node instalado, ejecuta desde esta carpeta:

   node scripts/configure.mjs https://URL_REAL_DE_LA_NUEVA_BASE

3. Instala Firebase CLI si no la tienes, inicia sesión con firebase login y publica SOLO las reglas de la nueva base:

   firebase deploy --only database:catalogo

El target catalogo apunta exclusivamente a la nueva instancia. No publiques las reglas de este proyecto sobre la base del inventario.

## Publicación y repositorio

Copia esta carpeta completa a tu nuevo repositorio. Para una vista local: python -m http.server 8080, y abre http://localhost:8080. Puedes usar cualquier alojamiento estático y autorizar su dominio en Firebase Authentication.

Si eliges Firebase Hosting, crea un SITIO nuevo dentro del proyecto y pasa su ID como segundo argumento de configure.mjs. Después ejecuta firebase deploy --only hosting:catalogo. Se exige un target explícito para no sobrescribir el sitio del inventario.

## Accesos

- index.html: catálogo público con búsqueda, categoría y ordenación. Muestra PVP; las tiendas activas ven también su tarifa mayorista y mínimo por producto.
- admin.html: panel exclusivo para administradores, con nombre, descripción, categoría, foto, PVP, mayorista y mínimo. Gestiona también las autorizaciones de tiendas.
- Crea cada cuenta de tienda en Firebase Authentication (Email/Password), copia su UID y autorízalo en admin.html. Los usuarios no pueden concederse el rol tienda. Desactivar una tienda retira sus tarifas de la interfaz.
- Los administradores se configuran en firebase-config.js Y en database.rules.json; ambos deben coincidir.

## Qué se comparte y qué queda separado

Se reutilizan el proyecto Firebase, Authentication y el bucket Storage. Las cuentas pertenecen al mismo proyecto; los permisos de tiendas se guardan exclusivamente en la nueva base. El código, el despliegue, los productos, las tarifas y las autorizaciones del catálogo son independientes del inventario.

Las imágenes nuevas van a productos/dev3d-catalogo/ dentro del bucket existente. No se publica ninguna regla de Storage desde este repositorio, para no sustituir las de la otra aplicación. Las reglas actuales permiten subir imágenes a los administradores. También se puede utilizar una URL de imagen externa.

Ramas de la NUEVA base: dev3dCatalogoPublico (lectura pública), dev3dCatalogoMayorista (solo tienda activa o administrador), dev3dTiendas (solo administrador y lectura de perfil propio). Reglas con denegación por defecto, validación de importes y mínimo entero positivo. No se sincronizan datos con el inventario.

## Verificación antes de publicar

Probar con administrador: crear, editar y eliminar productos y autorizar/revocar tienda. Probar anónimo: solo PVP y lectura de tarifas denegada. Probar tienda activa: PVP, mayorista y mínimo; escritura denegada. Probar cuenta sin autorización: solo PVP. Validar también las reglas con Firebase Emulator antes de uso real.

No se han ejecutado pruebas contra servicios remotos ni publicado reglas. No incluye carrito, pagos ni gestión de pedidos.
