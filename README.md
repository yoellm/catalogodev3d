# DEV3D Studio · Web y catálogo

## Descubrimiento y consultas

La portada muestra las creaciones antes de la presentación del estudio. Servicios y preguntas frecuentes explican qué enviar para consultar una personalización; los enlaces preparados de WhatsApp requieren que el visitante revise y envíe el mensaje.

Inicio, catálogo y solicitud de acceso tienen descripciones, URL canónica y metadatos Open Graph/Twitter. La imagen de 1200 × 630 en `assets/social-cover.png` está compuesta con el logo original y la fuente local, sin imágenes generadas. El sitemap incluye esas tres páginas públicas; administración, cuentas y errores mantienen `noindex`. `404.html` ofrece enlaces de recuperación con rutas absolutas para funcionar también desde direcciones anidadas.

Los detalles del catálogo incorporan `catalogo-share.js`: utiliza el menú nativo de compartir, copia el enlace si no está disponible, y muestra un enlace seleccionable si el navegador no permite copiarlo. Solo se comparte nombre y URL pública; no precios mayoristas, condiciones privadas ni datos de cuenta. No se envían mensajes automáticamente.

`tests/discovery.cjs` comprueba metadatos, canónicas, sitemap, imagen social y exclusiones de páginas privadas. La suite de navegador comprueba compartir y copiar con APIs simuladas, sin abrir aplicaciones externas ni usar el portapapeles real. Estas mejoras facilitan descubrir y consultar las piezas; no garantizan tráfico ni posiciones en buscadores.

## Identidad clara y vista de impresión 3D

Todas las páginas utilizan `dev3d-light.css`, `interface-polish.css` y `studio-light.css`. La calculadora integrada utiliza `calculadora/native-light.css`. El sistema visual y sus recursos se documentan en `DESIGN.md`.

`logo-light.svg` es la versión para fondo blanco del logo original: convierte los tonos blancos a negro y conserva el azul. `logo.png` se mantiene como original. Las fuentes Manrope se sirven desde `assets/`, con su licencia incluida.

La portada incluye una escena automática de impresión 3D como fondo de toda la sección (`print-preview.js`): cama, pieza que crece por capas y cabezal móvil, sin barras laterales. La geometría se precalcula y la animación reutiliza los lienzos en ciclos de 18 segundos. Puede pausarse y se detiene fuera de pantalla, en pestañas ocultas o al solicitar movimiento reducido. No es un producto del catálogo ni calcula tiempos o costes reales.

`npm run test:browser` ejecuta Playwright en Chrome sobre 48 vistas, entre 320 y 1440 px. Comprueba páginas públicas, menús, filtros, diálogos, teclado, contraste del texto y pantallas de administrador y tienda. Firebase se sustituye por datos locales simulados y se bloquean las peticiones externas. Las capturas se guardan en una carpeta temporal indicada al terminar. El script busca Playwright instalado en el proyecto o en el runtime local de Codex; `PLAYWRIGHT_MODULE` permite indicar otra ubicación del módulo. `npm test` mantiene las pruebas funcionales existentes.

Aplicación estática para un repositorio y alojamiento propios. Utiliza Firebase del proyecto savvy-nature-200119 y la misma Realtime Database que el inventario, con datos separados por ramas.

## Separación de los datos

El catálogo solo consulta y modifica:

- dev3dCatalogoPublico: nombres, fotografías, descripciones, categorías y PVP.
- dev3dCatalogoMayorista: precios mayoristas y mínimos por producto; solo administradores y tiendas activas pueden leerlos.
- dev3dTiendas: autorizaciones de tiendas; solo administradores pueden modificarlas. Cada usuario puede leer únicamente su propio perfil.

No lee ni modifica productos, productos_publicos, stock, vendedores, ventas ni liquidaciones del inventario. Crear, editar o eliminar un producto del catálogo solo afecta a sus ramas. No hay sincronización entre aplicaciones. Las imágenes se guardan en productos/dev3d-catalogo/ del bucket Storage compartido.

Se comparten el proyecto Firebase, la instancia de base de datos, Authentication y Storage. Las autorizaciones de tiendas son propias del catálogo. La aplicación y sus archivos no dependen del repositorio de inventario.

## Uso

- index.html: presentación del estudio, servicios, proceso, preguntas frecuentes y contacto.
- catalogo.html: catálogo público y acceso para tiendas.
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

La calculadora se inicializa como pantalla nativa del panel únicamente tras verificar el administrador. El HTML y JavaScript estáticos son públicos en GitHub Pages; no contienen datos privados del negocio. El control de escritura de productos y lectura de tarifas depende de las reglas Firebase.


## Alta de tiendas desde la web

En admin.html, Dar de alta una tienda pide nombre, correo y contraseña inicial (mínimo 8 caracteres y requisitos adicionales de la política Firebase, si existen). La contraseña se utiliza únicamente para crear o comprobar la cuenta en Firebase Authentication; no se guarda en Realtime Database ni se incluye en los perfiles. El administrador debe facilitar las credenciales a la tienda; no se envían correos automáticos.

Si el correo ya tiene cuenta, introduce su contraseña actual para verificarla y autorizar ese usuario. Editar acceso permite cambiar nombre y estado sin conocer la contraseña ni modificarla. La creación utiliza una aplicación Firebase secundaria con sesión solo en memoria, que se cierra al terminar; no sustituye la sesión del administrador. Si falla guardar permisos se intenta deshacer únicamente la cuenta recién creada; no se eliminan cuentas existentes. Si no se puede deshacer, se puede repetir el alta con el mismo correo y contraseña para completar la autorización.

Las reglas mantienen la escritura de dev3dTiendas limitada a los administradores. Crear una cuenta de Authentication no concede por sí solo acceso mayorista. Los perfiles admiten correo opcional para mantener la compatibilidad con tiendas anteriores.


## Menú y espacios por usuario

El menú de la cabecera contiene un inicio de sesión común. Tras entrar, el administrador pasa automáticamente a admin.html y una tienda activa a tienda.html. Una cuenta sin autorización vuelve a la página de inicio. La sesión guardada se reutiliza entre estas páginas.

El panel de administración se abre con tarjetas: Gestión del catálogo, Calculadora y Tiendas, más un espacio informativo para futuras herramientas. Cada tarjeta abre su sección y Volver al panel regresa al inicio. La calculadora se carga al abrir su tarjeta y sus borradores abren directamente Gestión del catálogo.

El menú de una tienda contiene Mi tienda, Catálogo mayorista, Mi cuenta y Cerrar sesión. Mi tienda muestra su perfil; los precios y mínimos se consultan en el catálogo. El menú se actualiza al revocar el acceso o cerrar sesión. Los permisos de Firebase siguen siendo la protección de datos y no cambian con esta reorganización.

Validación: tests/navigation.cjs comprueba rutas de acceso, menús por rol, tarjetas y secciones, revocación y cierre de sesión; se conservan las pruebas de calculadora y alta de tiendas.


## Portada del estudio y contacto

La página inicial presenta DEV3D Studio con secciones de estudio, servicios, proceso de trabajo, tiendas, preguntas frecuentes y contacto. El catálogo se encuentra en catalogo.html y conserva búsquedas, categorías y tarifas por rol. Los enlaces antiguos a index.html#catalogo llevan al catálogo. La presentación se muestra independientemente del catálogo. La selección de muestras consulta únicamente productos públicos; no lee tarifas mayoristas.

Contacto público facilitado por el propietario: WhatsApp +34 678 746 953, Instagram @dev3d.studio y TikTok @dev3dstudio. Los enlaces abren sus respectivos servicios; no se envían mensajes automáticamente. No se ha publicado ninguna dirección de correo, dirección física, plazo de entrega ni política comercial no proporcionada.

Se incluyen metadatos básicos, datos de organización y un sitemap con las dos páginas públicas. Las páginas de administración, tienda y calculadora llevan noindex; la protección de los datos sigue correspondiendo a Firebase.


## Muestras de productos y reseñas

La portada muestra hasta doce productos del catálogo con nombre, foto HTTP/HTTPS y precio público válidos. La selección se actualiza con Firebase y enlaza a cada pieza del catálogo. Con el catálogo vacío se muestra un estado informativo y un enlace al Instagram del estudio; no se incluyen productos inventados ni productos del inventario anterior.

Las creaciones se recorren en un carrusel automático (`featured-carousel.js`), más ancho que el contenido principal. Se desplaza de forma continua a 16 píxeles por segundo y cambia de sentido al llegar a un extremo. Las tarjetas compactas miden 250 px en escritorio y 210 px en móvil. Dispone de pausa y solo avanza mientras está visible, sin foco de teclado ni puntero encima; una interacción táctil retrasa el siguiente avance. Con movimiento reducido funciona de forma manual. Permite desplazamiento táctil nativo, botones anterior/siguiente y teclado con flechas, Inicio y Fin. Los controles desaparecen cuando todas las piezas caben; se actualizan al cambiar los datos o el tamaño de pantalla. En móvil se muestra parte de la siguiente tarjeta para hacer visible el desplazamiento horizontal. Se respeta la preferencia de movimiento reducido.

La sección de reseñas enlaza a la ficha de Google facilitada por el propietario. web-content.js admite hasta tres comentarios reales con author, text, rating (entero de 1 a 5) y url opcional de Google. Actualmente no hay comentarios copiados ni puntuación agregada. El contenido se incorpora manualmente y no se presenta como sincronización automática. No se utiliza Google Places, servicios de terceros ni APIs de pago.


## Calculadora como pantalla nativa

La calculadora ya no usa iframe ni un documento independiente: sus controles se montan directamente en Administración → Calculadora, con el menú y el tema de la web. Las consultas DOM y los estilos se limitan a su contenedor para evitar interferir en productos o tiendas. Los borradores se entregan por una función interna que vuelve a comprobar el administrador y valida los datos; no se utilizan mensajes entre ventanas.

Se conserva la clave local dev3d-catalogo-costes-v1 para mantener los ajustes existentes. Salir de la pantalla y volver no duplica los controles ni pierde el cálculo en curso. Cerrar sesión desmonta los controles y desactiva sus acciones. La antigua dirección calculadora/index.html redirige a admin.html#calculadora.

Se mantienen cálculo manual, materiales, electricidad, trabajo, margen, IVA, precios para tiendas, mínimo, precio cerrado, lectura de G-code y G-code 3MF, copia e impresión. Para ejecutar las pruebas, instalar dependencias de desarrollo con npm ci y ejecutar npm test. linkedom se usa solo en pruebas; la web sigue siendo estática y no necesita instalación ni compilación para publicarse. La prueba nativa utiliza los controles del HTML real y un 3MF comprimido de dos placas.


## Eliminar tiendas y gestionar credenciales

Administración → Tiendas permite crear, editar, desactivar y eliminar tiendas. Eliminar requiere confirmación y borra únicamente dev3dTiendas/UID, retirando su acceso mayorista. Se conserva la cuenta de Firebase Authentication, compartida con el resto del proyecto: no se borra el usuario global ni se alteran datos del inventario.

En Mi tienda → Mi cuenta, las tiendas pueden cambiar correo y contraseña tras introducir su contraseña actual. El correo utiliza verifyBeforeUpdateEmail: solo cambia al confirmar el enlace enviado a la dirección nueva. Después se inicia sesión con ese correo. Actualizar estado de mi correo vuelve a cargar la cuenta; el perfil se sincroniza por UID con el correo del token autenticado. No se guardan contraseñas en Realtime Database. Las tiendas desactivadas conservan el acceso a sus ajustes de cuenta, pero no a los precios mayoristas.

Las reglas permiten al propietario actualizar exclusivamente el campo email de su ficha existente, con el mismo correo de su token; no permiten crear perfiles, cambiar roles, activar acceso ni borrar tiendas. El resto de campos continúa limitado al administrador.

## Respuesta al guardar productos

El formulario indica los campos obligatorios y muestra validación, progreso y resultado junto al botón de guardar. Evita envíos duplicados y conserva los datos si Firebase devuelve un error. Los productos sin fotografía se guardan sin utilizar Storage. Si falta el precio mayorista, PVP, nombre o mínimo, el formulario indica el campo.

### Presupuesto vinculado al producto

Al crear o actualizar un producto desde la calculadora, el guardado de su ficha publica los precios y guarda el cálculo en una única operación. La copia incluye materiales, tiempos, mano de obra, consumibles y ajustes de beneficios/IVA; no incluye los archivos G-code o 3MF. Se conserva en `dev3dProductoPresupuestos/ID_PRODUCTO`, separada del catálogo público y mayorista y accesible solo por administradores. Los presupuestos personales de `dev3dPresupuestos/UID` mantienen sus permisos individuales.

En gestión del catálogo, «Recalcular» recupera esa copia y prepara la actualización del mismo producto. Revisar los precios no los publica: hay que guardar la ficha. Editar únicamente la información del producto conserva su cálculo. Eliminar el producto elimina también su copia; duplicar la ficha no copia el presupuesto. Para productos anteriores sin copia se abre un cálculo nuevo, claramente identificado, que quedará vinculado al guardar los precios. Recuperar un presupuesto personal o reiniciar la calculadora abandona el producto de la sesión sin borrar su copia guardada.

Los precios de venta calculados (directa, mayorista, precio fijo y PVP recomendado de reventa) se redondean hacia arriba en saltos de 0,10 € por unidad, después del beneficio y del IVA. Por ejemplo, 3,67 € pasa a 3,70 €; un importe que ya termina en decenas de céntimos se conserva. Los totales multiplican el precio unitario redondeado, con aritmética en céntimos. Los costes y los porcentajes mantienen su precisión; el PVP objetivo introducido manualmente sirve para evaluar el margen tal como se ha escrito.
