const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const product={nombre:'Nombre',precio:10,colores:['Rojo'],referencia:'NOM-001'},user={uid:'s',email:'s@example.test'},profile={rol:'tienda',activo:true,nombre:'Tienda'};
 async function load(price=2,minimum=5){const app=await appDOM('catalogo.html',undefined,'',true,storage);await app.session(user);app.emit('dev3dTiendas/s',profile);app.emit('dev3dCatalogoPublico',{a:product});app.emit('dev3dCatalogoMayorista',{a:{precio:price,minimo:minimum}});return app;}
 let app=await load();app.node('grid').querySelector('.product-details-link').onclick();assert.match(app.node('catalogDetailReference').textContent,/NOM-001/);app.node('detailCustomization').value='Ana';await app.submit('detailOrderForm');assert.equal(values.size,1);
 app=await load(3);app.node('orderOpen').onclick();assert.equal(app.node('orderLines').querySelectorAll('.order-line').length,1);assert.match(app.node('orderLines').textContent,/Ana/);assert.match(app.node('orderLines').textContent,/NOM-001/);assert.match(app.node('orderTotal').textContent,/15,00/);assert.equal(app.node('sendOrder').disabled,false);
 app=await load(3,10);app.node('orderOpen').onclick();assert.equal(app.node('sendOrder').disabled,true);assert.match(app.node('orderErrors').textContent,/mínimo es 10/);app.node('clearOrderDraft').onclick();assert.equal(values.size,0);
 app.node('orderClose').onclick();app.node('grid').querySelector('.product-details-link').onclick();await app.submit('detailOrderForm');assert.equal(values.size,1);await app.session(null);assert.equal(values.size,0);
 app=await load();app.node('grid').querySelector('.product-details-link').onclick();await app.submit('detailOrderForm');assert.equal(values.size,1);const home=await appDOM('index.html',undefined,'',false,storage);await home.session(user);await home.session(null);assert.equal(values.size,0);
 console.log('PASS: draft survives reload/navigation for its store, restores customization/reference, uses current prices/minimums and clears on empty/logout including home.');
})().catch(error=>{console.error(error);process.exitCode=1;});
