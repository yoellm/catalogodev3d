const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const app=await appDOM('admin.html');await app.session({uid:'admin',email:'admin@example.test'});
 const products=Object.fromEntries(Array.from({length:29},(_,i)=>['p'+i,{nombre:'Pieza '+String(i).padStart(2,'0'),categoria:i%2?'Nombres':'Decoración',descripcion:i===20?'Especial único':'',imagen:'',precio:29-i}]));
 app.emit('dev3dCatalogoPublico',products);app.emit('dev3dCatalogoMayorista',{p0:{precio:2,minimo:3}});
 const rows=()=>[...app.node('adminProducts').querySelectorAll('tbody tr')];
 assert.equal(app.node('productForm').hidden,true);assert.equal(rows().length,12);assert.equal(app.node('adminProductCount').textContent,'29 de 29 productos');
 app.node('adminProductNext').onclick();assert.match(rows()[0].textContent,/Pieza 12/);app.node('adminProductNext').onclick();assert.equal(rows().length,5);assert.equal(app.node('adminProductNext').disabled,true);
 app.node('adminProductSearch').value='unico';app.node('adminProductSearch').oninput();assert.equal(rows().length,1);assert.match(rows()[0].textContent,/Pieza 20/);assert.match(app.node('adminProductPage').textContent,/Página 1 de 1/);
 app.node('adminProductSearch').value='';app.node('adminProductCategory').value='Nombres';app.node('adminProductCategory').oninput();assert.equal(app.node('adminProductCount').textContent,'14 de 29 productos');
 app.node('adminProductCategory').value='';app.node('adminProductSort').value='price-asc';app.node('adminProductSort').oninput();assert.match(rows()[0].textContent,/Pieza 28/);
 rows()[0].querySelector('button').onclick();assert.equal(app.node('productForm').hidden,false);assert.equal(app.node('productListPanel').hidden,false);assert.equal(app.node('productDialog').open,true);assert.equal(app.node('productForm').elements.id.value,'p28');
 app.node('productForm').elements.nombre.value='Edición pendiente';app.emit('dev3dCatalogoPublico',products);assert.equal(app.node('productForm').elements.nombre.value,'Edición pendiente');assert.equal(app.node('productForm').hidden,false);
 app.node('closeProductDialog').onclick();assert.equal(app.node('productDialog').open,false);assert.equal(app.node('productListPanel').hidden,false);app.node('newProduct').onclick();assert.equal(app.node('productDialog').open,true);assert.equal(app.node('productForm').elements.id.value,'');assert.equal(app.node('formTitle').textContent,'Nuevo producto');
 app.node('resetProduct').onclick();app.node('adminProductNext').onclick();app.node('adminProductNext').onclick();app.emit('dev3dCatalogoPublico',{p0:products.p0});assert.match(app.node('adminProductPage').textContent,/Página 1 de 1/);assert.equal(rows().length,1);
 app.node('adminProductSearch').value='no existe';app.node('adminProductSearch').oninput();assert.equal(rows().length,0);assert.match(app.node('adminProducts').textContent,/No hay productos que coincidan/);
 console.log('PASS: catalog management with 29 products, pagination, accent-insensitive search, category, price order, editor transitions, preserved draft and page clamping after removal.');
})().catch(error=>{console.error(error);process.exitCode=1;});
