(function(scope){
  'use strict';
  function whatsappUrl(values){
    const data={};for(const key of ['shop','contact','email','phone','city','website','interest'])data[key]=String(values[key]||'').trim();
    if(['shop','contact','email','phone','city'].some(key=>!data[key]))throw Error('Completa los campos obligatorios.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw Error('Introduce un correo electrónico válido.');
    if(data.phone.replace(/\D/g,'').length<7)throw Error('Revisa el teléfono de contacto.');
    const message=['¡Hola, DEV3D Studio! 👋','Me gustaría solicitar acceso al catálogo mayorista para mi tienda.','','🏪 Tienda: '+data.shop,'👤 Contacto: '+data.contact,'✉️ Correo para la cuenta: '+data.email,'📞 Teléfono: '+data.phone,'📍 Localidad y provincia: '+data.city,...(data.website?['🌐 Web o redes: '+data.website]:[]),...(data.interest?['','Productos y consulta:',data.interest]:[]),'','¿Podéis indicarme las condiciones y los siguientes pasos para activar mi cuenta? ¡Gracias!'].join('\n');
    return 'https://wa.me/34678746953?text='+encodeURIComponent(message);
  }
  if(typeof module!=='undefined')module.exports={whatsappUrl};
  if(scope.document){const form=scope.document.getElementById('shopRequestForm');if(form)form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;try{const data=Object.fromEntries(['shop','contact','email','phone','city','website','interest'].map(key=>[key,form.elements.namedItem(key).value]));scope.location.assign(whatsappUrl(data));}catch(error){scope.document.getElementById('shopRequestMessage').textContent=error.message;}};}
})(typeof window==='undefined'?globalThis:window);
