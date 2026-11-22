(function(scope){
  'use strict';
  function mount({document=scope.document,getState,navigate=url=>scope.location.assign(url),orders=scope.CATALOGO_ORDERS,products=scope.CATALOGO_PRODUCTS,drafts=scope.CATALOGO_ORDER_DRAFT,storage,registerOrder}){
    const $=id=>document.getElementById(id),el=(tag,text,css)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(css)node.className=css;return node;};
    const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
    let lines=[],activeId=null,session=null,priceRole=null,sequence=0,submitting=false;
    let loadedOwner=null;const draftStore=drafts?.create(storage);
    function bodyLock(){document.body.classList.toggle('catalog-detail-open',!!$('catalogDetailDialog').open||!!$('orderCartDialog').open);}
    function showImage(url,index,total){const image=el('img');image.src=url;image.alt=$('catalogDetailTitle').textContent+' · foto '+(index+1);image.onerror=()=>{image.src='logo.png';image.onerror=null;};$('catalogDetailPhoto').replaceChildren(image);$('galleryPosition').textContent='Foto '+(index+1)+' de '+total;}
    function detailLine(){return {id:activeId,color:$('detailColor').value,quantity:Number($('detailQuantity').value),customization:$('detailCustomization').value.trim(),notes:$('detailNotes').value.trim()};}
    function updateDetail(){
      if(!activeId)return;const state=getState(),p=state.products[activeId];
      if(!p){$('detailAdd').disabled=true;$('detailPrice').textContent='Este producto ya no está disponible.';return;}
      $('detailAvailability').textContent=products.availability(p)+ ' · '+(p.plazo||'Plazo a confirmar');
      $('detailAvailability').dataset.state=p.estado||'disponible';
      $('catalogDetailReference').textContent='Ref. '+products.reference(p,activeId);
      if(!state.shop||state.checking){$('detailOrderForm').hidden=true;$('detailAdd').disabled=true;$('detailPrice').textContent='';return;}
      $('detailOrderForm').hidden=false;
      const trade=state.wholesale[activeId],price=state.shop?trade?.precio:p.precio,min=state.shop?trade?.minimo:1;
      $('detailMinimum').textContent=state.shop?'Mínimo: '+(min||'pendiente')+' unidades por color. Puedes combinar personalizaciones del mismo color.':'Elige el color y la cantidad que necesitas.';
      const quantity=Number($('detailQuantity').value);
      $('detailPrice').textContent=state.checking?'Comprobando tus condiciones…':Number.isFinite(price)?money(Math.round(price*100))+' / unidad'+(Number.isSafeInteger(quantity)&&quantity>0?' · Total: '+money(Math.round(price*100)*quantity):''):'Precio pendiente de configurar.';
      $('detailAdd').disabled=submitting||state.checking||p.estado==='agotado'||!Number.isFinite(price)||(state.shop&&!Number.isSafeInteger(min));
    }
    function openProduct(id){
      const state=getState(),p=state.products[id];if(!p)return;activeId=id;
      $('catalogDetailTitle').textContent=p.nombre;$('catalogDetailDescription').textContent=p.descripcion||'Este producto todavía no tiene una descripción.';
      const images=products.gallery(p);$('catalogDetailPhoto').replaceChildren();$('galleryThumbnails').replaceChildren();$('galleryPosition').textContent='';$('catalogDetailPhoto').hidden=!images.length;
      images.forEach((url,index)=>{const button=el('button',undefined,'gallery-thumbnail');button.type='button';button.setAttribute('aria-label','Ver foto '+(index+1));const image=el('img');image.src=url;image.alt='';image.loading='lazy';button.append(image);button.onclick=()=>{showImage(url,index,images.length);for(const sibling of $('galleryThumbnails').children)sibling.setAttribute('aria-pressed',String(sibling===button));};button.setAttribute('aria-pressed',String(index===0));$('galleryThumbnails').append(button);});
      if(images.length)showImage(images[0],0,images.length);
      $('detailOrderForm').reset();$('detailOrderMessage').textContent='';
      const choices=products.colors(Object.values(p.colores||{})),field=el(choices.length?'select':'input');field.id='detailColor';field.name='color';field.required=true;field.maxLength=60;
      if(choices.length)for(const color of choices){const option=el('option',color);option.value=color;field.append(option);}else {field.type='text';field.placeholder='Indica el color que quieres';}
      $('detailColorControl').replaceChildren(field);$('detailQuantity').value=String(state.shop?state.wholesale[id]?.minimo||1:1);
      $('detailCustomizationField').hidden=p.personalizable===false;
      $('detailCustomization').value='';$('detailNotes').value='';updateDetail();
      $('catalogDetailDialog').showModal();$('catalogDetailDialog').scrollTop=0;bodyLock();
    }
    function renderCart(){
      const state=getState(),allowed=state.shop&&!state.checking;
      $('orderOpen').hidden=!allowed;$('detailOrderForm').hidden=!allowed;
      if(!allowed){if(!state.checking){lines=[];if(loadedOwner)draftStore?.remove(loadedOwner);loadedOwner=null;}$('orderLines').replaceChildren();$('orderErrors').replaceChildren();$('orderTotal').textContent=money(0);$('sendOrder').disabled=true;$('orderOpen').textContent='Mi pedido (0)';if($('orderCartDialog').open)$('orderCartDialog').close();return;}
      const owner=state.user?.uid;
      if(owner&&loadedOwner!==owner){const saved=draftStore?.read(owner);lines=(saved?.lines||[]).map(line=>({...line,lineKey:++sequence}));loadedOwner=owner;}
      const saved=draftStore?.write(owner,lines);
      $('orderDraftStatus').textContent=saved?(lines.length?'Borrador guardado en este navegador durante 30 días. Los precios y la disponibilidad se comprueban al recuperar el pedido.':'El pedido está vacío. Se guardará al añadir productos.'):'No se ha podido conservar el borrador. Corrige las cantidades o mantén abierta esta página para no perderlo.';
      $('clearOrderDraft').disabled=submitting||lines.length===0;
      const result=orders.quote(lines,state);$('orderOpen').textContent='Mi pedido ('+lines.reduce((sum,line)=>sum+Number(line.quantity||0),0)+')';
      $('orderLines').replaceChildren();
      if(!lines.length)$('orderLines').append(el('p','Todavía no has añadido productos. Abre «Ver detalles» para elegir color, cantidad y personalización.','empty-list'));
      lines.forEach((line,index)=>{
        const item=result.items.find(item=>item.lineKey===line.lineKey),p=state.products[line.id],row=el('article',undefined,'order-line');
        row.append(el('h3',p?.nombre||'Producto retirado'),...(p?[el('small','Ref. '+products.reference(p,line.id),'product-reference')]:[]),el('p','Color: '+line.color+(line.customization?' · Personalización: '+line.customization:'')),...(line.notes?[el('p',line.notes)]:[]));
        const controls=el('div',undefined,'order-line-controls'),label=el('label','Unidades'),input=el('input');input.type='number';input.min='1';input.max='10000';input.step='1';input.value=String(line.quantity);input.setAttribute('aria-label','Unidades de '+(p?.nombre||'producto')+' en '+line.color);
        input.disabled=submitting;input.onchange=()=>{if(submitting)return;line.quantity=Number(input.value);renderCart();};label.append(input);const remove=el('button','Quitar','secondary');remove.type='button';remove.disabled=submitting;remove.setAttribute('aria-label','Quitar '+(p?.nombre||'producto')+' en '+line.color);remove.onclick=()=>{if(submitting)return;lines.splice(index,1);renderCart();};
        controls.append(label,el('strong',item?money(item.totalCents):'Pendiente'),remove);row.append(controls);$('orderLines').append(row);
      });
      $('orderErrors').replaceChildren(...result.errors.map(error=>el('p',error)));$('orderTotal').textContent=money(result.totalCents);$('sendOrder').disabled=submitting||!result.valid;
      $('orderTariff').textContent=state.shop?'Pedido mayorista · Mínimos por producto y color':'Pedido para particular';
    }
    $('detailQuantity').oninput=updateDetail;
    $('detailOrderForm').onsubmit=event=>{
      event.preventDefault();if(submitting)return;const state=getState();if(!state.shop||state.checking){$('detailOrderMessage').textContent='Los pedidos están disponibles solo para tiendas mayoristas autorizadas.';return;}
      const line=detailLine(),result=orders.quote([line],state,{enforceMinimum:false});
      if(result.errors.length){$('detailOrderMessage').textContent=result.errors[0];return;}
      if(lines.length>=30){$('detailOrderMessage').textContent='El pedido admite hasta 30 líneas. Envía este pedido antes de añadir más.';return;}
      const same=lines.find(item=>item.id===line.id&&orders.key(item.color)===orders.key(line.color)&&item.customization===line.customization&&item.notes===line.notes);
      if(same){if(same.quantity+line.quantity>10000){$('detailOrderMessage').textContent='La cantidad máxima por línea es 10.000.';return;}same.quantity+=line.quantity;}else lines.push({...line,lineKey:++sequence});
      $('detailOrderMessage').textContent='Añadido al pedido. Puedes elegir otra personalización o revisar el pedido.';renderCart();
    };
    function openCart(){const state=getState();if(!state.shop||state.checking)return;renderCart();const fields=$('orderCheckout').elements;fields.name.value=fields.name.value||state.profile?.nombre||'';fields.email.value=fields.email.value||state.user?.email||'';$('catalogDetailDialog').close();$('orderCartDialog').showModal();bodyLock();}
    $('orderOpen').onclick=openCart;$('detailViewOrder').onclick=openCart;
    $('clearOrderDraft').onclick=()=>{if(submitting)return;lines=[];$('orderCheckout').reset();$('orderMessage').textContent='Pedido vaciado.';renderCart();};
    $('orderClose').onclick=()=>$('orderCartDialog').close();$('orderCartDialog').onclose=bodyLock;
    $('closeCatalogDetail').onclick=()=>$('catalogDetailDialog').close();$('catalogDetailDialog').onclose=bodyLock;
    $('orderCheckout').onsubmit=async event=>{
      event.preventDefault();if(submitting)return;const fields=event.currentTarget.elements,customer={name:fields.name.value,email:fields.email.value,phone:fields.phone.value,notes:fields.notes.value};
      try{orders.whatsapp(lines,getState(),customer);if(!registerOrder)throw Error('El registro de pedidos no está disponible. Recarga la página.');submitting=true;renderCart();$('orderMessage').textContent='Registrando tu solicitud. Espera la confirmación antes de salir…';
        const receipt=await registerOrder(lines.map(line=>({...line})),customer);lines=[];if(loadedOwner)draftStore?.remove(loadedOwner);renderCart();$('orderResumeLink').href=receipt.url;$('orderResumeLink').hidden=false;$('orderMessage').textContent='Solicitud '+receipt.reference+' registrada como pendiente. Revisa y envía el mensaje en WhatsApp; DEV3D Studio confirmará el pedido.';navigate(receipt.url);
      }catch(error){$('orderMessage').textContent=error?.code?'No se ha podido registrar la solicitud. Revisa la conexión y tus condiciones; tu borrador se conserva.':error.message;}
      finally{submitting=false;renderCart();updateDetail();}
    };
    return {openProduct,sync(){const state=getState(),role=state.shop?'shop':'public';if(!state.checking){if(priceRole!==null&&priceRole!==role){lines=[];$('orderCheckout').reset();$('orderResumeLink').hidden=true;}priceRole=role;}renderCart();updateDetail();},resetSession(key){if(session!==key){if(session&&session!=='public')draftStore?.remove(session);loadedOwner=null;lines=[];session=key;priceRole=null;$('orderCheckout').reset();$('orderMessage').textContent='';$('orderResumeLink').hidden=true;$('orderCartDialog').close();$('catalogDetailDialog').close();renderCart();}}};
  }
  scope.CATALOGO_COMMERCE={mount};if(typeof module!=='undefined')module.exports={mount};
})(typeof window==='undefined'?globalThis:window);
