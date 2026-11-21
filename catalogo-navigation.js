(function(scope){
  'use strict';
  function roleFor(user,profile,admins){
    if (!user) return 'public';
    if (admins.some(email=>String(email).toLowerCase()===String(user.email || '').toLowerCase())) return 'admin';
    return profile?.rol === 'tienda' && profile.activo === true ? 'shop' : 'member';
  }
  function destinationFor(role){return role==='admin'?'admin.html':role==='shop'?'tienda.html':'index.html';}
  scope.CATALOGO_NAVIGATION=Object.freeze({roleFor,destinationFor});
  if(typeof module!=='undefined')module.exports={roleFor,destinationFor};
})(typeof window==='undefined'?globalThis:window);
