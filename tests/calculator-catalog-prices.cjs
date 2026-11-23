const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const app=await appDOM('admin.html'),window=app.window;
 Object.defineProperty(window.HTMLSelectElement.prototype,'selectedOptions',{configurable:true,get(){const options=[...this.querySelectorAll('option')],selected=options.filter(o=>o.hasAttribute('selected'));return selected.length?selected:options.slice(0,1);}});
 const context=vm.createContext({window,document:app.document,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{clipboard:{writeText:async()=>{}}},Intl,URL,console,structuredClone,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,DataView,Blob,Response,DecompressionStream,DOMParser:window.DOMParser});
 for(const file of ['calculadora/commercial.js','calculadora/profit-profiles.js','calculadora/material-tax.js','calculadora/budgets.js','calculadora/app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
 await app.session({uid:'admin',email:'admin@example.test'});app.node('openCalculator').onclick();
 const root=app.node('calculatorMount'),get=id=>root.querySelector('#'+id);
 function set(id,value){const input=get(id);input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));}
 function field(name,value){const input=root.querySelector('[data-field="'+name+'"]');input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));}
 for(const [id,value] of Object.entries({quantity:10,printDays:0,printHours:0,printMinutes:0,printSeconds:0,operatorCount:0,printerPowerKw:0,maintenancePercent:0,profitPercent:30,vatPercent:21,fixedPricing:'no',wholesaleProfit:20,shopMargin:40,targetPvp:123,pieceName:'Producto calculado'}))set(id,value);
 field('weight',1);field('price',10);field('factor',1);field('priceVat','net');const aux=root.querySelector('.aux-item input');aux.value='0';aux.dispatchEvent(new window.Event('input',{bubbles:true}));
 for(const minimum of [5,20])for(const channel of ['shop','direct']){
  app.node('openCalculator').onclick();set('shopMinimum',minimum);set('saleChannel',channel);get('inventoryButton').click();
  const form=app.node('productForm');assert.equal(app.node('productDialog').open,true);assert.equal(Number(form.elements.precio.value),2);assert.equal(Number(form.elements.mayorista.value),1.46);assert.equal(Number(form.elements.minimo.value),minimum);assert.match(app.node('productMessage').textContent,/por 1 unidad/);
  await app.submit('productForm');const write=app.state.writes.at(-1);assert.equal(write.method,'update');const publicProduct=write.value['dev3dCatalogoPublico/test-product'],trade=write.value['dev3dCatalogoMayorista/test-product'];
  assert.equal(publicProduct.precio,2);assert(!('minimo' in publicProduct));assert.equal(trade.precio,1.46);assert.equal(trade.minimo,minimum);assert.equal(app.node('productDialog').open,false);
 }
 await app.session(null);
 console.log('PASS: real calculator → product modal → Firebase write: public/unit, wholesale/unit and shop-only minimum remain correct in both modes, ten-piece batches, different minimums and resale targets.');
})().catch(error=>{console.error(error);process.exitCode=1;});
