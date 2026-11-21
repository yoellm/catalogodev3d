(function(scope){
  'use strict';
  const operations={verifyEmail:'VERIFY_EMAIL',verifyAndChangeEmail:'VERIFY_AND_CHANGE_EMAIL',recoverEmail:'RECOVER_EMAIL'};
  function errorText(error){
    if(['auth/expired-action-code','auth/invalid-action-code','auth/user-not-found','auth/user-disabled'].includes(error?.code))return 'Este enlace ha caducado, ya se ha utilizado o no es válido. Solicita un correo nuevo desde tu cuenta o desde «¿Has olvidado tu contraseña?».';
    if(['auth/weak-password','auth/password-does-not-meet-requirements'].includes(error?.code))return 'La contraseña no cumple los requisitos de seguridad. Prueba con una más larga que combine letras, números y símbolos.';
    if(error?.code==='auth/too-many-requests')return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    return 'No hemos podido completar la solicitud. Comprueba la conexión y vuelve a intentarlo.';
  }
  async function mount(environment=scope){
    const doc=environment.document,$=id=>doc.getElementById(id),params=new URLSearchParams(environment.location.search),mode=params.get('mode'),code=params.get('oobCode');
    const message=text=>{$('actionMessage').textContent=text;};
    const invalid=()=>{$('actionTitle').textContent='Enlace no disponible';$('actionDescription').textContent='Abre el enlace completo del correo que te hemos enviado.';message(errorText({code:'auth/invalid-action-code'}));};
    if(!code||(mode!=='resetPassword'&&!operations[mode])){invalid();return;}
    // Keep the one-time code in this closure, out of subsequent navigation URLs.
    environment.history?.replaceState(null,'',environment.location.pathname);
    try{
      const [apps,,sdk]=await environment.CATALOGO_BOOT.loadFirebase();
      const app=apps.initializeApp(environment.CATALOGO_CONFIG.firebaseConfig,'dev3d-email-action');const auth=sdk.getAuth(app);auth.languageCode='es';
      let busy=false;
      const success=text=>{$('actionPasswordForm').reset();$('actionPasswordForm').hidden=true;$('actionConfirmEmail').hidden=true;$('actionTitle').textContent='Todo listo';$('actionDescription').textContent=text;message('Ya puedes volver a tu cuenta e iniciar sesión.');};
      if(mode==='resetPassword'){
        const email=await sdk.verifyPasswordResetCode(auth,code);
        $('actionTitle').textContent='Elige tu nueva contraseña';$('actionDescription').textContent='Actualiza la contraseña de tu cuenta '+email+'.';$('actionPasswordForm').hidden=false;
        $('actionPasswordForm').onsubmit=async event=>{
          event.preventDefault();if(busy)return;const fields=event.currentTarget.elements,password=fields.namedItem('password').value,confirmation=fields.namedItem('confirmation').value;
          if(password.length<8){message('Utiliza una contraseña de al menos 8 caracteres.');return;}if(password!==confirmation){message('Las contraseñas no coinciden.');return;}
          busy=true;$('actionSavePassword').disabled=true;message('Guardando tu nueva contraseña…');
          try{await sdk.confirmPasswordReset(auth,code,password);success('Tu contraseña se ha actualizado correctamente.');}catch(error){message(errorText(error));}finally{busy=false;$('actionSavePassword').disabled=false;}
        };
      }else{
        const info=await sdk.checkActionCode(auth,code);if(info.operation!==operations[mode]){invalid();return;}
        const recovering=mode==='recoverEmail',changing=mode==='verifyAndChangeEmail';
        $('actionTitle').textContent=recovering?'Recuperar tu correo anterior':changing?'Confirmar tu nuevo correo':'Verificar tu correo electrónico';
        $('actionDescription').textContent=recovering?'Confirma que quieres deshacer el cambio de correo de tu cuenta.':changing?'Confirma que quieres utilizar este nuevo correo para acceder a tu cuenta.':'Pulsa el botón para confirmar tu dirección de correo electrónico.';
        $('actionConfirmEmail').textContent=recovering?'Recuperar mi correo':changing?'Confirmar nuevo correo':'Confirmar mi correo';$('actionConfirmEmail').hidden=false;
        $('actionConfirmEmail').onclick=async()=>{
          if(busy)return;busy=true;$('actionConfirmEmail').disabled=true;message('Confirmando…');
          try{await sdk.applyActionCode(auth,code);success(recovering?'Se ha recuperado tu dirección de correo anterior.':changing?'Tu nuevo correo ha quedado confirmado. Utilízalo para iniciar sesión.':'Tu correo electrónico ha quedado verificado.');}catch(error){message(errorText(error));}finally{busy=false;$('actionConfirmEmail').disabled=false;}
        };
      }
    }catch(error){$('actionTitle').textContent='No se ha podido validar el enlace';$('actionDescription').textContent='Si el problema continúa, solicita un correo nuevo.';message(errorText(error));}
  }
  if(typeof module!=='undefined')module.exports={mount,errorText};
  else if(scope.document)mount();
})(typeof window==='undefined'?globalThis:window);
