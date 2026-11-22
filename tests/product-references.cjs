const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');const {reference,validate}=require('../catalogo-products.js');const {whatsapp}=require('../catalogo-orders.js');
(async()=>{
 assert.equal(reference({},'a'),'D3D-a');assert.equal(reference({referencia:'CUSTOM-1'},'a'),'CUSTOM-1');
 assert.throws(()=>validate({nombre:'Pieza',precio:1,mayorista:1,minimo:1,referencia:'Invalid reference!'}),/referencia/);
 const app=await appDOM('admin.html');await app.session({uid:'admin',email:'admin@example.test'});app.emit('dev3dCatalogoPublico',{a:{nombre:'Original',precio:5,referencia:'ORIG-1'}});const form=app.node('productForm');app.node('newProduct').onclick();for(const [key,value] of Object.entries({nombre:'Nueva',precio:'5',mayorista:'2',minimo:'5',referencia:'ORIG-1'}))form.elements[key].value=value;await app.submit('productForm');assert.equal(app.state.writes.length,0);assert.match(app.node('productMessage').textContent,/otro producto/);
 form.elements.referencia.value='';await app.submit('productForm');assert.equal(app.state.writes[0].value['dev3dCatalogoPublico/test-product'].referencia,'D3D-test-product');
 app.node('adminProductSearch').value='ORIG-1';app.node('adminProductSearch').oninput();assert.equal(app.node('adminProducts').querySelectorAll('tbody tr').length,1);
 [...app.node('adminProducts').querySelectorAll('button')].find(b=>b.textContent==='Duplicar').onclick();assert.equal(form.elements.referencia.value,'');assert.equal(form.elements.id.value,'');
 const url=whatsapp([{id:'a',color:'Rojo',quantity:5}],{products:{a:{nombre:'Pieza',precio:5,referencia:'ORIG-1'}},wholesale:{a:{precio:2,minimo:5}},shop:true},{name:'Tienda',email:'s@example.test',phone:'678123456'});assert.match(new URL(url).searchParams.get('text'),/Ref\. ORIG-1/);
 console.log('PASS: stable automatic references, custom reference validation, duplicate checking, admin search, copy renewal and WhatsApp references.');
})().catch(error=>{console.error(error);process.exitCode=1;});
