(function(scope){
  'use strict';
  function fail(code,message){throw Object.assign(new Error(message),{code:'account/'+code});}
  async function reauthenticate(sdk,user,password){
    if(!user?.uid || !user.email) fail('no-session','Inicia sesión de nuevo para cambiar tus datos.');
    if(typeof password!=='string' || !password) fail('current-password','Introduce tu contraseña actual.');
    await sdk.reauthenticateWithCredential(user,sdk.EmailAuthProvider.credential(user.email,password));
  }
  async function changeEmail({sdk,user,currentPassword,newEmail}){
    const email=String(newEmail||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) fail('email','Introduce un correo válido.');
    if(email===String(user?.email||'').toLowerCase()) fail('same-email','Ese ya es tu correo actual.');
    await reauthenticate(sdk,user,currentPassword);
    await sdk.verifyBeforeUpdateEmail(user,email);
    return email;
  }
  async function changePassword({sdk,user,currentPassword,newPassword,confirmation}){
    if(typeof newPassword!=='string'||newPassword.length<8) fail('password','La nueva contraseña debe tener al menos 8 caracteres.');
    if(newPassword!==confirmation) fail('confirmation','Las nuevas contraseñas no coinciden.');
    await reauthenticate(sdk,user,currentPassword);
    await sdk.updatePassword(user,newPassword);
  }
  async function syncEmail({sdk,user,profile,saveEmail}){
    if(!user?.uid||!user.email||profile?.rol!=='tienda'||profile.email===user.email) return false;
    await sdk.getIdToken(user,true);
    await saveEmail(user.uid,user.email);
    return true;
  }
  function errorMessage(error){
    const code=error?.code;
    if(code?.startsWith('account/')) return error.message;
    if(['auth/invalid-credential','auth/wrong-password','auth/invalid-login-credentials'].includes(code)) return 'La contraseña actual no es correcta. Vuelve a intentarlo.';
    if(code==='auth/email-already-in-use') return 'Ese correo ya está asociado a otra cuenta.';
    if(code==='auth/invalid-email') return 'El nuevo correo no es válido.';
    if(['auth/weak-password','auth/password-does-not-meet-requirements'].includes(code)) return 'La contraseña no cumple los requisitos. Usa al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos.';
    if(['auth/requires-recent-login','auth/user-token-expired','auth/invalid-user-token','auth/user-disabled'].includes(code)) return 'Tu sesión necesita renovarse. Cierra sesión y vuelve a entrar con tus datos actuales.';
    if(code==='auth/too-many-requests') return 'Hay demasiados intentos. Espera un momento y vuelve a intentarlo.';
    if(code==='auth/network-request-failed') return 'No se pudo conectar. Comprueba internet y vuelve a intentarlo.';
    return 'No se pudo completar el cambio. Revisa la conexión e inténtalo de nuevo.';
  }
  scope.CATALOGO_ACCOUNT=Object.freeze({changeEmail,changePassword,syncEmail,errorMessage});
  if(typeof module!=='undefined')module.exports={changeEmail,changePassword,syncEmail,errorMessage};
})(typeof window==='undefined'?globalThis:window);
