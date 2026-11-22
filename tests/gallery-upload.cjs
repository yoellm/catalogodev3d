const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 const app=await appDOM('admin.html');await app.session({uid:'admin',email:'admin@example.test'});app.node('newProduct').onclick();const form=app.node('productForm');
 for(const [key,value] of Object.entries({nombre:'Galería',precio:'5',mayorista:'3',minimo:'5'}))form.elements[key].value=value;
 const files=[new Blob(['test1'],{type:'image/png'}),new Blob(['test2'],{type:'image/png'})];Object.defineProperty(form.elements.fotosExtra,'files',{value:files});
 let compressions=0,uploads=0;const blob=new Blob(['optimized'],{type:'image/webp'});app.window.CATALOGO_IMAGES={compress:async()=>{compressions++;return {blob,type:blob.type,extension:'webp',size:blob.size,saving:80};}};
 app.state.upload=async(ref,data,metadata)=>{uploads++;assert.equal(data,blob);assert.equal(metadata.contentType,'image/webp');};app.state.download=async ref=>'https://example.test/'+ref.split('/').at(-1);
 app.state.update=async()=>{throw Error('Network failed');};await app.submit('productForm');assert.equal(uploads,2);assert.equal(compressions,2);await app.submit('productForm');assert.equal(uploads,2);
 app.state.update=null;await app.submit('productForm');const product=app.state.writes[0].value['dev3dCatalogoPublico/test-product'];assert.equal(product.imagenes.length,2);assert.equal(product.imagen,product.imagenes[0]);assert.equal(uploads,2);
 app.node('newProduct').onclick();for(const [key,value] of Object.entries({nombre:'Demasiadas',precio:'5',mayorista:'3',minimo:'5',galeria:Array.from({length:7},(_,i)=>'https://example.test/'+i).join('\n')}))form.elements[key].value=value;await app.submit('productForm');assert.match(app.node('productMessage').textContent,/hasta 6/);assert.equal(uploads,2);
 console.log('PASS: gallery uploads are optimized, reused after database failure, choose a cover and enforce the photo limit before uploading.');
})().catch(error=>{console.error(error);process.exitCode=1;});
