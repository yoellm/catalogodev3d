(function(scope){
  'use strict';
  const MAX_AGE=30*24*60*60*1000,PREFIX='dev3d-order-draft-v1:';
  function create(storage,now=()=>Date.now()){
    function remove(uid){try{if(!storage||!uid)return false;storage.removeItem(PREFIX+uid);return true;}catch{return false;}}
    function sanitize(lines){
      if(!Array.isArray(lines)||lines.length>30)throw Error('Invalid draft');
      return lines.map(line=>{
        if(!line||typeof line.id!=='string'||!line.id||line.id.length>200||typeof line.color!=='string'||line.color.length>60||!Number.isFinite(line.quantity)||line.quantity<0||line.quantity>10000)throw Error('Invalid line');
        const customization=String(line.customization||''),notes=String(line.notes||'');if(customization.length>300||notes.length>500)throw Error('Invalid text');
        return {id:line.id,color:line.color,quantity:line.quantity,customization,notes};
      });
    }
    return {
      read(uid){try{if(!storage||!uid)return {lines:[],ok:false};const raw=storage.getItem(PREFIX+uid);if(!raw)return {lines:[],ok:true};if(raw.length>65000)throw Error('Draft too large');const saved=JSON.parse(raw);if(saved.owner!==uid||!Number.isFinite(saved.updatedAt)||saved.updatedAt>now()+300000||now()-saved.updatedAt>MAX_AGE)throw Error('Expired draft');return {lines:sanitize(saved.lines),ok:true};}catch{remove(uid);return {lines:[],ok:false};}},
      write(uid,lines){try{if(!storage||!uid)return false;const clean=sanitize(lines);if(!clean.length)return remove(uid);storage.setItem(PREFIX+uid,JSON.stringify({owner:uid,updatedAt:now(),lines:clean}));return true;}catch{return false;}},remove
    };
  }
  scope.CATALOGO_ORDER_DRAFT={create,MAX_AGE};if(typeof module!=='undefined')module.exports=scope.CATALOGO_ORDER_DRAFT;
})(typeof window==='undefined'?globalThis:window);
