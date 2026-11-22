'use strict';
// This fragment adds an isolated catalog order branch to the existing live rules.
const admin="auth != null && (auth.token.email == 'yoelmejias@outlook.es' || auth.token.email == 'irelandmorcillo@gmail.com')";
const profile="root.child('dev3dTiendas').child($uid)";
const active=`auth != null && auth.uid == $uid && ${profile}.child('rol').val() == 'tienda' && ${profile}.child('activo').val() == true`;
const product="root.child('dev3dCatalogoPublico').child(newData.child('producto').val())";
const trade="root.child('dev3dCatalogoMayorista').child(newData.child('producto').val())";
const string=(max,min=0)=>({'.validate':`newData.isString() && newData.val().length >= ${min} && newData.val().length <= ${max}`});
const integer=(min,max)=>({'.validate':`newData.isNumber() && newData.val() >= ${min} && newData.val() <= ${max} && newData.val() % 1 == 0`});
const keys="/^([0-9]|[12][0-9])$/";
const sum=Array.from({length:30},(_,i)=>`(newData.child('lineas/${i}/cantidad').exists() ? newData.child('lineas/${i}/cantidad').val() : 0)`).join(' + ');
const colors=Array.from({length:30},(_,i)=>`${product}.child('colores/${i}').val() == newData.child('color').val()`).join(' || ');
const liveGroup=[`${product}.exists()`,`${trade}.exists()`,`${product}.child('estado').val() != 'agotado'`,
 `newData.child('nombre').val() == ${product}.child('nombre').val()`,
 `newData.child('precio').val() == ${trade}.child('precio').val()`,
 `newData.child('minimo').val() == ${trade}.child('minimo').val()`,
 `newData.child('cantidad').val() >= newData.child('minimo').val()`,
 `newData.child('cantidad').val() == (${sum})`,
 `newData.child('referencia').val() == (${product}.child('referencia').exists() && ${product}.child('referencia').val() != '' ? ${product}.child('referencia').val() : 'D3D-' + newData.child('producto').val())`,
 `newData.child('plazo').val() == (${product}.child('plazo').exists() && ${product}.child('plazo').val() != '' ? ${product}.child('plazo').val() : 'A confirmar')`,
 `(!${product}.child('colores').exists() || ${colors})`
].join(' && ');
const fragment={
 '.read':admin,
 '$uid':{
  '.read':`auth != null && auth.uid == $uid && ${profile}.child('rol').val() == 'tienda'`,
  '$order':{
   '.write':`${active} && !data.exists() && newData.exists() && newData.child('seguimiento/estado').val() == 'pendiente' && newData.child('seguimiento/nota').val() == '' && newData.child('seguimiento/actualizado').val() == newData.child('creado').val()`,
   '.validate':"newData.hasChildren(['tienda','contacto','grupos','creado','seguimiento']) && (data.exists() || newData.child('tienda').val() == "+profile+".child('nombre').val())",
   tienda:string(150,1),
   creado:{'.validate':'newData.isNumber() && (data.exists() ? newData.val() == data.val() : newData.val() == now)'},
   contacto:{'.validate':"newData.hasChildren(['nombre','correo','telefono','comentarios'])",nombre:string(150,1),correo:string(254,3),telefono:string(30,7),comentarios:string(1000),'$other':{'.validate':false}},
   grupos:{'.validate':'newData.hasChildren()','$index':{
    '.validate':`$index.matches(${keys}) && newData.hasChildren(['producto','nombre','referencia','color','cantidad','precio','minimo','plazo','lineas']) && (data.exists() || (${liveGroup}))`,
    producto:string(150,1),nombre:string(150,1),referencia:string(160,1),color:string(60,1),cantidad:integer(1,300000),precio:{'.validate':'newData.isNumber() && newData.val() >= 0'},minimo:integer(1,300000),plazo:string(150,1),
    lineas:{'.validate':'newData.hasChildren()','$index':{'.validate':`$index.matches(${keys}) && newData.hasChildren(['cantidad','personalizacion','comentarios']) && (data.exists() || newData.child('personalizacion').val() == '' || root.child('dev3dCatalogoPublico').child(newData.parent().parent().child('producto').val()).child('personalizable').val() != false)`,cantidad:integer(1,10000),personalizacion:string(300),comentarios:string(500),'$other':{'.validate':false}}},
    '$other':{'.validate':false}
   }},
   seguimiento:{
    '.write':`${admin} && data.parent().exists() && newData.exists()`,
    '.validate':"newData.hasChildren(['estado','actualizado','nota'])",
    estado:{'.validate':"newData.val() == 'pendiente' || newData.val() == 'confirmado' || newData.val() == 'fabricacion' || newData.val() == 'enviado' || newData.val() == 'entregado' || newData.val() == 'cancelado'"},
    actualizado:{'.validate':'newData.isNumber() && newData.val() == now'},nota:string(1000),'$other':{'.validate':false}
   },
   '$other':{'.validate':false}
  }
 }
};
module.exports=fragment;
