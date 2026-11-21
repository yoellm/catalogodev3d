const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const products={a:{nombre:'Pieza A',categoria:'Hogar & decoración',precio:3},b:{nombre:'Pieza B',categoria:'Regalos',precio:5},c:{nombre:'Pieza C',categoria:'Regalos',precio:4}};
 const home=await appDOM('index.html');await home.session(null);home.emit('dev3dCatalogoPublico',products);
 for(const id of ['desktopCatalogCategories','mobileCatalogCategories']){const links=[...home.node(id).querySelectorAll('a')];assert.equal(links.length,2);assert.equal(links[0].textContent,'Hogar & decoración');assert.equal(new URL(links[0].getAttribute('href'),'https://example.test').searchParams.get('categoria'),'Hogar & decoración');}
 const catalog=await appDOM('catalogo.html',undefined,'?categoria='+encodeURIComponent('Hogar & decoración'));await catalog.session(null);catalog.emit('dev3dCatalogoPublico',products);assert.equal(catalog.node('category').value,'Hogar & decoración');assert.equal(catalog.node('grid').children.length,1);assert.match(catalog.node('grid').textContent,/Pieza A/);
 const unknown=await appDOM('catalogo.html',undefined,'?categoria=Missing');await unknown.session(null);unknown.emit('dev3dCatalogoPublico',products);assert.equal(unknown.node('category').value,'');assert.equal(unknown.node('grid').children.length,3);
 const shop=await appDOM('tienda.html');await shop.session({uid:'s',email:'shop@example.test'});shop.emit('dev3dTiendas/s',{rol:'tienda',activo:true});shop.emit('dev3dCatalogoPublico',products);assert.equal(shop.node('mobileCatalogCategories').children.length,2);assert.equal(shop.node('mobileCatalogLabel').textContent,'Catálogo mayorista');
 console.log('PASS: dynamic nested categories on home and store pages, deduplicated names, encoded category URLs, prefiltered catalog and safe fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
