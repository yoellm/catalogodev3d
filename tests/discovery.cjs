const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const {loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),origin='https://www.dev3dstudio.es';
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
  const canonicals=new Set();
  for(const file of ['index.html','catalogo.html','solicitar-acceso.html']){
    const {document}=parseHTML(read(file));
    const canonical=document.querySelector('link[rel=canonical]').getAttribute('href');
    assert.ok(canonical.startsWith(origin+'/'));assert.ok(!canonicals.has(canonical));canonicals.add(canonical);
    assert.ok(document.querySelector('meta[name=description]').content.length>80);
    assert.ok(!document.querySelector('meta[name=robots]')?.content.includes('noindex'));
    assert.equal(document.querySelector('meta[property="og:url"]').content,canonical);
    for(const key of ['og:title','og:description','og:image','og:image:alt','og:locale'])assert.ok(document.querySelector(`meta[property="${key}"]`).content);
    assert.equal(document.querySelector('meta[name="twitter:card"]').content,'summary_large_image');
    assert.equal(document.querySelector('link[rel=icon]').getAttribute('href'),'logo-light.svg');
    const image=document.querySelector('meta[property="og:image"]').content;
    assert.ok(fs.existsSync(path.join(root,new URL(image).pathname)));
  }
  for(const file of ['admin.html','tienda.html','cuenta-accion.html','404.html']){
    const {document}=parseHTML(read(file));assert.ok(document.querySelector('meta[name=robots]').content.includes('noindex'));
  }
  const home=read('index.html');
  assert.ok(home.indexOf('id="creaciones"')<home.indexOf('id="estudio"'));
  const {document}=parseHTML(home);
  const inquiry=document.querySelector('.custom-inquiry a');assert.equal(new URL(inquiry.href).hostname,'wa.me');
  assert.ok(new URL(inquiry.href).searchParams.get('text').includes('pieza personalizada'));
  assert.ok(document.querySelector('noscript'));
  const organization=JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(organization['@type'],'Organization');assert.equal(organization.name,'DEV3D Studio');
  assert.ok(!organization.aggregateRating && !organization.review);
  const sitemap=read('sitemap.xml');
  for(const url of canonicals)assert.ok(sitemap.includes(`<loc>${url}</loc>`));
  for(const name of ['admin.html','tienda.html','cuenta-accion.html','404.html'])assert.ok(!sitemap.includes(name));
  const image=await loadImage(path.join(root,'assets/social-cover.png'));assert.equal(image.width,1200);assert.equal(image.height,630);
  console.log('PASS: public search/share metadata, unique canonicals, real organization data, private-page exclusions, product discovery order, WhatsApp inquiry, social image and sitemap.');
})().catch(e=>{console.error(e);process.exitCode=1;});
