const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const app=await appDOM('catalogo.html');await app.session(null);const description=('Una descripción larga.\n\n'+ 'x'.repeat(100)+'\n').repeat(15)+'<script>test</script>';
 app.emit('dev3dCatalogoPublico',{a:{nombre:'Producto A',descripcion:description,imagen:'https://example.test/portrait.jpg',precio:2},b:{nombre:'Producto B',descripcion:'',precio:3}});
 const card=app.node('grid').querySelector('#producto-a');assert(!card.querySelector('.description').textContent.includes('\n'));assert.equal(card.querySelectorAll('.catalog-pricing').length,1);
 card.querySelector('.product-details-link').onclick();assert.equal(app.node('catalogDetailDialog').open,true);assert.equal(app.node('catalogDetailDescription').textContent,description);assert.equal(app.node('catalogDetailDescription').querySelector('script'),null);assert.equal(app.node('catalogDetailPhoto').querySelector('img').src,'https://example.test/portrait.jpg');assert.equal(app.document.body.classList.contains('catalog-detail-open'),true);
 app.node('closeCatalogDetail').onclick();assert.equal(app.node('catalogDetailDialog').open,false);assert.equal(app.document.body.classList.contains('catalog-detail-open'),false);
 app.node('grid').querySelector('#producto-b .product-details-link').onclick();assert.equal(app.node('catalogDetailPhoto').hidden,true);assert.equal(app.node('catalogDetailPhoto').children.length,0);assert.match(app.node('catalogDetailDescription').textContent,/todavía no tiene/);
 console.log('PASS: complete long descriptions retained in details, plain text safety, full photo, close handling and clearing previous product content.');
})().catch(error=>{console.error(error);process.exitCode=1;});
