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
for(const file of ['calculadora/commercial.js','calculadora/budgets.js','calculadora/app.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context);
const mount=window.document.getElementById('calculatorMount'),template=window.document.getElementById('calculatorTemplate');
function content(){mount.replaceChildren(template.content.cloneNode(true));return mount.firstElementChild;}
const external=window.document.createElement('input');external.id='quantity';external.value='777';window.document.body.prepend(external);
let root=content();let instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});
const get=id=>root.querySelector('#'+id);
function set(id,value){const input=get(id);input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));}
function field(name,value){const input=root.querySelector('[data-field="'+name+'"]');input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));}
function click(id){get(id).dispatchEvent(new window.Event('click',{bubbles:true}));}
const euroValue=id=>Number(get(id).textContent.replace(/[^\d,.-]/g,'').replace(',','.'));
(async()=>{
assert.equal(window.document.querySelectorAll('iframe').length,0);assert(get('materialRows').children.length>0);assert(euroValue('recommendedPrice')>0);
for(const [id,value] of Object.entries({quantity:1,printDays:0,printHours:0,printMinutes:0,printSeconds:0,operatorCount:0,printerPowerKw:0,maintenancePercent:0,profitPercent:30,vatPercent:21,fixedPricing:'no',wholesaleProfit:20,shopMargin:40,targetPvp:0,shopMinimum:10}))set(id,value);
field('weight',.1);field('price',10);field('factor',1);
const aux=root.querySelector('.aux-item input');aux.value='0';aux.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(external.value,'777');assert.equal(euroValue('realCost'),1);assert.equal(euroValue('recommendedPrice'),2);
assert.equal(get('shopResaleResult').hidden,true);assert.match(get('offerTitle').textContent,/cobras al cliente/);
assert.equal(root.querySelector('.cost-details').hasAttribute('open'),false);
assert.equal(root.querySelector('.offer-calculation-details').hasAttribute('open'),false);
assert.equal(root.querySelector('.result-top').hidden,true);assert.equal(root.querySelector('.summary-pills').hidden,true);
set('pieceName','Pieza nativa');set('saleChannel','shop');assert.equal(euroValue('offerPriceAmount'),1.46);assert(get('offerPriceTotal').textContent.includes('10 unidades'));
assert.equal(get('shopResaleResult').hidden,false);assert.equal(euroValue('shopResalePrice'),2.44);assert.match(get('offerTitle').textContent,/cobras a la tienda/);assert.match(get('offerPriceTotal').textContent,/14,60/);assert.match(get('offerPriceLabel').textContent,/IVA incluido/);
assert.match(get('offerResults').textContent,/Mínimo para tiendas/);assert.equal(get('profitPercent').closest('label').hidden,true);assert.equal(get('wholesaleProfit').closest('label').hidden,false);
set('targetPvp',2);assert.match(get('offerStatus').textContent,/no deja a la tienda/);assert.equal(euroValue('offerPriceAmount'),1.46);assert.match(get('shopResaleMargin').textContent,/40,16/);assert.match(get('shopResaleTarget').textContent,/27%/);set('targetPvp',0);
click('inventoryButton');assert.equal(draft.nombre,'Pieza nativa');assert.equal(draft.precio,2);assert.equal(draft.mayorista,1.46);assert.equal(draft.minimo,10);
set('saleChannel','direct');click('inventoryButton');assert.equal(draft.precio,2);assert.equal(draft.mayorista,1.46);assert.equal(get('shopResaleResult').hidden,true);assert.equal(get('profitPercent').closest('label').hidden,false);assert.equal(get('wholesaleProfit').closest('label').hidden,true);
// A ten-piece batch still exports unit prices. The shop minimum only changes
// its quote total, and a resale target must not overwrite our own public price.
set('quantity',10);field('weight',1);
for(const minimum of [5,20])for(const channel of ['shop','direct']){
 set('shopMinimum',minimum);set('saleChannel',channel);set('targetPvp',123);click('inventoryButton');
 assert.equal(draft.precio,2);assert.equal(draft.mayorista,1.46);assert.equal(draft.minimo,minimum);
 assert.match(get('offerPriceTotal').textContent,channel==='shop'?(minimum===20?/29,20/:/14,60/):/20,00/);
}
set('quantity',1);field('weight',.1);set('targetPvp',0);set('shopMinimum',10);set('saleChannel','direct');
click('printButton');assert.equal(printCalls,1);
assert(values.has('dev3d-catalogo-costes-v1'));instance.destroy();mount.replaceChildren();
root=content();instance=window.DEV3D_CALCULATOR.mount(root,{onDraft:data=>{draft=data;return true;}});assert.equal(get('pieceName').value,'Pieza nativa');assert.equal(euroValue('recommendedPrice'),2);
click('gcodeTab');const file={name:'fixture.gcode',size:80,text:async()=>';TIME:3600\n; filament used [g] = 10\n; filament_type = PLA\n'};Object.defineProperty(get('gcodeInput'),'files',{configurable:true,value:[file]});get('gcodeInput').dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,80));assert.equal(get('pieceName').value,'fixture');assert(get('detectedMaterial').textContent.includes('10 g'),JSON.stringify({material:get('detectedMaterial').textContent,status:get('analysisStatus').textContent,note:get('analysisNote').textContent}));assert(get('detectedTime').textContent.includes('1'));
const zip=fs.readFileSync(path.join(__dirname,'fixtures/multiplaca.gcode.3mf'));
const multi={name:'multiplaca.gcode.3mf',size:zip.length,arrayBuffer:async()=>zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.byteLength)};
Object.defineProperty(get('gcodeInput'),'files',{configurable:true,value:[multi]});get('gcodeInput').dispatchEvent(new window.Event('change',{bubbles:true}));
const deadline=Date.now()+2000;while(get('detectedPlates').textContent!=='2 placas'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,15));
assert.equal(get('detectedPlates').textContent,'2 placas',get('analysisStatus').textContent);assert(get('detectedMaterial').textContent.includes('30 g'));assert.equal(get('pieceName').value,'multiplaca');
const previous=draft;instance.destroy();click('inventoryButton');assert.equal(draft,previous);mount.replaceChildren();
console.log('PASS: controles nativos sin iframe, cálculo real, IVA, mayorista, mínimo, borrador directo, impresión, persistencia, aislamiento y lectura G-code/3MF multiplaca.');
})().catch(error=>{console.error(error);instance?.destroy();process.exitCode=1;});
