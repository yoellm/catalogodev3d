const assert=require('node:assert/strict');
const {roundSalePrice,computeCommercialOffer}=require('../calculadora/commercial.js');
for(const [input,expected] of [[0,0],[1e-20,.1],[.01,.1],[.60,.6],[.61,.7],[.67,.7],[.69,.7],[.70,.7],[.71,.8],[.99,1],[3.67,3.7],[3.70,3.7],[3.71,3.8],[19.99,20],[.1+.2,.3],[.7*3,2.1]])assert.equal(roundSalePrice(input),expected);
for(let cents=0;cents<10000;cents++)assert.equal(roundSalePrice(cents/100),Math.ceil(cents/10)/10);
const options={saleChannel:'direct',fixedPricing:'no',wholesaleProfit:0,shopMargin:40,targetPvp:0,shopMinimum:5,referenceCost:3.67,costBuffer:0};
const costs={unitCost:3.67,quantity:1,profitRate:0,vatRate:0,unitRecommended:4};
for(const saleChannel of ['direct','shop'])for(const fixedPricing of ['no','yes']){
  const quote=computeCommercialOffer(costs,{...options,saleChannel,fixedPricing});
  assert.equal(quote.gross,3.7);assert.equal(quote.total,saleChannel==='shop'?18.5:3.7);assert.equal(quote.valid,true);
  if(saleChannel==='shop')assert.equal(quote.suggestedPvp,6.2);
}
// Round the final price after profit and sale VAT, then multiply its cents by
// the order quantity. A minimum never changes the price of a single unit.
const shop=computeCommercialOffer({unitCost:1,quantity:3,profitRate:.3,vatRate:.21},{...options,saleChannel:'shop',wholesaleProfit:20});
assert.equal(shop.gross,1.5);assert.equal(shop.total,7.5);assert.equal(shop.suggestedPvp,2.5);assert.equal(shop.net,1.5/1.21);
assert.equal(computeCommercialOffer({unitCost:.7,quantity:3,profitRate:0,vatRate:0},options).total,2.1);
assert.equal(computeCommercialOffer(costs,{...options,saleChannel:'shop',targetPvp:6.17}).pvp,6.17);
assert.equal(computeCommercialOffer({...costs,unitCost:NaN},options).valid,false);
console.log('PASS: sale prices round upwards to €0.10, cent boundaries and floating-point stability, direct/wholesale/fixed pricing, resale PVP, unit minimums and exact order totals.');
