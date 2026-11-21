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
  const status = message => { $('status').textContent = message; };
  function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function safeUrl(value) { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
  function setSessionUI(role, profile = {}) {
    document.body.dataset.role = role;
    $('identity').textContent = role === 'admin' ? 'Administrador' : role === 'shop' ? (profile.nombre || 'Cuenta de tienda') : currentUser ? 'Cuenta sin acceso mayorista' : 'Explora nuestro catálogo';
    $('menuLabel').textContent = role === 'admin' ? 'Administración' : role === 'shop' ? 'Mi tienda' : 'Menú';
    $('adminLink').hidden = role !== 'admin';
    $('menuCatalog').hidden = role === 'shop';
    $('headerCatalog').textContent = role === 'shop' ? 'Catálogo mayorista' : 'Catálogo';
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
  function importCalculatorDraft(data){
    if (!admin || !adminPage) return false;
    const draft=window.CATALOGO_DRAFT.validateDraft(data);
    if (!draft) return false;
        const form = $('productForm');
        if ((form.elements.id.value || form.elements.nombre.value.trim()) && !confirm('Hay un producto en edición. ¿Sustituir el formulario por un nuevo borrador de la calculadora?')) return false;
        form.reset();
        form.elements.id.value = '';
        for (const [key,value] of Object.entries(draft)) form.elements[key].value = value;
        $('formTitle').textContent = 'Nuevo producto desde la calculadora';
        showAdminView('catalog');
        status('Precios y mínimo preparados. Añade la foto y la categoría, revisa los datos y pulsa Guardar producto para publicarlo.');
        form.scrollIntoView({behavior:'smooth'});
    return true;
  }
  function showAdminView(view) {
    if (!admin || !adminPage) return;
    if (!['home','catalog','shops','calculator'].includes(view)) view = 'home';
    $('adminDashboard').hidden = view !== 'home';
    $('catalogView').hidden = view !== 'catalog';
    $('productWorkspace').hidden = view !== 'catalog';
    $('shopsView').hidden = view !== 'shops';
    $('calculatorPanel').hidden = view !== 'calculator';
    $('closeCalculator').hidden = view === 'home';
    const content = {
      home:['Panel de administración','Elige qué quieres hacer. Todas tus herramientas, en un solo lugar.'],
      catalog:['Gestión del catálogo','Añade productos, fotografías y precios para particulares y tiendas.'],
      shops:['Gestión de tiendas','Crea cuentas y gestiona el acceso a tus precios mayoristas.'],
      calculator:['Calculadora de precios','Calcula tus costes y convierte el resultado en un nuevo producto.']
    }[view];
    $('viewTitle').textContent = content[0]; $('viewDescription').textContent = content[1];
    document.body.dataset.adminView = view;
    if (view === 'calculator' && !calculatorInstance) {
      try {
        const mount = $('calculatorMount');
        mount.replaceChildren($('calculatorTemplate').content.cloneNode(true));
        calculatorInstance = window.DEV3D_CALCULATOR.mount(mount.firstElementChild,{onDraft:importCalculatorDraft});
      } catch(error) { console.error(error); $('calculatorMount').replaceChildren(); status('No se pudo abrir la calculadora. Recarga la página e inténtalo de nuevo.'); }
    }
    $('viewTitle').focus?.({preventScroll:true});
  }
  if (homePage) {
    const reviews = window.DEV3D_WEB_CONTENT?.googleReviews;
    const url = window.CATALOGO_HOME.googleReviewUrl(reviews?.url);
    if (url) {
      $('googleReviews').hidden = false; $('googleReviewsLink').href = url;
      (Array.isArray(reviews.items) ? reviews.items : []).slice(0,3).forEach(review=>{
        if (typeof review.author !== 'string' || typeof review.text !== 'string' || !review.author.trim() || !review.text.trim() || !Number.isInteger(review.rating) || review.rating<1 || review.rating>5) return;
        const card=el('figure',undefined,'google-review-card');
        const stars=el('p','★'.repeat(review.rating)+'☆'.repeat(5-review.rating),'review-stars'); stars.setAttribute('aria-label',review.rating+' de 5 estrellas');
        const quote=el('blockquote',review.text);
        const caption=el('figcaption'), source=el('a','Ver en Google ↗');source.href=window.CATALOGO_HOME.googleReviewUrl(review.url)||url;source.target='_blank';source.rel='noopener noreferrer';
        caption.append(el('strong',review.author),source);card.append(stars,quote,caption);$('googleReviewCards').append(card);
      });
    }
  }
  try {
    const databaseURL = window.CATALOGO_CONFIG?.firebaseConfig?.databaseURL;
    if (!databaseURL) { status('Falta configurar la base de datos del catálogo en firebase-config.js.'); return; }
    const [appSDK, database, authentication, storageSDK] = await window.CATALOGO_BOOT.loadFirebase();
    const app = appSDK.initializeApp(window.CATALOGO_CONFIG.firebaseConfig, 'dev3d-catalog');
    const db = database.getDatabase(app, databaseURL), auth = authentication.getAuth(app), storage = storageSDK.getStorage(app);
    const path = name => name ? database.ref(db, name) : database.ref(db);
    const watch = (name, callback) => { subscriptions.push(database.onValue(path(name), snap => callback(snap.val() || {}), error => {
      if (homePage) { $('featuredStatus').textContent = 'No hemos podido cargar las piezas. Puedes consultar el catálogo completo.'; }
      const denied = String(error?.code || error?.message || '').toLowerCase().replaceAll('_','-').includes('permission-denied');
      if (adminPage && admin && denied) $('rulesNotice').hidden = false;
      status(adminPage ? 'No se pudieron cargar los datos. Comprueba la conexión y las reglas de acceso del catálogo.' : 'El catálogo no está disponible en este momento. Inténtalo de nuevo más tarde.');
    })); };
    function resetSubscriptions() { subscriptions.forEach(stop => stop()); subscriptions = []; if (tradeStop) { tradeStop(); tradeStop = null; } }
    function openLogin() { $('mainMenu').open = false; $('loginError').textContent = ''; $('loginDialog').showModal(); }
    $('loginOpen').onclick = openLogin;
    if (homePage) $('homeShopLogin').onclick = openLogin;
    if (adminPage || shopPage) $('gateLogin').onclick = openLogin;
    document.addEventListener?.('click', event => { const menu = $('mainMenu'); if (menu.open && !menu.contains(event.target)) menu.open = false; });
    window.addEventListener('keydown', event => { if (event.key === 'Escape') $('mainMenu').open = false; });
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
        image.src = safeUrl(p.imagen); image.alt = p.nombre; image.loading = 'lazy'; image.decoding = 'async';
        image.addEventListener('error',()=>{ photo.replaceChildren(el('span','Fotografía no disponible','image-unavailable')); });
        photo.append(image);
        const body = el('div',undefined,'featured-product-body');
        body.append(el('span',p.categoria || 'Impresión 3D','tag'),el('h3',p.nombre),el('p',money(p.precio),'featured-price'),el('span','Ver pieza →','featured-action'));
        card.append(photo,body); $('featuredProducts').append(card);
      });
    }
    function render() {
      if (homePage) { renderFeatured(); return; }
      if (shopPage) { status(''); return; }
      if (adminPage) { renderAdmin(); return; }
      const query = $('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const selected = $('category').value;
      const categories = [...new Set(Object.values(publicProducts).map(p => p.categoria).filter(Boolean))].sort();
      $('category').replaceChildren(new Option('Todas las categorías',''), ...categories.map(c => new Option(c,c)));
      $('category').value = categories.includes(selected) ? selected : '';
      const items = Object.entries(publicProducts).filter(([,p]) => (!selected || p.categoria === selected) && `${p.nombre} ${p.descripcion || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
      const price = ([id,p]) => wholesale[id]?.precio ?? p.precio;
      items.sort((a,b) => $('sort').value === 'name' ? a[1].nombre.localeCompare(b[1].nombre,'es') : ($('sort').value === 'asc' ? 1 : -1) * (price(a)-price(b)));
      $('grid').replaceChildren();
      items.forEach(([id,p]) => {
        const card = el('article', undefined,'card'), photo = el('div','3D','photo'), body = el('div',undefined,'card-body');
        card.id = 'producto-' + id; card.tabIndex = -1;
        const url = safeUrl(p.imagen);
        if (url) { const image = el('img'); image.src = url; image.alt = p.nombre; image.loading = 'lazy'; image.onerror = () => photo.replaceChildren(el('span','3D')); photo.replaceChildren(image); }
        body.append(el('span',p.categoria || 'Impresión 3D','tag'),el('h2',p.nombre),el('p',p.descripcion || '', 'description'),el('p',money(p.precio),'price'),el('small','Precio de venta al público'));
        if (wholesale[id]) { const box = el('div',undefined,'wholesale'); box.append(el('strong',`${money(wholesale[id].precio)} / unidad`),el('p',`Precio mayorista · Mínimo: ${wholesale[id].minimo} unidades`)); body.append(box); }
        card.append(photo,body); $('grid').append(card);
      });
      status(items.length ? `${items.length} productos` : 'No hay productos para mostrar.');
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
      $('dashboardProducts').textContent = Object.keys(publicProducts).length + ' productos';
      $('dashboardShops').textContent = Object.keys(shops).length + ' tiendas';
      $('adminProducts').replaceChildren();
      Object.entries(publicProducts).forEach(([id,p]) => {
        const row = el('div',undefined,'admin-row'), edit = el('button','Editar'), remove = el('button','Eliminar','secondary');
        row.append(el('strong',p.nombre),el('p',`Público: ${money(p.precio)} · Mayorista: ${wholesale[id] ? money(wholesale[id].precio) : 'Sin configurar'} · Mínimo: ${wholesale[id]?.minimo ?? '?'}`));
        edit.onclick = () => { const f = $('productForm'); f.reset(); for (const key of ['nombre','descripcion','categoria','imagen','precio']) f.elements[key].value = p[key] ?? ''; f.elements.id.value = id; f.elements.mayorista.value = wholesale[id]?.precio ?? ''; f.elements.minimo.value = wholesale[id]?.minimo ?? 1; $('formTitle').textContent = 'Editar producto'; f.scrollIntoView({behavior:'smooth'}); };
        remove.onclick = async () => { if (!confirm(`¿Eliminar «${p.nombre}» del catálogo?`)) return; try { await database.update(path(''),{[`dev3dCatalogoPublico/${id}`]:null,[`dev3dCatalogoMayorista/${id}`]:null}); } catch { status('No se pudo eliminar el producto.'); } };
        row.append(edit,remove); $('adminProducts').append(row);
      });
      if (!Object.keys(publicProducts).length) $('adminProducts').append(el('p','Todavía no hay productos. Crea el primero desde el formulario.','empty-list'));
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
    if (catalogPage) ['search','category','sort'].forEach(id => $(id).addEventListener('input', render));
    if (adminPage) {
      function showCalculator(open) { showAdminView(open ? 'calculator' : 'catalog'); }
      $('goCatalog').onclick = () => showAdminView('catalog');
      $('goShops').onclick = () => showAdminView('shops');
      $('openCalculator').onclick = () => showCalculator(true);
      $('closeCalculator').onclick = () => showAdminView('home');
      function productFeedback(message,kind='info'){$('productMessage').textContent=message;$('productMessage').dataset.kind=kind;}
      $('resetProduct').onclick = () => { $('productForm').reset(); $('formTitle').textContent = 'Nuevo producto'; uploadedPhoto=null; productFeedback(''); };
      $('productForm').onsubmit = async event => {
        event.preventDefault();if(productSaving)return;
        if(!admin){productFeedback('Inicia sesión con una cuenta de administrador para guardar productos.','error');return;}
        const f=event.currentTarget,fields=f.elements;
        let values;
        try{values=window.CATALOGO_PRODUCTS.validate(Object.fromEntries(['nombre','descripcion','categoria','precio','mayorista','minimo'].map(key=>[key,fields[key].value])));}
        catch(error){productFeedback(error.message,'error');fields[error.field]?.focus();return;}
        if(typeof navigator!=='undefined'&&navigator.onLine===false){productFeedback('No hay conexión. Conéctate a internet antes de guardar el producto.','error');return;}
        productSaving=true;const button=$('saveProduct');button.disabled=true;button.textContent='Guardando…';$('resetProduct').disabled=true;f.setAttribute('aria-busy','true');productFeedback('Guardando el producto…');
        const waiting=setTimeout(()=>productFeedback('El guardado está tardando. Comprueba la conexión; Firebase todavía no ha confirmado el producto.'),8000);
        try{
          const id=fields.id.value||database.push(path('dev3dCatalogoPublico')).key;
          let image=fields.imagen.value.trim();const file=fields.foto.files[0];
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
          if(image&&!safeUrl(image))throw Object.assign(new Error('La URL de la imagen debe comenzar por https:// o http://.'),{code:'product/image-url'});
          await database.update(path(''),{['dev3dCatalogoPublico/'+id]:{nombre:values.nombre,descripcion:values.descripcion,categoria:values.categoria,imagen:image,precio:values.precio},['dev3dCatalogoMayorista/'+id]:{precio:values.mayorista,minimo:values.minimo}});
          f.reset();uploadedPhoto=null;$('formTitle').textContent='Nuevo producto';productFeedback('Producto guardado. Ya está publicado en el catálogo.'+(photoSummary?' '+photoSummary:''),'success');
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
      resetSubscriptions(); currentUser = user; currentShopProfile = null; wholesale = {}; publicProducts = {}; shops = {};
      admin = window.CATALOGO_NAVIGATION.roleFor(user,null,window.CATALOGO_CONFIG.ADMIN_EMAILS) === 'admin';
      setSessionUI(admin ? 'admin' : user ? 'member' : 'public');
      if (shopPage && admin) { location.replace('admin.html'); return; }
      if (adminPage) {
        resetShopForm(); $('rulesNotice').hidden = true;
        $('adminPanel').hidden = !admin; $('adminProducts').replaceChildren(); $('shops').replaceChildren(); $('productForm').reset();
        if (admin) { status(''); showAdminView(location.hash === '#calculadora' ? 'calculator' : 'home'); }
        else { if(calculatorInstance){calculatorInstance.destroy();calculatorInstance=null;} $('calculatorMount').replaceChildren(); document.body.dataset.adminView = ''; $('calculatorPanel').hidden = true; $('productWorkspace').hidden = true; $('shopsView').hidden = true; $('closeCalculator').hidden = true; status(''); }
      } else if (catalogPage) {
        $('grid').replaceChildren(); $('mode').textContent = 'Precios de venta al público.';
      }
      if (homePage || catalogPage || (adminPage && admin)) {
        watch('dev3dCatalogoPublico', value => { if (version === generation) { publicProducts = value; render(); } });
      }
      if (admin && (adminPage || catalogPage)) {
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
          if(shopPage)syncShopEmail(profile);
          if (catalogPage) {
            render();
            $('mode').textContent = role === 'shop' ? 'Tu tarifa de tienda está activa. Consulta el precio mayorista y el mínimo de cada producto.' : 'Tu cuenta no tiene acceso mayorista. Contacta con DEV3D Studio para solicitarlo.';
            if (role === 'shop') tradeStop = database.onValue(path('dev3dCatalogoMayorista'), snap => { if (version === generation) { wholesale = snap.val() || {}; render(); } }, () => { if (version === generation) { wholesale = {}; render(); status('No se pudieron consultar tus precios mayoristas.'); } });
          }
        });
      }
    });
  } catch (error) { console.error(error); status('No se pudo iniciar el catálogo. Comprueba tu conexión y vuelve a cargar la página.'); }
})();
