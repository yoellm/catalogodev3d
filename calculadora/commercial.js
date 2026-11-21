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

function commercialOptions() {
  return Object.fromEntries(['saleChannel', 'fixedPricing', 'wholesaleProfit', 'shopMargin', 'targetPvp',
    'shopMinimum', 'rateName', 'referenceCost', 'costBuffer']
    .map(id => [id, document.getElementById(id).value]));
}

function commercialOfferLines() {
  const o = state.offer;
  const options = commercialOptions();
  if (!o?.valid) return ['Tarifa pendiente de revisión.'];
  return [
    `OFERTA · ${o.fixed ? options.rateName || 'Personalización' : $('#pieceName').value.trim() || 'Pieza 3D'}`,
    o.shop ? 'Tarifa para tiendas' : 'Venta directa',
    ...(o.fixed ? [`Precio cerrado para las personalizaciones de este producto.`] : []),
    ...(o.shop ? [`Pedido mínimo: ${options.shopMinimum} unidades.`] : []),
    `Cantidad presupuestada: ${o.quoteQuantity} unidades.`,
    `Precio por unidad sin IVA: ${euro.format(o.net)}`,
    `IVA: ${decimal.format(state.lastCosts.vatRate * 100)}%`,
    `Precio por unidad con IVA: ${euro.format(o.gross)}`,
    `Total con IVA: ${euro.format(o.total)}`,
    ...(o.shop ? [`PVP sugerido con IVA: ${euro.format(o.suggestedPvp)}`] : [])
  ];
}

function renderCommercialOffer() {
  const options = commercialOptions();
  const o = computeCommercialOffer(state.lastCosts, options);
  state.offer = o;
  $('#fixedFields').classList.toggle('hidden', !o.fixed);
  $('#offerTitle').textContent = `${o.shop ? 'Tu precio para tiendas' : 'Tu precio de venta directa'}${o.fixed ? ' · precio cerrado' : ''}`;
  $('#offerPriceHighlight').classList.toggle('hidden', !o.valid);
  $('#offerPriceLabel').textContent = o.shop ? 'Este es el precio que debes cobrar a la tienda' : 'Este es el precio que debes cobrar al cliente';
  $('#offerPriceAmount').textContent = o.valid ? euro.format(o.gross) : '';
  $('#offerPriceTotal').textContent = o.valid ? `Total a cobrar por ${o.quoteQuantity} unidades: ${euro.format(o.total)} · IVA incluido` : '';
  const rows = [
    ['Tarifa', o.fixed ? `${options.rateName || 'Personalización'} · precio cerrado` : 'Pieza actual'],
    ['Tu precio / ud. sin IVA', euro.format(o.net)],
    ['Tu precio / ud. con IVA', euro.format(o.gross)],
    [`Total con IVA (${o.quoteQuantity} uds.)`, euro.format(o.total)],
    ['Coste cubierto / ud. sin IVA', euro.format(o.cost)],
    [o.fixed ? 'Beneficio reservado tras el colchón / ud.' : 'Tu beneficio / ud. sin IVA', euro.format(o.profit)]
  ];
  if (o.fixed) rows.push(
    ['Colchón disponible sobre el coste actual / ud.', euro.format(o.bufferRemaining)],
    ['Beneficio con el coste actual / ud. sin IVA', euro.format(o.actualProfit)]
  );
  if (o.shop) rows.push(
    ['Pedido mínimo', `${options.shopMinimum} unidades`],
    ['PVP necesario con IVA', euro.format(o.suggestedPvp)],
    ['PVP evaluado con IVA', euro.format(o.pvp)],
    ['Margen real de la tienda', `${decimal.format(o.actualMargin * 100)}%`],
    ['Beneficio tienda / ud. sin IVA', euro.format((o.pvp - o.gross) / (1 + state.lastCosts.vatRate))]
  );
  $('#offerResults').innerHTML = o.valid ? rows.map(([label, amount]) => `<div class="cost-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(amount)}</strong></div>`).join('') : '';
  let status = o.errors.join(' ');
  if (o.valid) status = !o.compatible
    ? `El PVP objetivo no permite ambos beneficios. Para dejar el margen solicitado, la tienda podría pagar como máximo ${euro.format(o.maxWholesaleNet)} sin IVA por unidad. Mantén tu tarifa y revisa el PVP, el coste o los porcentajes.`
    : 'Tarifa calculada con los costes indicados. Los márgenes se comparan sin IVA y se aplica el mismo IVA a ambas ventas.';
  if (o.valid && o.overBuffer) status += ` Esta variante supera el colchón en ${euro.format(-o.bufferRemaining)} por unidad. El precio se mantiene; tu beneficio con el coste actual es ${euro.format(o.actualProfit)} sin IVA por unidad.${o.actualProfit < 0 ? ' Atención: esta variante se vendería con pérdidas.' : ''}`;
  if (o.valid && o.minimumApplied) status += ` Oferta para el pedido mínimo de ${o.quoteQuantity} unidades, usando el coste por unidad del cálculo actual. No se ha aplicado un descuento por cantidad ni se han cambiado los datos de fabricación.`;
  $('#offerStatus').textContent = status;
  $('#offerStatus').classList.toggle('warning', !o.valid || !o.compatible || o.overBuffer);
  $('#copyOffer').disabled = !o.valid;
  $('#inventoryButton').disabled = !o.valid;
}

if (typeof module !== 'undefined') module.exports = {computeCommercialOffer};
