'use strict';
const {fields}=require('../calculadora/budgets.js');
const {profiles}=require('../calculadora/profit-profiles.js');
const admin="auth != null && auth.uid == $uid && (auth.token.email == 'yoelmejias@outlook.es' || auth.token.email == 'irelandmorcillo@gmail.com')";
const text=max=>({'.validate':`newData.isString() && newData.val().length <= ${max}`}),number={'.validate':'newData.isNumber() && newData.val() >= 0'};
const material={'.validate':"$index.matches(/^([0-9]|[1-9][0-9])$/) && newData.hasChildren(['name','brand','nozzle','layer','kg','factor','price','unit','priceVat','color'])",name:text(150),brand:text(150),...Object.fromEntries(['nozzle','layer','kg','factor','price'].map(key=>[key,number])),unit:{'.validate':"newData.val() == 'kg' || newData.val() == 'g'"},priceVat:{'.validate':"newData.val() == 'net' || newData.val() == 'gross'"},color:text(7),'$other':{'.validate':false}};
module.exports={'$uid':{'.read':admin,'.write':admin,'$id':{
 '.validate':"newData.hasChildren(['nombre','actualizado','calculo'])",nombre:{'.validate':'newData.isString() && newData.val().length > 0 && newData.val().length <= 100'},actualizado:{'.validate':'newData.isNumber() && newData.val() == now'},
 calculo:{'.validate':"newData.hasChildren(['version','defaultsVersion','values','mode'])",version:{'.validate':'newData.val() == 1'},defaultsVersion:number,mode:{'.validate':"newData.val() == 'manual'"},
  wholesaleProfile:{'.validate':["newData.val() == 'manual'",...Object.keys(profiles).map(id=>"newData.val() == '"+id+"'")].join(' || ')},
  values:{'.validate':`newData.hasChildren(${JSON.stringify(fields)})`,...Object.fromEntries(fields.map(key=>[key,text(200)])),'$other':{'.validate':false}},
  materials:{'$index':material},auxiliaryItems:{'$index':{'.validate':"$index.matches(/^([0-9]|[1-9][0-9])$/) && newData.hasChildren(['name','amount'])",name:text(150),amount:number,'$other':{'.validate':false}}},'$other':{'.validate':false}
 },'$other':{'.validate':false}
}}};
