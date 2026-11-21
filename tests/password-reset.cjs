const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 for(const page of ['index.html','catalogo.html','admin.html','tienda.html']){
  const app=await appDOM(page),login=app.node('loginForm'),reset=app.node('passwordResetForm');
  login.elements.email.value='shop@example.test';login.elements.password.value='secret';app.node('forgotPassword').onclick();
  assert.equal(login.hidden,true);assert.equal(reset.hidden,false);assert.equal(login.elements.password.value,'');assert.equal(reset.elements.email.value,'shop@example.test');
  reset.elements.email.value='bad';await app.submit('passwordResetForm');assert.match(app.node('passwordResetMessage').textContent,/válido/);assert.equal(app.state.resetCalls,undefined);
  reset.elements.email.value='shop@example.test';let finish;app.state.resetEmail=async()=>new Promise(resolve=>finish=resolve);
  const pending=app.submit('passwordResetForm');assert.equal(app.node('sendPasswordReset').disabled,true);await app.submit('passwordResetForm');assert.equal(app.state.resetCalls.length,1);finish();await pending;
  assert.deepEqual(app.state.resetCalls[0],{email:'shop@example.test',language:'es'});const success=app.node('passwordResetMessage').textContent;assert.match(success,/no cambia/);assert.equal(app.state.writes.length,0);
  app.state.resetEmail=async()=>{throw {code:'auth/user-not-found'};};await app.submit('passwordResetForm');assert.equal(app.node('passwordResetMessage').textContent,success);
  app.state.resetEmail=async()=>{throw {code:'auth/too-many-requests'};};await app.submit('passwordResetForm');assert.match(app.node('passwordResetMessage').textContent,/demasiados/);assert.equal(app.node('sendPasswordReset').disabled,false);
  app.node('backToLogin').onclick();assert.equal(reset.hidden,true);assert.equal(login.hidden,false);
 }
 console.log('PASS: password reset on all pages, email validation, duplicate prevention, Spanish emails, private account response, retry and no database writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
