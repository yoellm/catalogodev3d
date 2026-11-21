(function(scope) {
  'use strict';
  let counter = 0;
  async function createShop({appSDK, authSDK, config, email, password, profile, saveProfile}) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw Object.assign(new Error('Revisa el correo de la tienda.'), {code:'shop/invalid-email'});
    if (typeof password !== 'string' || password.length < 8) throw Object.assign(new Error('Utiliza una contraseña de al menos 8 caracteres.'), {code:'shop/invalid-password'});
    if (typeof profile?.nombre !== 'string' || !profile.nombre.trim()) throw Object.assign(new Error('Indica el nombre de la tienda.'), {code:'shop/invalid-name'});
    const secondaryApp = appSDK.initializeApp(config, 'dev3d-shop-registration-' + Date.now() + '-' + (++counter));
    let secondaryAuth, user, created = false;
    try {
      secondaryAuth = authSDK.initializeAuth(secondaryApp, {persistence:authSDK.inMemoryPersistence});
      try {
        user = (await authSDK.createUserWithEmailAndPassword(secondaryAuth,email,password)).user;
        created = true;
      } catch(error) {
        if (error.code !== 'auth/email-already-in-use') throw error;
        user = (await authSDK.signInWithEmailAndPassword(secondaryAuth,email,password)).user;
      }
      try {
        await saveProfile(user.uid, {rol:'tienda',nombre:profile.nombre.trim(),activo:profile.activo === true,email});
      } catch(error) {
        let rolledBack = false;
        if (created) { try { await authSDK.deleteUser(user); rolledBack = true; } catch {} }
        throw Object.assign(new Error('No se pudo guardar la autorización de la tienda.'), {code:'shop/profile-save-failed',rolledBack,accountCreated:created,uid:user.uid,cause:error});
      }
      return {uid:user.uid,email,created};
    } finally {
      if (secondaryAuth) { try { await authSDK.signOut(secondaryAuth); } catch {} }
      try { await appSDK.deleteApp(secondaryApp); } catch {}
    }
  }
  function errorMessage(error) {
    const code = error?.code;
    if (code === 'shop/profile-save-failed') return error.accountCreated && !error.rolledBack
      ? 'La cuenta se ha creado, pero no se pudo autorizar. Revisa la conexión y repite el alta con el mismo correo y contraseña para completar el acceso.'
      : 'No se pudo autorizar la tienda. Revisa la conexión y los permisos e inténtalo de nuevo.';
    if (code?.startsWith('shop/')) return error.message;
    if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(code)) return 'Ese correo ya tiene una cuenta. Para autorizarla, introduce su contraseña actual.';
    if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') return 'La contraseña no cumple los requisitos de Firebase. Usa una más larga con mayúsculas, minúsculas, números y símbolos.';
    if (code === 'auth/invalid-email') return 'El correo no es válido.';
    if (code === 'auth/operation-not-allowed') return 'El alta de usuarios por correo está desactivada en Firebase.';
    if (code === 'auth/network-request-failed') return 'No se pudo conectar. Comprueba internet y vuelve a intentarlo.';
    if (code === 'auth/too-many-requests') return 'Se han realizado demasiados intentos. Espera un momento y vuelve a intentarlo.';
    return 'No se pudo dar de alta a la tienda. Revisa los datos y la conexión.';
  }
  scope.CATALOGO_SHOPS = Object.freeze({createShop,errorMessage});
  if (typeof module !== 'undefined') module.exports = {createShop,errorMessage};
})(typeof window === 'undefined' ? globalThis : window);
