(function(scope){
  'use strict';
  const rate=value=>String(value??'').trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=100?Number(value):null;
  function normalize(config){return {mode:['auto','keep','deduct'].includes(config?.mode)?config.mode:'auto',rate:rate(config?.rate)??21};}
  function legacy(saleRate){const value=rate(saleRate);return {mode:'auto',rate:value>0?value:21};}
  function amounts(material,config,saleRate){
    const settings=normalize(config),entered=Math.max(0,Number(material.price)||0),deduct=settings.mode==='deduct'||settings.mode==='auto'&&Number(saleRate)>0;
    const gross=material.priceVat==='gross',cost=deduct&&gross?entered/(1+settings.rate/100):entered;
    const reference=deduct&&!gross?entered*(1+settings.rate/100):entered;
    return {cost,reference,entered,deduct,removed:deduct&&gross&&settings.rate>0,rate:settings.rate};
  }
  scope.DEV3D_MATERIAL_TAX={normalize,legacy,amounts};if(typeof module!=='undefined')module.exports=scope.DEV3D_MATERIAL_TAX;
})(typeof window==='undefined'?globalThis:window);
