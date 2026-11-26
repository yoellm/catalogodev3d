const assert=require('node:assert/strict');
const {selectFeatured,googleReviewUrl}=require('../catalogo-home.js');
const product=(nombre,extra={})=>({nombre,precio:12,imagen:'https://example.test/product.jpg',...extra});
const data={z:product('Zorro'),a:product('Aries'),b:product('Búho'),d:product('Dragón'),c:product('Casa'),missing:product('Sin foto',{imagen:''}),unsafe:product('URL peligrosa',{imagen:'javascript:alert(1)'}),invalid:product('',{}),price:product('Precio inválido',{precio:NaN}),negative:product('Precio negativo',{precio:-1})};
assert.deepEqual(selectFeatured(data).map(([id])=>id),['a','b','c','d','z']);assert.equal(selectFeatured({}).length,0);assert.equal(selectFeatured(null).length,0);assert.equal(selectFeatured(data,2).length,2);assert.equal(selectFeatured(data,50).length,5);assert.equal(selectFeatured(data,0).length,0);
assert.equal(selectFeatured(Object.fromEntries(Array.from({length:20},(_,i)=>[String(i),product('Pieza '+i)])),50).length,12);
assert.equal(selectFeatured({p:product('Sin coste',{precio:0})}).length,1);
console.log('PASS: muestras reales, máximo doce, orden estable, foto válida y precio público válido, sin productos de relleno.');

assert.equal(googleReviewUrl('https://share.google/k1rfT4gqOr7te3IaV'),'https://share.google/k1rfT4gqOr7te3IaV');
assert.equal(googleReviewUrl('javascript:alert(1)'),'');assert.equal(googleReviewUrl('https://notgoogle.com/'),'');assert.equal(googleReviewUrl('https://google.com.evil.test/'),'');
