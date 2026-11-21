(function(scope){
  'use strict';
  const MAX_EDGE=1200,TARGET_BYTES=80*1024,MAX_BYTES=100*1024,MAX_SOURCE_BYTES=30*1024*1024;
  function failure(message){return Object.assign(new Error(message),{code:'product/image-compression'});}
  async function decode(file,environment){
    if(typeof environment.createImageBitmap==='function'){
      try{const image=await environment.createImageBitmap(file);return {image,width:image.width,height:image.height,close:()=>image.close?.()};}catch{}
    }
    if(!environment.Image||!environment.URL?.createObjectURL)throw failure('No se ha podido leer la fotografía. Prueba con un archivo JPG, PNG o WebP.');
    const url=environment.URL.createObjectURL(file),image=new environment.Image();
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(failure('No se ha podido leer la fotografía. Prueba con JPG, PNG o WebP.'));image.src=url;});}
    catch(error){environment.URL.revokeObjectURL(url);throw error;}
    return {image,width:image.naturalWidth||image.width,height:image.naturalHeight||image.height,close:()=>environment.URL.revokeObjectURL(url)};
  }
  function encode(canvas,type,quality){return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(failure('No se ha podido comprimir la fotografía. Prueba con otra imagen.')),type,quality);}catch{reject(failure('No se ha podido procesar esta imagen. Prueba con JPG, PNG o WebP.'));}});}
  async function compress(file,environment=scope){
    if(!file||!String(file.type||'').startsWith('image/')||file.type==='image/svg+xml')throw failure('Elige una fotografía JPG, PNG, WebP u otro formato de imagen compatible.');
    if(!file.size||file.size>MAX_SOURCE_BYTES)throw failure('La fotografía original debe ocupar como máximo 30 MB.');
    const decoded=await decode(file,environment);
    try{
      if(!decoded.width||!decoded.height||decoded.width*decoded.height>60000000)throw failure('La imagen es demasiado grande para procesarla. Utiliza una foto de hasta 60 megapíxeles.');
      const canvas=environment.document.createElement('canvas');let type='image/webp',previousEdge=0;
      let best=Math.max(decoded.width,decoded.height)<=MAX_EDGE&&file.size<=MAX_BYTES&&['image/jpeg','image/png','image/webp'].includes(file.type)?{blob:file,width:decoded.width,height:decoded.height}:null;
      const draw=(width,height)=>{canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw failure('Tu navegador no ha podido procesar la fotografía.');if(type==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(decoded.image,0,0,width,height);};
      for(const maximum of [MAX_EDGE,960,768,640,512,384,256,128]){
        const edge=Math.min(maximum,Math.max(decoded.width,decoded.height));if(edge===previousEdge)continue;previousEdge=edge;
        const ratio=edge/Math.max(decoded.width,decoded.height),width=Math.max(1,Math.round(decoded.width*ratio)),height=Math.max(1,Math.round(decoded.height*ratio));
        draw(width,height);
        for(const quality of [.76,.64,.52,.42]){
          let blob=await encode(canvas,type,quality);
          if(type==='image/webp'&&blob.type!=='image/webp'){type='image/jpeg';draw(width,height);blob=await encode(canvas,type,quality);}
          if(!['image/webp','image/jpeg'].includes(blob.type))throw failure('El navegador no puede crear una fotografía comprimida. Utiliza una versión reciente de Chrome, Edge, Firefox o Safari.');
          if(!best||blob.size<best.blob.size)best={blob,width,height};
          if(best.blob.size<=TARGET_BYTES)break;
        }
        if(best?.blob.size<=TARGET_BYTES)break;
      }
      if(!best||best.blob.size>MAX_BYTES)throw failure('No se ha podido reducir la fotografía a menos de 100 KB. Prueba con otra imagen.');
      return {...best,type:best.blob.type,extension:best.blob.type==='image/webp'?'webp':best.blob.type==='image/png'?'png':'jpg',originalSize:file.size,size:best.blob.size,saving:Math.max(0,Math.round((1-best.blob.size/file.size)*100))};
    }finally{decoded.close();}
  }
  scope.CATALOGO_IMAGES=Object.freeze({compress,MAX_EDGE,TARGET_BYTES,MAX_BYTES});
  if(typeof module!=='undefined')module.exports={compress,MAX_EDGE,TARGET_BYTES,MAX_BYTES};
})(typeof window==='undefined'?globalThis:window);
