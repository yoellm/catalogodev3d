(function(scope){
  'use strict';
  const fields=['pieceName','printerName','quantity','printDays','printHours','printMinutes','printSeconds','filamentDiameter','gcodeMaterialType','gcodeBrand','gcodeMaterialPrice','gcodeErrorFactor','printerPowerKw','electricityPrice','operatorCount','laborHours','laborMinutes','laborSeconds','laborRate','maintenancePercent','profitPercent','vatPercent','partnerMarkupPercent','saleChannel','fixedPricing','wholesaleProfit','shopMargin','targetPvp','shopMinimum','rateName','referenceCost','costBuffer'];
  const numberFields=['nozzle','layer','kg','factor','price'];
  const text=(value,max)=>{if(typeof value!=='string'||value.length>max)throw Error('Hay un texto demasiado largo o datos de presupuesto no válidos.');return value;};
  const number=value=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Revisa los importes y cantidades del presupuesto.');return value;};
  function prepare(data){
    const list=value=>value==null?[]:Array.isArray(value)?value:typeof value==='object'?Object.values(value):null;
    const materialList=list(data?.materials),auxiliaryList=list(data?.auxiliaryItems);
    if(!data||!data.values||!materialList||!auxiliaryList||materialList.length>100||auxiliaryList.length>100)throw Error('El presupuesto admite hasta 100 materiales y 100 auxiliares.');
    const values=Object.fromEntries(fields.map(key=>[key,text(data.values[key],200)]));
    const materials=materialList.map(m=>({name:text(m.name||'',150),brand:text(m.brand||'',150),...Object.fromEntries(numberFields.map(key=>[key,number(m[key])])),unit:m.unit==='g'?'g':'kg',priceVat:m.priceVat==='gross'?'gross':'net',color:/^#[0-9a-f]{6}$/i.test(m.color||'')?m.color:''}));
    const auxiliaryItems=auxiliaryList.map(a=>({name:text(a.name||'',150),amount:number(a.amount)}));
    return {version:1,defaultsVersion:number(data.defaultsVersion),values,materials,auxiliaryItems,mode:'manual'};
  }
  function mount({root,api,capture,restore,isActive=()=>true}){
    const $=id=>root.querySelector('#'+id),el=(tag,text)=>{const n=root.ownerDocument.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    let records={},selected=null,busy=false,alive=true;
    const message=text=>{$('budgetMessage').textContent=text;};
    function controls(){for(const id of ['saveBudget','saveBudgetCopy'])$(id).disabled=busy||!api;}
    function render(){
      const query=$('budgetSearch').value.trim().toLocaleLowerCase('es');$('budgetList').replaceChildren();
      const entries=Object.entries(records).filter(([,r])=>String(r.nombre).toLocaleLowerCase('es').includes(query)).sort((a,b)=>(b[1].actualizado||0)-(a[1].actualizado||0));
      for(const [id,record] of entries){const row=el('article');row.className='budget-row';const info=el('div'),title=el('strong',record.nombre);info.append(title);if(typeof record.actualizado==='number')info.append(el('small',new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(record.actualizado)));const load=el('button','Recuperar'),remove=el('button','Eliminar');load.type=remove.type='button';remove.className='button button-ghost';load.className='button button-dark';load.disabled=remove.disabled=busy;
        load.onclick=()=>{if(!alive||!isActive()||busy||!records[id])return;try{restore(prepare(records[id].calculo));selected=id;$('budgetName').value=record.nombre;message('Presupuesto recuperado. Puedes ajustar sus datos y guardar los cambios. Los archivos originales no se guardan.');$('saveBudget').textContent='Guardar cambios';}catch(error){message(error.message);}};
        remove.onclick=async()=>{if(!alive||!isActive()||busy||!scope.confirm('¿Eliminar el presupuesto «'+record.nombre+'»?'))return;busy=true;controls();render();try{await api.remove(id);if(alive&&isActive()){if(selected===id){selected=null;$('budgetName').value='';$('saveBudget').textContent='Guardar presupuesto';}message('Presupuesto eliminado.');}}catch{if(alive)message('No se pudo eliminar el presupuesto. Revisa la conexión y tus permisos.');}finally{busy=false;if(alive){controls();render();}}};row.append(info,load,remove);$('budgetList').append(row);
      }
      if(!entries.length)$('budgetList').append(el('p',query?'No hay presupuestos con ese nombre.':'Todavía no tienes presupuestos guardados.'));
    }
    async function save(copy){
      if(!alive||!isActive()||busy||!api)return;const name=$('budgetName').value.trim();if(!name||name.length>100){message('Escribe un nombre de hasta 100 caracteres.');return;}
      let calculo;try{calculo=prepare(capture());}catch(error){message(error.message);return;}
      busy=true;controls();render();message('Guardando presupuesto…');
      try{const id=await api.save({id:copy?null:selected,name,calculo});if(alive&&isActive()){selected=id;$('saveBudget').textContent='Guardar cambios';message('Presupuesto guardado en tu cuenta de administrador.');}}catch{if(alive)message('No se pudo guardar. Tus datos siguen en la calculadora; revisa la conexión y tus permisos.');}finally{busy=false;if(alive){controls();render();}}
    }
    $('openBudgets').onclick=()=>{$('budgetLibrary').hidden=!$('budgetLibrary').hidden;$('openBudgets').setAttribute('aria-expanded',String(!$('budgetLibrary').hidden));};
    $('saveBudget').onclick=()=>save(false);$('saveBudgetCopy').onclick=()=>save(true);$('budgetSearch').oninput=render;controls();
    const stop=api?.watch(data=>{if(!alive||!isActive())return;records=data||{};if(selected&&!records[selected]){selected=null;$('saveBudget').textContent='Guardar presupuesto';}render();},()=>{if(alive){records={};render();message('No se pudieron cargar tus presupuestos. Revisa la conexión o vuelve a iniciar sesión.');}});
    if(!api)message('Los presupuestos guardados están disponibles al abrir la calculadora desde administración.');
    return {destroy(){alive=false;stop?.();records={};$('budgetList').replaceChildren();$('budgetName').value='';message('');}};
  }
  scope.DEV3D_BUDGETS={fields,prepare,mount};if(typeof module!=='undefined')module.exports=scope.DEV3D_BUDGETS;
})(typeof window==='undefined'?globalThis:window);
