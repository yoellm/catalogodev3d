const assert=require('node:assert/strict');
const {createShop,errorMessage}=require('../catalogo-shops.js');
function setup({existing=false,failSave=false,failDelete=false,failCreate=false,failLogin=false}={}){
 const calls=[], secondary={name:'secondary'}, secondaryAuth={app:secondary}, user={uid:'shop-123'};
 const memory={};
 return {calls, appSDK:{initializeApp(config,name){calls.push('initApp');assert.match(name,/dev3d-shop-registration/);return secondary;},async deleteApp(app){assert.equal(app,secondary);calls.push('deleteApp');}},authSDK:{inMemoryPersistence:memory,initializeAuth(app,options){assert.equal(app,secondary);assert.equal(options.persistence,memory);calls.push('memoryAuth');return secondaryAuth;},async createUserWithEmailAndPassword(auth,email,password){assert.equal(auth,secondaryAuth);assert.equal(email,'shop@example.test');calls.push('create');if(existing)throw {code:'auth/email-already-in-use'};if(failCreate)throw {code:'auth/weak-password'};return {user};},async signInWithEmailAndPassword(auth){assert.equal(auth,secondaryAuth);calls.push('existingSignIn');if(failLogin)throw {code:'auth/invalid-credential'};return {user};},async deleteUser(u){assert.equal(u,user);calls.push('deleteUser');if(failDelete)throw Error('network');},async signOut(auth){assert.equal(auth,secondaryAuth);calls.push('signOut');}},async saveProfile(uid,profile){assert.equal(uid,'shop-123');assert.deepEqual(profile,{rol:'tienda',nombre:'Mi tienda',activo:true,email:'shop@example.test'});assert.equal(profile.password,undefined);calls.push('saveProfile');if(failSave)throw Error('permission-denied');}};
}
async function run(options={}) {const s=setup(options);const input={...s,config:{projectId:'test'},email:' Shop@Example.Test ',password:'test-password-only',profile:{nombre:' Mi tienda ',activo:true}};try{return {...s,result:await createShop(input)};}catch(error){return {...s,error};}}
(async()=>{
 let s=await run();assert.equal(s.result.created,true);assert.deepEqual(s.calls,['initApp','memoryAuth','create','saveProfile','signOut','deleteApp']);
 s=await run({existing:true});assert.equal(s.result.created,false);assert(s.calls.includes('existingSignIn'));assert(!s.calls.includes('deleteUser'));
 s=await run({failSave:true});assert.equal(s.error.rolledBack,true);assert(s.calls.includes('deleteUser'));assert(s.calls.includes('deleteApp'));
 s=await run({existing:true,failSave:true});assert.equal(s.error.accountCreated,false);assert(!s.calls.includes('deleteUser'));
 s=await run({failSave:true,failDelete:true});assert.equal(s.error.rolledBack,false);assert.match(errorMessage(s.error),/repite el alta/);
 s=await run({existing:true,failLogin:true});assert(!s.calls.includes('saveProfile'));assert.match(errorMessage(s.error),/contraseña actual/);assert(s.calls.includes('deleteApp'));
 s=await run({failCreate:true});assert(!s.calls.includes('saveProfile'));assert(!s.calls.includes('deleteUser'));assert(s.calls.includes('deleteApp'));
 const untouched=setup();await assert.rejects(createShop({...untouched,email:'bad',password:'test-password',profile:{nombre:'Tienda'}}));assert.equal(untouched.calls.length,0);
 await assert.rejects(createShop({...untouched,email:'shop@example.test',password:'short',profile:{nombre:'Tienda'}}));assert.equal(untouched.calls.length,0);
 console.log('PASS: alta y cuenta existente, sesión secundaria en memoria, perfil sin contraseña, recuperación ante fallo de permisos, sin borrar cuentas existentes y limpieza de sesión.');
})().catch(error=>{console.error(error);process.exitCode=1;});
