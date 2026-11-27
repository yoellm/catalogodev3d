const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {parseHTML}=require('linkedom');
const base=path.resolve(__dirname,'..');
const {window}=parseHTML(fs.readFileSync(path.join(base,'admin.html'),'utf8'));
// LinkeDOM's select getter does not implement the browser's first-option fallback/setter.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){const options=[...this.querySelectorAll('option')];const selected=options.find(o=>o.hasAttribute('selected'))||options[0];return selected?.getAttribute('value')??selected?.textContent??'';},set(value){const options=[...this.querySelectorAll('option')];for(const option of options)option.removeAttribute('selected');const match=options.find(o=>(o.getAttribute('value')??o.textContent)===String(value));if(match)match.setAttribute('selected','');}});
Object.defineProperty(window.HTMLSelectElement.prototype,'selectedOptions',{configurable:true,get(){const options=[...this.querySelectorAll('option')];const selected=options.filter(o=>o.hasAttribute('selected'));return selected.length?selected:options.slice(0,1);}});
const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
let printCalls=0,draft;
window.print=()=>printCalls++;window.confirm=()=>true;
const context=vm.createContext({window,document:window.document,localStorage:storage,navigator:{clipboard:{writeText:async()=>{}}},Intl,URL,console,structuredClone,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,DataView,Blob,Response,DecompressionStream,DOMParser:window.DOMParser});
for(const file of ['calculadora/commercial.js','calculadora/profit-profiles.js','calculadora/material-tax.js','calculadora/budgets.js','calculadora/app.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context);
const mount=window.document.getElementById('calculatorMount'),template=window.document.getElementById('calculatorTemplate');
function content(){mount.replaceChildren(template.content.cloneNode(true));return mount.firstElementChild;}
const external=window.document.createElement('input');external.id='quantity';external.value='777';window.document.body.prepend(external);
let root=content();let instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});
const get=id=>root.querySelector('#'+id);
function set(id,value){const input=get(id);input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));}
function field(name,value){const input=root.querySelector('[data-field="'+name+'"]');input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));}
function click(id){get(id).dispatchEvent(new window.Event('click',{bubbles:true}));}
function profile(id){get('wholesaleProfile').value=id;get('wholesaleProfile').dispatchEvent(new window.Event('change',{bubbles:true}));}
const euroValue=id=>Number(get(id).textContent.replace(/[^\d,.-]/g,'').replace(',','.'));
(async()=>{
assert.equal(window.document.querySelectorAll('iframe').length,0);assert(get('materialRows').children.length>0);assert(euroValue('recommendedPrice')>0);
assert.equal(get('wholesaleProfit').value,'20');assert.match(get('wholesaleProfitExample').textContent,/12,00/);assert.match(get('wholesaleProfitExample').textContent,/2,00/);
assert.equal(get('wholesaleProfile').value,'profit20');assert.equal(get('wholesaleProfile').querySelectorAll('option').length,6);
for(const [id,value] of Object.entries({quantity:1,printDays:0,printHours:0,printMinutes:0,printSeconds:0,operatorCount:0,printerPowerKw:0,maintenancePercent:0,profitPercent:30,vatPercent:21,fixedPricing:'no',wholesaleProfit:20,shopMargin:40,targetPvp:0,shopMinimum:10}))set(id,value);
field('weight',.1);field('price',10);field('factor',0);field('priceVat','net');
const aux=root.querySelector('.aux-item input');aux.value='0';aux.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(external.value,'777');assert.equal(euroValue('realCost'),1);assert.equal(euroValue('recommendedPrice'),1.6);
function includeMachine(enabled){get('includeDepreciation').checked=enabled;get('includeDepreciation').dispatchEvent(new window.Event('change',{bubbles:true}));}
assert(get('depreciationFields').classList.contains('hidden'));
includeMachine(true);
set('printHours',2);set('machineHourlyCost',1.5);set('maintenancePercent',10);set('failedPrintPercent',10);
// Reserva: (material 1 + máquina 3) × 10 % = 0,40.
assert.equal(euroValue('realCost'),4.50);
includeMachine(false);assert.equal(euroValue('realCost'),1.20);
includeMachine(true);assert.equal(euroValue('realCost'),4.50);
set('quantity',2);assert.equal(euroValue('realCost'),2.25);
set('printerPowerKw',0.5);set('electricityPrice',1);
set('operatorCount',1);set('laborHours',1);set('laborMinutes',0);set('laborSeconds',0);set('laborRate',10);
const auxiliaryAmount=root.querySelector('[data-aux-amount]');
auxiliaryAmount.value='8';auxiliaryAmount.dispatchEvent(new window.Event('input',{bubbles:true}));
// Electricidad 1; mano de obra 10 y auxiliares 8. Mantenimiento 2; reserva 0,50.
assert.equal(euroValue('realCost'),12.75);
auxiliaryAmount.value='0';auxiliaryAmount.dispatchEvent(new window.Event('input',{bubbles:true}));
set('printerPowerKw',0);set('operatorCount',0);
for(const id of ['printHours','machineHourlyCost','maintenancePercent','failedPrintPercent'])set(id,0);
set('quantity',1);
assert.equal(get('shopResaleResult').hidden,true);assert.match(get('offerTitle').textContent,/cobras al cliente/);
assert.equal(root.querySelector('.cost-details').hasAttribute('open'),false);
assert.equal(root.querySelector('.offer-calculation-details').hasAttribute('open'),false);
assert.equal(root.querySelector('.result-top').hidden,true);assert.equal(root.querySelector('.summary-pills').hidden,true);
assert(!/Pequeña|Figura|personalizada|acabados/i.test(get('wholesaleProfile').textContent));
function purchaseMode(mode){get('purchaseVatMode').value=mode;get('purchaseVatMode').dispatchEvent(new window.Event('change',{bubbles:true}));}
field('weight',1);field('price',24.2);field('priceVat','gross');set('vatPercent',0);assert.equal(euroValue('materialTotalPreview'),24.2);assert.match(root.querySelector('.net-price-hint').textContent,/Se mantiene/);
assert.equal(root.querySelector('[data-field="priceVat"]').hidden,true);assert(root.querySelector('.price-vat-control').classList.contains('single-price'));assert.equal(get('purchaseVatPercent').closest('label').hidden,true);
set('vatPercent',21);assert.equal(euroValue('materialTotalPreview'),20);set('vatPercent',10);assert.equal(euroValue('materialTotalPreview'),20);
assert.equal(root.querySelector('[data-field="priceVat"]').hidden,false);assert.equal(root.querySelector('[data-field="priceVat"]').value,'gross');assert.equal(root.querySelector('.price-vat-control').classList.contains('single-price'),false);assert.equal(get('purchaseVatPercent').closest('label').hidden,false);
const basis=root.querySelector('[data-field="priceVat"]');basis.value='net';basis.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(euroValue('materialTotalPreview'),24.2);basis.value='gross';basis.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(euroValue('materialTotalPreview'),20);
purchaseMode('keep');assert.equal(euroValue('materialTotalPreview'),24.2);set('vatPercent',0);purchaseMode('deduct');assert.equal(euroValue('materialTotalPreview'),20);purchaseMode('auto');assert.equal(euroValue('materialTotalPreview'),24.2);set('vatPercent',21);set('purchaseVatPercent',10);assert.equal(euroValue('materialTotalPreview'),22);set('purchaseVatPercent',21);assert.equal(euroValue('materialTotalPreview'),20);assert.equal(root.querySelector('[data-field="price"]').value,'24.2');
purchaseMode('keep');assert.equal(root.querySelector('[data-field="priceVat"]').hidden,true);assert.equal(root.querySelector('[data-field="price"]').value,'24.2');purchaseMode('deduct');assert.equal(root.querySelector('[data-field="priceVat"]').hidden,false);assert.equal(root.querySelector('[data-field="priceVat"]').value,'gross');purchaseMode('auto');
// Five euros of material plus three euros of work is eight euros of cost.
// Profit is added once afterwards; changing it does not change labor costs.
field('priceVat','net');field('weight',.5);field('price',10);set('operatorCount',1);set('laborHours',0);set('laborMinutes',12);set('laborSeconds',0);set('laborRate',15);set('saleChannel','shop');set('shopMinimum',1);profile('profit25');set('vatPercent',0);assert.equal(euroValue('realCost'),8);assert.equal(euroValue('laborTotalPreview'),3);assert.equal(euroValue('offerPriceAmount'),10);
set('vatPercent',21);assert.equal(euroValue('offerPriceAmount'),12.10);profile('profit40');assert.equal(euroValue('realCost'),8);assert.equal(euroValue('laborTotalPreview'),3);assert.equal(euroValue('offerPriceAmount'),13.6);profile('profit25');set('quantity',2);assert.equal(euroValue('realCost'),4);assert.equal(euroValue('laborTotalPreview'),3);assert.equal(euroValue('offerPriceAmount'),6.1);
set('quantity',1);set('operatorCount',0);set('laborMinutes',0);field('weight',.1);profile('profit20');set('shopMinimum',10);set('saleChannel','direct');
set('pieceName','Pieza nativa');set('saleChannel','shop');assert.equal(euroValue('offerPriceAmount'),1.5);assert(get('offerPriceTotal').textContent.includes('10 unidades'));
for(const [id,rate,price] of [['profit20',20,1.5],['profit40',40,1.70],['profit30',30,1.6],['profit25',25,1.6],['profit50',50,1.9]]){profile(id);assert.equal(Number(get('wholesaleProfit').value),rate);assert.equal(euroValue('offerPriceAmount'),price);assert.equal(get('profitPercent').value,'30');assert.equal(get('wholesaleProfile').value,id);}
set('wholesaleProfit',37);assert.equal(get('wholesaleProfile').value,'manual');profile('profit50');field('weight',1);assert.match(get('offerStatus').textContent,/supera tu precio público/);field('weight',.1);profile('profit20');
assert.equal(get('shopResaleResult').hidden,false);assert.equal(euroValue('shopResalePrice'),2.5);assert.match(get('offerTitle').textContent,/cobras a la tienda/);assert.match(get('offerPriceTotal').textContent,/15,00/);assert.match(get('offerPriceLabel').textContent,/IVA incluido/);
assert.match(get('offerResults').textContent,/Mínimo para tiendas/);assert.equal(get('profitPercent').closest('label').hidden,true);assert.equal(get('wholesaleProfit').closest('label').hidden,false);
set('targetPvp',2);assert.match(get('offerStatus').textContent,/no deja a la tienda/);assert.equal(euroValue('offerPriceAmount'),1.5);assert.match(get('shopResaleMargin').textContent,/40%/);assert.match(get('shopResaleTarget').textContent,/25%/);set('targetPvp',0);
click('inventoryButton');assert.equal(draft.nombre,'Pieza nativa');assert.equal(draft.precio,1.6);assert.equal(draft.mayorista,1.5);assert.equal(draft.minimo,10);
set('saleChannel','direct');click('inventoryButton');assert.equal(draft.precio,1.6);assert.equal(draft.mayorista,1.5);assert.equal(get('shopResaleResult').hidden,true);assert.equal(get('profitPercent').closest('label').hidden,false);assert.equal(get('wholesaleProfit').closest('label').hidden,true);
// A ten-piece batch still exports unit prices. The shop minimum only changes
// its quote total, and a resale target must not overwrite our own public price.
set('quantity',10);field('weight',1);
for(const minimum of [5,20])for(const channel of ['shop','direct']){
 set('shopMinimum',minimum);set('saleChannel',channel);set('targetPvp',123);click('inventoryButton');
 assert.equal(draft.precio,1.6);assert.equal(draft.mayorista,1.5);assert.equal(draft.minimo,minimum);
 assert.match(get('offerPriceTotal').textContent,channel==='shop'?(minimum===20?/30,00/:/15,00/):/16,00/);
}
set('quantity',1);field('weight',.1);set('targetPvp',0);set('shopMinimum',10);set('saleChannel','direct');
click('printButton');assert.equal(printCalls,1);
assert(values.has('dev3d-catalogo-costes-v1'));instance.destroy();mount.replaceChildren();
const savedSettings=JSON.parse(values.get('dev3d-catalogo-costes-v1'));savedSettings.values.wholesaleProfit='';values.set('dev3d-catalogo-costes-v1',JSON.stringify(savedSettings));
root=content();instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});assert.equal(get('pieceName').value,'Pieza nativa');assert.equal(euroValue('recommendedPrice'),1.6);
assert.equal(get('wholesaleProfit').value,'20');set('wholesaleProfit',25);assert.match(get('wholesaleProfitExample').textContent,/12,50/);assert.match(get('wholesaleProfitExample').textContent,/2,50/);assert.equal(get('profitPercent').value,'30');instance.destroy();root=content();instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});assert.equal(get('wholesaleProfit').value,'25');assert.equal(get('wholesaleProfile').value,'manual');profile('profit30');instance.destroy();root=content();instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});assert.equal(get('wholesaleProfile').value,'profit30');assert.equal(get('wholesaleProfit').value,'30');set('wholesaleProfit',20);
instance.destroy();const legacySettings=JSON.parse(values.get('dev3d-catalogo-costes-v1'));legacySettings.wholesaleProfile='personalized';legacySettings.values.wholesaleProfit='40';legacySettings.values.vatPercent='0';legacySettings.materialTax={mode:'auto',rate:21};values.set('dev3d-catalogo-costes-v1',JSON.stringify(legacySettings));root=content();instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});assert.equal(get('wholesaleProfit').value,'40');assert.equal(get('wholesaleProfile').value,'manual');assert.equal(get('vatPercent').value,'0');assert.equal(get('purchaseVatMode').value,'auto');set('wholesaleProfit',20);set('vatPercent',21);
click('gcodeTab');const file={name:'fixture.gcode',size:80,text:async()=>';TIME:3600\n; filament used [g] = 10\n; filament_type = PLA\n'};Object.defineProperty(get('gcodeInput'),'files',{configurable:true,value:[file]});get('gcodeInput').dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,80));assert.equal(get('pieceName').value,'fixture');assert(get('detectedMaterial').textContent.includes('10 g'),JSON.stringify({material:get('detectedMaterial').textContent,status:get('analysisStatus').textContent,note:get('analysisNote').textContent}));assert(get('detectedTime').textContent.includes('1'));
assert.equal(root.querySelector('[data-field=priceVat]').value,'gross');field('priceVat','net');set('gcodeBrand','Prueba');assert.equal(root.querySelector('[data-field=priceVat]').value,'net');
const zip=fs.readFileSync(path.join(__dirname,'fixtures/multiplaca.gcode.3mf'));
const multi={name:'multiplaca.gcode.3mf',size:zip.length,arrayBuffer:async()=>zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.byteLength)};
Object.defineProperty(get('gcodeInput'),'files',{configurable:true,value:[multi]});get('gcodeInput').dispatchEvent(new window.Event('change',{bubbles:true}));
const deadline=Date.now()+2000;while(get('detectedPlates').textContent!=='2 placas'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,15));
assert.equal(get('detectedPlates').textContent,'2 placas',get('analysisStatus').textContent);assert(get('detectedMaterial').textContent.includes('30 g'));assert.equal(get('pieceName').value,'multiplaca');
const previous=draft;instance.destroy();click('inventoryButton');assert.equal(draft,previous);mount.replaceChildren();
console.log('PASS: controles nativos sin iframe, cálculo real, IVA, mayorista, mínimo, borrador directo, impresión, persistencia, aislamiento y lectura G-code/3MF multiplaca.');
})().catch(error=>{console.error(error);instance?.destroy();process.exitCode=1;});
