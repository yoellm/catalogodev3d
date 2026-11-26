(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const adminPage = document.body.dataset.admin === 'true';
  const shopPage = document.body.dataset.shop === 'true';
  const homePage = document.body.dataset.home === 'true';
  const catalogPage = !adminPage && !shopPage && !homePage;
  if (homePage && location.hash === '#catalogo') { location.replace('catalogo.html'); return; }
  const money = value => new Intl.NumberFormat('es-ES', {style:'currency',currency:'EUR'}).format(value);
  let publicProducts = {}, wholesale = {}, shops = {}, currentUser = null, currentShopProfile = null, admin = false, generation = 0;
  let subscriptions = [], tradeStop = null, productHashHandled = false, calculatorInstance = null, productSaving = false, uploadedPhoto = null;
  let adminProductPage = 1;
  let historyView=null,submitOrder=null,historyStop=null;
  let pricingDraft=null,budgetAPI=null,pendingCalculation=null,recalculateRequest=0;
  const uploadedGallery=new Map();
  let categoryFromLink=catalogPage?new URL('https://www.dev3dstudio.es/catalogo.html'+(location.search||'')).searchParams.get('categoria'):null;
  function renderCategoryNavigation(){
    const categories=[...new Set(Object.values(publicProducts).map(p=>String(p.categoria||'').trim()||'Impresión 3D'))].sort((a,b)=>a.localeCompare(b,'es'));
    for(const id of ['desktopCatalogCategories','mobileCatalogCategories']){
      $(id).replaceChildren(...categories.map(category=>{const link=el('a',category);link.href='catalogo.html?categoria='+encodeURIComponent(category);return link;}));
    }
  }
  function showProductEditor(open) {
    const dialog=$('productDialog');
    $('productForm').hidden = !open; $('productListPanel').hidden = false;
    if(open){if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
    else if(dialog.open)dialog.close();
    document.body.classList?.toggle('product-modal-open',open);
  }
  const status = message => { $('status').textContent = message; };
  function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function productWatermark(container) { const logo=el('img',undefined,'product-watermark');logo.src='logo.png';logo.alt='';container.replaceChildren(logo); }
  function safeUrl(value) { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
  function orderStorage(){try{return window.localStorage;}catch{return null;}}
  function orderState(){return {products:publicProducts,wholesale,shop:!admin&&currentShopProfile?.rol==='tienda'&&currentShopProfile.activo===true,checking:!!currentUser&&!admin&&currentShopProfile===null,user:currentUser,profile:currentShopProfile};}
  const commerce=catalogPage&&window.CATALOGO_COMMERCE?window.CATALOGO_COMMERCE.mount({document,getState:orderState,orders:window.CATALOGO_ORDERS,products:window.CATALOGO_PRODUCTS,drafts:window.CATALOGO_ORDER_DRAFT,storage:orderStorage(),navigate:url=>location.assign(url),registerOrder:(lines,customer)=>{if(!submitOrder)throw Error('El registro de pedidos no está disponible. Recarga la página.');return submitOrder(lines,customer);}}):null;
  if (window.matchMedia) {
    const menu = $('mainMenu'), content = menu.querySelector('.menu-content');
    const desktop = el('div', undefined, 'desktop-account'); menu.after(desktop);
    const mobile = window.matchMedia('(max-width:760px)');
    const arrangeNavigation = () => {
      menu.open = false;
      (mobile.matches ? menu : desktop).append(content);
    };
    arrangeNavigation(); mobile.addEventListener('change', arrangeNavigation);
  }
  function setSessionUI(role, profile = {}) {
    document.body.dataset.role = role;
    $('identity').textContent = role === 'admin' ? 'Administrador' : role === 'shop' ? (profile.nombre || 'Cuenta de tienda') : currentUser ? 'Cuenta sin acceso mayorista' : 'Explora nuestro catálogo';
    $('menuLabel').textContent = role === 'admin' ? 'Administración' : role === 'shop' ? 'Mi tienda' : 'Menú';
    $('adminLink').hidden = role !== 'admin';
    $('menuCatalog').hidden = false;
    $('headerCatalog').textContent = role === 'shop' ? 'Catálogo mayorista' : 'Catálogo / Productos';
    $('mobileCatalogLabel').textContent=$('headerCatalog').textContent;
    for (const id of ['shopLink','shopCatalogLink']) $(id).hidden = role !== 'shop';
    $('shopAccountLink').hidden = role !== 'shop' && profile.rol !== 'tienda';
    $('loginOpen').hidden = !!currentUser;
    $('logout').hidden = !currentUser;
    if (homePage) {
      $('homeShopLogin').hidden = !!currentUser;
      $('homeShopAccess').hidden = role !== 'shop';
      $('homeAdminAccess').hidden = role !== 'admin';
      $('homeShopPending').hidden = role !== 'member';
    }
    if (adminPage) {
      $('adminGate').hidden = role === 'admin';
      $('adminGateMessage').textContent = currentUser ? 'Este panel es exclusivo del administrador. Puedes acceder a tu espacio desde el menú.' : 'Inicia sesión para gestionar tu catálogo, tus tiendas y tus precios.';
      $('gateShopLink').hidden = role !== 'shop';
      $('gateLogin').hidden = !!currentUser;
    }
    if (shopPage) {
      const hasShopAccount=!!currentUser && !admin && profile.rol==='tienda';
      $('accountSettings').hidden=!hasShopAccount;
      $('orderHistorySection').hidden=!hasShopAccount;
      $('accountCurrentEmail').textContent=hasShopAccount ? currentUser.email || '' : '';
      if(!hasShopAccount){$('emailChangeForm').reset();$('passwordChangeForm').reset();for(const id of ['emailChangeMessage','passwordChangeMessage','accountStateMessage'])$(id).textContent='';}
      $('shopDashboard').hidden = role !== 'shop';
      $('shopGate').hidden = role === 'shop';
      $('gateLogin').hidden = !!currentUser;
      $('shopGateMessage').textContent = currentUser ? 'Tu cuenta no tiene acceso mayorista activo. Contacta con DEV3D Studio para activarlo.' : 'Inicia sesión para consultar tus condiciones mayoristas.';
      if (role !== 'shop') { $('shopWelcome').textContent = ''; $('shopAccountName').textContent = ''; $('shopAccountEmail').textContent = ''; }
      if (role === 'shop') {
        $('shopWelcome').textContent = 'Hola, ' + (profile.nombre || 'tienda');
        $('shopAccountName').textContent = profile.nombre || 'Tu tienda';
        $('shopAccountEmail').textContent = currentUser?.email || '';
      }
    }
  }
  function refreshPricingWarnings(){
    if(!adminPage||!$('productWarnings'))return;const fields=$('productForm').elements;
    const notes=window.CATALOGO_PRODUCTS?.pricingWarnings?.(Object.fromEntries(['precio','mayorista','minimo','estado','plazo'].map(key=>[key,fields[key]?.value])))||[];
    $('productWarnings').hidden=!notes.length;$('productWarningList').replaceChildren(...notes.map(note=>el('li',note)));
  }
  function fillProductEditor(id){
    const p=publicProducts[id];if(!p)return false;const f=$('productForm');f.reset();uploadedPhoto=null;uploadedGallery.clear();$('productMessage').textContent='';
    pendingCalculation=null;
    for(const key of ['nombre','descripcion','categoria','imagen','precio','wallapop','plazo','referencia'])f.elements[key].value=p[key]??'';
    f.elements.estado.value=p.estado||'disponible';f.elements.colores.value=Object.values(p.colores||{}).join(', ');f.elements.personalizable.value=String(p.personalizable!==false);f.elements.galeria.value=window.CATALOGO_PRODUCTS.gallery(p).filter(url=>url!==safeUrl(p.imagen)).join('\n');
    f.elements.referencia.value=window.CATALOGO_PRODUCTS.reference(p,id);f.elements.id.value=id;f.elements.mayorista.value=wholesale[id]?.precio??'';f.elements.minimo.value=wholesale[id]?.minimo??1;f.elements.minimoTipo.value=window.CATALOGO_PRODUCTS.minimumType(wholesale[id]);
    $('formTitle').textContent='Editar producto';refreshPricingWarnings();showProductEditor(true);return true;
  }
  function renderPriceTargets(){
    if(!adminPage||!pricingDraft)return;const selected=$('pricingTarget').value,query=String($('pricingSearch').value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const entries=Object.entries(publicProducts).filter(([id,p])=>[p.nombre,window.CATALOGO_PRODUCTS.reference(p,id)].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)).sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre,'es'));
    $('pricingTarget').replaceChildren(...entries.map(([id,p])=>{const option=el('option',p.nombre+' · '+window.CATALOGO_PRODUCTS.reference(p,id));option.value=id;return option;}));
    $('pricingTarget').value=entries.some(([id])=>id===selected)?selected:entries[0]?.[0]||'';
    previewPriceTarget();
  }
  function previewPriceTarget(){
    const id=$('pricingTarget').value,p=publicProducts[id];$('pricingAccept').disabled=!p||!pricingDraft;$('pricingPreview').replaceChildren();
    if(!p||!pricingDraft){$('pricingPreview').textContent='No hay productos que coincidan con la búsqueda.';return;}
    for(const [label,oldValue,newValue] of [['Público / unidad',money(p.precio),money(pricingDraft.precio)],['Mayorista / unidad',wholesale[id]?money(wholesale[id].precio):'Sin configurar',money(pricingDraft.mayorista)],['Mínimo para tiendas '+window.CATALOGO_PRODUCTS.minimumLabel(wholesale[id]),wholesale[id]?.minimo||'Sin configurar',pricingDraft.minimo]])$('pricingPreview').append(el('p',label+': '+oldValue+' → '+newValue));
  }
  function openPriceUpdater(data){
    if(!admin||!adminPage)return false;pricingDraft=window.CATALOGO_DRAFT.validateDraft(data);if(!pricingDraft)return false;
    $('pricingSearch').value='';renderPriceTargets();$('pricingProductDialog').showModal();return true;
  }
  function importCalculatorDraft(data){
    if (!admin || !adminPage) return false;
    const draft=window.CATALOGO_DRAFT.validateDraft(data);
    if (!draft) return false;
        const form = $('productForm');
        if(draft.productId&&!publicProducts[draft.productId]){status('El producto ya no está en el catálogo. Selecciona otro producto.');return false;}
        const sameProduct=draft.productId&&form.elements.id.value===draft.productId;
        if (!sameProduct&&(form.elements.id.value || form.elements.nombre.value.trim()) && !confirm('Hay un producto en edición. ¿Sustituir el formulario por el producto elegido de la calculadora?')) return false;
        if(draft.productId){if(!sameProduct)fillProductEditor(draft.productId);for(const key of ['precio','mayorista','minimo'])form.elements[key].value=draft[key];}
        else{form.reset();form.elements.id.value='';for(const key of ['nombre','descripcion','precio','mayorista','minimo'])form.elements[key].value=draft[key];uploadedPhoto=null;uploadedGallery.clear();}
        pendingCalculation=draft.calculo||null;
        $('formTitle').textContent = draft.productId?'Actualizar precios del producto':'Nuevo producto desde la calculadora';
        showAdminView('catalog');
        refreshPricingWarnings();showProductEditor(true);
        $('productMessage').textContent='Los dos precios son por 1 unidad, con IVA incluido. El pedido mínimo se aplica solo a tiendas, según la condición elegida.'+(pendingCalculation?' Al guardar, también se vinculará este cálculo para poder recuperarlo con «Recalcular».':'');
        $('productMessage').dataset.kind='info';
        status('Precios por unidad preparados. Añade la foto y la categoría, revisa los datos y pulsa Guardar producto para publicarlo.');
        form.scrollIntoView({behavior:'smooth'});
    return true;
  }
  function showAdminView(view) {
    if (!admin || !adminPage) return;
    if (!['home','catalog','shops','calculator','orders'].includes(view)) view = 'home';
    $('adminDashboard').hidden = view !== 'home';
    $('catalogView').hidden = view !== 'catalog';
    $('productWorkspace').hidden = view !== 'catalog';
    $('shopsView').hidden = view !== 'shops';
    $('calculatorPanel').hidden = view !== 'calculator';
    $('orderHistorySection').hidden=view!=='orders';
    $('closeCalculator').hidden = view === 'home';
    const content = {
      home:['Panel de administración','Elige qué quieres hacer. Todas tus herramientas, en un solo lugar.'],
      catalog:['Gestión del catálogo','Añade productos, fotografías y precios para particulares y tiendas.'],
      shops:['Gestión de tiendas','Crea cuentas y gestiona el acceso a tus precios mayoristas.'],
      calculator:['Calculadora de precios','Calcula tus costes y convierte el resultado en un nuevo producto.'],
      orders:['Pedidos de tiendas','Revisa las solicitudes y actualiza su estado. Las solicitudes pendientes todavía necesitan tu confirmación.']
    }[view];
    $('viewTitle').textContent = content[0]; $('viewDescription').textContent = content[1];
    document.body.dataset.adminView = view;
    if (view === 'calculator' && !calculatorInstance) {
      try {
        const mount = $('calculatorMount');
        mount.replaceChildren($('calculatorTemplate').content.cloneNode(true));
        calculatorInstance = window.DEV3D_CALCULATOR.mount(mount.firstElementChild,{onDraft:importCalculatorDraft,onUpdatePrices:openPriceUpdater,budgets:budgetAPI});
      } catch(error) { console.error(error); $('calculatorMount').replaceChildren(); status('No se pudo abrir la calculadora. Recarga la página e inténtalo de nuevo.'); }
    }
    $('viewTitle').focus?.({preventScroll:true});
  }
  if (homePage) {
    const reviews = window.DEV3D_WEB_CONTENT?.googleReviews;
    const url = window.CATALOGO_HOME.googleReviewUrl(reviews?.url);
    if (url) {
      $('googleReviews').hidden = false; $('googleReviewsLink').href = url;
      (Array.isArray(reviews.items) ? reviews.items : []).forEach(review=>{
        if (typeof review.author !== 'string' || typeof review.text !== 'string' || !review.author.trim() || !review.text.trim() || !Number.isInteger(review.rating) || review.rating<1 || review.rating>5) return;
        const card=el('figure',undefined,'google-review-card');
        const stars=el('p','★'.repeat(review.rating)+'☆'.repeat(5-review.rating),'review-stars'); stars.setAttribute('aria-label',review.rating+' de 5 estrellas');
        const quote=el('blockquote',review.text);
        const caption=el('figcaption'), source=el('a','Ver en Google ↗');source.href=window.CATALOGO_HOME.googleReviewUrl(review.url)||url;source.target='_blank';source.rel='noopener noreferrer';
        caption.append(el('strong',review.author),source);card.append(stars,quote,caption);$('googleReviewCards').append(card);
      });
      window.DEV3D_REVIEWS?.mount();
      if(!$('googleReviewCards').children.length){$('reviewsTitle').textContent='Tu opinión nos ayuda a crecer.';$('reviewsIntro').textContent='¿Ya tienes una pieza de DEV3D Studio? Cuéntanos tu experiencia en Google.';$('googleReviewsLink').textContent='Visitar nuestra ficha de Google ↗';}
      const summary = window.DEV3D_GOOGLE_SUMMARY;
      const age = Date.now() - summary?.updatedAt;
      if (age >= 0 && age < 7 * 86400000 && summary.totalReviewCount > 0) {
        const count = summary.totalReviewCount;
        const rating = summary.averageRating.toLocaleString('es-ES', { maximumFractionDigits: 1 });
        $('reviewsTitle').textContent = rating + ' de 5 en Google';
        $('reviewsIntro').textContent = count.toLocaleString('es-ES') + (count === 1 ? ' reseña' : ' reseñas');
        $('googleReviewsLink').textContent = 'Leer reseñas en Google ↗';
      }
    }
  }
  try {
    const databaseURL = window.CATALOGO_CONFIG?.firebaseConfig?.databaseURL;
    if (!databaseURL) { status('Falta configurar la base de datos del catálogo en firebase-config.js.'); return; }
    const [appSDK, database, authentication, storageSDK] = await window.CATALOGO_BOOT.loadFirebase();
    const app = appSDK.initializeApp(window.CATALOGO_CONFIG.firebaseConfig, 'dev3d-catalog');
    const db = database.getDatabase(app, databaseURL), auth = authentication.getAuth(app), storage = storageSDK.getStorage(app);
    const path = name => name ? database.ref(db, name) : database.ref(db);
    if(adminPage)budgetAPI={
      watch(callback,error){const owner=currentUser?.uid;if(!admin||!owner)return ()=>{};return database.onValue(path('dev3dPresupuestos/'+owner),snapshot=>{if(admin&&currentUser?.uid===owner)callback(snapshot.val());},error);},
      async save({id,name,calculo}){if(!admin||!currentUser)throw Error('Acceso exclusivo del administrador.');const uid=currentUser.uid,key=id||database.push(path('dev3dPresupuestos/'+uid)).key;await database.set(path('dev3dPresupuestos/'+uid+'/'+key),{nombre:name,calculo,actualizado:database.serverTimestamp()});return key;},
      async remove(id){if(!admin||!currentUser)throw Error('Acceso exclusivo del administrador.');await database.set(path('dev3dPresupuestos/'+currentUser.uid+'/'+id),null);}
    };
    if(catalogPage&&window.CATALOGO_HISTORY)submitOrder=window.CATALOGO_HISTORY.sender({sdk:database,db,getState:orderState});
    if((adminPage||shopPage)&&window.CATALOGO_HISTORY_UI)historyView=window.CATALOGO_HISTORY_UI.mount({document,admin:adminPage,api:window.CATALOGO_HISTORY,saveStatus:async(uid,id,state,note)=>{
      if(!admin||!currentUser)throw Error('Acceso exclusivo del administrador.');
      await database.set(path('dev3dPedidos/'+uid+'/'+id+'/seguimiento'),{estado:state,nota:note,actualizado:database.serverTimestamp()});
    }});
    const watch = (name, callback) => { subscriptions.push(database.onValue(path(name), snap => callback(snap.val() || {}), error => {
      if (homePage) { $('featuredStatus').textContent = 'No hemos podido cargar las piezas. Puedes consultar el catálogo completo.'; }
      const denied = String(error?.code || error?.message || '').toLowerCase().replaceAll('_','-').includes('permission-denied');
      if (adminPage && admin && denied) $('rulesNotice').hidden = false;
      status(adminPage ? 'No se pudieron cargar los datos. Comprueba la conexión y las reglas de acceso del catálogo.' : 'El catálogo no está disponible en este momento. Inténtalo de nuevo más tarde.');
    })); };
    function resetSubscriptions() { subscriptions.forEach(stop => stop()); subscriptions = []; if (tradeStop) { tradeStop(); tradeStop = null; } if(historyStop){historyStop();historyStop=null;} }
    let resetSending = false;
    function showLogin() { $('passwordResetForm').hidden = true; $('loginForm').hidden = false; $('loginError').textContent = ''; }
    function openLogin() { $('mainMenu').open = false; showLogin(); $('loginDialog').showModal(); }
    $('forgotPassword').onclick = () => {
      $('passwordResetForm').elements.email.value = $('loginForm').elements.email.value.trim();
      $('loginForm').elements.password.value = '';
      $('passwordResetMessage').textContent = '';
      $('loginForm').hidden = true; $('passwordResetForm').hidden = false;
      $('passwordResetForm').elements.email.focus();
    };
    $('backToLogin').onclick = showLogin;
    $('passwordResetForm').onsubmit = async event => {
      event.preventDefault(); if (resetSending) return;
      const field = event.currentTarget.elements.email, email = field.value.trim(), message = $('passwordResetMessage');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { message.textContent = 'Introduce un correo electrónico válido.'; field.focus(); return; }
      resetSending = true; $('sendPasswordReset').disabled = true; message.textContent = 'Enviando el enlace…';
      const sent = 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también la carpeta de spam. Tu contraseña no cambia hasta que completes el enlace.';
      try { auth.languageCode = 'es'; await authentication.sendPasswordResetEmail(auth, email); message.textContent = sent; }
      catch (error) {
        if (error?.code === 'auth/user-not-found') message.textContent = sent;
        else if (error?.code === 'auth/too-many-requests') message.textContent = 'Se han realizado demasiados intentos. Espera unos minutos y vuelve a probar.';
        else message.textContent = 'No se ha podido enviar el enlace. Comprueba la conexión e inténtalo de nuevo.';
      }
      finally { resetSending = false; $('sendPasswordReset').disabled = false; }
    };
    $('loginOpen').onclick = openLogin;
    if (homePage) $('homeShopLogin').onclick = openLogin;
    if (adminPage || shopPage) $('gateLogin').onclick = openLogin;
    document.addEventListener?.('click', event => { for(const id of ['mainMenu','catalogNav']){const menu=$(id);if(menu.open&&!menu.contains(event.target))menu.open=false;} });
    window.addEventListener('keydown', event => { if (event.key === 'Escape') { $('mainMenu').open = false; $('catalogNav').open=false; } });
    $('loginClose').onclick = () => $('loginDialog').close();
    $('loginForm').onsubmit = async event => {
      event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true; $('loginError').textContent = '';
      try {
        const result = await authentication.signInWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value);
        let profile = null;
        if (!window.CATALOGO_CONFIG.ADMIN_EMAILS.includes(result.user.email?.toLowerCase())) profile = (await database.get(path('dev3dTiendas/' + result.user.uid))).val();
        const role = window.CATALOGO_NAVIGATION.roleFor(result.user,profile,window.CATALOGO_CONFIG.ADMIN_EMAILS);
        form.reset(); $('loginDialog').close();
        location.assign(window.CATALOGO_NAVIGATION.destinationFor(role));
      }
      catch { $('loginError').textContent = 'No se pudo iniciar sesión. Revisa tus credenciales y la conexión.'; }
      finally { button.disabled = false; }
    };
    $('logout').onclick = async () => { try { await authentication.signOut(auth); } catch { status('No se pudo cerrar la sesión. Inténtalo de nuevo.'); } };
    function renderFeatured() {
      const items = window.CATALOGO_HOME.selectFeatured(publicProducts);
      $('featuredProducts').replaceChildren();
      $('featuredEmpty').hidden = items.length > 0;
      $('featuredStatus').textContent = '';
      items.forEach(([id,p])=>{
        const card = el('a',undefined,'featured-product');
        card.href = 'catalogo.html#producto-' + encodeURIComponent(id);
        const photo = el('div',undefined,'featured-photo'), image = el('img');
        const url=safeUrl(p.imagen);
        const placeholder=()=>{image.src='logo-light.svg';image.alt='DEV3D Studio: imagen provisional de '+p.nombre;image.className='featured-placeholder';};
        if(url){image.src=url;image.alt=p.nombre;}else placeholder();
        image.loading='lazy';image.decoding='async';
        image.addEventListener('error',placeholder,{once:true});
        photo.append(image);
        const body = el('div',undefined,'featured-product-body');
        body.append(el('span',p.categoria || 'Impresión 3D','tag'),el('h3',p.nombre),el('span','Ver pieza →','featured-action'));
        card.append(photo,body); $('featuredProducts').append(card);
      });
    }
    function render() {
      if(catalogPage)commerce?.sync();
      if (homePage) { renderFeatured(); return; }
      if (shopPage) { status(''); return; }
      if (adminPage) { renderAdmin(); return; }
      const query = $('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let selected = $('category').value;
      const categoryFor = p => String(p.categoria||'').trim()||'Impresión 3D';
      const counts=new Map();for(const p of Object.values(publicProducts)){const category=categoryFor(p);counts.set(category,(counts.get(category)||0)+1);}
      const categories=[...counts.keys()].sort((a,b)=>a.localeCompare(b,'es'));
      if(categoryFromLink!==null&&categories.length){selected=categoryFromLink;categoryFromLink=null;}
      $('category').replaceChildren(new Option('Todas las categorías ('+Object.keys(publicProducts).length+')',''), ...categories.map(c => new Option(c+' ('+counts.get(c)+')',c)));
      selected=categories.includes(selected)?selected:'';$('category').value=selected;
      const items = Object.entries(publicProducts).filter(([id,p]) => (!selected || categoryFor(p) === selected) && `${p.nombre} ${p.descripcion || ''} ${window.CATALOGO_PRODUCTS.reference(p,id)}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
      const shopView=currentShopProfile?.rol==='tienda'&&currentShopProfile.activo===true;
      const checkingShop=!!currentUser&&!admin&&currentShopProfile===null;
      const validTrade = trade => Number.isFinite(trade?.precio)&&trade.precio>=0&&Number.isSafeInteger(trade?.minimo)&&trade.minimo>=1;
      const price = ([id,p]) => shopView ? (validTrade(wholesale[id])?wholesale[id].precio:null) : wholesale[id]?.precio ?? p.precio;
      items.sort((a,b) => {
        if($('sort').value==='name')return a[1].nombre.localeCompare(b[1].nombre,'es');
        const x=price(a),y=price(b);if(x===null||y===null)return x===y?0:x===null?1:-1;
        return ($('sort').value==='asc'?1:-1)*(x-y);
      });
      $('grid').replaceChildren();
      items.forEach(([id,p]) => {
        const card = el('article', undefined,'card'), photo = el('div',undefined,'photo'), body = el('div',undefined,'card-body');
        card.id = 'producto-' + id; card.tabIndex = -1;
        const url = safeUrl(p.imagen)||window.CATALOGO_PRODUCTS.gallery(p)[0]||'';
        if (url) { const image = el('img'); image.src = url; image.alt = p.nombre; image.loading = 'lazy'; image.onerror = () => productWatermark(photo); photo.replaceChildren(image); }
        else productWatermark(photo);
        const title=el('h2',p.nombre);title.title=p.nombre;
        const preview=el('p',String(p.descripcion||'').replace(/\s+/g,' ').trim(),'description'),details=el('button','Ver detalles','product-details-link'),pricing=el('div',undefined,'catalog-pricing');
        details.type='button';details.setAttribute('aria-label','Ver detalles de '+p.nombre);
        details.onclick=()=>{
          $('catalogDetailDialog').dataset.productId=id;
          if(commerce){commerce.openProduct(id);return;}
          $('catalogDetailTitle').textContent=p.nombre;$('catalogDetailDescription').textContent=p.descripcion||'Este producto todavía no tiene una descripción.';
          $('catalogDetailPhoto').replaceChildren();$('catalogDetailPhoto').hidden=!url;
          if(url){const image=el('img');image.src=url;image.alt=p.nombre;$('catalogDetailPhoto').append(image);}
          $('catalogDetailDialog').showModal();$('catalogDetailDialog').scrollTop=0;document.body.classList?.add('catalog-detail-open');
        };
        const availability=el('span',window.CATALOGO_PRODUCTS.availability(p),'availability-badge');availability.dataset.state=p.estado||'disponible';
        body.append(el('span',p.categoria || 'Impresión 3D','tag'),el('small','Ref. '+window.CATALOGO_PRODUCTS.reference(p,id),'product-reference'),title,availability,el('small',p.plazo||'Plazo a confirmar','product-lead-time'),preview,details,pricing);
        if(!shopView&&!checkingShop)pricing.append(el('p',money(p.precio),'price'),el('small','Precio de venta al público'));
        if(validTrade(wholesale[id])){
          const trade=wholesale[id],total=Math.round(trade.precio*100)*trade.minimo/100,box=el('div',undefined,'wholesale');
          box.append(el('strong',money(trade.precio)+' / unidad','wholesale-unit'),el('p','Pedido mínimo: '+trade.minimo+(trade.minimo===1?' unidad':' unidades')+' '+window.CATALOGO_PRODUCTS.minimumLabel(trade),'wholesale-minimum'),el('span',window.CATALOGO_PRODUCTS.minimumType(trade)==='color'?'Total del mínimo por color':'Total del mínimo por producto','wholesale-total-label'),el('strong',money(total),'wholesale-total'));
          pricing.append(box);
        }else if(shopView||checkingShop)pricing.append(el('p',checkingShop?'Comprobando tus condiciones…':'Precio mayorista pendiente de configurar. Consúltanos para este producto.','wholesale-pending'));
        if(!shopView&&!checkingShop&&p.estado!=='agotado'){const url=window.CATALOGO_PRODUCTS.wallapopUrl(p.wallapop);if(url){const link=el('a','Comprar en Wallapop ↗','wallapop-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Comprar '+p.nombre+' en Wallapop (abre otra pestaña)');pricing.append(link);}}
        card.append(photo,body); $('grid').append(card);
      });
      status(items.length ? `${items.length} ${items.length===1?'producto':'productos'}` : 'No hay productos para mostrar.');
      if (!productHashHandled && location.hash?.startsWith('#producto-')) {
        try { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (target) { target.scrollIntoView({block:'center'}); target.focus?.({preventScroll:true}); productHashHandled = true; } } catch {}
      }
    }
    function resetShopForm() {
      $('shopForm').reset();
      $('shopForm').elements.uid.value = '';
      $('shopCredentials').hidden = false;
      $('shopForm').elements.email.required = true;
      $('shopForm').elements.password.required = true;
      $('shopEditEmail').hidden = true;
      $('shopFormTitle').textContent = 'Dar de alta una tienda';
      $('saveShop').textContent = 'Crear tienda';
      $('shopMessage').textContent = '';
    }
    function renderAdmin() {
      if (!admin) return;
      if(pricingDraft)renderPriceTargets();
      const productCount=Object.keys(publicProducts).length,shopCount=Object.keys(shops).length;
      $('dashboardProducts').textContent = productCount + (productCount===1?' producto':' productos');
      $('dashboardShops').textContent = shopCount + (shopCount===1?' tienda':' tiendas');
      $('adminProducts').replaceChildren();
      const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const selected=$('adminProductCategory').value, query=normalize($('adminProductSearch').value).trim();
      const categories=[...new Set(Object.values(publicProducts).map(p=>p.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
      $('adminProductCategory').replaceChildren(...['',...categories].map(value=>{const option=el('option',value||'Todas las categorías');option.value=value;return option;}));
      $('adminProductCategory').value=categories.includes(selected)?selected:'';
      const entries=Object.entries(publicProducts).filter(([id,p])=>(!$('adminProductCategory').value||p.categoria===$('adminProductCategory').value)&&normalize([p.nombre,p.categoria,p.descripcion,window.CATALOGO_PRODUCTS.reference(p,id)].join(' ')).includes(query));
      const sort=$('adminProductSort').value;
      entries.sort((a,b)=> (sort==='price-asc'?Number(a[1].precio)-Number(b[1].precio):sort==='price-desc'?Number(b[1].precio)-Number(a[1].precio):0)||String(a[1].nombre).localeCompare(String(b[1].nombre),'es')||a[0].localeCompare(b[0]));
      const pageSize=12,pages=Math.max(1,Math.ceil(entries.length/pageSize));adminProductPage=Math.min(adminProductPage,pages);
      const start=(adminProductPage-1)*pageSize;
      $('adminProductCount').textContent=entries.length+' de '+Object.keys(publicProducts).length+' productos';
      $('adminProductPage').textContent='Página '+adminProductPage+' de '+pages;
      $('adminProductPrev').disabled=adminProductPage===1;$('adminProductNext').disabled=adminProductPage===pages;
      const table=el('table',undefined,'product-management-table'),head=el('thead'),heading=el('tr'),body=el('tbody');
      for(const title of ['Producto','Precio público','Mayorista / ud.','Mínimo mayorista','Acciones']){const th=el('th',title);th.scope='col';heading.append(th);}head.append(heading);table.append(head,body);
      entries.slice(start,start+pageSize).forEach(([id,p])=>{
        const row=el('tr'),product=el('td'),info=el('div',undefined,'product-row-info'),name=el('div');
        const url=safeUrl(p.imagen);if(url){const photo=el('img');photo.src=url;photo.alt='';photo.loading='lazy';info.append(photo);}
        name.append(el('strong',p.nombre),el('small','Ref. '+window.CATALOGO_PRODUCTS.reference(p,id),'product-reference'),el('small',p.categoria||'Sin categoría'));info.append(name);product.append(info);row.append(product);
        for(const [label,value] of [['Precio público',money(p.precio)],['Mayorista / ud.',wholesale[id]?money(wholesale[id].precio):'Sin configurar'],['Mínimo mayorista',wholesale[id]?.minimo?wholesale[id].minimo+' uds. '+window.CATALOGO_PRODUCTS.minimumLabel(wholesale[id]):'—']]){const cell=el('td',value);cell.dataset.label=label;row.append(cell);}
        const actions=el('td'),buttons=el('div',undefined,'product-row-actions'),edit=el('button','Editar','secondary'),recalculate=el('button','Recalcular','secondary'),duplicate=el('button','Duplicar','secondary'),remove=el('button','Eliminar','danger-button');
        edit.setAttribute('aria-label','Editar '+p.nombre);remove.setAttribute('aria-label','Eliminar '+p.nombre);
        edit.onclick=()=>{if(!productSaving)fillProductEditor(id);};
        recalculate.setAttribute('aria-label','Recalcular '+p.nombre);
        recalculate.onclick=async()=>{
          if(!admin||productSaving)return;
          const request=++recalculateRequest,version=generation;recalculate.disabled=true;
          $('catalogListMessage').textContent='Recuperando el presupuesto del producto…';$('catalogListMessage').dataset.kind='info';
          try{
            const record=(await database.get(path('dev3dProductoPresupuestos/'+id))).val();
            if(request!==recalculateRequest||version!==generation||!admin)return;
            if(!publicProducts[id])throw Error('El producto ya no está en el catálogo.');
            const calculo=record?window.DEV3D_BUDGETS.prepare(record.calculo):null;
            showAdminView('calculator');
            if(!calculatorInstance?.loadProductBudget({id,name:publicProducts[id].nombre,calculo,minimo:wholesale[id]?.minimo}))throw Error('No se pudo abrir la calculadora. Recarga la página.');
            status(calculo?'Presupuesto recuperado. Ajusta el cálculo y pulsa «Revisar precios de este producto». El catálogo solo cambia al guardar la ficha.':'Este producto todavía no tiene presupuesto. Introduce sus costes y revisa sus precios para guardar el primer cálculo vinculado.');
            $('catalogListMessage').textContent='';
          }catch(error){if(request===recalculateRequest&&version===generation){$('catalogListMessage').textContent='No se pudo recuperar el presupuesto. '+(error.code?'Comprueba la conexión y tus permisos.':error.message);$('catalogListMessage').dataset.kind='error';status($('catalogListMessage').textContent);}}
          finally{recalculate.disabled=false;}
        };
        duplicate.setAttribute('aria-label','Duplicar '+p.nombre);duplicate.onclick=()=>{if(productSaving)return;edit.onclick();const f=$('productForm');f.elements.id.value='';f.elements.nombre.value=String(p.nombre).slice(0,142)+' (copia)';f.elements.wallapop.value='';f.elements.referencia.value='';$('formTitle').textContent='Duplicar producto';$('productMessage').textContent='Revisa los datos y guarda para publicar la copia. El producto original se conserva.';};
        remove.onclick=async()=>{if(!admin||!confirm('¿Eliminar «'+p.nombre+'» del catálogo?'))return;remove.disabled=true;try{await database.update(path(''),{['dev3dCatalogoPublico/'+id]:null,['dev3dCatalogoMayorista/'+id]:null,['dev3dProductoPresupuestos/'+id]:null});$('catalogListMessage').textContent='Producto eliminado.';$('catalogListMessage').dataset.kind='success';}catch{$('catalogListMessage').textContent='No se pudo eliminar el producto. Comprueba la conexión y tus permisos.';$('catalogListMessage').dataset.kind='error';}finally{remove.disabled=false;}};
        name.append(el('small',window.CATALOGO_PRODUCTS.availability(p)+(p.plazo?' · '+p.plazo:'')));buttons.append(edit,recalculate,duplicate,remove);actions.append(buttons);row.append(actions);body.append(row);
      });
      if(entries.length)$('adminProducts').append(table);else $('adminProducts').append(el('p',Object.keys(publicProducts).length?'No hay productos que coincidan. Prueba otra búsqueda o categoría.':'Todavía no hay productos. Pulsa «Nuevo producto» para crear el primero.','empty-list'));
      $('shops').replaceChildren();
      if (!Object.keys(shops).length) $('shops').append(el('p','Todavía no hay tiendas. Da de alta la primera desde el formulario.','empty-list'));
      Object.entries(shops).forEach(([uid,s]) => { const row = el('div',undefined,'admin-row'), edit = el('button','Editar acceso'), remove = el('button','Eliminar tienda','danger-button'); row.append(el('strong',s.nombre),el('p',(s.email ? s.email + ' · ' : '') + (s.activo ? 'Tienda autorizada' : 'Acceso desactivado'))); edit.onclick = () => { resetShopForm(); const f = $('shopForm'); f.elements.uid.value = uid; f.elements.nombre.value = s.nombre; f.elements.activo.value = String(s.activo); $('shopCredentials').hidden = true; f.elements.email.required = false; f.elements.password.required = false; $('shopEditEmail').hidden = false; $('shopEditEmail').textContent = s.email || 'Cuenta ya autorizada'; $('shopFormTitle').textContent = 'Editar acceso de tienda'; $('saveShop').textContent = 'Guardar acceso'; f.scrollIntoView({behavior:'smooth'}); }; remove.onclick=async()=>{
        if(!admin || !confirm('¿Eliminar la tienda «'+s.nombre+'» y retirar su acceso mayorista?'))return;
        remove.disabled=true;
        try{await database.set(path('dev3dTiendas/'+uid),null);if($('shopForm').elements.uid.value===uid)resetShopForm();status('Tienda eliminada y acceso mayorista retirado.');}
        catch{status('No se pudo eliminar la tienda. Comprueba la conexión y tus permisos.');}
        finally{remove.disabled=false;}
      };row.append(edit,remove); $('shops').append(row); });
    }
    let emailSyncInFlight=false;
    async function syncShopEmail(profile){
      if(!shopPage||emailSyncInFlight||!currentUser||profile?.rol!=='tienda')return;
      const user=currentUser,version=generation;emailSyncInFlight=true;
      try{await window.CATALOGO_ACCOUNT.syncEmail({sdk:authentication,user,profile,saveEmail:async(uid,email)=>{
        if(version!==generation||currentUser?.uid!==uid||currentShopProfile?.rol!=='tienda')return;
        await database.set(path('dev3dTiendas/'+uid+'/email'),email);
      }});return true;}
      catch(error){if(version===generation&&currentShopProfile?.rol==='tienda')$('accountStateMessage').textContent='No se pudo sincronizar el correo del perfil. Pulsa Actualizar estado de mi correo para reintentarlo.';return false;}
      finally{emailSyncInFlight=false;}
    }
    if(shopPage){
      auth.languageCode='es';
      $('emailChangeForm').onsubmit=async event=>{
        event.preventDefault();if(!currentUser||admin||currentShopProfile?.rol!=='tienda')return;
        const form=event.currentTarget;if(!form.reportValidity())return;
        const button=form.querySelector('button');button.disabled=true;$('emailChangeMessage').textContent='Preparando el cambio…';
        try{const email=await window.CATALOGO_ACCOUNT.changeEmail({sdk:authentication,user:currentUser,currentPassword:form.elements.currentPassword.value,newEmail:form.elements.newEmail.value});form.reset();$('emailChangeMessage').textContent='Enlace enviado a '+email+'. Confirma el nuevo correo y vuelve a iniciar sesión con él. Si no lo ves, revisa el correo no deseado.';}
        catch(error){$('emailChangeMessage').textContent=window.CATALOGO_ACCOUNT.errorMessage(error);}
        finally{form.elements.currentPassword.value='';button.disabled=false;}
      };
      $('passwordChangeForm').onsubmit=async event=>{
        event.preventDefault();if(!currentUser||admin||currentShopProfile?.rol!=='tienda')return;
        const form=event.currentTarget;if(!form.reportValidity())return;
        const button=form.querySelector('button');button.disabled=true;$('passwordChangeMessage').textContent='Guardando contraseña…';
        try{await window.CATALOGO_ACCOUNT.changePassword({sdk:authentication,user:currentUser,currentPassword:form.elements.currentPassword.value,newPassword:form.elements.newPassword.value,confirmation:form.elements.confirmation.value});$('passwordChangeMessage').textContent='Contraseña actualizada. Utilízala la próxima vez que inicies sesión.';}
        catch(error){$('passwordChangeMessage').textContent=window.CATALOGO_ACCOUNT.errorMessage(error);}
        finally{form.reset();button.disabled=false;}
      };
      $('refreshAccount').onclick=async()=>{
        if(!currentUser||currentShopProfile?.rol!=='tienda')return;
        const button=$('refreshAccount');button.disabled=true;
        try{await authentication.reload(currentUser);const synced=await syncShopEmail(currentShopProfile);$('accountCurrentEmail').textContent=currentUser?.email||'';if(currentUser)$('shopAccountEmail').textContent=currentUser.email||'';if(currentUser&&synced)$('accountStateMessage').textContent='Correo de acceso: '+currentUser.email+'. Si acabas de confirmarlo y no ha cambiado, cierra sesión y entra con el nuevo correo.';}
        catch(error){$('accountStateMessage').textContent=window.CATALOGO_ACCOUNT.errorMessage(error);}
        finally{button.disabled=false;}
      };
    }
    if (catalogPage) {
      ['search','category','sort'].forEach(id => $(id).addEventListener('input', render));
      $('clearCatalogFilters').onclick=()=>{$('search').value='';$('category').value='';$('sort').value='name';render();};
      if(!commerce){$('closeCatalogDetail').onclick=()=>$('catalogDetailDialog').close();
      $('catalogDetailDialog').onclose=()=>document.body.classList?.remove('catalog-detail-open');}
    }
    if (adminPage) {
      function showCalculator(open) { showAdminView(open ? 'calculator' : 'catalog'); }
      $('goCatalog').onclick = () => showAdminView('catalog');
      $('goShops').onclick = () => showAdminView('shops');
      $('goOrders').onclick = () => showAdminView('orders');
      $('pricingSearch').oninput=renderPriceTargets;$('pricingTarget').onchange=previewPriceTarget;
      $('pricingCancel').onclick=()=>$('pricingProductDialog').close();$('pricingProductDialog').onclose=()=>{pricingDraft=null;};
      $('pricingAccept').onclick=()=>{if(!admin||!pricingDraft)return;const data={...pricingDraft,type:'dev3d:product-draft',productId:$('pricingTarget').value};if(!publicProducts[data.productId]){renderPriceTargets();return;}if(importCalculatorDraft(data))$('pricingProductDialog').close();};
      $('productForm').oninput=refreshPricingWarnings;
      $('openCalculator').onclick = () => showCalculator(true);
      $('closeCalculator').onclick = () => showAdminView('home');
      function productFeedback(message,kind='info'){$('productMessage').textContent=message;$('productMessage').dataset.kind=kind;}
      $('closeProductDialog').onclick=()=>{if(!productSaving)showProductEditor(false);};
      $('productDialog').oncancel=event=>{if(productSaving)event.preventDefault();};
      $('productDialog').onclose=()=>{$('productForm').hidden=true;document.body.classList?.remove('product-modal-open');};
      $('resetProduct').onclick = () => { if(productSaving)return;$('productForm').reset();pendingCalculation=null; $('formTitle').textContent = 'Nuevo producto'; uploadedPhoto=null;uploadedGallery.clear(); productFeedback('');showProductEditor(false); };
      $('newProduct').onclick=()=>{if(productSaving)return;$('productForm').reset();pendingCalculation=null;uploadedPhoto=null;uploadedGallery.clear();$('formTitle').textContent='Nuevo producto';productFeedback('');refreshPricingWarnings();$('catalogListMessage').textContent='';showProductEditor(true);$('productForm').elements.nombre.focus();};
      for(const id of ['adminProductSearch','adminProductCategory','adminProductSort'])$(id).oninput=()=>{adminProductPage=1;renderAdmin();};
      $('adminProductPrev').onclick=()=>{if(adminProductPage>1){adminProductPage--;renderAdmin();}};
      $('adminProductNext').onclick=()=>{adminProductPage++;renderAdmin();};
      $('productForm').onsubmit = async event => {
        event.preventDefault();if(productSaving)return;
        if(!admin){productFeedback('Inicia sesión con una cuenta de administrador para guardar productos.','error');return;}
        const f=event.currentTarget,fields=f.elements;
        refreshPricingWarnings();
        if(fields.id.value&&!publicProducts[fields.id.value]){productFeedback('Este producto ya no está en el catálogo. Cierra la ficha y selecciona otro producto.','error');return;}
        let values;
        try{values=window.CATALOGO_PRODUCTS.validate(Object.fromEntries(['nombre','descripcion','categoria','precio','mayorista','minimo','minimoTipo','wallapop','estado','plazo','colores','personalizable','referencia'].map(key=>[key,fields[key].value])));}
        catch(error){productFeedback(error.message,'error');fields[error.field]?.focus();return;}
        if(typeof navigator!=='undefined'&&navigator.onLine===false){productFeedback('No hay conexión. Conéctate a internet antes de guardar el producto.','error');return;}
        productSaving=true;const button=$('saveProduct');button.disabled=true;button.textContent='Guardando…';$('resetProduct').disabled=true;f.setAttribute('aria-busy','true');productFeedback('Guardando el producto…');
        const calculation=pendingCalculation;
        const waiting=setTimeout(()=>productFeedback('El guardado está tardando. Comprueba la conexión; Firebase todavía no ha confirmado el producto.'),8000);
        try{
          const id=fields.id.value||database.push(path('dev3dCatalogoPublico')).key;
          const referencia=values.referencia||window.CATALOGO_PRODUCTS.reference({},id);
          if(Object.entries(publicProducts).some(([otherId,product])=>otherId!==id&&window.CATALOGO_PRODUCTS.reference(product,otherId).toLowerCase()===referencia.toLowerCase()))throw Object.assign(new Error('Ya existe otro producto con esa referencia. Utiliza una diferente.'),{code:'product/reference'});
          let image=fields.imagen.value.trim();const file=fields.foto.files[0];
          if(image&&!window.CATALOGO_PRODUCTS.imageUrl(image))throw Object.assign(new Error('La URL de la imagen debe comenzar por https:// o http://.'),{code:'product/image-url'});
          const galleryUrls=fields.galeria.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean),extraFiles=[...fields.fotosExtra.files];
          if(galleryUrls.some(url=>!window.CATALOGO_PRODUCTS.imageUrl(url)))throw Object.assign(new Error('Revisa las URLs de la galería: deben comenzar por https:// o http://.'),{code:'product/gallery'});
          if(galleryUrls.length+extraFiles.length+((file||image)?1:0)>6)throw Object.assign(new Error('Se permiten hasta 6 fotos en total, incluida la principal.'),{code:'product/gallery'});
          let photoSummary='';
          if(file){
            if(uploadedPhoto?.file===file){image=uploadedPhoto.url;photoSummary=uploadedPhoto.summary;}
            else{
              productFeedback('Comprimiendo la fotografía antes de subirla…');button.textContent='Optimizando foto…';
              const optimized=await window.CATALOGO_IMAGES.compress(file);
              const kiloBytes=new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(optimized.size/1024);
              photoSummary='Fotografía: '+kiloBytes+' KB'+(optimized.saving>0?' ('+optimized.saving+' % menos).':'.');
              productFeedback(photoSummary+' Subiendo la imagen optimizada…');button.textContent='Subiendo foto…';
              const imageRef=storageSDK.ref(storage,'productos/dev3d-catalogo/'+id+'_'+Date.now()+'.'+optimized.extension);
              await storageSDK.uploadBytes(imageRef,optimized.blob,{contentType:optimized.type});image=await storageSDK.getDownloadURL(imageRef);
              uploadedPhoto={file,url:image,summary:photoSummary};
            }
            productFeedback(photoSummary+' Guardando el producto…');button.textContent='Guardando…';
          }
          for(const [index,extraFile] of extraFiles.entries()){
            if(!uploadedGallery.has(extraFile)){productFeedback('Optimizando foto adicional '+(index+1)+' de '+extraFiles.length+'…');const optimized=await window.CATALOGO_IMAGES.compress(extraFile);const ref=storageSDK.ref(storage,'productos/dev3d-catalogo/'+id+'_galeria_'+index+'_'+Date.now()+'.'+optimized.extension);await storageSDK.uploadBytes(ref,optimized.blob,{contentType:optimized.type});uploadedGallery.set(extraFile,await storageSDK.getDownloadURL(ref));}
            galleryUrls.push(uploadedGallery.get(extraFile));
          }
          if(image&&!window.CATALOGO_PRODUCTS.imageUrl(image))throw Object.assign(new Error('La URL de la imagen debe comenzar por https:// o http://.'),{code:'product/image-url'});
          const imagenes=[...new Set([image,...galleryUrls].filter(Boolean))];image=image||imagenes[0]||'';
          const updates={['dev3dCatalogoPublico/'+id]:{nombre:values.nombre,descripcion:values.descripcion,categoria:values.categoria,imagen:image,precio:values.precio,wallapop:values.wallapop,imagenes,colores:values.colores,estado:values.estado,plazo:values.plazo,personalizable:values.personalizable,referencia},['dev3dCatalogoMayorista/'+id]:{precio:values.mayorista,minimo:values.minimo,minimoTipo:values.minimoTipo}};
          if(calculation)updates['dev3dProductoPresupuestos/'+id]={nombre:values.nombre.slice(0,100),calculo:calculation,actualizado:database.serverTimestamp()};
          await database.update(path(''),updates);
          pendingCalculation=null;
          uploadedGallery.clear();
          f.reset();uploadedPhoto=null;$('formTitle').textContent='Nuevo producto';productFeedback('Producto guardado. Ya está publicado en el catálogo.'+(calculation?' Presupuesto vinculado: podrás recuperarlo con «Recalcular».':'')+(photoSummary?' '+photoSummary:''),'success');
          $('catalogListMessage').textContent=$('productMessage').textContent;$('catalogListMessage').dataset.kind='success';showProductEditor(false);
        }catch(error){productFeedback(window.CATALOGO_PRODUCTS.errorMessage(error),'error');}
        finally{clearTimeout(waiting);productSaving=false;button.disabled=false;button.textContent='Guardar producto';$('resetProduct').disabled=false;f.removeAttribute('aria-busy');}
      };
      $('resetShop').onclick = () => resetShopForm();
      $('shopForm').onsubmit = async event => {
        event.preventDefault(); if (!admin) return;
        const f = event.currentTarget, fields = f.elements, editUid = fields.uid.value;
        if (!f.reportValidity() || !fields.nombre.value.trim()) return;
        const button = $('saveShop'); button.disabled = true; $('resetShop').disabled = true;
        const profile = {nombre:fields.nombre.value.trim(),activo:fields.activo.value === 'true'};
        $('shopMessage').textContent = editUid ? 'Guardando acceso…' : 'Creando cuenta y autorizando tienda…';
        try {
          if (editUid) {
            await database.update(path('dev3dTiendas/' + editUid), profile);
          } else {
            if (window.CATALOGO_CONFIG.ADMIN_EMAILS.includes(fields.email.value.trim().toLowerCase())) throw Object.assign(new Error('Utiliza el correo de la tienda, no una cuenta de administrador.'),{code:'shop/admin-email'});
            const sessionUid = currentUser.uid;
            await window.CATALOGO_SHOPS.createShop({appSDK,authSDK:authentication,config:window.CATALOGO_CONFIG.firebaseConfig,email:fields.email.value,password:fields.password.value,profile,saveProfile:async (uid,data) => {
              if (!admin || currentUser?.uid !== sessionUid) throw new Error('La sesión de administrador ha cambiado.');
              await database.update(path('dev3dTiendas/' + uid),data);
            }});
          }
          resetShopForm();
          $('shopMessage').textContent = editUid ? 'Acceso actualizado.' : 'Tienda creada. ' + (profile.activo ? 'Ya puede iniciar sesión con el correo y la contraseña que has indicado.' : 'Su acceso mayorista está desactivado hasta que lo autorices.');
        } catch(error) { $('shopMessage').textContent = window.CATALOGO_SHOPS.errorMessage(error); }
        finally { fields.password.value = ''; button.disabled = false; $('resetShop').disabled = false; }
      };
    }
    authentication.onAuthStateChanged(auth, async user => {
      const version = ++generation;
      if(adminPage){pricingDraft=null;pendingCalculation=null;recalculateRequest++;$('pricingProductDialog').close();if(currentUser?.uid!==user?.uid&&calculatorInstance){calculatorInstance.destroy();calculatorInstance=null;$('calculatorMount').replaceChildren();}}
      if(currentUser?.uid&&currentUser.uid!==user?.uid)window.CATALOGO_ORDER_DRAFT?.create(orderStorage()).remove(currentUser.uid);
      resetSubscriptions(); currentUser = user; currentShopProfile = null; wholesale = {}; publicProducts = {}; shops = {};
      historyView?.reset();
      uploadedGallery.clear();commerce?.resetSession(user?.uid||'public');
      renderCategoryNavigation();
      admin = window.CATALOGO_NAVIGATION.roleFor(user,null,window.CATALOGO_CONFIG.ADMIN_EMAILS) === 'admin';
      setSessionUI(admin ? 'admin' : user ? 'member' : 'public');
      if (shopPage && admin) { location.replace('admin.html'); return; }
      if (adminPage) {
        resetShopForm(); $('rulesNotice').hidden = true;
        adminProductPage=1;uploadedPhoto=null;showProductEditor(false);
        $('adminPanel').hidden = !admin; $('adminProducts').replaceChildren(); $('shops').replaceChildren(); $('productForm').reset();
        if (admin) { status(''); showAdminView(location.hash === '#calculadora' ? 'calculator' : location.hash === '#pedidos' ? 'orders' : 'home'); }
        else { if(calculatorInstance){calculatorInstance.destroy();calculatorInstance=null;} $('calculatorMount').replaceChildren(); document.body.dataset.adminView = ''; $('calculatorPanel').hidden = true; $('productWorkspace').hidden = true; $('shopsView').hidden = true; $('orderHistorySection').hidden=true; $('closeCalculator').hidden = true; status(''); }
      } else if (catalogPage) {
        $('grid').replaceChildren(); $('mode').textContent = 'Precios de venta al público.';
      }
      if (homePage || catalogPage || shopPage || (adminPage && admin)) {
        watch('dev3dCatalogoPublico', value => { if (version === generation) { publicProducts = value; renderCategoryNavigation(); render(); } });
      }
      if (admin && (adminPage || catalogPage)) {
        if(adminPage&&historyView){const stop=database.onValue(path('dev3dPedidos'),snapshot=>{if(version===generation&&admin)historyView.setData(snapshot.val());},()=>{if(version===generation&&admin)historyView.fail();});subscriptions.push(stop);}
        watch('dev3dCatalogoMayorista', value => { if (version === generation) { wholesale = value; render(); } });
        if (adminPage) watch('dev3dTiendas', value => { if (version === generation) { shops = value; renderAdmin(); } });
      } else if (user && !admin) {
        watch('dev3dTiendas/' + user.uid, profile => {
          if (version !== generation) return;
          if (tradeStop) { tradeStop(); tradeStop = null; }
          wholesale = {};
          const role = window.CATALOGO_NAVIGATION.roleFor(user,profile,window.CATALOGO_CONFIG.ADMIN_EMAILS);
          currentShopProfile=profile;
          setSessionUI(role,profile);
          if(shopPage&&historyView){if(historyStop){historyStop();historyStop=null;}historyView.reset();if(profile?.rol==='tienda')historyStop=database.onValue(path('dev3dPedidos/'+user.uid),snapshot=>{if(version===generation&&currentUser?.uid===user.uid&&currentShopProfile?.rol==='tienda')historyView.setData(snapshot.val(),user.uid);},()=>{if(version===generation&&currentUser?.uid===user.uid&&currentShopProfile?.rol==='tienda')historyView.fail();});}
          if(shopPage)syncShopEmail(profile);
          if (catalogPage) {
            render();
            $('mode').textContent = role === 'shop' ? 'Precios mayoristas por unidad y total mínimo. Cada producto indica si el mínimo se exige por color o permite combinar colores.' : 'Tu cuenta no tiene acceso mayorista. Contacta con DEV3D Studio para solicitarlo.';
            if (role === 'shop') tradeStop = database.onValue(path('dev3dCatalogoMayorista'), snap => { if (version === generation && currentShopProfile?.rol==='tienda' && currentShopProfile.activo===true) { wholesale = snap.val() || {}; render(); } }, () => { if (version === generation) { wholesale = {}; render(); status('No se pudieron consultar tus precios mayoristas.'); } });
          }
        });
      }
    });
  } catch (error) { console.error(error); status('No se pudo iniciar el catálogo. Comprueba tu conexión y vuelve a cargar la página.'); }
})();
