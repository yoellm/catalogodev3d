/* Share only a public product link, never store tariffs or account data. */
(() => {
  'use strict';
  const dialog=document.getElementById('catalogDetailDialog');
  const button=document.getElementById('shareProduct');
  const message=document.getElementById('shareProductMessage');
  const fallback=document.getElementById('productShareLink');
  if(!dialog||!button)return;
  const clear=()=>{message.textContent='';fallback.hidden=true;fallback.removeAttribute('href');fallback.textContent='';};
  dialog.addEventListener('close',clear);
  button.addEventListener('click',async()=>{
    const id=dialog.dataset.productId;
    if(!id)return;
    clear();button.disabled=true;
    const url='https://www.dev3dstudio.es/catalogo.html#producto-'+encodeURIComponent(id);
    const title=document.getElementById('catalogDetailTitle').textContent+' · DEV3D Studio';
    try{
      if(typeof navigator.share==='function'){
        try{await navigator.share({title,url});return;}
        catch(error){if(error.name==='AbortError')return;}
      }
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      message.textContent='Enlace copiado. Puedes pegarlo en un mensaje o compartirlo en tus redes.';
    }catch{
      message.textContent='Puedes copiar este enlace para compartir la pieza:';
      fallback.href=url;fallback.textContent=url;fallback.hidden=false;
    }finally{button.disabled=false;}
  });
})();
