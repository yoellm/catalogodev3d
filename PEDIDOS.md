# Pedidos y opciones de producto

Los pedidos se permiten únicamente a tiendas mayoristas activas. Visitantes, administradores y cuentas sin acceso mayorista pueden consultar el catálogo y los detalles, pero no preparar ni enviar pedidos. Los enlaces de Wallapop siguen disponibles en la vista pública. Las tiendas activas utilizan exclusivamente su tarifa mayorista. El mínimo se suma por producto y color: varias personalizaciones del mismo color pueden completarlo; colores distintos no se suman. Las cantidades no necesitan ser múltiplos del mínimo.

Los borradores de pedidos mayoristas se conservan hasta 30 días en el almacenamiento local de este navegador, separados por UID. Se recuperan al recargar o volver al catálogo. Se guardan únicamente productos, cantidades, colores y personalizaciones/comentarios por pieza, sin precios ni datos de contacto; las tarifas y la disponibilidad se vuelven a consultar. Cerrar sesión, retirar el acceso mayorista o pulsar Vaciar pedido elimina el borrador. Si el navegador impide guardar, se avisa y el pedido continúa en memoria. Al pulsar Registrar solicitud y abrir WhatsApp se guarda una solicitud pendiente en Firebase y se vacía el borrador solo si el registro termina correctamente. No se reserva inventario. El usuario revisa el resumen en WhatsApp y debe pulsar Enviar; registrar la solicitud no envía el mensaje ni confirma el pedido. Los precios y la disponibilidad se vuelven a comprobar antes de abrir WhatsApp. Envío y condiciones finales quedan a confirmar.

Administración: el formulario admite disponibilidad, plazo orientativo, colores separados por comas y personalización opcional. Productos antiguos conservan el comportamiento por defecto: disponibles, plazo a confirmar y color libre. Duplicar abre una copia sin ID y sin enlace al anuncio de Wallapop; no publica hasta guardar.

La galería admite 6 fotos contando la principal. Las fotos nuevas se comprimen localmente hasta 100 KB. La primera actúa como portada si no hay una principal. Se pueden retirar URLs del campo de galería; retirar una URL no borra archivos de Storage porque pueden ser utilizados por copias del producto.

Los nuevos campos se guardan solo bajo dev3dCatalogoPublico: imagenes, colores, estado, plazo y personalizable. Las tarifas siguen bajo dev3dCatalogoMayorista. Las reglas de inventario no se han alterado.

Comprobaciones: tests/orders.cjs, tests/commerce-ui.cjs y tests/gallery-upload.cjs, además de las pruebas existentes. No se han enviado pedidos ni creado productos de prueba en producción.

## Referencias

Cada producto tiene una referencia estable: la configurada en referencia o, en productos antiguos, D3D- seguida de su ID. En administración se puede indicar una referencia de hasta 40 letras, números, guiones o guiones bajos. Al guardar se comprueba que no coincida con otro producto cargado en el catálogo. Las referencias también sirven para buscar y se incluyen en el resumen de WhatsApp. Duplicar deja la referencia vacía para generar una nueva al guardar. No se han migrado ni modificado los productos existentes.

## Historial y seguimiento

Las solicitudes se guardan en dev3dPedidos/UID/ID, separadas del inventario. Cada tienda consulta únicamente su historial en Mi tienda, incluso si se desactiva su acceso a nuevos pedidos. Eliminar su ficha revoca también esta lectura. El administrador dispone de una tarjeta Pedidos con buscador, filtro de estado y páginas de 12 solicitudes. Puede abrir el resumen y actualizar el estado y una nota visible para la tienda: pendiente, confirmado, en fabricación, enviado, entregado o cancelado. No se envían avisos ni mensajes automáticamente.

La solicitud conserva datos de contacto y la tarifa, referencias, cantidades, colores y personalizaciones del momento de su creación. No cambia al editar el catálogo. Las reglas comprueban tarifa y mínimo vigentes, sumas por grupo y marcas de tiempo del servidor. Los clientes no pueden modificar ni borrar solicitudes; el administrador puede actualizar únicamente el seguimiento desde esta web. No se guardan contraseñas en los pedidos. Los datos de contacto quedan en este historial privado hasta que el propietario del proyecto los elimine desde una herramienta administrativa.

La referencia usa el ID completo para evitar colisiones. Los reintentos reutilizan el ID si el guardado falla; una respuesta perdida se comprueba contra el registro antes de reintentar. Si falla el registro, se conserva el borrador y no se abre WhatsApp.

Pruebas locales de permisos: iniciar el emulador de Realtime Database en 127.0.0.1:9008 con tests/firebase-emulator.json y ejecutar node tests/order-rules.cjs. La prueba carga las reglas y datos ficticios solo en demo-dev3d-default-rtdb, nunca en producción. tests/order-history.cjs cubre los flujos de solicitud y seguimiento y forma parte de npm test.

## Lectura de la calculadora

El resultado principal muestra lo que cobra DEV3D Studio con IVA, por unidad y por pedido. La venta para tiendas presenta su tarifa mayorista y, en un bloque separado, el PVP de reventa y el margen de la tienda. El beneficio propio se muestra sin IVA. El desglose de costes y el detalle del IVA se abren solo cuando se necesitan. Se conservan las fórmulas y redondeos anteriores.

Al preparar un producto desde la calculadora, precio siempre toma la tarifa de venta directa por unidad y mayorista toma la tarifa para tiendas por unidad, ambos con IVA. El modo de visualización, el total del lote y el PVP de reventa de la tienda no cambian estos campos. El mínimo se guarda solo en dev3dCatalogoMayorista y no afecta al precio público. tests/calculator-catalog-prices.cjs verifica el recorrido completo de calculadora, formulario y escritura de ambos registros.
