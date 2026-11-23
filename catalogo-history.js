(function(scope){
  'use strict';
  const orders=typeof module!=='undefined'?require('./catalogo-orders.js'):scope.CATALOGO_ORDERS;
  const states={pendiente:'Pendiente',confirmado:'Confirmado',fabricacion:'En fabricación',enviado:'Enviado',entregado:'Entregado',cancelado:'Cancelado'};
  const reference=id=>'PED-'+id;
  function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
  function payloadOf(order){return {tienda:order.tienda,contacto:order.contacto,grupos:Object.values(order.grupos||{}).map(g=>({...g,lineas:Object.values(g.lineas||{})}))};}
  function request(lines,state,customer){
    orders.whatsapp(lines,state,customer);const quote=orders.quote(lines,state),groups=new Map();
    for(const item of quote.items){
      const p=state.products[item.id],choices=Object.values(p.colores||{}),color=choices.find(c=>orders.key(c)===orders.key(item.color))||item.color;
      const key=JSON.stringify([item.id,orders.key(color)]);if(!groups.has(key))groups.set(key,{producto:item.id,nombre:item.name,referencia:item.reference,color,cantidad:0,precio:state.wholesale[item.id].precio,minimo:item.minimum,minimoTipo:item.minimumType,plazo:item.leadTime,lineas:[]});
      const group=groups.get(key);group.cantidad+=item.quantity;group.lineas.push({cantidad:item.quantity,personalizacion:item.customization||'',comentarios:item.notes||''});
    }
    return {tienda:String(state.profile?.nombre||customer.name).trim(),contacto:{nombre:customer.name.trim(),correo:customer.email.trim(),telefono:customer.phone.trim(),comentarios:String(customer.notes||'').trim()},grupos:[...groups.values()]};
  }
  function total(order){return Object.values(order.grupos||{}).reduce((sum,group)=>sum+Math.round(group.precio*100)*group.cantidad,0);}
  function whatsapp(order,id){
    const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100),c=order.contacto;
    const text=['¡Hola, DEV3D Studio! Solicitud mayorista '+reference(id), 'Tienda: '+order.tienda,'Contacto: '+c.nombre,'Correo: '+c.correo,'Teléfono: '+c.telefono,''];
    for(const g of Object.values(order.grupos||{})){text.push(g.nombre+' · Ref. '+g.referencia,'Color: '+g.color+' · '+g.cantidad+' uds. × '+money(Math.round(g.precio*100))+' = '+money(Math.round(g.precio*100)*g.cantidad));for(const line of Object.values(g.lineas||{}))text.push('  '+line.cantidad+' uds.'+(line.personalizacion?' · Personalización: '+line.personalizacion:'')+(line.comentarios?' · '+line.comentarios:''));text.push('Mínimo: '+g.minimo+' unidades '+orders.minimumLabel(g),'Plazo solicitado: '+g.plazo,'');}
    text.push('TOTAL DE PRODUCTOS: '+money(total(order)),'Envío y condiciones finales a confirmar.',...(c.comentarios?['Notas: '+c.comentarios]:[]),'','La solicitud está registrada; queda pendiente vuestra confirmación.');
    const message=text.join('\n');if(message.length>6500)throw Error('El pedido es demasiado largo para WhatsApp. Divide el pedido o reduce los comentarios.');
    return 'https://wa.me/34678746953?text='+encodeURIComponent(message);
  }
  function sender({sdk,db,getState}){
    let pending=null;
    return async(lines,customer)=>{
      const state=getState(),uid=state.user?.uid;if(!uid||!state.shop||state.checking)throw Error('Inicia sesión con una tienda mayorista activa.');
      const payload=request(lines,state,customer),fingerprint=JSON.stringify({uid,payload});
      if(pending?.fingerprint!==fingerprint)pending={fingerprint,uid,id:sdk.push(sdk.ref(db,'dev3dPedidos/'+uid)).key};
      const attempt=pending,record={...payload,creado:sdk.serverTimestamp(),seguimiento:{estado:'pendiente',actualizado:sdk.serverTimestamp(),nota:''}};
      const url=whatsapp(record,attempt.id),path=sdk.ref(db,'dev3dPedidos/'+uid+'/'+attempt.id);
      try{await sdk.set(path,record);}catch(error){
        // A retry may hit a request already stored before a connection interruption.
        let stored;try{stored=(await sdk.get(path)).val();}catch{}
        if(!stored||JSON.stringify(canonical(payloadOf(stored)))!==JSON.stringify(canonical(payload)))throw error;
      }
      const current=getState();if(current.user?.uid!==uid||!current.shop||current.checking)throw Error('La cuenta o el acceso ha cambiado. Revisa el historial al volver a entrar.');
      pending=null;return {id:attempt.id,reference:reference(attempt.id),url};
    };
  }
  scope.CATALOGO_HISTORY={states,reference,request,total,whatsapp,sender,minimumLabel:orders.minimumLabel};if(typeof module!=='undefined')module.exports=scope.CATALOGO_HISTORY;
})(typeof window==='undefined'?globalThis:window);
