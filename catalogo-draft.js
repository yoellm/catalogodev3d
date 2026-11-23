(function (scope) {
  'use strict';
  function validateDraft(data) {
    if (!data || data.type !== 'dev3d:product-draft') return null;
    if (typeof data.nombre !== 'string' || !data.nombre.trim() || data.nombre.length > 150) return null;
    if (![data.precio, data.mayorista].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)) return null;
    if (!Number.isSafeInteger(data.minimo) || data.minimo < 1) return null;
    if (data.descripcion !== undefined && (typeof data.descripcion !== 'string' || data.descripcion.length > 3000)) return null;
    if(data.productId!==undefined&&(typeof data.productId!=='string'||!data.productId||data.productId.length>150||/[.#$\[\]\/]/.test(data.productId)))return null;
    let calculo;
    if(data.calculo!==undefined){
      try{const budgets=typeof module!=='undefined'?require('./calculadora/budgets.js'):scope.DEV3D_BUDGETS;calculo=budgets.prepare(data.calculo);}catch{return null;}
    }
    return {nombre:data.nombre.trim(),precio:data.precio,mayorista:data.mayorista,minimo:data.minimo,descripcion:data.descripcion || '',...(data.productId?{productId:data.productId}:{}),...(calculo?{calculo}:{})};
  }
  scope.CATALOGO_DRAFT = Object.freeze({validateDraft});
  if (typeof module !== 'undefined') module.exports = {validateDraft};
})(typeof window === 'undefined' ? globalThis : window);
