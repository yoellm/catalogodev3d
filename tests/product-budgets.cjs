const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {appDOM}=require('./helpers/app-dom.cjs');
const {prepare}=require('../calculadora/budgets.js');
(async()=>{
  const app=await appDOM('admin.html'),window=app.window;
  let questions=0;window.confirm=()=>{questions++;return app.state.confirm;};
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
  Object.defineProperty(window.HTMLSelectElement.prototype,'selectedOptions',{configurable:true,get(){const options=[...this.querySelectorAll('option')];return options.filter(o=>o.hasAttribute('selected')).length?options.filter(o=>o.hasAttribute('selected')):options.slice(0,1);}});
  const context=vm.createContext({window,document:app.document,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{clipboard:{writeText:async()=>{}}},Intl,URL,console,structuredClone,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,DataView,Blob,Response,DecompressionStream,DOMParser:window.DOMParser});
  for(const file of ['commercial','profit-profiles','material-tax','budgets','app'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../calculadora',file+'.js'),'utf8'),context);
  await app.session({uid:'admin',email:'admin@example.test'});app.node('openCalculator').onclick();
  const root=app.node('calculatorMount'),get=id=>root.querySelector('#'+id);
  const set=(id,value)=>{get(id).value=String(value);get(id).dispatchEvent(new window.Event('input',{bubbles:true}));};
  const field=(name,value)=>{const input=root.querySelector('[data-field="'+name+'"]');input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  const action=(name)=>[...app.node('adminProducts').querySelectorAll('button')].find(b=>b.textContent===name);
  for(const [id,value] of Object.entries({pieceName:'Figura personalizada',quantity:3,printDays:1,printHours:2,printMinutes:7,printSeconds:4,operatorCount:2,laborHours:0,laborMinutes:23,laborSeconds:8,laborRate:12.5,printerPowerKw:.2,electricityPrice:.17,maintenancePercent:7,profitPercent:43,vatPercent:10,fixedPricing:'yes',wholesaleProfit:27,shopMargin:35,shopMinimum:5,targetPvp:0,referenceCost:10,costBuffer:12,saleChannel:'shop'}))set(id,value);
  field('name','PLA especial');field('brand','Mi marca');field('weight',.25);field('price',24.2);field('factor',1.12);field('priceVat','gross');
  get('purchaseVatMode').value='deduct';get('purchaseVatPercent').value='21';get('purchaseVatMode').dispatchEvent(new window.Event('change',{bubbles:true}));
  const aux=root.querySelector('.aux-item input');aux.value='2.3';aux.dispatchEvent(new window.Event('input',{bubbles:true}));
  // Saving errors keep the calculation open, and declining still allows creation.
  app.state.set=async()=>{throw Error('offline');};get('inventoryButton').click();await settle();
  assert(!app.node('productDialog').open);assert.equal(get('pieceName').value,'Figura personalizada');assert.equal(get('inventoryButton').disabled,false);
  app.state.set=null;app.state.confirm=false;get('inventoryButton').click();
  assert.equal(app.node('productDialog').open,true);assert.equal(app.state.writes.length,0);app.node('productDialog').close();
  app.state.confirm=true;get('inventoryButton').click();get('inventoryButton').click();await settle();
  const form=app.node('productForm');assert.equal(app.node('productDialog').open,true);assert.equal(questions,3);assert.equal(app.state.writes.length,1);
  const savedBudget=app.state.writes[0];assert.equal(savedBudget.name,'dev3dPresupuestos/admin/test-product');assert.equal(savedBudget.value.nombre,'Figura personalizada');

  assert.match(app.node('productMessage').textContent,/vinculará/);
  app.state.update=async()=>{throw Error('offline');};await app.submit('productForm');assert.match(app.node('productMessage').textContent,/No se ha podido/);assert.equal(form.elements.nombre.value,'Figura personalizada');
  app.state.update=null;form.elements.minimoTipo.value='producto';await app.submit('productForm');
  const updates=app.state.writes.at(-1).value,record=updates['dev3dProductoPresupuestos/test-product'];
  assert(record);assert.deepEqual(JSON.parse(JSON.stringify(record.calculo)),JSON.parse(JSON.stringify(savedBudget.value.calculo)));assert.equal(record.calculo.values.printMinutes,'7');assert.equal(record.calculo.values.laborMinutes,'23');assert.equal(record.calculo.values.wholesaleProfit,'27');assert.equal(record.calculo.values.profitPercent,'43');assert.equal(record.calculo.values.vatPercent,'10');assert.equal(record.calculo.materialTax.mode,'deduct');assert.equal(record.calculo.materialTax.rate,21);assert.equal(record.calculo.materials[0].name,'PLA especial');assert.equal(record.calculo.materials[0].kg,.25);assert.equal(record.calculo.materials[0].priceVat,'gross');assert.equal(record.calculo.auxiliaryItems[0].amount,2.3);
  for(const key of ['dev3dCatalogoPublico/test-product','dev3dCatalogoMayorista/test-product'])assert(!/calculo|laborMinutes|materialTax|PLA especial/.test(JSON.stringify(updates[key])));
  const product={...updates['dev3dCatalogoPublico/test-product'],nombre:'Figura publicada',descripcion:'Descripción que se conserva',colores:['Rojo','Azul'],imagenes:['https://example.test/foto.webp'],imagen:'https://example.test/foto.webp'};
  app.emit('dev3dCatalogoPublico',{'test-product':product});app.emit('dev3dCatalogoMayorista',{'test-product':updates['dev3dCatalogoMayorista/test-product']});
  let stored=record;app.state.get=async name=>{assert.equal(name,'dev3dProductoPresupuestos/test-product');return {val:()=>stored};};
  // A restored product must not overwrite a previously selected personal budget.
  app.node('openCalculator').onclick();get('budgetName').value='Personal';await get('saveBudget').onclick();const personal=app.state.writes.at(-1).value;app.emit('dev3dPresupuestos/admin',{personal});get('budgetList').querySelector('button').onclick();
  set('pieceName','Otro cálculo');set('profitPercent',99);set('printHours',9);field('name','Material cambiado');
  const before=app.state.writes.length;await action('Recalcular').onclick();assert.equal(app.state.writes.length,before);assert.equal(app.document.body.dataset.adminView,'calculator');assert.equal(get('linkedProductPanel').hidden,false);assert.equal(get('linkedProductName').textContent,'Figura publicada');
  assert.equal(get('pieceName').value,'Figura personalizada');assert.equal(get('printHours').value,'2');assert.equal(get('laborMinutes').value,'23');assert.equal(get('profitPercent').value,'43');assert.equal(get('wholesaleProfit').value,'27');assert.equal(get('purchaseVatMode').value,'deduct');assert.equal(get('purchaseVatPercent').value,'21');assert.equal(root.querySelector('[data-field="name"]').value,'PLA especial');assert.equal(get('budgetName').value,'');assert.equal(get('saveBudget').textContent,'Guardar presupuesto');
  assert.equal(Number(get('shopMinimum').value),5);set('wholesaleProfit',31);get('updateCatalogButton').click();assert.equal(app.node('pricingProductDialog').open,false);assert.equal(app.node('productDialog').open,true);assert.equal(form.elements.id.value,'test-product');assert.equal(form.elements.nombre.value,product.nombre);assert.equal(form.elements.descripcion.value,product.descripcion);assert.equal(form.elements.minimoTipo.value,'producto');assert.equal(app.state.writes.length,before);
  await app.submit('productForm');const repriced=app.state.writes.at(-1).value;assert.equal(repriced['dev3dProductoPresupuestos/test-product'].calculo.values.wholesaleProfit,'31');assert.equal(repriced['dev3dCatalogoPublico/test-product'].descripcion,product.descripcion);assert.equal(repriced['dev3dCatalogoMayorista/test-product'].minimoTipo,'producto');
  action('Editar').onclick();form.elements.nombre.value='Nombre corregido';await app.submit('productForm');assert(!('dev3dProductoPresupuestos/test-product' in app.state.writes.at(-1).value));
  // Choosing another named calculation explicitly leaves the product context.
  get('budgetList').querySelector('button').onclick();assert.equal(get('linkedProductPanel').hidden,true);get('updateCatalogButton').click();assert.equal(app.node('pricingProductDialog').open,true);app.node('pricingCancel').onclick();
  // Legacy products start a fresh calculation; unrelated materials are never reused.
  stored=null;await action('Recalcular').onclick();assert.match(get('linkedProductHelp').textContent,/todavía no/);assert.equal(get('pieceName').value,product.nombre);assert.notEqual(root.querySelector('[data-field="name"]').value,'PLA especial');assert.equal(get('budgetName').value,'');
  app.state.get=async()=>{throw {code:'PERMISSION_DENIED'};};await action('Recalcular').onclick();assert.match(app.node('catalogListMessage').textContent,/No se pudo recuperar/);
  await action('Eliminar').onclick();assert.equal(app.state.writes.at(-1).value['dev3dProductoPresupuestos/test-product'],null);
  // A late response after logout cannot reopen private calculation data.
  let release;app.state.get=()=>new Promise(resolve=>{release=resolve;});const stale=action('Recalcular'),loading=stale.onclick();await app.session(null);release({val:()=>record});await loading;assert.equal(app.node('calculatorMount').children.length,0);const count=app.state.writes.length;await stale.onclick();assert.equal(app.state.writes.length,count);
  assert.throws(()=>prepare({...record.calculo,materials:[{...record.calculo.materials[0],price:-1}]}));
  console.log('PASS: product budget atomic save/retry, private costs, exact restore, direct repricing, preserved metadata/minimum scope, personal budget isolation, legacy products, failed reads, deletion and logout races.');
})().catch(error=>{console.error(error);process.exitCode=1;});
