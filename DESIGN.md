# DEV3D Studio

La web utiliza blanco, azul de marca y superficies suaves para presentar el diseño y la impresión 3D. La portada explica el trabajo mediante una simulación por capas; el catálogo presenta únicamente productos reales de Firebase. No se presentan las piezas de la simulación como productos a la venta.

## Color y tipografía

- Fondo: `#ffffff`; superficies auxiliares: `#f3f6fc` y `#edf3ff`.
- Texto principal: `#152236`; secundario: `#526278`.
- Acción principal: `#165dff`, con texto blanco. Enlaces: `#1652c4`.
- Fuente local: Manrope, pesos 400, 600 y 800. Licencia en `assets/Manrope-OFL.txt`.
- Los estados mantienen significado: verde para disponible/entregado, ámbar para pendiente/bajo pedido y rojo para errores/cancelaciones.

## Componentes

`dev3d-light.css` conserva los contenedores, puntos de corte y componentes de la aplicación. `studio-light.css` define la identidad clara y sus estados. `interface-polish.css` aporta navegación por teclado y mejoras móviles. La calculadora utiliza `calculadora/native-light.css` y las mismas variables de identidad.

Ancho máximo de contenido de 1280 px. Campos blancos con bordes visibles; tarjetas de producto de 14 px de radio. Las acciones principales son azules y las secundarias utilizan fondos claros. Los menús y diálogos también son claros. El precio a cobrar y el IVA de la calculadora mantienen su jerarquía y significado.

## Logo y recursos

`logo-light.svg` integra una copia optimizada del logo proporcionado y un filtro SVG: fondo negro a blanco, elementos blancos a negro y conservación del azul. `logo-light.png` es su exportación de 640 × 640 px, renderizada en Chrome. `logo.png` permanece como original. No se han utilizado generadores ni fotografías de terceros para representar productos.

La cabecera utiliza `logo-header.svg`: el logo completo con su tipografía original, encuadrado sin el margen exterior. No separar el extrusor ni reconstruir las letras con una fuente web. Mide 116 × 102 px en escritorio y 100 × 88 px en móvil. La navegación destaca el catálogo en azul y separa el acceso a la cuenta en escritorio.

`print-preview.js` muestra una impresora reconocible que ocupa todo el fondo: cama de impresión, pieza azul con volumen y cabezal con boquilla. No hay barras laterales ni travesaños que enmarquen la escena. El texto está centrado horizontal y verticalmente. La pieza crece por capas y el cabezal recorre su sección superior durante un ciclo de 18 segundos. La geometría completa y la base se precalculan al cambiar el tamaño; la composición reutiliza esos lienzos a un máximo de 24 fotogramas por segundo. Es una demostración visual, no una estimación de fabricación ni un producto del catálogo.

## Accesibilidad y movimiento

Mantener el enlace para saltar al contenido, foco visible, controles de formulario de al menos 16 px en móvil, zoom permitido y controles táctiles amplios. El movimiento de entrada es breve y respeta `prefers-reduced-motion`. Los estilos de hover se limitan a dispositivos capaces de mantener el puntero sobre un elemento.

La portada centra el texto y las acciones sobre un fondo animado que ocupa toda la sección, también en móvil. Una zona blanca suave mantiene el contraste en el centro. La animación tiene un botón de pausa accesible, se detiene cuando la portada sale de pantalla o la pestaña queda oculta, y muestra la pieza terminada estática con movimiento reducido. No volver a separar la ilustración en una columna lateral.

## Descubrimiento y consultas

Las creaciones reales se muestran antes que la presentación del estudio. Los encabezados explican la oferta con palabras concretas: figuras, regalos personalizados y diseño e impresión a medida. Junto a los servicios se explica cómo consultar una idea, con referencia, medidas y cantidad; la acción lleva a un mensaje de WhatsApp que el visitante debe revisar y enviar.

La selección del inicio es un carrusel ancho de hasta doce creaciones, con desplazamiento nativo, teclado, contador y controles de 46 px. Se desplaza lentamente y de forma continua a 16 píxeles por segundo, con tarjetas compactas de 250 px (210 px en móvil), con pausa explícita y detención mientras se interactúa. No avanza con movimiento reducido ni fuera de pantalla. Las fotos muestran el objeto completo. El catálogo utiliza la misma regla de imagen, una acción de detalles visible y precios separados por una línea suave. El administrador conserva cuatro herramientas funcionales en una cuadrícula de dos columnas en escritorio y una en móvil; no añadir tarjetas sin acción. Los listados usan filas alternas suaves y destacan la acción Editar sin confundirla con Eliminar.

La imagen para compartir utiliza el logo original, Manrope y los mismos colores. No añadir reseñas, plazos, materiales, disponibilidad o precios que no procedan del negocio. Compartir productos solo transmite el nombre y el enlace público. La página de error ofrece una salida clara al catálogo, al inicio y al contacto.
