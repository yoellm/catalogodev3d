const assert=require('node:assert/strict'),fs=require('node:fs'),budgets=require('../calculadora/budgets.js');
// Only the local emulator and fictitious users. No production credentials.
const base='http://127.0.0.1:9008',namespace='demo-dev3d-default-rtdb';
const token=(uid,email)=>[Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,user_id:uid,email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:'demo-dev3d',iss:'https://securetoken.google.com/demo-dev3d',firebase:{sign_in_provider:'password'}})).toString('base64url'),''].join('.');
async function request(method,path,data,auth){return fetch(base+'/'+path+'.json?ns='+namespace+(auth&&auth!=='owner'?'&auth='+encodeURIComponent(auth):''),{method,headers:{...(auth==='owner'?{Authorization:'Bearer owner'}:{}),'Content-Type':'application/json'},...(data!==undefined?{body:JSON.stringify(data)}:{})});}
async function allowed(p){const r=await p;assert(r.ok,await r.text());}async function denied(p){const r=await p;assert.equal(r.status,401,await r.text());}
(async()=>{
 await allowed(request('PUT','.settings/rules',JSON.parse(fs.readFileSync(require.resolve('../catalogo.rules.json'),'utf8')),'owner'));await allowed(request('PUT','',{},'owner'));
 const calculo=budgets.prepare({defaultsVersion:5,values:Object.fromEntries(budgets.fields.map(key=>[key,'0'])),materials:[{name:'PLA',brand:'Prueba',nozzle:.4,layer:.2,kg:.1,factor:1.05,price:19,unit:'kg',priceVat:'net',color:'#ffffff'}],auxiliaryItems:[]});
 const record={nombre:'Presupuesto de prueba',calculo,actualizado:{'.sv':'timestamp'}},a=token('a','yoelmejias@outlook.es'),other=token('b','irelandmorcillo@gmail.com'),shop=token('shop','tienda@example.test');
 await allowed(request('PUT','dev3dPresupuestos/a/p1',record,a));await allowed(request('GET','dev3dPresupuestos/a',undefined,a));await denied(request('GET','dev3dPresupuestos/a',undefined));await denied(request('GET','dev3dPresupuestos/a',undefined,shop));await denied(request('GET','dev3dPresupuestos/a',undefined,other));await denied(request('PUT','dev3dPresupuestos/a/p2',record,shop));await denied(request('PUT','dev3dPresupuestos/a/p2',record,other));
 for(const [name,change] of Object.entries({file:r=>r.calculo.originalFile='binary',unknown:r=>r.calculo.values.secret='x',long:r=>r.nombre='a'.repeat(101),timestamp:r=>r.actualizado=1,nan:r=>r.calculo.materials[0].price=-1,tooMany:r=>r.calculo.materials[100]=r.calculo.materials[0],missing:r=>delete r.calculo.values.vatPercent})){const invalid=structuredClone(record);change(invalid);await denied(request('PUT','dev3dPresupuestos/a/'+name,invalid,a));}
 const empty=structuredClone(record);empty.calculo.materials=[];await allowed(request('PUT','dev3dPresupuestos/a/empty',empty,a));
 const legacy=structuredClone(record);delete legacy.calculo.wholesaleProfile;await allowed(request('PUT','dev3dPresupuestos/a/legacy',legacy,a));assert.equal(budgets.prepare(legacy.calculo).wholesaleProfile,'manual');
 const profiled=structuredClone(record);profiled.calculo.wholesaleProfile='profit40';profiled.calculo.values.wholesaleProfit='40';await allowed(request('PUT','dev3dPresupuestos/a/profiled',profiled,a));assert.equal(budgets.prepare(profiled.calculo).wholesaleProfile,'profit40');
 profiled.calculo.values.wholesaleProfit='37';assert.equal(budgets.prepare(profiled.calculo).wholesaleProfile,'manual');profiled.calculo.wholesaleProfile='unknown';await denied(request('PUT','dev3dPresupuestos/a/invalidProfile',profiled,a));
 const oldProfile=structuredClone(record);oldProfile.calculo.wholesaleProfile='personalized';oldProfile.calculo.values.wholesaleProfit='40';await allowed(request('PUT','dev3dPresupuestos/a/oldProfile',oldProfile,a));assert.equal(budgets.prepare(oldProfile.calculo).wholesaleProfile,'manual');assert.equal(budgets.prepare(oldProfile.calculo).values.wholesaleProfit,'40');
 const tax=structuredClone(record);tax.calculo.materialTax={mode:'keep',rate:21};await allowed(request('PUT','dev3dPresupuestos/a/tax',tax,a));tax.calculo.materialTax.rate=-1;await denied(request('PUT','dev3dPresupuestos/a/invalidTax',tax,a));tax.calculo.materialTax={mode:'unknown',rate:21};await denied(request('PUT','dev3dPresupuestos/a/invalidTaxMode',tax,a));
 const large=structuredClone(record);large.calculo.materials=Array.from({length:100},()=>record.calculo.materials[0]);large.calculo.auxiliaryItems=Array.from({length:100},()=>({name:'Auxiliar',amount:.5}));await allowed(request('PUT','dev3dPresupuestos/a/large',large,a));
 await allowed(request('PUT','dev3dPresupuestos/a/p1',{...record,nombre:'Actualizado'},a));await allowed(request('DELETE','dev3dPresupuestos/a/p1',undefined,a));
 // A linked calculation is private to administrators and saved atomically with
 // its product; personal budgets above remain restricted to their owner.
 const productUpdates={'dev3dCatalogoPublico/linked':{nombre:'Pieza vinculada',precio:10},'dev3dCatalogoMayorista/linked':{precio:6,minimo:5,minimoTipo:'producto'},'dev3dProductoPresupuestos/linked':record};
 await allowed(request('PATCH','',productUpdates,a));
 await allowed(request('GET','dev3dProductoPresupuestos/linked',undefined,a));await allowed(request('GET','dev3dProductoPresupuestos/linked',undefined,other));
 await allowed(request('PUT','dev3dTiendas/shop',{nombre:'Tienda de prueba',rol:'tienda',activo:true,email:'tienda@example.test'},'owner'));
 for(const identity of [undefined,shop]){await denied(request('GET','dev3dProductoPresupuestos/linked',undefined,identity));await denied(request('GET','dev3dProductoPresupuestos',undefined,identity));await denied(request('PUT','dev3dProductoPresupuestos/linked',record,identity));await denied(request('DELETE','dev3dProductoPresupuestos/linked',undefined,identity));}
 await denied(request('PUT','dev3dProductoPresupuestos/missing',record,a));
 const invalidLinked=structuredClone(record);invalidLinked.calculo.values.secret='not allowed';await denied(request('PUT','dev3dProductoPresupuestos/linked',invalidLinked,a));
 await denied(request('PATCH','',{'dev3dCatalogoPublico/linked/precio':11,'dev3dProductoPresupuestos/linked':invalidLinked},a));
 const unchanged=await request('GET','dev3dCatalogoPublico/linked/precio');assert.equal(await unchanged.json(),10);
 await denied(request('PUT','dev3dCatalogoPublico/leaked',{nombre:'Pieza',precio:10,calculo},a));
 await allowed(request('PUT','dev3dProductoPresupuestos/linked',{...record,nombre:'Recalculado'},other));
 await allowed(request('PATCH','',{'dev3dCatalogoPublico/linked':null,'dev3dCatalogoMayorista/linked':null,'dev3dProductoPresupuestos/linked':null},a));
 const deleted=await request('GET','dev3dProductoPresupuestos/linked',undefined,a);assert.equal(await deleted.json(),null);
 console.log('PASS: emulator budget rules: only owning admin can read/save/delete, no store/public/other-admin access, bounded snapshots, server timestamps and no uploaded files.');
 console.log('PASS: emulator product-budget rules: catalogue admins only, active stores denied, product existence, atomic create/update/delete and rejection of leaked or invalid calculations.');
})().catch(error=>{console.error(error);process.exitCode=1;});
