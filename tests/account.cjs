const assert=require('node:assert/strict');
const {changeEmail,changePassword,syncEmail,errorMessage}=require('../catalogo-account.js');
const user={uid:'shop-1',email:'old@example.test'};
function setup(fail=false){const calls=[];return {calls,sdk:{EmailAuthProvider:{credential(email,password){calls.push(['credential',email]);return {email,password};}},async reauthenticateWithCredential(u,credential){assert.equal(u,user);assert.equal(credential.password,'test-current-password');calls.push(['reauthenticate']);if(fail)throw {code:'auth/invalid-credential'};},async verifyBeforeUpdateEmail(u,email){assert.equal(u,user);calls.push(['verify',email]);},async updatePassword(u,password){assert.equal(u,user);assert.equal(password,'test-new-password');calls.push(['password']);},async getIdToken(u,force){assert.equal(u,user);assert.equal(force,true);calls.push(['token']);}}};}
(async()=>{
let s=setup();assert.equal(await changeEmail({...s,user,currentPassword:'test-current-password',newEmail:' NEW@Example.Test '}),'new@example.test');assert.deepEqual(s.calls,[['credential','old@example.test'],['reauthenticate'],['verify','new@example.test']]);assert.equal(user.email,'old@example.test');
s=setup(true);await assert.rejects(changeEmail({...s,user,currentPassword:'test-current-password',newEmail:'new@example.test'}));assert(!s.calls.some(c=>c[0]==='verify'));
s=setup();await assert.rejects(changeEmail({...s,user,currentPassword:'test-current-password',newEmail:user.email}));assert.equal(s.calls.length,0);
await assert.rejects(changeEmail({...s,user,currentPassword:'test-current-password',newEmail:'invalid'}));assert.equal(s.calls.length,0);
await assert.rejects(changePassword({...s,user,currentPassword:'test-current-password',newPassword:'test-new-password',confirmation:'different'}));assert.equal(s.calls.length,0);
await changePassword({...s,user,currentPassword:'test-current-password',newPassword:'test-new-password',confirmation:'test-new-password'});assert.deepEqual(s.calls.map(c=>c[0]),['credential','reauthenticate','password']);
let writes=[];s=setup();assert.equal(await syncEmail({...s,user,profile:{rol:'tienda',email:user.email},saveEmail:async(...args)=>writes.push(args)}),false);assert.equal(writes.length,0);
assert.equal(await syncEmail({...s,user,profile:{rol:'tienda',email:'previous@example.test'},saveEmail:async(...args)=>writes.push(args)}),true);assert.deepEqual(writes,[['shop-1','old@example.test']]);
writes=[];assert.equal(await syncEmail({...s,user,profile:{},saveEmail:async(...args)=>writes.push(args)}),false);assert.equal(writes.length,0);assert.match(errorMessage({code:'auth/invalid-credential'}),/contraseña actual/);
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const rules=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalogo.rules.json'),'utf8')).rules.dev3dTiendas;
const ownRule=rules.$uid.email['.write'];
function allows(auth,value,profile){return vm.runInNewContext(ownRule,{auth,$uid:'shop-1',newData:{isString:()=>typeof value==='string',val:()=>value},root:{child:()=>({child:()=>({child:()=>({val:()=>profile?.rol??null})})})}});}
assert.equal(allows({uid:'shop-1',token:{email:'old@example.test'}},'old@example.test',{rol:'tienda'}),true);
assert.equal(allows({uid:'shop-1',token:{email:'old@example.test'}},'other@example.test',{rol:'tienda'}),false);
assert.equal(allows({uid:'different',token:{email:'old@example.test'}},'old@example.test',{rol:'tienda'}),false);
assert.equal(allows(null,'old@example.test',{rol:'tienda'}),false);
assert.equal(allows({uid:'shop-1',token:{email:'old@example.test'}},'old@example.test',{}),false);
assert.equal(rules.$uid['.write'],undefined);
console.log('PASS: regla de correo limitada al propietario, su email autenticado y una ficha existente.');
console.log('PASS: reautenticación, confirmación de correo previa al cambio, contraseña coincidente, sincronización por UID y sin guardar contraseñas en el perfil.');
})().catch(error=>{console.error(error);process.exitCode=1;});
