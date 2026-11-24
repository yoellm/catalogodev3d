const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const {validateDraft} = require('../catalogo-draft.js');
const {computeCommercialOffer:calc} = require('../calculadora/commercial.js');
const costs={unitCost:1,quantity:1,profitRate:.3,vatRate:.21,unitRecommended:1.6};
const options={saleChannel:'shop',fixedPricing:'no',wholesaleProfit:20,shopMargin:40,targetPvp:0,shopMinimum:10,referenceCost:1,costBuffer:10};
const offer=calc(costs,options);
assert.equal(offer.gross,1.5); assert.equal(offer.suggestedPvp,2.5); assert.equal(offer.quoteQuantity,10);
assert.equal(calc(costs,{...options,shopMinimum:20}).gross,offer.gross);
assert.equal(calc(costs,{...options,saleChannel:'direct'}).gross,1.6);
assert.equal(calc(costs,{...options,saleChannel:'direct',shopMinimum:'',wholesaleProfit:'',targetPvp:'',shopMargin:''}).valid,true);
assert.equal(calc(costs,{...options,shopMinimum:1.2}).valid,false);
const fixed=calc(costs,{...options,fixedPricing:'yes'});
assert.equal(fixed.gross,calc({...costs,unitCost:1.08},{...options,fixedPricing:'yes'}).gross);
let received;
const calculatorSource=fs.readFileSync(path.join(root,'calculadora/app.js'),'utf8');
const sender=calculatorSource.match(/async function openProductDraftInInventory\([^)]*\) \{[\s\S]*?\n\}/)[0];
const calculator={preparingProduct:false,budgets:null,active:true,linkedProduct:null,captureCalculation:()=>undefined,onDraft:data=>{received={data};return true;},state:{offer,lastCosts:costs},commercialOptions:()=>options,computeCommercialOffer:calc,$:()=>({value:'Llavero'}),showToast:()=>{}};
vm.runInNewContext(sender+'; openProductDraftInInventory();',calculator);
assert.equal(received.data.precio,1.6); assert.equal(received.data.mayorista,1.5); assert.equal(received.data.minimo,10);
assert(validateDraft(received.data));
for(const bad of [{...received.data,precio:NaN},{...received.data,minimo:0},{...received.data,minimo:2.2},{...received.data,nombre:''},{...received.data,precio:'2'},{...received.data,type:'other'}]) assert.equal(validateDraft(bad),null);
assert.equal(validateDraft({...received.data,unitCost:10}).unitCost,undefined);
calculator.state.offer=calc(costs,{...options,saleChannel:'direct'});
vm.runInNewContext(sender+'; openProductDraftInInventory();',calculator);
assert.equal(received.data.precio,1.6); assert.equal(received.data.mayorista,1.5);
// Importing the same unit costs must never depend on mode, batch size, shop
// minimum or the separate target PVP for the shop's resale.
for(const quantity of [1,5,10])for(const minimum of [1,5,20])for(const channel of ['shop','direct']){
 const config={...options,saleChannel:channel,shopMinimum:minimum,targetPvp:123};
 calculator.commercialOptions=()=>config;calculator.state.lastCosts={...costs,quantity};calculator.state.offer=calc(calculator.state.lastCosts,config);
 vm.runInNewContext(sender+'; openProductDraftInInventory();',calculator);
 assert.equal(received.data.precio,1.6);assert.equal(received.data.mayorista,1.5);assert.equal(received.data.minimo,minimum);
}
for(const channel of ['shop','direct']){
 const config={...options,saleChannel:channel,fixedPricing:'yes',shopMinimum:5};
 calculator.commercialOptions=()=>config;calculator.state.lastCosts={...costs,quantity:10};calculator.state.offer=calc(calculator.state.lastCosts,config);
 vm.runInNewContext(sender+'; openProductDraftInInventory();',calculator);
 assert.equal(received.data.precio,1.8);assert.equal(received.data.mayorista,1.60);assert.equal(received.data.minimo,5);
}
calculator.commercialOptions=()=>options;calculator.state.lastCosts=costs;calculator.state.offer=offer;
vm.runInNewContext(sender+'; openProductDraftInInventory();',calculator);
const nodes={};
function node(id){return nodes[id] ||= {hidden:false,value:'',textContent:'',attrs:{},dataset:{},getAttribute(k){return this.attrs[k]??null;},set src(v){this.attrs.src=v;},removeAttribute(k){delete this.attrs[k];},replaceChildren(){},scrollIntoView(){},querySelector(){return {disabled:false};}};}
node('pricingProductDialog').close=function(){this.open=false;};
const form=node('productForm');
node('productDialog').showModal=function(){this.open=true;};node('productDialog').close=function(){this.open=false;this.onclose?.();};
form.elements=Object.fromEntries(['id','nombre','descripcion','categoria','imagen','precio','mayorista','minimo'].map(k=>[k,{value:''}]));
form.reset=()=>Object.values(form.elements).forEach(e=>e.value='');
const shopForm=node('shopForm'); shopForm.elements=Object.fromEntries(['uid','nombre','email','password','activo'].map(k=>[k,{value:'',required:false}])); shopForm.reset=()=>{}; shopForm.reportValidity=()=>true;
node('calculatorTemplate').content={cloneNode:()=>({})};node('calculatorMount').firstElementChild={};
let mountCalls=0,destroyCalls=0,draftReceiver;
let authCallback, messageHandler, writes=0;
const database={getDatabase:()=>({}),ref:(_,name)=>name,onValue:()=>()=>{},update:()=>{writes++;},set:()=>{writes++;}};
const auth={getAuth:()=>({}),onAuthStateChanged:(_,fn)=>authCallback=fn};
const windowMock={DEV3D_CALCULATOR:{mount(root,{onDraft}){mountCalls++;draftReceiver=onDraft;return {destroy(){destroyCalls++;}};}},CATALOGO_NAVIGATION:require('../catalogo-navigation.js'),CATALOGO_DRAFT:{validateDraft},CATALOGO_CONFIG:{firebaseConfig:{databaseURL:'https://example.test'},ADMIN_EMAILS:['admin@example.test']},CATALOGO_BOOT:{loadFirebase:async()=>[{initializeApp:()=>({})},database,auth,{getStorage:()=>({})}]},addEventListener:(type,fn)=>{if(type==='message')messageHandler=fn;}};
(async()=>{
const source=fs.readFileSync(path.join(root,'catalogo-app.js'),'utf8');
await vm.runInNewContext(source,{document:{body:{dataset:{admin:'true'}},getElementById:node},window:windowMock,location:{origin:'https://yoellm.github.io'},Intl,URL,console,confirm:()=>true});
await authCallback(null); node('openCalculator').onclick(); assert.equal(mountCalls,0);
await authCallback({uid:'admin',email:'admin@example.test'}); node('openCalculator').onclick(); assert.equal(mountCalls,1);node('openCalculator').onclick();assert.equal(mountCalls,1);
assert.equal(draftReceiver({...received.data,minimo:0}),false);assert.equal(form.elements.nombre.value,'');
assert.equal(draftReceiver(received.data),true);
assert.equal(form.elements.nombre.value,'Llavero'); assert.equal(form.elements.precio.value,1.6); assert.equal(form.elements.mayorista.value,1.5); assert.equal(form.elements.minimo.value,10); assert.equal(form.elements.id.value,''); assert.equal(node('calculatorPanel').hidden,true); assert.equal(writes,0);
await authCallback(null); assert.equal(destroyCalls,1); assert.equal(node('adminPanel').hidden,true);
assert.equal(draftReceiver(received.data),false);assert.equal(writes,0);
let helperCalls=0, profileWrite;
database.update=async(path,data)=>{writes++;profileWrite={path,data};};
windowMock.CATALOGO_SHOPS={errorMessage:()=> 'error',createShop:async args=>{helperCalls++;assert.equal(args.email,'shop@example.test');assert.equal(args.password,'test-password-only');await args.saveProfile('shop-created',{rol:'tienda',nombre:'Tienda nueva',activo:true,email:'shop@example.test'});}};
await shopForm.onsubmit({preventDefault(){},currentTarget:shopForm});assert.equal(helperCalls,0);
await authCallback({uid:'admin',email:'admin@example.test'});
Object.assign(shopForm.elements.nombre,{value:'Tienda nueva'});Object.assign(shopForm.elements.email,{value:'shop@example.test'});Object.assign(shopForm.elements.password,{value:'test-password-only'});Object.assign(shopForm.elements.activo,{value:'true'});
await shopForm.onsubmit({preventDefault(){},currentTarget:shopForm});assert.equal(helperCalls,1);assert.equal(profileWrite.path,'dev3dTiendas/shop-created');assert.equal(profileWrite.data.password,undefined);assert.equal(shopForm.elements.password.value,'');assert.equal(node('saveShop').disabled,false);
shopForm.elements.uid.value='old-shop';shopForm.elements.nombre.value='Nombre editado';shopForm.elements.activo.value='false';
await shopForm.onsubmit({preventDefault(){},currentTarget:shopForm});assert.equal(helperCalls,1);assert.equal(profileWrite.path,'dev3dTiendas/old-shop');assert.equal(profileWrite.data.activo,false);assert.equal(profileWrite.data.email,undefined);
console.log('PASS: alta web solo de administrador, autorización y edición de tienda, contraseña vaciada.');
console.log('PASS: cálculos, IVA, mínimo, precio fijo, borrador directo/tienda, validación, pantalla nativa, administrador, cierre de sesión y ausencia de publicación automática.');
})().catch(error=>{console.error(error);process.exitCode=1;});
