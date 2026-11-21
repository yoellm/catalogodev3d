# DEV3D Studio · Catálogo independiente

Aplicación estática para un repositorio y alojamiento propios. Utiliza Firebase del proyecto savvy-nature-200119 y la misma Realtime Database que el inventario, con datos separados por ramas.

## Separación de los datos

El catálogo solo consulta y modifica:

- dev3dCatalogoPublico: nombres, fotografías, descripciones, categorías y PVP.
- dev3dCatalogoMayorista: precios mayoristas y mínimos por producto; solo administradores y tiendas activas pueden leerlos.
- dev3dTiendas: autorizaciones de tiendas; solo administradores pueden modificarlas. Cada usuario puede leer únicamente su propio perfil.

No lee ni modifica productos, productos_publicos, stock, vendedores, ventas ni liquidaciones del inventario. Crear, editar o eliminar un producto del catálogo solo afecta a sus ramas. No hay sincronización entre aplicaciones. Las imágenes se guardan en productos/dev3d-catalogo/ del bucket Storage compartido.

Se comparten el proyecto Firebase, la instancia de base de datos, Authentication y Storage. Las autorizaciones de tiendas son propias del catálogo. La aplicación y sus archivos no dependen del repositorio de inventario.

## Uso

- index.html: catálogo público y acceso para tiendas.
- admin.html: gestión privada de productos, fotografías, precios y mínimos; autorización y revocación de tiendas.
- En administración, usa Dar de alta una tienda e indica nombre, correo y contraseña inicial. El panel crea la cuenta y autoriza su acceso sin entrar en Firebase ni cerrar la sesión del administrador. No se concede acceso al inventario por tener rol tienda.
- Los administradores se configuran tanto en firebase-config.js como en catalogo.rules.json.
- Vista local: python -m http.server 8080, y abrir http://localhost:8080.

## Publicar las reglas compartidas

La URL real de la base existente ya está configurada. No hay que crear otra instancia.

Firebase publica el conjunto completo de reglas de una instancia. Por eso database.rules.json conserva las reglas actuales del repositorio del inventario y añade las tres ramas del catálogo. Se ha actualizado también el archivo local de reglas del inventario para que un despliegue posterior no borre los permisos del catálogo. El inventario sigue sin enlaces ni código de esta aplicación.

Si las reglas de producción han cambiado, exportarlas desde Firebase Console y combinarlas antes de desplegar:

    node scripts/merge-rules.mjs RUTA_REGLAS_ACTUALES_EXPORTADAS.json

El archivo catalogo.rules.json es únicamente el fragmento de reglas del catálogo; no publicarlo solo como reglas de toda la base. Mantener actualizado el conjunto combinado en ambos repositorios cuando cambien permisos.

Con Firebase CLI instalado y sesión iniciada:

    firebase deploy --only database:catalogo

El target catalogo apunta a savvy-nature-200119-default-rtdb. No se han publicado reglas remotamente desde esta sesión. No se modifica ninguna regla de Storage.

## Publicar la web

Subir los archivos estáticos al alojamiento elegido y autorizar su dominio en Firebase Authentication. Para Firebase Hosting, crear un sitio propio del catálogo y configurar su ID:

    node scripts/configure.mjs ID_SITIO_HOSTING_DEL_CATALOGO
    firebase deploy --only hosting:catalogo

El target de Hosting es independiente para no sobrescribir el sitio del inventario.

## Verificar tras publicar

Administrador: crear, editar y eliminar productos, subir imágenes y autorizar tiendas. Anónimo: ver solo PVP y tener denegada la lectura mayorista. Tienda activa: ver PVP, mayorista y mínimo, sin permiso de escritura. Tienda desactivada: solo PVP. Comprobar que ninguna operación altera productos ni stock del inventario. No se han realizado pruebas con usuarios reales ni publicado reglas.


## Calculadora integrada

En admin.html, inicia sesión como administrador y pulsa Calculadora de costes y precios. La copia integrada está en calculadora/; conserva cálculo manual, lectura de G-code/3MF, precios para tiendas y precio cerrado con colchón. Los archivos se procesan en el navegador. Los ajustes de esta copia se guardan en dev3d-catalogo-costes-v1, de forma independiente de la calculadora original. No se migran automáticamente los ajustes de otro dominio.

Preparar producto en catálogo devuelve un borrador al formulario: nombre, PVP, precio mayorista y mínimo, con IVA según lo configurado en la calculadora. En venta a tienda se usa el PVP evaluado y en directa el precio directo; el mayorista se calcula con los ajustes para tiendas. Revisa precios, impuestos, categoría y fotografía y pulsa Guardar producto para publicarlo. No se guardan costes ni beneficios internos en las ramas públicas. El mínimo no aplica descuento unitario.

La calculadora se carga dentro del panel únicamente tras verificar el administrador. El HTML y JavaScript estáticos son públicos en GitHub Pages; no contienen datos privados del negocio. El control de escritura de productos y lectura de tarifas depende de las reglas Firebase.


## Alta de tiendas desde la web

En admin.html, Dar de alta una tienda pide nombre, correo y contraseña inicial (mínimo 8 caracteres y requisitos adicionales de la política Firebase, si existen). La contraseña se utiliza únicamente para crear o comprobar la cuenta en Firebase Authentication; no se guarda en Realtime Database ni se incluye en los perfiles. El administrador debe facilitar las credenciales a la tienda; no se envían correos automáticos.

Si el correo ya tiene cuenta, introduce su contraseña actual para verificarla y autorizar ese usuario. Editar acceso permite cambiar nombre y estado sin conocer la contraseña ni modificarla. La creación utiliza una aplicación Firebase secundaria con sesión solo en memoria, que se cierra al terminar; no sustituye la sesión del administrador. Si falla guardar permisos se intenta deshacer únicamente la cuenta recién creada; no se eliminan cuentas existentes. Si no se puede deshacer, se puede repetir el alta con el mismo correo y contraseña para completar la autorización.

Las reglas mantienen la escritura de dev3dTiendas limitada a los administradores. Crear una cuenta de Authentication no concede por sí solo acceso mayorista. Los perfiles admiten correo opcional para mantener la compatibilidad con tiendas anteriores.
