(function(scope){
  'use strict';
  function mount(root,{onDraft,onUpdatePrices,budgets}={}){
  let linkedProduct=null;
    if (!root || typeof root.querySelector !== 'function') throw new Error('No se encuentra la pantalla de la calculadora.');
    let active=true,analysisVersion=0;
    // Todas las consultas quedan dentro de esta pantalla.
    const document={querySelector:selector=>root.querySelector(selector),getElementById:id=>root.querySelector('#'+id)};
    const computeCommercialOffer=scope.DEV3D_PRICING.computeCommercialOffer;
    const roundSalePrice=scope.DEV3D_PRICING.roundSalePrice;
    const profitProfiles=scope.DEV3D_PROFIT_PROFILES;
    const materialTax=scope.DEV3D_MATERIAL_TAX;
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
    ...(o.shop ? [`PVP recomendado para la reventa de la tienda, con IVA: ${euro.format(o.suggestedPvp)}`] : [])
  ];
}

function renderCommercialOffer() {
  const options = commercialOptions();
  const profileId=profitProfiles.normalize($('#wholesaleProfile').value,options.wholesaleProfit);
  $('#wholesaleProfile').value=profileId;
  $('#wholesaleProfileHint').textContent=profitProfiles.profiles[profileId]?.help||'Escribe el porcentaje que quieras aplicar sobre tu coste. Tu beneficio es independiente del margen de reventa de la tienda.';
  const wholesaleRate=Number(options.wholesaleProfit),validRate=String(options.wholesaleProfit).trim()!==''&&Number.isFinite(wholesaleRate)&&wholesaleRate>=0;
  $('#wholesaleProfitExample').textContent=validRate?`Ejemplo con 10 € de coste total: cobrarías ${euro.format(10*(1+wholesaleRate/100))} antes del IVA de venta y tu beneficio sería ${euro.format(10*wholesaleRate/100)}.`:'Introduce un porcentaje para ver el ejemplo.';
  const o = computeCommercialOffer(state.lastCosts, options);
  state.offer = o;
  $('#fixedFields').classList.toggle('hidden', !o.fixed);
  $('#offerTitle').textContent = `${o.shop ? 'Lo que tú cobras a la tienda' : 'Lo que tú cobras al cliente'}${o.fixed ? ' · precio fijo' : ''}`;
  $('#offerPriceHighlight').classList.toggle('hidden', !o.valid);
  const saleTaxNote=state.lastCosts.vatRate===0?'IVA de venta: 0 %':'IVA incluido';
  $('#offerPriceLabel').textContent = (o.shop?'Tu tarifa mayorista · ':'Tu precio de venta · ')+saleTaxNote;
  $('#offerPriceAmount').textContent = o.valid ? euro.format(o.gross) : '';
  $('#offerPriceTotal').textContent = o.valid ? `Total por ${o.quoteQuantity} unidades: ${euro.format(o.total)} · ${saleTaxNote}` : '';
  const rows = [['Coste total / unidad', euro.format(state.lastCosts.unitCost)],['Tu beneficio / ud. sin IVA', euro.format(o.actualProfit)]];
  if(o.shop)rows.push(['Mínimo para tiendas',options.shopMinimum+' unidades']);
  $('#offerResults').innerHTML = o.valid ? rows.map(([label, amount]) => `<div class="cost-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(amount)}</strong></div>`).join('') : '';
  const technical=[['Tu tarifa / ud. sin IVA',euro.format(o.net)],[`IVA por unidad (${decimal.format(state.lastCosts.vatRate*100)}%)`,euro.format(o.gross-o.net)]];
  if(o.fixed)technical.push(['Coste de referencia con colchón / ud.',euro.format(o.cost)],['Colchón restante sobre el coste actual / ud.',euro.format(o.bufferRemaining)],['Beneficio reservado / ud. sin IVA',euro.format(o.profit)]);
  $('#offerTechnical').innerHTML=o.valid?technical.map(([label,amount])=>`<div class="cost-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(amount)}</strong></div>`).join(''):'';
  $('#shopResaleResult').hidden=!o.shop||!o.valid;
  $('#shopResalePrice').textContent=o.valid?euro.format(o.suggestedPvp):'';
  const resaleMargin=o.suggestedPvp>0?(o.suggestedPvp-o.gross)/o.suggestedPvp:0;
  $('#shopResaleMargin').textContent=`Margen de la tienda con este PVP: ${decimal.format(resaleMargin*100)}%`;
  const differentTarget=Number(options.targetPvp)>0&&Math.abs(o.pvp-o.suggestedPvp)>.005;
  $('#shopResaleTarget').hidden=!differentTarget;$('#shopResaleTarget').textContent=differentTarget?'Con tu PVP objetivo de '+euro.format(o.pvp)+' con IVA, el margen de la tienda sería '+decimal.format(o.actualMargin*100)+'%.':'';
  for(const id of ['wholesaleProfile','wholesaleProfit','shopMargin','targetPvp','shopMinimum'])document.getElementById(id).closest('label').hidden=!o.shop;
  document.getElementById('profitPercent').closest('label').hidden=o.shop;
  let status = o.errors.join(' ');
  if (o.valid) status = !o.compatible
    ? `El PVP objetivo de ${euro.format(o.pvp)} no deja a la tienda el margen solicitado. Con tu tarifa, el PVP recomendado es ${euro.format(o.suggestedPvp)}. Tu precio de cobro no se ha reducido.`
    : '';
  if (o.valid && o.overBuffer) status += ` Esta variante supera el colchón en ${euro.format(-o.bufferRemaining)} por unidad. El precio se mantiene; tu beneficio con el coste actual es ${euro.format(o.actualProfit)} sin IVA por unidad.${o.actualProfit < 0 ? ' Atención: esta variante se vendería con pérdidas.' : ''}`;
  if (o.valid && o.minimumApplied) status += ` El total usa el mínimo de ${o.quoteQuantity} unidades. El precio unitario no tiene descuento por cantidad.`;
  const directOffer=computeCommercialOffer(state.lastCosts,{...options,saleChannel:'direct'}),abovePublic=o.shop&&o.valid&&directOffer.valid&&o.gross>directOffer.gross;
  if(abovePublic)status+=` Tu tarifa mayorista de ${euro.format(o.gross)} por unidad supera tu precio público de ${euro.format(directOffer.gross)}. Revisa el beneficio de venta directa antes de preparar el producto.`;
  $('#offerStatus').textContent = status;
  $('#offerStatus').classList.toggle('warning', !o.valid || !o.compatible || o.overBuffer || abovePublic);
  $('#copyOffer').disabled = !o.valid;
  $('#copyOffer').textContent=o.shop?'Copiar oferta para la tienda':'Copiar oferta para el cliente';
  $('#inventoryButton').disabled = !o.valid;
  $('#updateCatalogButton').disabled = !o.valid || typeof onUpdatePrices !== 'function';
}
const $ = (selector) => document.querySelector(selector);

const STORAGE_KEY = "dev3d-catalogo-costes-v1";
const SETTINGS_DEFAULTS_VERSION = 5;
const fieldIds = [
  "pieceName", "printerName", "quantity", "printDays", "printHours", "printMinutes", "printSeconds",
  "filamentDiameter", "gcodeMaterialType", "gcodeBrand", "gcodeMaterialPrice",
  "gcodeErrorFactor", "printerPowerKw", "electricityPrice", "operatorCount",
  "laborHours", "laborMinutes", "laborSeconds", "laborRate", "machineHourlyCost", "failedPrintPercent", "maintenancePercent", "profitPercent", "vatPercent",
  "partnerMarkupPercent", "saleChannel", "fixedPricing", "wholesaleProfit", "shopMargin",
  "targetPvp", "shopMinimum", "rateName", "referenceCost", "costBuffer"
];

const defaultMaterials = [
  {
    id: "material-1",
    name: "PLA Blanco",
    brand: "ELEGOO",
    nozzle: 0.4,
    layer: 0.2,
    kg: 0.38473,
    unit: "kg",
    factor: 1.05,
    price: 19,
    priceVat: "gross"
  }
];

const defaultAuxiliaryItems = [
  { id: "aux-1", name: "Pegamento", amount: 0.20 }
];
const profileSelect=$('#wholesaleProfile');
profileSelect.replaceChildren(...[['manual','Manual: escribir mi porcentaje'],...Object.entries(profitProfiles.profiles).map(([id,p])=>[id,p.label])].map(([id,label])=>{const option=root.ownerDocument.createElement('option');option.value=id;option.textContent=label;return option;}));
profileSelect.value='profit20';

const defaults = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id).value]));
const state = {
  mode: "manual",
  gcode: null,
  materials: structuredClone(defaultMaterials),
  auxiliaryItems: structuredClone(defaultAuxiliaryItems),
  lastCosts: null,
  toastTimer: null
};

const colors = ["#2869f0", "#ff6b3d", "#f2b72b", "#6e7b91", "#8b5cf6"];
const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const precise = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 5 });

function value(id) {
  const element = document.getElementById(id);
  const number = Number.parseFloat(element?.value);
  return Number.isFinite(number) ? number : 0;
}

function safeNumber(number, fallback = 0) {
  const parsed = Number.parseFloat(number);
  return Number.isFinite(parsed) ? parsed : fallback;
}

let preparingProduct = false, dismissBudgetPrompt = null;
function askToSaveProductBudget() {
  const dialog = $('#saveProductBudgetDialog');
  return new Promise(resolve => {
    let finished = false;
    const finish = choice => {
      if (finished) return;
      finished = true;
      dismissBudgetPrompt = null;
      dialog.close();
      resolve(choice);
    };
    dismissBudgetPrompt = () => finish(null);
    $('#saveProductBudgetYes').onclick = () => finish(true);
    $('#saveProductBudgetNo').onclick = () => finish(false);
    $('#saveProductBudgetCancel').onclick = () => finish(null);
    dialog.oncancel = event => { event.preventDefault(); finish(null); };
    dialog.onclose = () => finish(null);
    dialog.showModal();
    $('#saveProductBudgetYes').focus();
  });
}
async function openProductDraftInInventory(mode) {
  if (preparingProduct) return;
  if (!state.offer?.valid) return showToast("Revisa los avisos de la tarifa comercial");
  const options = commercialOptions();
  const publicOffer = computeCommercialOffer(state.lastCosts, {...options, saleChannel: 'direct'});
  const shopOffer = computeCommercialOffer(state.lastCosts, {...options, saleChannel: 'shop'});
  if (!publicOffer.valid) return showToast('Revisa el precio de venta directa antes de preparar el producto');
  if (!shopOffer.valid) return showToast('Selecciona «Venta a tienda» y revisa su beneficio y mínimo antes de preparar el producto');
  if (!active) return;
  const data = {
    type: 'dev3d:product-draft',
    nombre: $("#pieceName").value.trim() || 'Pieza 3D',
    // Catalog prices always describe one unit. The quote total and the shop's
    // resale PVP belong to the quote, regardless of the selected screen mode.
    precio: publicOffer.gross,
    mayorista: shopOffer.gross,
    minimo: Number(options.shopMinimum),
    descripcion: options.fixedPricing === 'yes' ? 'Precio cerrado para las personalizaciones de este producto.' : ''
  };
  try{data.calculo=captureCalculation();}catch(error){return showToast(error.message);}
  if(mode==='update'&&linkedProduct)data.productId=linkedProduct.id;
  const receiver=mode==='update'&&!linkedProduct?onUpdatePrices:onDraft;
  if (typeof receiver !== 'function') return showToast('No se pudo preparar el producto. Vuelve al panel y abre la calculadora de nuevo.');
  if(mode!=='update' && budgets) {
    preparingProduct = true;
    $('#inventoryButton').disabled = true;
    try {
      const saveBudget = await askToSaveProductBudget();
      if (!active || saveBudget === null) return;
      if (saveBudget) await budgetView.saveForProduct(data.nombre, data.calculo);
    } catch (error) {
      showToast('No se pudo guardar el presupuesto. Revisa la conexi\u00f3n e int\u00e9ntalo de nuevo.');
      return;
    } finally {
      preparingProduct = false;
      $('#inventoryButton').disabled = !state.offer?.valid;
    }
    if (!active) return;
  }
  const accepted = receiver(data);
  if (accepted === false) return;
  showToast('Precios por unidad preparados. El mínimo se aplica solo a tiendas.');
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeHexColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : "";
}

function materialSubtitleHtml(material) {
  const color = normalizeHexColor(material.color);
  return `${color ? `<i class="filament-color-dot" style="--filament-color:${color}"></i>` : ""}${escapeHtml(material.name || "Sin nombre")}${color ? ` · ${color}` : ""}`;
}

function createMaterial(overrides = {}) {
  return {
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "PLA",
    brand: "",
    nozzle: 0.4,
    layer: 0.2,
    kg: 0,
    unit: "kg",
    factor: 1.05,
    price: 19,
    priceVat: "gross",
    ...overrides
  };
}

function materialTaxConfig(){return materialTax.normalize({mode:$('#purchaseVatMode').value,rate:$('#purchaseVatPercent').value});}
function materialAmounts(material){return materialTax.amounts(material,materialTaxConfig(),value('vatPercent'));}
function getNetMaterialPrice(material) {return materialAmounts(material).cost;}
function materialPriceHint(material){
  const amount=materialAmounts(material);
  if(!amount.deduct)return `Coste usado: ${euro.format(amount.cost)}/kg. Se mantiene el importe introducido.`;
  return amount.removed?`Coste sin IVA de compra: ${euro.format(amount.cost)}/kg (descontado ${decimal.format(amount.rate)} %).`:`Coste usado: ${euro.format(amount.cost)}/kg. El precio ya está indicado sin IVA.`;
}

function createAuxiliaryItem(name, amount) {
  return {
    id: `aux-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: String(name || "Otro concepto").trim(),
    amount: Math.max(0, safeNumber(amount))
  };
}

function getPrintHours() {
  return value("printDays") * 24 + value("printHours") + value("printMinutes") / 60 + value("printSeconds") / 3600;
}

function getLaborHours() {
  return value("laborHours") + value("laborMinutes") / 60 + value("laborSeconds") / 3600;
}

function setLaborTimeInputs(totalSeconds) {
  const rounded = Math.max(0, Math.round(totalSeconds));
  $("#laborHours").value = Math.floor(rounded / 3600);
  $("#laborMinutes").value = Math.floor((rounded % 3600) / 60);
  $("#laborSeconds").value = rounded % 60;
}

function getAuxiliaryCosts() {
  return state.auxiliaryItems.map((item) => [item.name, Math.max(0, safeNumber(item.amount))]);
}

function renderMaterialRows() {
  const container = $("#materialRows");
  if (!state.materials.length) {
    container.innerHTML = `
      <div class="empty-materials">
        Todavía no hay filamentos. Añade uno o sube un G-code.
      </div>`;
    return;
  }

  container.innerHTML = state.materials.map((material, index) => {
    const netPrice = getNetMaterialPrice(material);
    const netTotal = safeNumber(material.kg) * safeNumber(material.factor, 1) * netPrice;
    const grossTotal = safeNumber(material.kg) * safeNumber(material.factor,1) * materialAmounts(material).reference;
    const unit = material.unit === "g" ? "g" : "kg";
    const displayedWeight = unit === "g"
      ? Number((safeNumber(material.kg) * 1000).toFixed(3))
      : Number(safeNumber(material.kg).toFixed(6));
    return `
      <article class="material-row" data-material-id="${material.id}">
        <header class="material-row-header">
          <div class="material-row-title">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>Filamento ${index + 1}</strong>
              <small>${materialSubtitleHtml(material)}</small>
            </div>
          </div>
          <div class="material-row-actions">
            <div class="material-result">
              <div class="material-result-line">
                <span>COSTE UTILIZADO</span>
                <strong data-material-net>${euro.format(netTotal)}</strong>
              </div>
              <div class="material-result-line">
                <span>REFERENCIA DE COMPRA</span>
                <strong data-material-gross>${euro.format(grossTotal)}</strong>
              </div>
            </div>
            <button class="remove-material" type="button" data-remove-material="${material.id}" aria-label="Eliminar ${escapeHtml(material.name)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 10v7m4-7v7"/></svg>
            </button>
          </div>
        </header>
        <div class="material-fields">
          <label class="field material-field-name">
            <span>Material</span>
            <input data-field="name" type="text" value="${escapeHtml(material.name)}" placeholder="Ej. PLA Blanco">
          </label>
          <label class="field material-field-brand">
            <span>Marca o perfil</span>
            <input data-field="brand" type="text" value="${escapeHtml(material.brand)}" placeholder="Ej. ELEGOO">
          </label>
          <label class="field material-field-weight">
            <span>Cantidad usada</span>
            <div class="weight-control">
              <input data-field="weight" type="number" value="${displayedWeight}" min="0" step="${unit === "g" ? "0.1" : "0.00001"}">
              <select data-field="unit" aria-label="Unidad del material">
                <option value="g" ${unit === "g" ? "selected" : ""}>g</option>
                <option value="kg" ${unit === "kg" ? "selected" : ""}>kg</option>
              </select>
            </div>
          </label>
          <label class="field material-field-nozzle">
            <span>Boquilla</span>
            <div class="input-suffix"><input data-field="nozzle" type="number" value="${material.nozzle}" min="0.1" step="0.1"><b>mm</b></div>
          </label>
          <label class="field material-field-layer">
            <span>Altura de capa</span>
            <div class="input-suffix"><input data-field="layer" type="number" value="${material.layer}" min="0.01" step="0.01"><b>mm</b></div>
          </label>
          <label class="field material-field-factor">
            <span>Factor de error</span>
            <input data-field="factor" type="number" value="${material.factor}" min="1" step="0.01">
          </label>
          <label class="field material-field-price">
            <span class="material-price-label">${materialAmounts(material).deduct?'Precio por kg':'Precio de compra por kg'}</span>
            <div class="price-vat-control ${materialAmounts(material).deduct?'':'single-price'}">
              <input data-field="price" type="number" value="${material.price}" min="0" step="0.01">
              <select data-field="priceVat" aria-label="IVA del precio de ${escapeHtml(material.name)}" ${materialAmounts(material).deduct?'':'hidden'}>
                <option value="net" ${material.priceVat !== "gross" ? "selected" : ""}>Sin IVA</option>
                <option value="gross" ${material.priceVat === "gross" ? "selected" : ""}>Con IVA</option>
              </select>
            </div>
            <small class="net-price-hint">${materialPriceHint(material)}</small>
          </label>
        </div>
      </article>`;
  }).join("");
}

function updateMaterialCalculatedDisplays() {
  state.materials.forEach((material) => {
    const row = document.querySelector(`[data-material-id="${material.id}"]`);
    if (!row) return;
    const netPrice = getNetMaterialPrice(material);
    const netTotal = safeNumber(material.kg) * safeNumber(material.factor, 1) * netPrice;
    const grossTotal = safeNumber(material.kg)*safeNumber(material.factor,1)*materialAmounts(material).reference;
    const netResult = row.querySelector("[data-material-net]");
    const grossResult = row.querySelector("[data-material-gross]");
    const hint = row.querySelector(".net-price-hint");
    const showTaxBasis=materialAmounts(material).deduct;
    row.querySelector('[data-field="priceVat"]').hidden=!showTaxBasis;
    row.querySelector('.price-vat-control').classList.toggle('single-price',!showTaxBasis);
    row.querySelector('.material-price-label').textContent=showTaxBasis?'Precio por kg':'Precio de compra por kg';
    if (netResult) netResult.textContent = euro.format(netTotal);
    if (grossResult) grossResult.textContent = euro.format(grossTotal);
    if (hint) hint.textContent = materialPriceHint(material);
  });
}

function renderAuxiliaryItems() {
  const container = $("#auxItemsList");
  if (!state.auxiliaryItems.length) {
    container.innerHTML = `<div class="empty-aux-items">No has añadido ningún acabado o material auxiliar.</div>`;
    return;
  }

  container.innerHTML = state.auxiliaryItems.map((item) => `
    <div class="aux-item" data-aux-id="${item.id}">
      <span class="aux-item-index">${String(state.auxiliaryItems.indexOf(item) + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <div class="input-suffix">
        <input data-aux-amount type="number" value="${safeNumber(item.amount)}" min="0" step="0.01" aria-label="Coste de ${escapeHtml(item.name)}">
        <b>€</b>
      </div>
      <button class="remove-aux" type="button" data-remove-aux="${item.id}" aria-label="Eliminar ${escapeHtml(item.name)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 10v7m4-7v7"/></svg>
      </button>
    </div>`).join("");
}

function calculate() {
  const hours = Math.max(0, getPrintHours());
  const quantity = Math.max(1, Math.round(value("quantity")));
  const vatRate = Math.max(0, value("vatPercent")) / 100;
  const material = state.materials.reduce((sum, item) => {
    return sum + Math.max(0, safeNumber(item.kg)) * Math.max(1, safeNumber(item.factor, 1)) * getNetMaterialPrice(item);
  }, 0);
  const materialGross = state.materials.reduce((sum,item)=>sum+Math.max(0,safeNumber(item.kg))*Math.max(1,safeNumber(item.factor,1))*materialAmounts(item).reference,0);
  const totalKg = state.materials.reduce((sum, item) => sum + Math.max(0, safeNumber(item.kg)), 0);
  const electricity = hours * Math.max(0, value("printerPowerKw")) * Math.max(0, value("electricityPrice"));
  const laborTimeHours = Math.max(0, getLaborHours());
  const labor = Math.max(0, value("operatorCount")) * laborTimeHours * Math.max(0, value("laborRate"));
  const auxiliaryItems = getAuxiliaryCosts();
  const auxiliaries = auxiliaryItems.reduce((sum, [, amount]) => sum + Math.max(0, amount), 0);
  const directCost = material + electricity + labor + auxiliaries;
  const maintenanceRate = Math.max(0, value("maintenancePercent")) / 100;
  const maintenance = directCost * maintenanceRate;
  const depreciation = $("#includeDepreciation").checked ? hours * Math.max(0, value("machineHourlyCost")) : 0;
  const productionCost = directCost + maintenance + depreciation;
  const reprintCost = material + electricity + depreciation;
  const failureReserve = reprintCost * Math.max(0, value("failedPrintPercent")) / 100;
  const costBase = productionCost + failureReserve;
  const profitRate = Math.max(0, value("profitPercent")) / 100;
  const profit = costBase * profitRate;
  const beforeVat = costBase + profit;
  const vat = beforeVat * vatRate;
  const finalPrice = beforeVat + vat;
  const unitFinal = finalPrice / quantity;
  const unitRecommended = roundSalePrice(unitFinal);
  const recommendedFinal = unitRecommended * quantity;
  const partnerMarkupRate = Math.max(0, value("partnerMarkupPercent")) / 100;
  const partnerUnitCalculated = unitRecommended * (1 + partnerMarkupRate);
  const partnerUnitRecommended = roundSalePrice(partnerUnitCalculated);
  const partnerRecommendedFinal = partnerUnitRecommended * quantity;

  state.lastCosts = {
    hours, quantity, material, materialGross, totalKg, electricity, laborTimeHours, labor, auxiliaryItems,
    auxiliaries, directCost, maintenanceRate, maintenance, depreciation, failureReserve, costBase, profitRate, profit, beforeVat,
    vatRate, vat, finalPrice, recommendedFinal,
    unitCost: costBase / quantity,
    unitProfit: profit / quantity,
    unitBeforeVat: beforeVat / quantity,
    unitVat: vat / quantity,
    unitFinal,
    unitRecommended, partnerMarkupRate, partnerUnitCalculated, partnerUnitRecommended, partnerRecommendedFinal,
    unitRounding: unitRecommended - unitFinal
  };

  renderResults();
  renderCommercialOffer();
  saveSettings();
}

function renderResults() {
  const c = state.lastCosts;
  updateMaterialCalculatedDisplays();
  $("#materialTotalPreview").textContent = euro.format(c.material);
  $("#materialGrossTotalPreview").textContent = euro.format(c.materialGross);
  const tax=materialTaxConfig(),deduct=materialTax.amounts({price:0},tax,value('vatPercent')).deduct;
  $('#purchaseVatPercent').closest('label').hidden=!deduct;
  $('#materialTaxHint').textContent=deduct?`Se descuenta el ${decimal.format(tax.rate)} % de IVA de compra a los filamentos marcados «Con IVA». Los marcados «Sin IVA» se usan directamente.`:'Se usa el precio de cada filamento tal como lo introduces, sin descontar IVA de compra.';
  $("#materialGrossHint").textContent=deduct?`Referencia de compra con IVA del ${decimal.format(tax.rate)} %`:'Importes introducidos, sin conversiones de IVA';
  $("#electricityDurationPreview").textContent = formatDuration(c.hours * 3600);
  $("#electricityKwhPreview").textContent = `${decimal.format(c.hours * value("printerPowerKw"))} kWh`;
  $("#electricityTotalPreview").textContent = euro.format(c.electricity);
  $("#laborDurationPreview").textContent = formatDuration(c.laborTimeHours * 3600);
  $("#laborTotalPreview").textContent = euro.format(c.labor);
  $("#auxTotalPreview").textContent = euro.format(c.auxiliaries);

  $("#recommendedPrice").textContent = euro.format(c.unitRecommended);
  $("#perUnitLabel").textContent = c.quantity > 1 ? "por unidad" : "pieza";
  $("#totalLabel").textContent = c.quantity > 1
    ? `Precio calculado: ${euro.format(c.unitFinal)}/ud. · Total recomendado (${c.quantity} uds.): ${euro.format(c.recommendedFinal)}`
    : `Precio calculado: ${euro.format(c.unitFinal)} · Ajuste: +${euro.format(c.unitRounding)}`;
  $("#partnerPrice").textContent = euro.format(c.partnerUnitRecommended);
  $("#partnerMarkupLabel").textContent = `Precio base +${decimal.format(c.partnerMarkupRate * 100)}%`;
  $("#partnerTotalLabel").textContent = c.quantity > 1
    ? `por unidad · Total (${c.quantity} uds.): ${euro.format(c.partnerRecommendedFinal)}`
    : "por pieza";
  $("#realCost").textContent = euro.format(c.unitCost);
  $("#profitValue").textContent = euro.format(c.unitProfit);
  $("#vatValue").textContent = euro.format(c.unitVat);
  $("#donutTotal").textContent = euro.format(c.unitCost);
  $("#costPerHour").textContent = c.hours > 0 ? `${euro.format(c.costBase / c.hours)}/h` : "— €/h";

  const parts = [
    { label: "Material", value: c.material / c.quantity, color: colors[0] },
    { label: "Electricidad", value: c.electricity / c.quantity, color: colors[1] },
    { label: "Operarios", value: c.labor / c.quantity, color: colors[2] },
    { label: "Mat. auxiliares", value: c.auxiliaries / c.quantity, color: colors[3] },
    { label: `Mantenimiento (${decimal.format(c.maintenanceRate * 100)}%)`, value: c.maintenance / c.quantity, color: colors[4] },
    { label: "Amortización", value: c.depreciation / c.quantity, color: "#087e85" },
    { label: "Reserva para piezas fallidas", value: c.failureReserve / c.quantity, color: "#ac4869" }
  ];
  const visibleParts = parts.filter((part) => part.value > 0);
  const total = visibleParts.reduce((sum, part) => sum + part.value, 0);
  let cursor = 0;
  const gradient = visibleParts.map((part) => {
    const start = cursor;
    cursor += total > 0 ? part.value / total * 100 : 0;
    return `${part.color} ${start}% ${cursor}%`;
  }).join(", ");
  $("#costDonut").style.background = total > 0
    ? `conic-gradient(${gradient})`
    : "conic-gradient(#e7ebf1 0 100%)";

  $("#costLegend").innerHTML = visibleParts.map((part) => `
    <div class="legend-row">
      <i class="legend-dot" style="background:${part.color}"></i>
      <span>${part.label}</span>
      <b>${total > 0 ? Math.round(part.value / total * 100) : 0}%</b>
    </div>`).join("");

  $("#costLines").innerHTML = [
    ...parts.map((part) => `
      <div class="cost-line">
        <span>${part.label} / ud.</span>
        <strong>${euro.format(part.value)}</strong>
      </div>`),
    `<div class="cost-line total"><span>Coste total / unidad</span><strong>${euro.format(c.unitCost)}</strong></div>`
  ].join("");

  const biggest = parts.reduce((max, part) => part.value > max.value ? part : max, parts[0]);
  let tip = `El mayor coste es ${biggest.label.toLowerCase()}.`;
  if (c.hours <= 0) tip = "Añade las horas de impresión para calcular el consumo eléctrico.";
  else if (c.material <= 0) tip = "Añade al menos un filamento con kilos usados y precio por kilo.";
  else if (biggest.label === "Material") tip += " Revisa los soportes y el factor de error de cada bobina.";
  else if (biggest.label === "Operarios") tip += " Agrupar acabados de varias unidades puede reducir el coste por pieza.";
  else if (biggest.label === "Electricidad") tip += " Comprueba que la potencia introducida sea la media real, no la potencia máxima.";
  else tip += " Ajustarlo tendrá el mayor impacto en el precio final.";
  $("#tipText").textContent = tip;
}

function switchMode(mode) {
  state.mode = mode;
  const manual = mode === "manual";
  $("#manualTab").classList.toggle("active", manual);
  $("#gcodeTab").classList.toggle("active", !manual);
  $("#manualTab").setAttribute("aria-selected", String(manual));
  $("#gcodeTab").setAttribute("aria-selected", String(!manual));
  $("#manualPanel").classList.toggle("hidden", !manual);
  $("#gcodePanel").classList.toggle("hidden", manual);
  calculate();
}

function saveSettings() {
  if (!active) return;
  try {
    const values = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id).value]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      defaultsVersion: SETTINGS_DEFAULTS_VERSION,
      includeDepreciation: Boolean($("#includeDepreciation").checked),
      values,
      materials: state.materials,
      auxiliaryItems: state.auxiliaryItems,
      mode: state.mode,
      wholesaleProfile:profitProfiles.normalize($('#wholesaleProfile').value,values.wholesaleProfit),
      materialTax:materialTaxConfig()
    }));
  } catch (_) {
    // La aplicación sigue funcionando si el almacenamiento local está bloqueado.
  }
}

function loadSettings(snapshot) {
  try {
    const saved = snapshot || JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.values) return;
    setDepreciationEnabled(saved.includeDepreciation ?? (Number(saved.values.machineHourlyCost) > 0));
    fieldIds.forEach((id) => {
      if (saved.values[id] !== undefined) document.getElementById(id).value = saved.values[id];
    });
    if(String(saved.values.wholesaleProfit??'').trim()==='')$('#wholesaleProfit').value=defaults.wholesaleProfit;
    $('#wholesaleProfile').value=profitProfiles.normalize(saved.wholesaleProfile,$('#wholesaleProfit').value);
    const tax=materialTax.normalize(saved.materialTax||materialTax.legacy(saved.values.vatPercent));$('#purchaseVatMode').value=tax.mode;$('#purchaseVatPercent').value=String(tax.rate);
    if (saved.defaultsVersion !== SETTINGS_DEFAULTS_VERSION && String(saved.values.maintenancePercent) === "8") {
      $("#maintenancePercent").value = defaults.maintenancePercent;
    }
    if (saved.defaultsVersion !== SETTINGS_DEFAULTS_VERSION && String(saved.values.profitPercent) === "20") {
      $("#profitPercent").value = defaults.profitPercent;
    }
    setTimeInputs(getPrintHours() * 3600);
    const legacyLaborTime = saved.values.laborMinutes === undefined && saved.values.laborSeconds === undefined;
    if (legacyLaborTime) {
      setLaborTimeInputs(safeNumber(saved.values.laborHours) * 3600);
    } else {
      setLaborTimeInputs(getLaborHours() * 3600);
    }
    if (Array.isArray(saved.materials)) {
      state.materials = saved.materials.map((material) => createMaterial({...material,priceVat:material.priceVat==='gross'?'gross':'net'}));
    }
    if (Array.isArray(saved.auxiliaryItems)) {
      state.auxiliaryItems = saved.auxiliaryItems.map((item) => createAuxiliaryItem(item.name, item.amount));
    } else {
      const legacyAuxiliaries = [
        ["Pintura", saved.values.auxPaint],
        ["Masilla", saved.values.auxPutty],
        ["Tira LED / electrónica", saved.values.auxLed],
        ["Otra impresión", saved.values.auxPrint],
        ["Packaging", saved.values.auxPackaging],
        ["Pegamento", saved.values.auxGlue],
        ["Otros materiales", saved.values.auxOther]
      ].filter(([, amount]) => safeNumber(amount) > 0);
      if (legacyAuxiliaries.length) {
        state.auxiliaryItems = legacyAuxiliaries.map(([name, amount]) => createAuxiliaryItem(name, amount));
      }
    }
    state.mode = saved.mode === "gcode" ? "gcode" : "manual";
  } catch (_) {
    // Ignora configuraciones antiguas o dañadas.
  }
}

function showToast(message) {
  if (!active) return;
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "No detectado";
  const rounded = Math.round(seconds);
  const days = Math.floor(rounded / 86400);
  const hours = Math.floor((rounded % 86400) / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  const parts = [];
  if (days) parts.push(`${days} ${days === 1 ? "día" : "días"}`);
  if (hours || days) parts.push(`${hours} h`);
  if (minutes || hours || days) parts.push(`${minutes} min`);
  if (secs || !parts.length) parts.push(`${secs} s`);
  return parts.join(" ");
}

function setTimeInputs(totalSeconds) {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const parts = {
    Days: Math.floor(rounded / 86400),
    Hours: Math.floor((rounded % 86400) / 3600),
    Minutes: Math.floor((rounded % 3600) / 60),
    Seconds: rounded % 60
  };
  Object.entries(parts).forEach(([part, amount]) => {
    $(`#print${part}`).value = amount;
    $(`#gcodePrint${part}`).value = amount;
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function durationStringToSeconds(text) {
  const normalized = text.toLowerCase().replace(/(\d),(\d)/g, "$1.$2");
  let seconds = 0;
  const days = normalized.match(/([\d.]+)\s*d(?:ays?|ías?)?/);
  const hours = normalized.match(/([\d.]+)\s*h(?:ours?|oras?)?/);
  const minutes = normalized.match(/([\d.]+)\s*m(?:in(?:utes?|utos?)?)?/);
  const secs = normalized.match(/([\d.]+)\s*s(?:ec(?:onds?|undos?)?)?/);
  if (days) seconds += Number(days[1]) * 86400;
  if (hours) seconds += Number(hours[1]) * 3600;
  if (minutes) seconds += Number(minutes[1]) * 60;
  if (secs) seconds += Number(secs[1]);
  if (seconds === 0 && /^\s*[\d.]+\s*$/.test(normalized)) seconds = Number(normalized);
  return seconds;
}

function firstNumber(text) {
  const match = String(text).replace(",", ".").match(/-?[\d.]+/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function sumNumberList(text) {
  const raw = String(text).trim();
  if (/^-?\d+,\d+\s*(?:g|mm)?$/i.test(raw)) return Number(raw.replace(",", ".").replace(/[^\d.-]/g, ""));
  const matches = raw.match(/-?\d+(?:\.\d+)?/g);
  if (!matches?.length) return firstNumber(raw);
  return matches.reduce((sum, number) => sum + Number(number), 0);
}

function commentValue(text, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`;\\s*${escapedKey}\\s*=\\s*([^\\r\\n]+)`, "i"));
  return match ? match[1].trim() : "";
}

function parseNumericValues(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];
  const segments = raw.includes(";") ? raw.split(";") : raw.split(",");
  return segments
    .flatMap((segment) => segment.match(/-?\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter(Number.isFinite);
}

function parseTextValues(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];
  const quoted = [...raw.matchAll(/"([^"]*)"|'([^']*)'/g)].map((match) => (match[1] ?? match[2]).trim());
  if (quoted.length) return quoted;
  return raw.split(/\s*;\s*/).map((value) => value.trim()).filter(Boolean);
}

function cleanProfileName(settingsId) {
  return String(settingsId || "").replace(/\s*@.*$/i, "").replace(/^"|"$/g, "").trim();
}

function parseFilamentBreakdown(text, profiles = []) {
  let weightRaw = commentValue(text, "filament used [g]");
  if (!weightRaw) weightRaw = commentValue(text, "total filament used [g]");
  const weights = parseNumericValues(weightRaw);
  if (!weights.length) return [];

  const types = parseTextValues(commentValue(text, "filament_type"));
  const settingsIds = parseTextValues(commentValue(text, "filament_settings_id"));
  const vendors = parseTextValues(commentValue(text, "filament_vendor"));
  const totalCosts = parseNumericValues(commentValue(text, "filament cost"));
  const nozzleValues = parseNumericValues(commentValue(text, "nozzle_diameter"));
  const layerValues = parseNumericValues(commentValue(text, "layer_height"));

  return weights.map((grams, index) => {
    const profile = profiles[index] || {};
    const type = types[index] || profile.type || "";
    const settingsId = settingsIds[index] || profile.settingsId || "";
    const profileLabel = cleanProfileName(settingsId);
    const vendor = vendors[index] || profile.vendor || "";
    const inferredPrice = totalCosts.length === weights.length && grams > 0 && totalCosts[index] > 0
      ? totalCosts[index] / (grams / 1000)
      : 0;
    return {
      index,
      grams: Math.max(0, grams),
      name: type || profileLabel || `Filamento ${index + 1}`,
      brand: vendor || (profileLabel && profileLabel !== type ? profileLabel : ""),
      settingsId,
      price: Math.max(0, safeNumber(profile.price) || inferredPrice),
      nozzle: safeNumber(nozzleValues[index] ?? nozzleValues[0] ?? profile.nozzle, 0.4),
      layer: safeNumber(layerValues[index] ?? layerValues[0] ?? profile.layer, 0.2)
    };
  }).filter((filament) => filament.grams > 0);
}

function parseMetadata(text) {
  let grams = 0;
  let lengthMm = 0;
  let seconds = 0;

  const gramPatterns = [
    /;\s*(?:total\s+)?filament\s+(?:used|weight)[^\r\n]*?\[g\]\s*[:=]\s*([^\r\n]+)/ig,
    /;\s*(?:total\s+)?filament\s+weight\s*[:=]\s*([^\r\n]+)/ig,
    /;\s*filament_used_g\s*[:=]\s*([^\r\n]+)/ig
  ];
  for (const pattern of gramPatterns) {
    const values = [...text.matchAll(pattern)].map((match) => sumNumberList(match[1])).filter((number) => number > 0);
    if (values.length) {
      grams = Math.max(...values);
      break;
    }
  }

  const lengthPatterns = [
    /;\s*(?:total\s+)?filament\s+(?:used|length)[^\r\n]*?\[mm\]\s*[:=]\s*([^\r\n]+)/ig,
    /;\s*filament\s+used\s*[:=]\s*([\d.,]+)\s*m(?:eters?)?\b/ig
  ];
  for (const pattern of lengthPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (!matches.length) continue;
    const values = matches.map((match) => {
      const number = /\[mm\]/i.test(match[0]) ? sumNumberList(match[1]) : firstNumber(match[1]);
      return /\s+m(?:eters?)?\b/i.test(match[0]) && !/\[mm\]/i.test(match[0]) ? number * 1000 : number;
    }).filter((number) => number > 0);
    if (values.length) {
      lengthMm = Math.max(...values);
      break;
    }
  }

  const durationPatterns = [
    /;\s*print_time\s*[:=]\s*([^\r\n]+)/ig,
    /;\s*estimated printing time\s*\(normal mode\)\s*=\s*([^\r\n]+)/ig,
    /;\s*(?:total estimated time|model printing time|estimated print time)\s*[:=]\s*([^\r\n]+)/ig,
    /;\s*estimated printing time[^\r\n]*?=\s*([^\r\n]+)/ig
  ];
  for (const pattern of durationPatterns) {
    const values = [...text.matchAll(pattern)]
      .map((match) => durationStringToSeconds(match[1]))
      .filter((value) => value > 0);
    if (!values.length) continue;
    seconds = values.at(-1);
    break;
  }
  if (!(seconds > 0)) {
    const numericTimes = [...text.matchAll(/;\s*TIME\s*:\s*([\d.]+)/ig)]
      .map((match) => Number(match[1]))
      .filter((value) => value > 0);
    if (numericTimes.length) seconds = numericTimes.at(-1);
  }
  return { grams, lengthMm, seconds };
}

function readAxes(line) {
  const values = {};
  for (const match of line.matchAll(/(?:^|\s)([XYZEFPS])\s*(-?(?:\d+\.?\d*|\.\d+))/ig)) {
    values[match[1].toUpperCase()] = Number(match[2]);
  }
  return values;
}

function parseMoves(text) {
  const lines = text.split(/\r?\n/);
  let absolutePosition = true;
  let absoluteExtrusion = true;
  let x = 0, y = 0, z = 0, e = 0, feed = 1800;
  let extrusionMm = 0;
  let moveSeconds = 0;
  let dwellSeconds = 0;

  for (const rawLine of lines) {
    const line = rawLine.split(";")[0].trim();
    if (!line) continue;
    if (/^G90(?:\s|$)/i.test(line)) { absolutePosition = true; continue; }
    if (/^G91(?:\s|$)/i.test(line)) { absolutePosition = false; continue; }
    if (/^M82(?:\s|$)/i.test(line)) { absoluteExtrusion = true; continue; }
    if (/^M83(?:\s|$)/i.test(line)) { absoluteExtrusion = false; continue; }
    if (/^G92(?:\s|$)/i.test(line)) {
      const values = readAxes(line);
      if (values.X !== undefined) x = values.X;
      if (values.Y !== undefined) y = values.Y;
      if (values.Z !== undefined) z = values.Z;
      if (values.E !== undefined) e = values.E;
      continue;
    }
    if (/^G4(?:\s|$)/i.test(line)) {
      const values = readAxes(line);
      dwellSeconds += values.P !== undefined ? values.P / 1000 : (values.S || 0);
      continue;
    }
    if (!/^G0?1(?:\s|$)/i.test(line)) continue;

    const values = readAxes(line);
    if (values.F !== undefined && values.F > 0) feed = values.F;
    const nextX = values.X === undefined ? x : (absolutePosition ? values.X : x + values.X);
    const nextY = values.Y === undefined ? y : (absolutePosition ? values.Y : y + values.Y);
    const nextZ = values.Z === undefined ? z : (absolutePosition ? values.Z : z + values.Z);
    const nextE = values.E === undefined ? e : (absoluteExtrusion ? values.E : e + values.E);
    const deltaE = nextE - e;
    if (deltaE > 0) extrusionMm += deltaE;

    const distance = Math.hypot(nextX - x, nextY - y, nextZ - z);
    if (distance > 0 && feed > 0) moveSeconds += distance / feed * 60;
    else if (deltaE > 0 && feed > 0) moveSeconds += deltaE / feed * 60;
    x = nextX; y = nextY; z = nextZ; e = nextE;
  }
  return { extrusionMm, seconds: moveSeconds + dwellSeconds };
}

function gramsFromLength(lengthMm) {
  const diameter = value("filamentDiameter");
  const density = value("gcodeMaterialType");
  return Math.PI * (diameter / 2) ** 2 * lengthMm / 1000 * density;
}

function syncGcodeMaterial(preserveTaxBasis=true) {
  if (!state.gcode) return;
  const taxBasis=new Map(preserveTaxBasis?state.materials.map(material=>[material.id,material.priceVat]):[]);
  const selected = $("#gcodeMaterialType").selectedOptions[0];
  const fallbackName = selected?.dataset.material || "Filamento G-code";
  const fallbackBrand = $("#gcodeBrand").value.trim();
  const fallbackPrice = Math.max(0, value("gcodeMaterialPrice"));
  const factor = Math.max(1, value("gcodeErrorFactor"));
  const breakdown = state.gcode.filaments?.filter((filament) => filament.grams > 0) || [];

  if (breakdown.length) {
    state.materials = breakdown.map((filament, index) => createMaterial({
      id: `gcode-filament-${filament.index ?? index}`,
      name: filament.name || fallbackName,
      brand: filament.brand || fallbackBrand,
      nozzle: filament.nozzle || 0.4,
      layer: filament.layer || 0.2,
      kg: filament.grams / 1000,
      unit: "g",
      factor,
      price: filament.price > 0 ? filament.price : fallbackPrice,
      priceVat: taxBasis.get(`gcode-filament-${filament.index ?? index}`)||'gross',
      color: filament.color || ""
    }));
  } else {
    state.materials = [createMaterial({
      id: "gcode-filament-0",
      name: fallbackName,
      brand: fallbackBrand,
      kg: state.gcode.grams / 1000,
      unit: "g",
      factor,
      price: fallbackPrice,
      priceVat: taxBasis.get('gcode-filament-0')||'gross'
    })];
  }
  renderMaterialRows();
  calculate();
}

function analyzeGcodeText(text, profiles = []) {
  const metadata = parseMetadata(text);
  const needMoves = !(metadata.grams > 0 && metadata.seconds > 0);
  const moves = needMoves ? parseMoves(text) : { extrusionMm: 0, seconds: 0 };
  const lengthMm = metadata.lengthMm || moves.extrusionMm;
  const filaments = parseFilamentBreakdown(text, profiles);
  return {
    grams: metadata.grams || gramsFromLength(lengthMm),
    seconds: metadata.seconds || moves.seconds,
    lengthMm,
    gramEstimated: !metadata.grams,
    timeEstimated: !metadata.seconds,
    filaments
  };
}

function listZipEntries(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder("utf-8");
  const minimumOffset = Math.max(0, view.byteLength - 65557);
  let eocdOffset = -1;

  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("El archivo 3MF no contiene una estructura ZIP válida.");

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries = [];

  for (let index = 0; index < entryCount; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error("No se pudo localizar el contenido de una placa del 3MF.");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    entries.push({ name, method, compressedSize, uncompressedSize, dataOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function extractZipText(arrayBuffer, entry) {
  const compressed = new Uint8Array(arrayBuffer, entry.dataOffset, entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(compressed);
  if (entry.method !== 8) throw new Error(`El 3MF usa una compresión no compatible (${entry.method}).`);
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Este navegador no puede descomprimir 3MF. Utiliza una versión reciente de Chrome o Edge.");
  }

  try {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const decompressed = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch (_) {
    throw new Error("No se pudo descomprimir una de las placas del archivo 3MF.");
  }
}

function configValues(config, key) {
  const raw = config?.[key];
  if (Array.isArray(raw)) return raw;
  if (raw === undefined || raw === null) return [];
  return [raw];
}

async function read3mfFilamentProfiles(arrayBuffer, entries) {
  const configEntry = entries.find((entry) => /(?:^|[\\/])project_settings\.config$/i.test(entry.name));
  if (!configEntry) return [];
  try {
    const config = JSON.parse(await extractZipText(arrayBuffer, configEntry));
    const types = configValues(config, "filament_type");
    const settingsIds = configValues(config, "filament_settings_id");
    const vendors = configValues(config, "filament_vendor");
    const prices = configValues(config, "filament_cost");
    const nozzles = configValues(config, "nozzle_diameter");
    const layerValues = configValues(config, "layer_height");
    const count = Math.max(types.length, settingsIds.length, vendors.length, prices.length);
    return Array.from({ length: count }, (_, index) => ({
      type: String(types[index] ?? ""),
      settingsId: String(settingsIds[index] ?? ""),
      vendor: String(vendors[index] ?? ""),
      price: Math.max(0, safeNumber(prices[index])),
      nozzle: safeNumber(nozzles[index] ?? nozzles[0], 0.4),
      layer: safeNumber(layerValues[index] ?? layerValues[0], 0.2)
    }));
  } catch (_) {
    return [];
  }
}

function parseSliceInfoData(xmlText, profiles = []) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) return { filaments: [], seconds: 0 };

  const totals = new Map();
  const allNodes = [...xml.getElementsByTagName("*")];
  const filamentNodes = allNodes.filter((node) => node.localName === "filament");
  const seconds = allNodes
    .filter((node) => node.localName === "metadata" && node.getAttribute("key") === "prediction")
    .reduce((sum, node) => sum + Math.max(0, safeNumber(node.getAttribute("value"))), 0);

  filamentNodes.forEach((node, fallbackIndex) => {
    const grams = Math.max(0, safeNumber(node.getAttribute("used_g")));
    const rawSlotId = Number.parseInt(node.getAttribute("id"), 10);
    if (!(grams > 0) || rawSlotId === 255) return;

    // slice_info usa IDs de filamento empezando en 1; project_settings usa arrays desde 0.
    const profileIndex = Number.isFinite(rawSlotId) && rawSlotId > 0
      ? rawSlotId - 1
      : fallbackIndex;
    const profile = profiles[profileIndex] || {};
    const profileLabel = cleanProfileName(profile.settingsId);
    const type = node.getAttribute("type") || profile.type || "";
    const filament = {
      index: profileIndex,
      slotId: Number.isFinite(rawSlotId) ? rawSlotId : profileIndex + 1,
      grams,
      name: profileLabel || type || `Filamento ${profileIndex + 1}`,
      brand: profile.vendor || "",
      color: node.getAttribute("color") || "",
      settingsId: profile.settingsId || "",
      price: Math.max(0, safeNumber(profile.price)),
      nozzle: safeNumber(node.getAttribute("nozzle_diameter") || profile.nozzle, 0.4),
      layer: safeNumber(profile.layer, 0.2)
    };

    const current = totals.get(profileIndex);
    if (current) {
      current.grams += grams;
    } else {
      totals.set(profileIndex, filament);
    }
  });

  return {
    filaments: [...totals.values()].sort((a, b) => a.index - b.index),
    seconds
  };
}

function parseSliceInfoFilaments(xmlText, profiles = []) {
  return parseSliceInfoData(xmlText, profiles).filaments;
}

async function read3mfSliceInfo(arrayBuffer, entries, profiles) {
  const sliceInfoEntry = entries.find((entry) => /(?:^|[\\/])slice_info\.config$/i.test(entry.name));
  if (!sliceInfoEntry) return { filaments: [], seconds: 0 };
  try {
    return parseSliceInfoData(await extractZipText(arrayBuffer, sliceInfoEntry), profiles);
  } catch (_) {
    return { filaments: [], seconds: 0 };
  }
}

async function analyze3mf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const entries = listZipEntries(arrayBuffer);
  const profiles = await read3mfFilamentProfiles(arrayBuffer, entries);
  const sliceInfo = await read3mfSliceInfo(arrayBuffer, entries, profiles);
  const plateEntries = entries
    .filter((entry) => /\.gcode$/i.test(entry.name) && !entry.name.startsWith("__MACOSX/"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (!plateEntries.length) {
    throw new Error("Este 3MF no contiene placas laminadas. Exporta el archivo como «G-code 3MF» desde el laminador.");
  }

  const result = {
    grams: 0,
    seconds: 0,
    lengthMm: 0,
    gramEstimated: false,
    timeEstimated: false,
    plates: plateEntries.length,
    plateNames: [],
    filaments: [],
    filamentSource: "gcode",
    timeSource: "gcode"
  };
  const filamentTotals = new Map();

  for (let index = 0; index < plateEntries.length; index++) {
    const entry = plateEntries[index];
    $("#analysisStatus").innerHTML = `<span class="spinner"></span><span>Analizando placa ${index + 1} de ${plateEntries.length}…</span>`;
    const text = await extractZipText(arrayBuffer, entry);
    const plate = analyzeGcodeText(text, profiles);
    result.grams += Math.max(0, plate.grams);
    result.seconds += Math.max(0, plate.seconds);
    result.lengthMm += Math.max(0, plate.lengthMm);
    result.gramEstimated ||= plate.gramEstimated;
    result.timeEstimated ||= plate.timeEstimated;
    result.plateNames.push(entry.name.split(/[\\/]/).pop().replace(/\.gcode$/i, ""));
    plate.filaments.forEach((filament) => {
      const key = filament.index;
      const current = filamentTotals.get(key);
      if (current) {
        current.grams += filament.grams;
        if (!current.name && filament.name) current.name = filament.name;
        if (!current.brand && filament.brand) current.brand = filament.brand;
        if (!(current.price > 0) && filament.price > 0) current.price = filament.price;
      } else {
        filamentTotals.set(key, { ...filament });
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const gcodeFilaments = [...filamentTotals.values()].sort((a, b) => a.index - b.index);
  if (sliceInfo.filaments.length) {
    result.filaments = sliceInfo.filaments;
    result.grams = sliceInfo.filaments.reduce((sum, filament) => sum + filament.grams, 0);
    result.gramEstimated = false;
    result.filamentSource = "slice_info";
  } else {
    result.filaments = gcodeFilaments;
  }
  if (sliceInfo.seconds > 0) {
    result.seconds = sliceInfo.seconds;
    result.timeEstimated = false;
    result.timeSource = "slice_info";
  }
  return result;
}

async function analyzeFile(file) {
  if(!active)return;const version=++analysisVersion;
  $("#fileResult").classList.remove("hidden");
  $("#dropzone").classList.add("hidden");
  $("#fileName").textContent = file.name;
  $("#fileSize").textContent = formatFileSize(file.size);
  $("#analysisStatus").innerHTML = `<span class="spinner"></span><span>Analizando el archivo…</span>`;
  $("#analysisStatus").classList.remove("hidden");
  $("#detectedGrid").classList.add("hidden");
  $("#analysisNote").classList.add("hidden");
  $("#gcodeTimeEditor").classList.add("hidden");

  try {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const is3mf = /\.3mf$/i.test(file.name);
    const analysis = is3mf ? await analyze3mf(file) : analyzeGcodeText(await file.text());
    if(!active||version!==analysisVersion)return;
    const { grams, seconds, lengthMm } = analysis;
    if (!(grams > 0) && !(seconds > 0)) throw new Error("No se han encontrado datos de impresión válidos.");

    state.gcode = {
      fileName: file.name,
      grams: Math.max(0, grams),
      seconds: Math.max(0, seconds),
      lengthMm,
      gramEstimated: analysis.gramEstimated,
      timeEstimated: analysis.timeEstimated,
      plates: analysis.plates || 1,
      plateNames: analysis.plateNames || [file.name],
      filaments: analysis.filaments || [],
      filamentSource: analysis.filamentSource || "gcode",
      timeSource: analysis.timeSource || "gcode"
    };

    const baseName = file.name.replace(/(?:\.gcode)?\.3mf$|\.(?:gcode|gco|gc|txt)$/i, "");
    $("#pieceName").value = baseName;
    $("#gcodePieceName").value = baseName;
    setTimeInputs(seconds);
    syncGcodeMaterial(false);
    // Each successfully loaded file becomes the new cost reference.
    $("#referenceCost").value = (Math.ceil(state.lastCosts.unitCost * 100) / 100).toFixed(2);
    calculate();

    $("#analysisStatus").classList.add("hidden");
    $("#detectedGrid").classList.remove("hidden");
    $("#gcodeTimeEditor").classList.remove("hidden");
    $("#detectedPlates").textContent = `${state.gcode.plates} ${state.gcode.plates === 1 ? "placa" : "placas"}`;
    $("#detectedTime").textContent = formatDuration(seconds);
    const filamentCount = state.gcode.filaments.length;
    $("#detectedMaterial").textContent = grams > 0
      ? `${decimal.format(grams)} g${filamentCount > 1 ? ` · ${filamentCount} filamentos` : ""}`
      : "No detectado";
    if (is3mf && analysis.timeSource === "slice_info" && analysis.filamentSource === "slice_info") {
      $("#detectedSource").textContent = "Resumen por placa del 3MF";
    } else if (is3mf) {
      $("#detectedSource").textContent = analysis.filamentSource === "slice_info"
        ? "Filamentos por ID del 3MF"
        : (analysis.timeSource === "slice_info" ? "Tiempo por placa del 3MF" : "Suma del G-code");
    } else {
      $("#detectedSource").textContent = `${analysis.timeEstimated ? "Tiempo estimado" : "Tiempo del slicer"} · ${analysis.gramEstimated ? "peso calculado" : "peso del slicer"}`;
    }

    const notes = [];
    if (is3mf) notes.push(`Se han sumado el tiempo y el material de ${state.gcode.plates} ${state.gcode.plates === 1 ? "placa" : "placas"}.`);
    if (analysis.timeSource === "slice_info") notes.push("El tiempo se ha leído del resumen final de cada placa del slicer.");
    if (analysis.filamentSource === "slice_info") notes.push("Se han usado los ID reales del proyecto y se han omitido los filamentos con 0 g.");
    if (filamentCount > 1) notes.push(`La sección de material se ha rellenado con ${filamentCount} filamentos desglosados.`);
    if (analysis.gramEstimated && lengthMm > 0) notes.push("En las placas sin peso guardado se ha calculado con la longitud extruida, el diámetro y la densidad.");
    if (analysis.timeEstimated) notes.push("En las placas sin tiempo guardado se ha realizado una estimación por movimientos.");
    $("#analysisNote").textContent = notes.join(" ");
    $("#analysisNote").classList.toggle("hidden", notes.length === 0);
    showToast(is3mf ? `${state.gcode.plates} placas analizadas correctamente` : "G-code analizado y material actualizado");
  } catch (error) {
    if(!active||version!==analysisVersion)return;
    state.gcode = null;
    $("#gcodeTimeEditor").classList.add("hidden");
    $("#analysisStatus").innerHTML = `<span style="color:#d54b4b">${escapeHtml(error.message || "No se pudo leer el archivo.")}</span>`;
    calculate();
  }
}

function removeFile() {
  analysisVersion++;
  state.gcode = null;
  $("#gcodeInput").value = "";
  $("#fileResult").classList.add("hidden");
  $("#dropzone").classList.remove("hidden");
  $("#gcodeTimeEditor").classList.add("hidden");
  calculate();
}

function copySummary() {
  const c = state.lastCosts;
  const name = $("#pieceName").value.trim() || "Pieza 3D";
  const printer = $("#printerName").value.trim() || "Sin indicar";
  const materialLines = state.materials.map((material) => {
    const netPrice = getNetMaterialPrice(material);
    const total = safeNumber(material.kg) * safeNumber(material.factor, 1) * netPrice;
    const unit = material.unit === "g" ? "g" : "kg";
    const displayedWeight = unit === "g" ? safeNumber(material.kg) * 1000 : safeNumber(material.kg);
    const colorDetail = normalizeHexColor(material.color);
    const amount=materialAmounts(material),priceDetail=`${euro.format(material.price)}/kg ${material.priceVat==='gross'?'con IVA de compra':'sin IVA de compra'} → ${euro.format(netPrice)}/kg usado`+(amount.removed?` (descontado ${decimal.format(amount.rate)} %)`:'');
    return `  - ${material.name || "Material"} ${material.brand ? `(${material.brand})` : ""}${colorDetail ? ` [${colorDetail}]` : ""}: ${precise.format(displayedWeight)} ${unit} × ${material.factor} × ${priceDetail} = ${euro.format(total)}`;
  });
  const lines = [
    `PRESUPUESTO · ${name}`,
    `Impresora: ${printer}`,
    `Cantidad: ${c.quantity} ud${c.quantity === 1 ? "." : "s."}`,
    `Tiempo de impresión: ${formatDuration(c.hours * 3600)}`,
    "",
    "MATERIALES",
    ...materialLines,
    `Coste de material utilizado: ${euro.format(c.material)}`,
    `Referencia de compra de material: ${euro.format(c.materialGross)}`,
    `Electricidad: ${euro.format(c.electricity)}`,
    `Operarios: ${value("operatorCount")} × ${formatDuration(c.laborTimeHours * 3600)} × ${euro.format(value("laborRate"))}/h = ${euro.format(c.labor)}`,
    `Materiales auxiliares: ${euro.format(c.auxiliaries)}`,
    `Mantenimiento (${decimal.format(c.maintenanceRate * 100)}%): ${euro.format(c.maintenance)}`,
    "",
    `Amortización de la máquina: ${euro.format(c.depreciation)}`,
    `Reserva para piezas fallidas: ${euro.format(c.failureReserve)}`,
    `Coste total del lote: ${euro.format(c.costBase)}`,
    `Coste total por unidad: ${euro.format(c.unitCost)}`,
    `Tu beneficio por unidad sin IVA: ${euro.format(state.offer.actualProfit)}`
  ];
  lines.push("", "TARIFA COMERCIAL", ...commercialOfferLines(), $("#offerStatus").textContent);
  navigator.clipboard.writeText(lines.join("\n"))
    .then(() => showToast("Resumen copiado al portapapeles"))
    .catch(() => showToast("No se pudo copiar el resumen"));
}

function resetAll(options={}) {
  if (options.confirm!==false&&!window.confirm("¿Quieres reiniciar todos los valores de la calculadora?")) return;
  setProductContext(null);budgetView?.clearSelection();
  fieldIds.forEach((id) => { document.getElementById(id).value = defaults[id]; });
  setDepreciationEnabled(false);
  $('#wholesaleProfile').value='profit20';
  $('#purchaseVatMode').value='auto';$('#purchaseVatPercent').value='21';
  state.materials = structuredClone(defaultMaterials);
  state.auxiliaryItems = structuredClone(defaultAuxiliaryItems);
  localStorage.removeItem(STORAGE_KEY);
  removeFile();
  renderMaterialRows();
  renderAuxiliaryItems();
  linkMirroredValues();
  switchMode("manual");
  showToast("Calculadora reiniciada");
}

function linkMirroredValues() {
  $("#gcodePieceName").value = $("#pieceName").value;
  $("#gcodePrinterName").value = $("#printerName").value;
  $("#gcodeQuantity").value = $("#quantity").value;
  ["Days", "Hours", "Minutes", "Seconds"].forEach((part) => {
    $(`#gcodePrint${part}`).value = $(`#print${part}`).value;
  });
}

function bindMirror(primaryId, mirrorId) {
  const primary = document.getElementById(primaryId);
  const mirror = document.getElementById(mirrorId);
  primary.addEventListener("input", () => { mirror.value = primary.value; });
  mirror.addEventListener("input", () => {
    primary.value = mirror.value;
    calculate();
  });
}

function setDepreciationEnabled(enabled) {
  $("#includeDepreciation").checked = enabled;
  $("#depreciationFields").classList.toggle("hidden", !enabled);
}
$("#includeDepreciation").addEventListener("change", () => {
  setDepreciationEnabled($("#includeDepreciation").checked);
  calculate();
});

fieldIds.forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    if(id==='wholesaleProfit')$('#wholesaleProfile').value='manual';
    if (state.gcode && ["filamentDiameter", "gcodeMaterialType"].includes(id) && state.gcode.gramEstimated) {
      state.gcode.grams = gramsFromLength(state.gcode.lengthMm);
      $("#detectedMaterial").textContent = `${decimal.format(state.gcode.grams)} g`;
    }
    if (state.gcode && ["filamentDiameter", "gcodeMaterialType", "gcodeBrand", "gcodeMaterialPrice", "gcodeErrorFactor"].includes(id)) {
      syncGcodeMaterial();
    } else {
      calculate();
    }
  });
});
$('#wholesaleProfile').addEventListener('change',()=>{
  const profile=profitProfiles.profiles[$('#wholesaleProfile').value];if(profile)$('#wholesaleProfit').value=String(profile.rate);
  calculate();
});

function handleMaterialInput(event) {
  const input = event.target.closest("[data-field]");
  if (!input) return;
  const row = input.closest("[data-material-id]");
  const material = state.materials.find((item) => item.id === row.dataset.materialId);
  if (!material) return;
  const field = input.dataset.field;
  if(input.tagName==='SELECT'&&material[field]===input.value)return;
  if (field === "weight") {
    material.kg = safeNumber(input.value) * (material.unit === "g" ? 0.001 : 1);
  } else if (field === "unit") {
    material.unit = input.value === "g" ? "g" : "kg";
    renderMaterialRows();
    calculate();
    return;
  } else {
    material[field] = input.type === "number" ? safeNumber(input.value) : input.value;
  }
  if (field === "name") {
    const subtitle = row.querySelector(".material-row-title small");
    if (subtitle) subtitle.innerHTML = materialSubtitleHtml(material);
  }
  calculate();
}
$('#materialRows').addEventListener('input',handleMaterialInput);
$('#materialRows').addEventListener('change',event=>{if(event.target.closest('select[data-field]'))handleMaterialInput(event);});
$('#purchaseVatMode').addEventListener('change',calculate);$('#purchaseVatPercent').addEventListener('input',calculate);

$("#materialRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-material]");
  if (!button) return;
  state.materials = state.materials.filter((item) => item.id !== button.dataset.removeMaterial);
  renderMaterialRows();
  calculate();
});

$("#addMaterialButton").addEventListener("click", () => {
  state.materials.push(createMaterial());
  renderMaterialRows();
  calculate();
  $("#materialRows .material-row:last-child input").focus();
});

function updateAuxCustomField() {
  const custom = $("#auxType").value === "Otro";
  $("#auxCustomField").classList.toggle("hidden", !custom);
  if (custom) $("#auxCustomName").focus();
}

function addAuxiliaryFromForm() {
  const custom = $("#auxType").value === "Otro";
  const name = custom ? $("#auxCustomName").value.trim() : $("#auxType").value;
  const amount = value("auxAmount");
  if (!name) {
    showToast("Escribe un nombre para el concepto");
    $("#auxCustomName").focus();
    return;
  }
  if (amount <= 0) {
    showToast("Introduce un coste mayor que cero");
    $("#auxAmount").focus();
    return;
  }
  state.auxiliaryItems.push(createAuxiliaryItem(name, amount));
  renderAuxiliaryItems();
  calculate();
  $("#auxAmount").value = "0";
  if (custom) $("#auxCustomName").value = "";
  showToast(`${name} añadido`);
}

$("#auxType").addEventListener("change", updateAuxCustomField);
$("#addAuxButton").addEventListener("click", addAuxiliaryFromForm);
$("#auxAmount").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addAuxiliaryFromForm();
  }
});
$("#auxItemsList").addEventListener("input", (event) => {
  const input = event.target.closest("[data-aux-amount]");
  if (!input) return;
  const row = input.closest("[data-aux-id]");
  const item = state.auxiliaryItems.find((entry) => entry.id === row.dataset.auxId);
  if (!item) return;
  item.amount = Math.max(0, safeNumber(input.value));
  calculate();
});
$("#auxItemsList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-aux]");
  if (!button) return;
  state.auxiliaryItems = state.auxiliaryItems.filter((item) => item.id !== button.dataset.removeAux);
  renderAuxiliaryItems();
  calculate();
});

$("#costForm").addEventListener("submit", (event) => event.preventDefault());
$("#manualTab").addEventListener("click", () => switchMode("manual"));
$("#gcodeTab").addEventListener("click", () => switchMode("gcode"));
$("#dropzone").addEventListener("click", () => $("#gcodeInput").click());
$("#gcodeInput").addEventListener("change", (event) => {
  if (event.target.files[0]) analyzeFile(event.target.files[0]);
});
$("#dropzone").addEventListener("dragover", (event) => {
  event.preventDefault();
  $("#dropzone").classList.add("dragover");
});
$("#dropzone").addEventListener("dragleave", () => $("#dropzone").classList.remove("dragover"));
$("#dropzone").addEventListener("drop", (event) => {
  event.preventDefault();
  $("#dropzone").classList.remove("dragover");
  if (event.dataTransfer.files[0]) analyzeFile(event.dataTransfer.files[0]);
});
$("#removeFile").addEventListener("click", removeFile);
$("#captureReference").addEventListener("click", () => {
  $("#referenceCost").value = (Math.ceil(state.lastCosts.unitCost * 100) / 100).toFixed(2);
  calculate();
  showToast("Coste de referencia guardado por unidad");
});
$("#copyOffer").addEventListener("click", () => {
  if (!state.offer?.valid) return showToast("Revisa los avisos antes de emitir la oferta");
  navigator.clipboard.writeText(commercialOfferLines().join("\n"))
    .then(() => showToast("Oferta copiada sin costes internos"))
    .catch(() => showToast("No se pudo copiar la oferta"));
});
$("#copyButton").addEventListener("click", copySummary);
$("#inventoryButton").addEventListener("click", openProductDraftInInventory);
$("#updateCatalogButton").addEventListener('click',()=>openProductDraftInInventory('update'));
$("#resetButton").addEventListener("click", resetAll);
$("#printButton").addEventListener("click", () => window.print());

bindMirror("pieceName", "gcodePieceName");
bindMirror("printerName", "gcodePrinterName");
bindMirror("quantity", "gcodeQuantity");
bindMirror("printDays", "gcodePrintDays");
bindMirror("printHours", "gcodePrintHours");
bindMirror("printMinutes", "gcodePrintMinutes");
bindMirror("printSeconds", "gcodePrintSeconds");
loadSettings();
linkMirroredValues();
renderMaterialRows();
renderAuxiliaryItems();
updateAuxCustomField();
switchMode(state.mode);
function captureCalculation(){
  if(!state.offer?.valid)throw Error('Revisa los datos de la tarifa antes de guardar el presupuesto.');
  const values = Object.fromEntries(fieldIds.map(id=>[id,document.getElementById(id).value]));
  if (!$("#includeDepreciation").checked) values.machineHourlyCost = "0";
  return scope.DEV3D_BUDGETS.prepare({defaultsVersion:SETTINGS_DEFAULTS_VERSION,values,materials:state.materials,auxiliaryItems:state.auxiliaryItems,wholesaleProfile:profitProfiles.normalize($('#wholesaleProfile').value,$('#wholesaleProfit').value),materialTax:materialTaxConfig()});
}
function setProductContext(product){
  linkedProduct=product;
  $('#linkedProductPanel').hidden=!product;
  $('#linkedProductName').textContent=product?.name||'';
  $('#linkedProductHelp').textContent=product?.fresh?'Este producto todavía no tiene un cálculo guardado. Introduce sus materiales, tiempos y ajustes para vincularlo.':'Se han recuperado los materiales, tiempos y ajustes del último cálculo guardado con este producto.';
  $('#updateCatalogButton').textContent=product?'Revisar precios de este producto':'Actualizar precios de un producto';
}
function restoreCalculation(snapshot){
  setProductContext(null);
  analysisVersion++;state.gcode=null;loadSettings(snapshot);$('#gcodeInput').value='';$('#fileResult').classList.add('hidden');$('#dropzone').classList.remove('hidden');$('#gcodeTimeEditor').classList.add('hidden');
  linkMirroredValues();renderMaterialRows();renderAuxiliaryItems();updateAuxCustomField();switchMode('manual');
}
const budgetView=scope.DEV3D_BUDGETS?.mount({root,api:budgets,isActive:()=>active,capture:captureCalculation,restore:restoreCalculation});
$('#unlinkProductCalculation').onclick=()=>setProductContext(null);

    return {loadProductBudget({id,name,calculo,minimo}){
      if(!active)return false;
      if(calculo)restoreCalculation(scope.DEV3D_BUDGETS.prepare(calculo));
      else{resetAll({confirm:false});$('#pieceName').value=name;$('#shopMinimum').value=String(minimo||1);linkMirroredValues();calculate();}
      budgetView?.clearSelection();
      setProductContext({id,name,fresh:!calculo});return true;
    },destroy(){active=false;dismissBudgetPrompt?.();analysisVersion++;budgetView?.destroy();clearTimeout(state.toastTimer);}};
  }
  scope.DEV3D_CALCULATOR=Object.freeze({mount});
})(window);
