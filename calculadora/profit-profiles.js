(function(scope){
  'use strict';
  // These are independent profit choices; work and consumables are costs.
  const help='Elige el beneficio que quieres añadir al coste completo, después de sumar materiales, impresión, mano de obra y demás gastos.';
  const profiles=Object.freeze(Object.fromEntries([20,25,30,40,50].map(rate=>['profit'+rate,{rate,label:rate+' % sobre el coste total',help}])));
  // Old budgets retain their amount and reopen as Manual. Keep their IDs
  // accepted by the database while old clients may still be open.
  const legacyProfileIds=['simple','personalized','figure','large','complex'];
  function normalize(id,rate){return id!=='manual'&&Object.hasOwn(profiles,id)&&String(rate).trim()!==''&&Number(rate)===profiles[id].rate?id:'manual';}
  scope.DEV3D_PROFIT_PROFILES={profiles,normalize,legacyProfileIds};if(typeof module!=='undefined')module.exports=scope.DEV3D_PROFIT_PROFILES;
})(typeof window==='undefined'?globalThis:window);
