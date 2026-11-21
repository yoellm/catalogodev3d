const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const navigation=require('../catalogo-navigation.js');
const adminUser={uid:'a',email:'admin@example.test'},shopUser={uid:'s',email:'shop@example.test'};
const active={rol:'tienda',activo:true,nombre:'Mi tienda'},inactive={...active,activo:false};
assert.equal(navigation.roleFor(null,active,['admin@example.test']),'public');
assert.equal(navigation.roleFor(adminUser,null,['ADMIN@example.test']),'admin');
assert.equal(navigation.roleFor(shopUser,active,['admin@example.test']),'shop');
assert.equal(navigation.roleFor(shopUser,inactive,['admin@example.test']),'member');
const source=fs.readFileSync(path.join(__dirname,'../catalogo-app.js'),'utf8');
async function environment(page,hash=''){
 const nodes={},listeners=[],routes=[],events={};let authCallback,loginUser,loginProfile;
 function element(){return {hidden:false,value:'',textContent:'',children:[],attrs:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},set src(v){this.attrs.src=v;},addEventListener(){},focus(){},scrollIntoView(){},contains(){return false;},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return {disabled:false};}};}
 function node(id){return nodes[id] ||= element();}
 for(const [id,fields] of [['productForm',['id','nombre','descripcion','categoria','imagen','precio','mayorista','minimo']],['shopForm',['uid','nombre','email','password','activo']],['loginForm',['email','password']]]){const f=node(id);f.elements=Object.fromEntries(fields.map(key=>[key,{value:''}]));f.reset=()=>{for(const field of Object.values(f.elements))field.value='';};f.reportValidity=()=>true;}
 const database={getDatabase:()=>({}),ref:(_,name)=>name,onValue(name,callback,error){const item={name,callback,error,active:true};listeners.push(item);return ()=>item.active=false;},get:async()=>({val:()=>loginProfile})};
 const auth={getAuth:()=>({}),onAuthStateChanged:(_,callback)=>authCallback=callback,signInWithEmailAndPassword:async()=>({user:loginUser})};
 const win={CATALOGO_NAVIGATION:navigation,CATALOGO_CONFIG:{firebaseConfig:{databaseURL:'https://test.example'},ADMIN_EMAILS:['admin@example.test']},CATALOGO_BOOT:{loadFirebase:async()=>[{initializeApp:()=>({})},database,auth,{getStorage:()=>({})}]},addEventListener:(name,callback)=>events[name]=callback};
 await vm.runInNewContext(source,{document:{body:{dataset:{admin:page==='admin'?'true':'false',shop:page==='shop'?'true':'false',home:page==='home'?'true':'false'}},getElementById:node,createElement:element,addEventListener(){}},window:win,location:{hash,origin:'https://example.test',assign:url=>routes.push(url),replace:url=>routes.push(url)},Intl,URL,console,Option:function(text,value){this.text=text;this.value=value;},confirm:()=>true});
 return {node,listeners,routes,events,async session(user){await authCallback(user);},emit(name,value){const item=listeners.findLast(l=>l.name===name&&l.active);assert(item,'No listener: '+name);item.callback({val:()=>value});},async login(user,profile){loginUser=user;loginProfile=profile;await node('loginForm').onsubmit({preventDefault(){},currentTarget:node('loginForm')});}};
}
(async()=>{
 let env=await environment('public');await env.session(null);assert.equal(env.node('loginOpen').hidden,false);assert.equal(env.node('adminLink').hidden,true);assert.equal(env.node('shopLink').hidden,true);assert(!env.listeners.some(l=>l.name==='dev3dCatalogoMayorista'));
 await env.login(adminUser,null);assert.equal(env.routes.at(-1),'admin.html');await env.login(shopUser,active);assert.equal(env.routes.at(-1),'tienda.html');await env.login(shopUser,inactive);assert.equal(env.routes.at(-1),'index.html');
 env=await environment('admin');await env.session(adminUser);assert.equal(env.node('adminPanel').hidden,false);assert.equal(env.node('adminDashboard').hidden,false);assert.equal(env.node('catalogView').hidden,true);assert.equal(env.node('shopsView').hidden,true);assert.equal(env.node('calculatorFrame').getAttribute('src'),null);assert.equal(env.node('shopLink').hidden,true);
 env.node('goCatalog').onclick();assert.equal(env.node('catalogView').hidden,false);assert.equal(env.node('adminDashboard').hidden,true);
 env.node('goShops').onclick();assert.equal(env.node('shopsView').hidden,false);assert.equal(env.node('catalogView').hidden,true);
 env.node('openCalculator').onclick();assert.equal(env.node('calculatorPanel').hidden,false);assert.equal(env.node('calculatorFrame').getAttribute('src'),'calculadora/index.html?v=1');
 env.node('closeCalculator').onclick();assert.equal(env.node('adminDashboard').hidden,false);assert.equal(env.node('calculatorPanel').hidden,true);
 await env.session(null);assert.equal(env.node('adminPanel').hidden,true);assert.equal(env.node('calculatorFrame').getAttribute('src'),null);
 env=await environment('admin');await env.session(shopUser);env.emit('dev3dTiendas/s',active);assert.equal(env.node('adminPanel').hidden,true);assert.equal(env.node('gateShopLink').hidden,false);assert(!env.listeners.some(l=>l.name==='dev3dTiendas'));assert(!env.listeners.some(l=>l.name==='dev3dCatalogoMayorista'));
 env=await environment('public');await env.session(shopUser);env.emit('dev3dTiendas/s',active);assert.equal(env.node('shopLink').hidden,false);assert.equal(env.node('adminLink').hidden,true);assert(env.listeners.some(l=>l.name==='dev3dCatalogoMayorista'&&l.active));env.emit('dev3dTiendas/s',inactive);assert.equal(env.node('shopLink').hidden,true);assert(!env.listeners.some(l=>l.name==='dev3dCatalogoMayorista'&&l.active));
 env=await environment('shop');await env.session(shopUser);env.emit('dev3dTiendas/s',active);assert.equal(env.node('shopDashboard').hidden,false);assert.equal(env.node('shopGate').hidden,true);assert.equal(env.node('shopAccountEmail').textContent,'shop@example.test');assert(!env.listeners.some(l=>l.name==='dev3dCatalogoMayorista'||l.name==='dev3dCatalogoPublico'));await env.session(null);assert.equal(env.node('shopDashboard').hidden,true);assert.equal(env.node('shopAccountEmail').textContent,'');
 env=await environment('shop');await env.session(adminUser);assert.equal(env.routes.at(-1),'admin.html');
 env=await environment('home');await env.session(null);assert.equal(env.listeners.length,0);assert.equal(env.node('homeShopLogin').hidden,false);assert.equal(env.node('homeAdminAccess').hidden,true);
 await env.session(adminUser);assert.equal(env.listeners.length,0);assert.equal(env.node('homeAdminAccess').hidden,false);assert.equal(env.node('homeShopLogin').hidden,true);
 await env.session(shopUser);env.emit('dev3dTiendas/s',active);assert.equal(env.node('homeShopAccess').hidden,false);assert(!env.listeners.some(l=>l.name==='dev3dCatalogoMayorista'||l.name==='dev3dCatalogoPublico'));env.emit('dev3dTiendas/s',inactive);assert.equal(env.node('homeShopAccess').hidden,true);assert.equal(env.node('homeShopPending').hidden,false);
 env=await environment('home','#catalogo');assert.equal(env.routes.at(-1),'catalogo.html');
 console.log('PASS: enlaces antiguos del catálogo conservados.');
 console.log('PASS: portada sin carga de productos, con menú y acceso por rol.');
 console.log('PASS: inicio común, destinos por rol, menú de visitante/tienda/admin, panel de tarjetas, secciones, carga de calculadora, revocación y cierre de sesión.');
})().catch(error=>{console.error(error);process.exitCode=1;});
