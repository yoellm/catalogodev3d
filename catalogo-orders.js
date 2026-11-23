(function(scope){
  'use strict';
  const productTools=typeof module!=='undefined'?require('./catalogo-products.js'):scope.CATALOGO_PRODUCTS;
  const key=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
  function quote(lines,{products,wholesale={},shop=false,checking=false},{enforceMinimum=true}={}){
    const errors=[],groups=new Map(),items=[];let cents=0;
    if(checking)return {items:[],errors:['Espera a que se comprueben tus condiciones de acceso.'],totalCents:0,valid:false};
    if(!shop)return {items:[],errors:['Los pedidos están disponibles solo para tiendas mayoristas autorizadas.'],totalCents:0,valid:false};
    for(const line of lines){
      const product=products[line.id];if(!product){errors.push('Un producto ya no está en el catálogo. Elimínalo del pedido.');continue;}
      const color=String(line.color||'').trim(),qty=Number(line.quantity),trade=wholesale[line.id];
      if(!color||color.length>60)errors.push(product.nombre+': indica el color.');
      const choices=Object.values(product.colores||{});if(choices.length&&!choices.some(c=>key(c)===key(color)))errors.push(product.nombre+': el color elegido ya no está disponible.');
      if(!Number.isSafeInteger(qty)||qty<1||qty>10000){errors.push(product.nombre+': la cantidad debe ser de 1 a 10.000 unidades.');continue;}
      if(product.estado==='agotado')errors.push(product.nombre+': está temporalmente agotado.');
      if(String(line.customization||'').length>300||String(line.notes||'').length>500)errors.push(product.nombre+': reduce el texto de personalización o los comentarios.');
      if(product.personalizable===false&&line.customization)errors.push(product.nombre+': ya no admite personalización.');
      const price=shop?trade?.precio:product.precio,min=shop?trade?.minimo:1;
      if(!Number.isFinite(price)||price<0||!Number.isSafeInteger(min)||min<1){errors.push(product.nombre+': la tarifa todavía no está disponible.');continue;}
      const unit=Math.round(price*100),total=unit*qty;if(!Number.isSafeInteger(total)){errors.push('El importe es demasiado elevado.');continue;}cents+=total;
      const minimumType=productTools.minimumType(trade),groupKey=JSON.stringify([line.id,minimumType==='color'?key(color):null]),group=groups.get(groupKey)||{name:product.nombre,color,quantity:0,minimum:min,minimumType};group.quantity+=qty;groups.set(groupKey,group);
      items.push({...line,name:product.nombre,reference:productTools.reference(product,line.id),color,quantity:qty,unitCents:unit,totalCents:total,minimum:min,minimumType,leadTime:product.plazo||'A confirmar',status:product.estado||'disponible'});
    }
    if(enforceMinimum)for(const group of groups.values())if(group.quantity<group.minimum)errors.push(group.name+(group.minimumType==='color'?' · '+group.color:'')+': tienes '+group.quantity+'; el mínimo es '+group.minimum+' unidades '+productTools.minimumLabel({minimoTipo:group.minimumType})+'.');
    if(!Number.isSafeInteger(cents))errors.push('El total es demasiado elevado.');
    if(lines.length>30)errors.push('El pedido admite hasta 30 líneas. Divide el pedido en dos.');
    return {items,errors:[...new Set(errors)],totalCents:cents,valid:lines.length>0&&!errors.length};
  }
  function whatsapp(lines,state,customer){
    const result=quote(lines,state);if(!result.valid)throw Error(result.errors[0]||'Añade productos al pedido.');
    const name=String(customer.name||'').trim(),email=String(customer.email||'').trim(),phone=String(customer.phone||'').trim(),notes=String(customer.notes||'').trim();
    if(!name||name.length>150||!/^\S+@\S+\.\S+$/.test(email)||phone.replace(/\D/g,'').length<7||phone.length>30||notes.length>1000)throw Error('Completa un nombre, correo y teléfono válidos. Los comentarios admiten hasta 1.000 caracteres.');
    const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
    const parts=['¡Hola, DEV3D Studio! Quiero solicitar este pedido'+(state.shop?' mayorista':'')+'.','','Contacto: '+name,'Correo: '+email,'Teléfono: '+phone,...(state.shop?['Tienda: '+(state.profile?.nombre||name)]:[]),''];
    for(const item of result.items)parts.push(item.name+' · Ref. '+item.reference,'Color: '+item.color+' · '+item.quantity+' uds. × '+money(item.unitCents)+' = '+money(item.totalCents),...(item.customization?['Personalización: '+item.customization]:[]),...(item.notes?['Comentarios: '+item.notes]:[]),'Plazo: '+item.leadTime,'');
    parts.push('TOTAL DE PRODUCTOS: '+money(result.totalCents),'Envío y condiciones finales a confirmar con DEV3D Studio.',...(notes?['','Notas del pedido: '+notes]:[]),'','Por favor, confirmad disponibilidad y plazo antes de tramitarlo. ¡Gracias!');
    const text=parts.join('\n');if(text.length>6500)throw Error('El mensaje es demasiado largo para WhatsApp. Reduce los comentarios o divide el pedido.');
    return 'https://wa.me/34678746953?text='+encodeURIComponent(text);
  }
  scope.CATALOGO_ORDERS={quote,whatsapp,key,minimumLabel:productTools.minimumLabel};if(typeof module!=='undefined')module.exports=scope.CATALOGO_ORDERS;
})(typeof window==='undefined'?globalThis:window);
