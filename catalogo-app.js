(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const adminPage = document.body.dataset.admin === 'true';
  const money = value => new Intl.NumberFormat('es-ES', {style:'currency',currency:'EUR'}).format(value);
  let publicProducts = {}, wholesale = {}, shops = {}, currentUser = null, admin = false, generation = 0;
  let subscriptions = [];
  const status = message => { $('status').textContent = message; };
  function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function safeUrl(value) { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
  try {
    const databaseURL = window.CATALOGO_CONFIG?.firebaseConfig?.databaseURL;
    if (!databaseURL) { status('Falta configurar la base de datos del catálogo en firebase-config.js.'); return; }
    const [appSDK, database, authentication, storageSDK] = await window.CATALOGO_BOOT.loadFirebase();
    const app = appSDK.initializeApp(window.CATALOGO_CONFIG.firebaseConfig, 'dev3d-catalog');
    const db = database.getDatabase(app, databaseURL), auth = authentication.getAuth(app), storage = storageSDK.getStorage(app);
    const path = name => database.ref(db, name);
    const watch = (name, callback) => { subscriptions.push(database.onValue(path(name), snap => callback(snap.val() || {}), error => {
      const denied = String(error?.code || error?.message || '').toLowerCase().replaceAll('_','-').includes('permission-denied');
      if (adminPage && admin && denied) $('rulesNotice').hidden = false;
      status(adminPage ? 'No se pudieron cargar los datos. Comprueba la conexión y las reglas de acceso del catálogo.' : 'El catálogo no está disponible en este momento. Inténtalo de nuevo más tarde.');
    })); };
    function resetSubscriptions() { subscriptions.forEach(stop => stop()); subscriptions = []; }
    $('loginOpen').onclick = () => $('loginDialog').showModal();
    $('loginClose').onclick = () => $('loginDialog').close();
    $('loginForm').onsubmit = async event => {
      event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true; $('loginError').textContent = '';
      try { await authentication.signInWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value); form.reset(); $('loginDialog').close(); }
      catch { $('loginError').textContent = 'No se pudo iniciar sesión. Revisa tus credenciales y la conexión.'; }
      finally { button.disabled = false; }
    };
    $('logout').onclick = async () => { try { await authentication.signOut(auth); } catch { status('No se pudo cerrar la sesión. Inténtalo de nuevo.'); } };
    function render() {
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
        const url = safeUrl(p.imagen);
        if (url) { const image = el('img'); image.src = url; image.alt = p.nombre; image.loading = 'lazy'; image.onerror = () => photo.replaceChildren(el('span','3D')); photo.replaceChildren(image); }
        body.append(el('span',p.categoria || 'Impresión 3D','tag'),el('h2',p.nombre),el('p',p.descripcion || '', 'description'),el('p',money(p.precio),'price'),el('small','Precio de venta al público'));
        if (wholesale[id]) { const box = el('div',undefined,'wholesale'); box.append(el('strong',`${money(wholesale[id].precio)} / unidad`),el('p',`Precio mayorista · Mínimo: ${wholesale[id].minimo} unidades`)); body.append(box); }
        card.append(photo,body); $('grid').append(card);
      });
      status(items.length ? `${items.length} productos` : 'No hay productos para mostrar.');
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
      $('adminProducts').replaceChildren();
      Object.entries(publicProducts).forEach(([id,p]) => {
        const row = el('div',undefined,'admin-row'), edit = el('button','Editar'), remove = el('button','Eliminar','secondary');
        row.append(el('strong',p.nombre),el('p',`Público: ${money(p.precio)} · Mayorista: ${wholesale[id] ? money(wholesale[id].precio) : 'Sin configurar'} · Mínimo: ${wholesale[id]?.minimo ?? '?'}`));
        edit.onclick = () => { const f = $('productForm'); f.reset(); for (const key of ['nombre','descripcion','categoria','imagen','precio']) f.elements[key].value = p[key] ?? ''; f.elements.id.value = id; f.elements.mayorista.value = wholesale[id]?.precio ?? ''; f.elements.minimo.value = wholesale[id]?.minimo ?? 1; $('formTitle').textContent = 'Editar producto'; f.scrollIntoView({behavior:'smooth'}); };
        remove.onclick = async () => { if (!confirm(`¿Eliminar ?${p.nombre}? del catálogo…`)) return; try { await database.update(path(''),{[`dev3dCatalogoPublico/${id}`]:null,[`dev3dCatalogoMayorista/${id}`]:null}); } catch { status('No se pudo eliminar el producto.'); } };
        row.append(edit,remove); $('adminProducts').append(row);
      });
      $('shops').replaceChildren();
      Object.entries(shops).forEach(([uid,s]) => { const row = el('div',undefined,'admin-row'), edit = el('button','Editar acceso'); row.append(el('strong',s.nombre),el('p',(s.email ? s.email + ' · ' : '') + (s.activo ? 'Tienda autorizada' : 'Acceso desactivado'))); edit.onclick = () => { resetShopForm(); const f = $('shopForm'); f.elements.uid.value = uid; f.elements.nombre.value = s.nombre; f.elements.activo.value = String(s.activo); $('shopCredentials').hidden = true; f.elements.email.required = false; f.elements.password.required = false; $('shopEditEmail').hidden = false; $('shopEditEmail').textContent = s.email || 'Cuenta ya autorizada'; $('shopFormTitle').textContent = 'Editar acceso de tienda'; $('saveShop').textContent = 'Guardar acceso'; f.scrollIntoView({behavior:'smooth'}); }; row.append(edit); $('shops').append(row); });
    }
    if (!adminPage) ['search','category','sort'].forEach(id => $(id).addEventListener('input', render));
    if (adminPage) {
      function showCalculator(open) {
        if (!admin) return;
        $('calculatorPanel').hidden = !open;
        $('productWorkspace').hidden = open;
        $('closeCalculator').hidden = !open;
        $('openCalculator').hidden = open;
        if (open && !$('calculatorFrame').getAttribute('src')) $('calculatorFrame').src = 'calculadora/index.html?v=1';
      }
      $('openCalculator').onclick = () => showCalculator(true);
      $('closeCalculator').onclick = () => showCalculator(false);
      window.addEventListener('message', event => {
        if (!admin || event.origin !== location.origin || event.source !== $('calculatorFrame').contentWindow) return;
        const draft = window.CATALOGO_DRAFT.validateDraft(event.data);
        if (!draft) return;
        const form = $('productForm');
        if ((form.elements.id.value || form.elements.nombre.value.trim()) && !confirm('Hay un producto en edición. ¿Sustituir el formulario por un nuevo borrador de la calculadora?')) return;
        form.reset();
        form.elements.id.value = '';
        for (const [key,value] of Object.entries(draft)) form.elements[key].value = value;
        $('formTitle').textContent = 'Nuevo producto desde la calculadora';
        showCalculator(false);
        status('Precios y mínimo preparados. Añade la foto y la categoría, revisa los datos y pulsa Guardar producto para publicarlo.');
        form.scrollIntoView({behavior:'smooth'});
      });
      $('resetProduct').onclick = () => { $('productForm').reset(); $('formTitle').textContent = 'Nuevo producto'; };
      $('productForm').onsubmit = async event => {
        event.preventDefault(); if (!admin) return;
        const f = event.currentTarget, fields = f.elements, price = Number(fields.precio.value), trade = Number(fields.mayorista.value), minimum = Number(fields.minimo.value);
        if (![price,trade,minimum].every(Number.isFinite) || price < 0 || trade < 0 || !Number.isInteger(minimum) || minimum < 1 || !fields.nombre.value.trim()) { status('Revisa el nombre, los precios y el pedido mínimo.'); return; }
        $('saveProduct').disabled = true;
        try {
          const id = fields.id.value || database.push(path('dev3dCatalogoPublico')).key;
          let image = fields.imagen.value.trim(); const file = fields.foto.files[0];
          if (file) { if (!file.type.startsWith('image/') || file.size >= 8*1024*1024) throw new Error('Elige una imagen de menos de 8 MB.'); const imageRef = storageSDK.ref(storage,`productos/dev3d-catalogo/${id}_${Date.now()}`); await storageSDK.uploadBytes(imageRef,file,{contentType:file.type}); image = await storageSDK.getDownloadURL(imageRef); }
          if (image && !safeUrl(image)) throw new Error('La URL de imagen no es válida.');
          await database.update(path(''),{[`dev3dCatalogoPublico/${id}`]:{nombre:fields.nombre.value.trim(),descripcion:fields.descripcion.value.trim(),categoria:fields.categoria.value.trim(),imagen:image,precio:price},[`dev3dCatalogoMayorista/${id}`]:{precio:trade,minimo:minimum}});
          f.reset(); $('formTitle').textContent = 'Nuevo producto'; status('Producto guardado.');
        } catch (error) { status(error.message?.startsWith('Elige') || error.message?.startsWith('La URL') ? error.message : 'No se pudo guardar. Comprueba la conexión y tus permisos.'); }
        finally { $('saveProduct').disabled = false; }
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
      const version = ++generation; resetSubscriptions(); currentUser = user; wholesale = {}; publicProducts = {}; shops = {}; admin = !!user && window.CATALOGO_CONFIG.ADMIN_EMAILS.includes(user.email?.toLowerCase());
      $('identity').textContent = user ? 'Sesión iniciada' : 'Catálogo público'; $('logout').hidden = !user; $('loginOpen').hidden = !!user;
      if ($('adminLink')) $('adminLink').hidden = !admin;
      if (adminPage) {
        resetShopForm();
        $('rulesNotice').hidden = true;
        if (!admin) { $('calculatorFrame').removeAttribute('src'); $('calculatorPanel').hidden = true; $('productWorkspace').hidden = false; $('closeCalculator').hidden = true; $('openCalculator').hidden = false; }
        $('adminPanel').hidden = !admin; $('adminProducts').replaceChildren(); $('shops').replaceChildren(); $('productForm').reset(); status(admin ? 'Gestión privada del catálogo.' : 'Acceso exclusivo para administradores.'); if (!admin) return; }
      else { $('grid').replaceChildren(); $('mode').textContent = 'Precios de venta al público.'; }
      watch('dev3dCatalogoPublico', value => { publicProducts = value; render(); });
      const listenWholesale = () => watch('dev3dCatalogoMayorista', value => { wholesale = value; render(); });
      if (admin) { listenWholesale(); if (adminPage) watch('dev3dTiendas', value => { shops = value; renderAdmin(); }); }
      else if (user) {
        watch(`dev3dTiendas/${user.uid}`, profile => {
          if (version !== generation) return;
          // Restart the protected subscription when access changes; revoke cached prices immediately.
          if (tradeStop) { tradeStop(); tradeStop = null; }
          wholesale = {}; render();
          const allowed = profile.rol === 'tienda' && profile.activo === true;
          $('mode').textContent = allowed ? 'Acceso tiendas · Precio mayorista por unidad y pedido mínimo por producto.' : 'Tu cuenta no tiene acceso mayorista. Contacta con DEV3D Studio para solicitarlo.';
          if (allowed) { tradeStop = database.onValue(path('dev3dCatalogoMayorista'), snap => { if (version === generation) { wholesale = snap.val() || {}; render(); } }, () => { wholesale = {}; render(); status('No se pudieron consultar los precios mayoristas.'); }); subscriptions.push(() => { if (tradeStop) tradeStop(); tradeStop = null; }); }
        });
      }
    });
    let tradeStop = null;
  } catch (error) { console.error(error); status('No se pudo iniciar el catálogo. Comprueba tu conexión y vuelve a cargar la página.'); }
})();
