(function(scope){
  'use strict';
  function selectFeatured(source,limit=12){
    return Object.entries(source || {}).filter(([,p])=>{
      if(!p || typeof p.nombre!=='string' || !p.nombre.trim() || typeof p.precio!=='number' || !Number.isFinite(p.precio) || p.precio<0) return false;
      return true;
    }).sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre,'es')).slice(0,Math.max(0,Math.min(12,limit)));
  }
  function googleReviewUrl(value){
    try{const url=new URL(value);const host=url.hostname.toLowerCase();return url.protocol==='https:' && (host==='share.google'||host==='google.com'||host.endsWith('.google.com')||host==='maps.app.goo.gl'||host==='g.page'||host==='goo.gl') ? url.href : '';}catch{return '';}
  }
  scope.CATALOGO_HOME=Object.freeze({selectFeatured,googleReviewUrl});
  if(typeof module!=='undefined')module.exports={selectFeatured,googleReviewUrl};
})(typeof window==='undefined'?globalThis:window);
