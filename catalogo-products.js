(function(scope){
  'use strict';
  function invalid(field,message){throw Object.assign(new Error(message),{code:'product/invalid-field',field});}
  function reference(product,id){return String(product.referencia||'').trim()||'D3D-'+id;}
  function imageUrl(value){try{const url=new URL(String(value||'').trim());return url.href.length<=2000&&['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
  function gallery(product){return [...new Set([product.imagen,...Object.values(product.imagenes||{})].map(imageUrl).filter(Boolean))].slice(0,6);}
  function colors(value){return [...new Set((Array.isArray(value)?value:String(value||'').split(',')).map(x=>String(x).trim()).filter(Boolean))];}
  function availability(product){return {disponible:'Disponible',bajo_pedido:'Bajo pedido',agotado:'Temporalmente agotado'}[product.estado]||'Disponible';}
  function minimumType(trade){return trade?.minimoTipo==='producto'?'producto':'color';}
  function minimumLabel(trade){return minimumType(trade)==='producto'?'por producto, combinando colores':'por color';}
  function pricingWarnings(values){
    const warnings=[],publicSet=String(values.precio??'').trim()!=='',tradeSet=String(values.mayorista??'').trim()!=='';
    if(publicSet&&!tradeSet)warnings.push('Falta el precio mayorista por unidad para las tiendas.');
    if(tradeSet&&!publicSet)warnings.push('Falta el precio público por unidad.');
    if(publicSet&&tradeSet&&Number.isFinite(Number(values.precio))&&Number.isFinite(Number(values.mayorista))&&Number(values.mayorista)>Number(values.precio))warnings.push('El precio mayorista por unidad supera al precio público. Revisa si es lo que quieres ofrecer a las tiendas.');
    if((publicSet||tradeSet)&&(!Number.isSafeInteger(Number(values.minimo))||Number(values.minimo)<1))warnings.push('Indica un pedido mínimo para tiendas: un entero de al menos 1 unidad.');
    if(values.estado==='bajo_pedido'&&!String(values.plazo||'').trim())warnings.push('El producto es bajo pedido y todavía no tiene plazo orientativo para la tienda.');
    return warnings;
  }
  function wallapopUrl(value){
    try{const url=new URL(String(value||'').trim());return url.href.length<=2000&&url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(url.hostname==='wallapop.com'||url.hostname.endsWith('.wallapop.com'))?url.href:'';}catch{return '';}
  }
  function validate(values){
    const nombre=String(values.nombre||'').trim(),descripcion=String(values.descripcion||'').trim(),categoria=String(values.categoria||'').trim();
    if(!nombre||nombre.length>150)invalid('nombre','Indica un nombre para el producto (máximo 150 caracteres).');
    if(descripcion.length>3000)invalid('descripcion','La descripción no puede superar los 3000 caracteres.');
    if(categoria.length>100)invalid('categoria','La categoría no puede superar los 100 caracteres.');
    const prices={};
    for(const [field,label] of [['precio','el precio de venta al público'],['mayorista','el precio mayorista']]){
      if(String(values[field]??'').trim()==='')invalid(field,'Completa '+label+'.');
      prices[field]=Number(values[field]);if(!Number.isFinite(prices[field])||prices[field]<0)invalid(field,'Revisa '+label+': debe ser un número igual o mayor que cero.');
    }
    const minimo=Number(values.minimo);if(String(values.minimo??'').trim()===''||!Number.isSafeInteger(minimo)||minimo<1)invalid('minimo','El pedido mínimo debe ser un número entero de al menos 1 unidad.');
    const minimoTipo=values.minimoTipo||'color';if(!['color','producto'].includes(minimoTipo))invalid('minimoTipo','Elige si el mínimo es por color o por producto.');
    const wallapop=String(values.wallapop||'').trim();if(wallapop&&!wallapopUrl(wallapop))invalid('wallapop','Indica un enlace HTTPS válido de Wallapop o deja el campo vacío.');
    const colores=colors(values.colores);if(colores.length>30||colores.some(c=>c.length>60))invalid('colores','Indica hasta 30 colores de un máximo de 60 caracteres, separados por comas.');
    const estado=values.estado||'disponible';if(!['disponible','bajo_pedido','agotado'].includes(estado))invalid('estado','Selecciona un estado válido.');
    const plazo=String(values.plazo||'').trim();if(plazo.length>150)invalid('plazo','El plazo no puede superar 150 caracteres.');
    const referencia=String(values.referencia||'').trim();if(referencia&&!/^[a-zA-Z0-9_-]{1,40}$/.test(referencia))invalid('referencia','La referencia admite hasta 40 letras, números, guiones o guiones bajos, sin espacios.');
    return {nombre,descripcion,categoria,...prices,minimo,minimoTipo,wallapop:wallapopUrl(wallapop),colores,estado,plazo,personalizable:values.personalizable!==false&&values.personalizable!=='false',referencia};
  }
  function errorMessage(error){
    const code=String(error?.code||'').toLowerCase().replaceAll('_','-');
    if(code.startsWith('product/'))return error.message;
    if(code.includes('permission-denied'))return 'Firebase ha rechazado el guardado. Cierra sesión y vuelve a entrar con tu cuenta de administrador.';
    if(code==='storage/unauthorized')return 'No tienes permiso para subir la fotografía. Prueba sin foto y revisa el acceso de almacenamiento.';
    if(code==='storage/unauthenticated')return 'La sesión para subir la foto ha caducado. Cierra sesión y vuelve a entrar.';
    if(code==='storage/retry-limit-exceeded')return 'La fotografía no se ha podido subir por un problema de conexión. Inténtalo de nuevo.';
    if(code==='storage/quota-exceeded')return 'El almacenamiento de fotografías ha alcanzado su límite. Puedes guardar el producto sin foto.';
    if(code==='storage/bucket-not-found')return 'No se ha encontrado el almacenamiento de fotografías. Puedes guardar el producto sin foto.';
    const detail=typeof error?.message==='string' ? error.message : '';
    return 'No se ha podido guardar el producto. '+(detail ? detail+' ' : '')+(code ? 'Código: '+code+'. ' : '')+'Tus datos se mantienen en el formulario para que puedas reintentarlo.';
  }
  scope.CATALOGO_PRODUCTS=Object.freeze({validate,errorMessage,wallapopUrl,imageUrl,gallery,colors,availability,reference,pricingWarnings,minimumType,minimumLabel});
  if(typeof module!=='undefined')module.exports=scope.CATALOGO_PRODUCTS;
})(typeof window==='undefined'?globalThis:window);
