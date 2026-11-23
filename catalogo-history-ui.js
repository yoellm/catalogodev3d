(function(scope){
  'use strict';
  function mount({document=scope.document,admin=false,api=scope.CATALOGO_HISTORY,saveStatus}){
    const $=id=>document.getElementById(id),el=(tag,text,css)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n;};
    const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100),date=value=>typeof value==='number'?new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(value):'Registrando…';
    let rows=[],page=1,selected=null,saving=false;
    for(const [value,label] of Object.entries(api.states)){for(const id of ['historyFilter','historyStatus']){const option=el('option',label);option.value=value;$(id).append(option);}}
    $('historyAdminControls').hidden=!admin;
    function renderDetail(row,resetForm=false){
      $('historyDetailTitle').textContent=api.reference(row.id);$('historyDetailMeta').textContent=row.order.tienda+' · '+date(row.order.creado);
      const status=row.order.seguimiento||{};$('historyDetailState').textContent='Estado: '+(api.states[status.estado]||status.estado)+' · '+date(status.actualizado);$('historyDetailNote').textContent=status.nota||'';
      const c=row.order.contacto;$('historyContact').textContent=c.nombre+' · '+c.correo+' · '+c.telefono+(c.comentarios?'\n'+c.comentarios:'');
      $('historyDetailLines').replaceChildren();
      for(const g of Object.values(row.order.grupos||{})){const card=el('article',undefined,'order-line');card.append(el('h3',g.nombre),el('p','Ref. '+g.referencia+' · Color: '+g.color),el('p',g.cantidad+' uds. × '+money(Math.round(g.precio*100))+' = '+money(Math.round(g.precio*100)*g.cantidad)),el('p','Mínimo solicitado: '+g.minimo+' '+api.minimumLabel(g)+' · Plazo: '+g.plazo));for(const line of Object.values(g.lineas||{}))card.append(el('p',line.cantidad+' uds.'+(line.personalizacion?' · Personalización: '+line.personalizacion:'')+(line.comentarios?' · '+line.comentarios:'')));$('historyDetailLines').append(card);}
      $('historyDetailTotal').textContent=money(api.total(row.order));
      if(resetForm){$('historyStatus').value=status.estado||'pendiente';$('historyNote').value=status.nota||'';$('historyStatusMessage').textContent='';}
      $('historyWhatsApp').hidden=status.estado!=='pendiente';
      try{$('historyWhatsApp').href=api.whatsapp(row.order,row.id);}catch{$('historyWhatsApp').hidden=true;}
    }
    function render(){
      const query=$('historySearch').value.trim().toLocaleLowerCase('es'),status=$('historyFilter').value;
      const filtered=rows.filter(row=>(!status||row.order.seguimiento?.estado===status)&&[api.reference(row.id),row.order.tienda,row.order.contacto?.nombre,...Object.values(row.order.grupos||{}).flatMap(g=>[g.nombre,g.referencia])].join(' ').toLocaleLowerCase('es').includes(query)).sort((a,b)=>(b.order.creado||0)-(a.order.creado||0)||b.id.localeCompare(a.id));
      const pages=Math.max(1,Math.ceil(filtered.length/12));page=Math.min(page,pages);$('historyCount').textContent=filtered.length+' solicitudes';$('historyPage').textContent='Página '+page+' de '+pages;$('historyPrev').disabled=page===1;$('historyNext').disabled=page===pages;
      if(admin)$('dashboardOrders').textContent=rows.filter(row=>row.order.seguimiento?.estado==='pendiente').length+' pendientes';
      $('historyList').replaceChildren();
      for(const row of filtered.slice((page-1)*12,page*12)){
        const card=el('article',undefined,'history-row'),info=el('div'),status=row.order.seguimiento?.estado||'pendiente';info.append(el('strong',api.reference(row.id)),el('p',(admin?row.order.tienda+' · ':'')+date(row.order.creado)));
        const badge=el('span',api.states[status]||status,'history-state');badge.dataset.state=status;const button=el('button','Ver pedido','secondary');button.type='button';button.setAttribute('aria-label','Ver pedido '+api.reference(row.id));button.onclick=()=>{if(!rows.includes(row))return;selected={uid:row.uid,id:row.id};renderDetail(row,true);$('historyDialog').showModal();document.body.classList?.add('history-modal-open');};card.append(info,badge,el('strong',money(api.total(row.order))),button);$('historyList').append(card);
      }
      if(!filtered.length)$('historyList').append(el('p',rows.length?'No hay pedidos que coincidan con estos filtros.':'Todavía no hay solicitudes de pedido registradas.','empty-list'));
      if(selected){const row=rows.find(row=>row.id===selected.id&&row.uid===selected.uid);if(row)renderDetail(row);else{$('historyDialog').close();selected=null;}}
    }
    $('historySearch').oninput=$('historyFilter').oninput=()=>{page=1;render();};$('historyPrev').onclick=()=>{if(page>1){page--;render();}};$('historyNext').onclick=()=>{page++;render();};
    $('historyClose').onclick=()=>$('historyDialog').close();$('historyDialog').onclose=()=>{selected=null;document.body.classList?.remove('history-modal-open');};
    $('historyStatusForm').onsubmit=async event=>{
      event.preventDefault();if(!admin||saving||!selected)return;
      const current={...selected},state=$('historyStatus').value,note=$('historyNote').value.trim();if(!api.states[state]||note.length>1000){$('historyStatusMessage').textContent='Revisa el estado y la nota (máximo 1.000 caracteres).';return;}
      saving=true;$('historySaveStatus').disabled=true;$('historyStatusMessage').textContent='Guardando estado…';
      try{await saveStatus(current.uid,current.id,state,note);$('historyStatusMessage').textContent='Estado actualizado. La tienda verá el cambio en su historial.';}catch{$('historyStatusMessage').textContent='No se ha podido actualizar el estado. Revisa la conexión y tus permisos.';}finally{saving=false;$('historySaveStatus').disabled=false;}
    };
    return {setData(data,owner){rows=owner?Object.entries(data||{}).map(([id,order])=>({uid:owner,id,order})):Object.entries(data||{}).flatMap(([uid,list])=>Object.entries(list||{}).map(([id,order])=>({uid,id,order})));$('historyMessage').textContent='';render();},reset(){rows=[];page=1;selected=null;$('historyDialog').close();$('historyList').replaceChildren();$('historyCount').textContent='';$('historyContact').textContent='';$('historyDetailLines').replaceChildren();$('historyMessage').textContent='';if(admin)$('dashboardOrders').textContent='Solicitudes y seguimiento';},fail(){this.reset();$('historyMessage').textContent='No se ha podido cargar el historial. Comprueba la conexión o vuelve a iniciar sesión.';}};
  }
  scope.CATALOGO_HISTORY_UI={mount};if(typeof module!=='undefined')module.exports={mount};
})(typeof window==='undefined'?globalThis:window);
