/* Read-only browser checks. Firebase is replaced locally; all writes are blocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
let playwright;
try { playwright = require('playwright'); }
catch {
  playwright = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dev3d-design-'));
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ttf':'font/ttf' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});
function fixture(role) {
  return `(() => {
    const role=${JSON.stringify(role)};
    const user=role==='public'?null:{uid:'preview-'+role,email:role+'@example.test'};
    const auth={currentUser:user};
    const profile={nombre:'Tienda de prueba',email:'shop@example.test',rol:'tienda',activo:true};
    const data={dev3dCatalogoPublico:{demo:{nombre:'Pieza de prueba visual',categoria:'Impresión 3D',precio:12,descripcion:'Producto simulado para verificar la interfaz.',imagen:'/logo-light.svg',disponibilidad:'disponible'}},dev3dCatalogoMayorista:{demo:{precio:8,minimo:5}},dev3dTiendas:{'preview-shop':profile}};
    if(document.body.dataset.home==='true')data.dev3dCatalogoPublico=Object.fromEntries(Array.from({length:12},(_,i)=>['piece-'+i,{nombre:'Pieza de prueba '+String(i+1).padStart(2,'0'),categoria:'Impresión 3D',precio:12,imagen:location.origin+'/logo-light.svg'}]));
    window.CATALOGO_CONFIG={firebaseConfig:{databaseURL:'https://preview.invalid'},ADMIN_EMAILS:['admin@example.test']};
    const database={getDatabase:()=>({}),ref:(_,n)=>n,query:n=>n,orderByChild:()=>{},equalTo:()=>{},onValue:(n,cb)=>{const value=n.split('/').reduce((o,k)=>o?.[k],data);queueMicrotask(()=>cb({val:()=>value||null}));return()=>{};},get:async()=>({val:()=>null}),serverTimestamp:()=>0,set:async()=>{throw Error('Writes blocked in browser tests')},update:async()=>{throw Error('Writes blocked in browser tests')},push:()=>({key:'preview'})};
    window.CATALOGO_BOOT={loadFirebase:async()=>[{initializeApp:()=>({})},database,{getAuth:()=>auth,onAuthStateChanged:(_,fn)=>{setTimeout(()=>fn(user),0);return()=>{}},signOut:async()=>{},EmailAuthProvider:{credential:()=>({})}},{getStorage:()=>({})}]};
  })();`;
}
async function checkLayout(page, label) {
  const state=await page.evaluate(() => ({
    overflow:document.documentElement.scrollWidth > innerWidth + 1,
    background:getComputedStyle(document.body).backgroundColor,
    font:document.fonts.check('400 16px Manrope'),
    logo:document.querySelector('.brand img')?.getAttribute('src'),
    badImages:[...document.images].filter(e=>e.loading!=='lazy' && (!e.complete || !e.naturalWidth)).map(e=>e.getAttribute('src'))
  }));
  assert.equal(state.overflow,false,label+': horizontal overflow');
  assert.equal(state.background,'rgb(255, 255, 255)',label+': light background');
  assert.equal(state.font,true,label+': local font');
  assert.equal(state.logo,'logo-header.svg',label+': light logo');
  assert.deepEqual(state.badImages,[],label+': broken images');
  const contrast = await page.evaluate(() => {
    const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
    const luminance=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    return [...document.querySelectorAll('body *')].flatMap(e=>{
      if(!e.checkVisibility() || e.closest(':disabled, [aria-hidden="true"]') || ![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return [];
      const style=getComputedStyle(e),fg=rgb(style.color);
      let bg=[255,255,255];const ancestors=[];
      for(let p=e;p;p=p.parentElement)ancestors.push(p);
      for(const p of ancestors.reverse()){
        const c=rgb(getComputedStyle(p).backgroundColor),a=c[3]??1;
        bg=bg.map((v,i)=>(c[i]||0)*a+v*(1-a));
      }
      const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const large=parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=18.66 && parseFloat(style.fontWeight)>=700);
      return ratio+0.05<(large?3:4.5)?[{text:e.textContent.trim().slice(0,60),color:style.color,ratio:ratio.toFixed(2)}]:[];
    });
  });
  assert.deepEqual(contrast,[],label+': text contrast');
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
  const errors=[];let views=0;
  try {
    for(const width of [320,390,768,1440]) {
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      await context.addInitScript(()=>{
        Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.testSharedProduct=data;}});
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testCopiedProduct=text;}}});
      });
      // Fail closed: no requests to production services during the suite.
      await context.route('**/*',route=>new URL(route.request().url()).origin===base ? route.continue() : route.abort());
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      let role='public';
      await page.route('**/firebase-loader.js',route=>route.fulfill({contentType:'text/javascript',body:fixture(role)}));
      for(const file of ['index.html','catalogo.html','solicitar-acceso.html','tienda.html','admin.html','cuenta-accion.html']) {
        await page.goto(`${base}/${file}`);await page.waitForTimeout(120);await page.evaluate(()=>document.fonts.ready);
        await checkLayout(page,`${width} ${file}`);views++;
        if(file==='index.html') {
          const cover=await page.locator('.hero-print-background').boundingBox();
          assert.ok(cover.width>=width-1 && Math.abs(cover.x)<1,'Animation must fill the cover, not a side column');
          const copy=await page.locator('.home-hero-copy').boundingBox();
          assert.ok(Math.abs(copy.x+copy.width/2-width/2)<2,'Cover copy must be centered');
          await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(e=>e===document.activeElement),true);
          await page.keyboard.press('Enter');assert.equal(await page.locator('main').evaluate(e=>e===document.activeElement),true);
          assert.equal(await page.locator('#heroMotionToggle').isVisible(),false);
          assert.equal(await page.locator('#printCanvas').evaluate(c=>getComputedStyle(c).animationName),'none');
          await page.evaluate(()=>scrollTo(0,0));
          await page.emulateMedia({reducedMotion:'no-preference'});
          const canvas=page.locator('#printSceneClock');
          await canvas.evaluate(async c=>{const a=c.getAnimations()[0];await a.ready;a.currentTime=5000;});
          const before=await canvas.evaluate(c=>c.getAnimations()[0].currentTime);
          await page.waitForTimeout(150);
          assert.notEqual(await canvas.evaluate(c=>c.getAnimations()[0].currentTime),before);
          await page.locator('#heroMotionToggle').click();
          assert.equal(await page.locator('#heroMotionToggle').getAttribute('aria-pressed'),'true');
          const paused=await canvas.evaluate(c=>c.getAnimations()[0].currentTime);
          await page.waitForTimeout(150);
          assert.equal(await canvas.evaluate(c=>c.getAnimations()[0].currentTime),paused);
          await page.locator('#heroMotionToggle').click();
          assert.equal(await canvas.evaluate(c=>getComputedStyle(c).animationPlayState),'running');
          await page.locator('#servicios').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
          assert.equal(await canvas.evaluate(c=>getComputedStyle(c).animationPlayState),'paused');
          await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>scrollTo(0,0));
          await page.screenshot({path:path.join(output,`home-${width}.png`)});
          await page.locator('#featuredCarousel').scrollIntoViewIfNeeded();
          assert.equal(await page.locator('#featuredProducts .featured-product').count(),12);
          await page.locator('#featuredNext').click();
          await page.waitForFunction(()=>document.getElementById('featuredProducts').scrollLeft>0);
          const track=page.locator('#featuredProducts');await track.focus();await page.keyboard.press('End');
          await page.waitForFunction(()=>document.getElementById('featuredNext').disabled);
          assert.equal(await page.locator('#featuredPrevious').isEnabled(),true);
          await page.keyboard.press('Home');await page.waitForFunction(()=>document.getElementById('featuredPrevious').disabled);
          await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.getElementById('featuredProducts').scrollLeft>0);
          await page.locator('#creaciones').screenshot({path:path.join(output,`carousel-${width}.png`)});
          if(width===390){
            await page.emulateMedia({reducedMotion:'no-preference'});
            await page.mouse.move(0,0);await track.evaluate(e=>e.blur());
            await page.waitForTimeout(10500);
            const beforeAuto=await track.evaluate(e=>e.scrollLeft);
            await page.waitForFunction(previous=>Math.abs(document.getElementById('featuredProducts').scrollLeft-previous)>20,beforeAuto,{timeout:6500});
            await page.locator('#featuredAutoplay').click();
            assert.equal(await page.locator('#featuredAutoplay').getAttribute('aria-pressed'),'true');
            await page.mouse.move(0,0);await page.locator('#featuredAutoplay').evaluate(e=>e.blur());
            await page.waitForTimeout(700);const stoppedAt=await track.evaluate(e=>e.scrollLeft);
            await page.waitForTimeout(5200);assert.equal(await track.evaluate(e=>e.scrollLeft),stoppedAt);
            await page.emulateMedia({reducedMotion:'reduce'});
            await page.waitForFunction(()=>document.getElementById('featuredAutoplay').hidden);
            assert.equal(await page.locator('#featuredAutoplay').isVisible(),false);
          }
        }
        if(file==='catalogo.html') {
          await page.waitForSelector('.card');
          await page.locator('#search').fill('not-a-product');assert.equal(await page.locator('.card').count(),0);
          await page.locator('#clearCatalogFilters').click();assert.equal(await page.locator('.card').count(),1);
          await page.locator('.product-details-link').first().click();assert.equal(await page.locator('#catalogDetailDialog').evaluate(e=>e.open),true);
          await page.locator('#shareProduct').click();
          assert.equal(await page.evaluate(()=>window.testSharedProduct.url),'https://www.dev3dstudio.es/catalogo.html#producto-demo');
          assert.deepEqual(await page.evaluate(()=>Object.keys(window.testSharedProduct).sort()),['title','url']);
          await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));
          await page.locator('#shareProduct').click();
          assert.equal(await page.evaluate(()=>window.testCopiedProduct),'https://www.dev3dstudio.es/catalogo.html#producto-demo');
          await page.keyboard.press('Escape');
          if(await page.locator('.account-menu>summary').isVisible())await page.locator('.account-menu>summary').click();
          await page.locator('#loginOpen').click();await page.locator('#forgotPassword').click();assert.equal(await page.locator('#passwordResetForm').isVisible(),true);
          await page.locator('#backToLogin').click();await page.locator('#loginClose').click();
          await page.screenshot({path:path.join(output,`catalog-${width}.png`)});
        }
      }
      role='admin';await page.goto(`${base}/admin.html`);await page.waitForSelector('#openCalculator:visible');
      await checkLayout(page,`${width} admin dashboard`);views++;
      await page.screenshot({path:path.join(output,`admin-${width}.png`)});
      await page.locator('#goCatalog').click();await page.locator('#newProduct').click();
      assert.equal(await page.locator('#productDialog').evaluate(e=>e.open),true);
      await checkLayout(page,`${width} product editor`);views++;await page.locator('#closeProductDialog').click();
      await page.locator('#closeCalculator').click();await page.locator('#goShops').click();await checkLayout(page,`${width} shops`);views++;
      await page.locator('#closeCalculator').click();await page.locator('#openCalculator').click();await page.waitForSelector('#calculatorMount input:visible');
      await checkLayout(page,`${width} calculator`);views++;
      assert.equal(await page.locator('#calculatorMount input:visible').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
      await page.screenshot({path:path.join(output,`calculator-${width}.png`),fullPage:true});
      role='shop';await page.goto(`${base}/tienda.html`);await page.waitForSelector('#shopDashboard:visible');await checkLayout(page,`${width} shop dashboard`);views++;
      await page.screenshot({path:path.join(output,`shop-${width}.png`),fullPage:true});
      await page.goto(`${base}/catalogo.html`);await page.waitForSelector('.wholesale');await checkLayout(page,`${width} wholesale`);views++;
      await context.close();console.log(`PASS: ${width}px public pages, automatic background animation, keyboard, catalog, dialogs, admin, calculator and shop.`);
    }
    assert.deepEqual(errors,[], 'JavaScript errors');
    console.log(`PASS: ${views} browser views; no JavaScript errors. Screenshots: ${output}`);
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
