# Pedidos y opciones de producto

Los pedidos se permiten únicamente a tiendas mayoristas activas. Visitantes, administradores y cuentas sin acceso mayorista pueden consultar el catálogo y los detalles, pero no preparar ni enviar pedidos. Los enlaces de Wallapop siguen disponibles en la vista pública. Las tiendas activas utilizan exclusivamente su tarifa mayorista. El mínimo se suma por producto y color: varias personalizaciones del mismo color pueden completarlo; colores distintos no se suman. Las cantidades no necesitan ser múltiplos del mínimo.

Los borradores de pedidos mayoristas se conservan hasta 30 días en el almacenamiento local de este navegador, separados por UID. Se recuperan al recargar o volver al catálogo. Se guardan únicamente productos, cantidades, colores y personalizaciones/comentarios por pieza, sin precios ni datos de contacto; las tarifas y la disponibilidad se vuelven a consultar. Cerrar sesión, retirar el acceso mayorista o pulsar Vaciar pedido elimina el borrador. Si el navegador impide guardar, se avisa y el pedido continúa en memoria. No se guardan datos de pedidos en Firebase ni se reserva inventario. El usuario revisa el resumen en WhatsApp y debe pulsar Enviar. Los precios y la disponibilidad se vuelven a comprobar antes de abrir WhatsApp. Envío y condiciones finales quedan a confirmar.

Administración: el formulario admite disponibilidad, plazo orientativo, colores separados por comas y personalización opcional. Productos antiguos conservan el comportamiento por defecto: disponibles, plazo a confirmar y color libre. Duplicar abre una copia sin ID y sin enlace al anuncio de Wallapop; no publica hasta guardar.

La galería admite 6 fotos contando la principal. Las fotos nuevas se comprimen localmente hasta 100 KB. La primera actúa como portada si no hay una principal. Se pueden retirar URLs del campo de galería; retirar una URL no borra archivos de Storage porque pueden ser utilizados por copias del producto.

Los nuevos campos se guardan solo bajo dev3dCatalogoPublico: imagenes, colores, estado, plazo y personalizable. Las tarifas siguen bajo dev3dCatalogoMayorista. Las reglas de inventario no se han alterado.

Comprobaciones: tests/orders.cjs, tests/commerce-ui.cjs y tests/gallery-upload.cjs, además de las pruebas existentes. No se han enviado pedidos ni creado productos de prueba en producción.

## Referencias

Cada producto tiene una referencia estable: la configurada en referencia o, en productos antiguos, D3D- seguida de su ID. En administración se puede indicar una referencia de hasta 40 letras, números, guiones o guiones bajos. Al guardar se comprueba que no coincida con otro producto cargado en el catálogo. Las referencias también sirven para buscar y se incluyen en el resumen de WhatsApp. Duplicar deja la referencia vacía para generar una nueva al guardar. No se han migrado ni modificado los productos existentes.
