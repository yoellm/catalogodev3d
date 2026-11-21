(function(scope){
  'use strict';
  function invalid(field,message){throw Object.assign(new Error(message),{code:'product/invalid-field',field});}
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
    return {nombre,descripcion,categoria,...prices,minimo};
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
    return 'No se ha podido guardar el producto. '+(code ? 'Código: '+code+'. ' : '')+'Tus datos se mantienen en el formulario para que puedas reintentarlo.';
  }
  scope.CATALOGO_PRODUCTS=Object.freeze({validate,errorMessage});
  if(typeof module!=='undefined')module.exports={validate,errorMessage};
})(typeof window==='undefined'?globalThis:window);
