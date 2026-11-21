const assert=require('node:assert/strict'),fs=require('node:fs');const {parseHTML}=require('linkedom');const {mount}=require('../cuenta-accion.js');
async function fixture(mode,overrides={},code='test-code'){
 const {document}=parseHTML(fs.readFileSync(require('node:path').join(__dirname,'../cuenta-accion.html'),'utf8'));const form=document.getElementById('actionPasswordForm');
 Object.defineProperty(form,'elements',{value:{namedItem:name=>form.querySelector('[name="'+name+'"]')}});form.reset=()=>{for(const input of form.querySelectorAll('input'))input.value='';};
 const calls=[];const sdk={getAuth:()=>({}),verifyPasswordResetCode:async(_,c)=>{calls.push(['verify',c]);return 'shop@example.test';},confirmPasswordReset:async(_,c,password)=>calls.push(['reset',c,password]),checkActionCode:async()=>({operation:({verifyEmail:'VERIFY_EMAIL',verifyAndChangeEmail:'VERIFY_AND_CHANGE_EMAIL',recoverEmail:'RECOVER_EMAIL'})[mode]}),applyActionCode:async(_,c)=>calls.push(['apply',c]),...overrides};
 const environment={document,location:{pathname:'/cuenta-accion.html',search:'?mode='+mode+'&oobCode='+code+'&continueUrl=https://evil.example'},history:{replaceState:(_,__,url)=>calls.push(['history',url])},CATALOGO_CONFIG:{firebaseConfig:{}},CATALOGO_BOOT:{loadFirebase:async()=>[{initializeApp:()=>({})},null,sdk]}};
 await mount(environment);return {document,form,calls,get:id=>document.getElementById(id)};
}
(async()=>{
 const reset=await fixture('resetPassword');assert.equal(reset.form.hidden,false);reset.form.elements.namedItem('password').value='short';await reset.form.onsubmit({preventDefault(){},currentTarget:reset.form});assert.match(reset.get('actionMessage').textContent,/8 caracteres/);assert(!reset.calls.some(x=>x[0]==='reset'));
 reset.form.elements.namedItem('password').value='valid-pass-123';reset.form.elements.namedItem('confirmation').value='mismatch';await reset.form.onsubmit({preventDefault(){},currentTarget:reset.form});assert.match(reset.get('actionMessage').textContent,/no coinciden/);
 reset.form.elements.namedItem('confirmation').value='valid-pass-123';await reset.form.onsubmit({preventDefault(){},currentTarget:reset.form});assert.equal(reset.form.hidden,true);assert.match(reset.get('actionTitle').textContent,/Todo listo/);assert.equal(reset.form.elements.namedItem('password').value,'');assert.deepEqual(reset.calls.find(x=>x[0]==='history'),['history','/cuenta-accion.html']);assert.equal(reset.get('actionReturn').getAttribute('href'),'tienda.html');
 for(const mode of ['verifyEmail','verifyAndChangeEmail','recoverEmail']){const app=await fixture(mode);assert.equal(app.get('actionConfirmEmail').hidden,false);assert(!app.calls.some(x=>x[0]==='apply'));await app.get('actionConfirmEmail').onclick();assert.equal(app.calls.filter(x=>x[0]==='apply').length,1);assert.equal(app.get('actionConfirmEmail').hidden,true);}
 const invalid=await fixture('unsupported');assert.equal(invalid.calls.length,0);
 const expired=await fixture('resetPassword',{verifyPasswordResetCode:async()=>{throw {code:'auth/expired-action-code'};}});assert.equal(expired.form.hidden,true);assert.match(expired.get('actionMessage').textContent,/caducado/);
 const mismatch=await fixture('verifyEmail',{checkActionCode:async()=>({operation:'RECOVER_EMAIL'})});assert.equal(mismatch.get('actionConfirmEmail').hidden,true);
 console.log('PASS: branded email actions, reset validation, valid/expired codes, operation matching, explicit email confirmation, cleared passwords and no external redirect.');
})().catch(error=>{console.error(error);process.exitCode=1;});
