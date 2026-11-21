(function(scope){
'use strict';
/* Commercial prices use net costs and margins on net selling prices. */
function computeCommercialOffer(c, options) {
  const n = (key) => Number(options[key]);
  const shop = options.saleChannel === 'shop';
  const fixed = options.fixedPricing === 'yes';
  const errors = [];
  const required = ['wholesaleProfit', 'shopMargin', 'targetPvp', 'shopMinimum'];
  if (fixed) required.push('referenceCost', 'costBuffer');
  if (required.some(key => !Number.isFinite(n(key)) || n(key) < 0 || String(options[key]).trim() === '')) errors.push('Completa los campos con valores válidos, iguales o mayores que cero.');
  if (shop && (n('shopMargin') >= 100 || !Number.isInteger(n('shopMinimum')) || n('shopMinimum') < 1)) errors.push('El margen debe ser menor del 100% y el pedido mínimo un entero positivo.');
  if (fixed && n('referenceCost') <= 0) errors.push('Indica un coste de referencia mayor que cero.');
  const quoteQuantity = shop ? Math.max(c.quantity, n('shopMinimum')) : c.quantity;
  const minimumApplied = shop && quoteQuantity > c.quantity;
  const cost = fixed ? n('referenceCost') * (1 + n('costBuffer') / 100) : c.unitCost;
  const overBuffer = fixed && c.unitCost > cost + 0.000001;
  const profitRate = shop ? n('wholesaleProfit') / 100 : c.profitRate;
  const round = amount => Math.ceil((amount - 1e-9) * 100) / 100;
  // The established direct price retains its 0.50 EUR rounding.
  const gross = !shop && !fixed ? c.unitRecommended : round(cost * (1 + profitRate) * (1 + c.vatRate));
  const net = gross / (1 + c.vatRate);
  const margin = n('shopMargin') / 100;
  const suggestedPvp = shop && margin < 1 ? round(gross / (1 - margin)) : gross;
  const pvp = shop && n('targetPvp') > 0 ? n('targetPvp') : suggestedPvp;
  const pvpNet = pvp / (1 + c.vatRate);
  const actualMargin = pvpNet > 0 ? (pvpNet - net) / pvpNet : 0;
  const maxWholesaleNet = pvpNet * (1 - margin);
  const compatible = !shop || n('targetPvp') <= 0 || maxWholesaleNet + 0.000001 >= net;
  if (cost <= 0) errors.push('Añade costes antes de emitir una oferta.');
  const finite = [cost, gross, net, pvp, suggestedPvp].every(Number.isFinite);
  return {shop, fixed, cost, gross, net, pvp, suggestedPvp, actualMargin, maxWholesaleNet, compatible,
    profit: net - cost, actualProfit: net - c.unitCost, bufferRemaining: cost - c.unitCost, overBuffer, quoteQuantity, minimumApplied, total: gross * quoteQuantity, errors, valid: finite && errors.length === 0};
}
scope.DEV3D_PRICING=Object.freeze({computeCommercialOffer});
if(typeof module!=='undefined')module.exports={computeCommercialOffer};
})(typeof window==='undefined'?globalThis:window);
