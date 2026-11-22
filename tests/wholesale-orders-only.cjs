const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const products={a:{nombre:'Figura',precio:10,imagen:'https://example.test/a.webp',wallapop:'https://es.wallapop.com/item/a'}};
 for(const user of [null,{uid:'admin',email:'admin@example.test'},{uid:'inactive',email:'inactive@example.test'}]){
  const app=await appDOM('catalogo.html',undefined,'',true);assert.equal(app.node('orderOpen').hidden,true);assert.equal(app.node('detailOrderForm').hidden,true);
  await app.session(user);app.emit('dev3dCatalogoPublico',products);if(user?.uid==='inactive')app.emit('dev3dTiendas/inactive',{rol:'tienda',activo:false});
  assert.equal(app.node('orderOpen').hidden,true);app.node('grid').querySelector('.product-details-link').onclick();assert.equal(app.node('detailOrderForm').hidden,true);assert.equal(app.node('catalogDetailDialog').open,true);assert.ok(app.node('catalogDetailPhoto').querySelector('img'));
  assert.equal(app.node('grid').querySelectorAll('.wallapop-link').length,1);app.node('orderOpen').onclick();assert.notEqual(app.node('orderCartDialog').open,true);
  await app.submit('detailOrderForm');await app.submit('orderCheckout');assert.equal(app.state.navigation,undefined);
 }
 const app=await appDOM('catalogo.html',undefined,'',true);await app.session({uid:'s',email:'s@example.test'});app.emit('dev3dCatalogoPublico',products);assert.equal(app.node('orderOpen').hidden,true);app.emit('dev3dTiendas/s',{rol:'tienda',activo:true});app.emit('dev3dCatalogoMayorista',{a:{precio:5,minimo:2}});assert.equal(app.node('orderOpen').hidden,false);
 app.node('grid').querySelector('.product-details-link').onclick();assert.equal(app.node('detailOrderForm').hidden,false);app.node('detailColor').value='Blanco';await app.submit('detailOrderForm');app.node('detailViewOrder').onclick();assert.equal(app.node('orderCartDialog').open,true);
 app.emit('dev3dTiendas/s',{rol:'tienda',activo:false});assert.equal(app.node('orderOpen').hidden,true);assert.equal(app.node('orderCartDialog').open,false);assert.equal(app.node('orderLines').children.length,0);await app.submit('orderCheckout');assert.equal(app.state.navigation,undefined);
 console.log('PASS: orders hidden and blocked for visitors/admin/inactive stores, public gallery and Wallapop retained, active wholesale access and immediate revocation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
