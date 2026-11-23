(function(scope){
  'use strict';
  // Editable starting points for this studio, not industry-wide profit rates.
  const profiles=Object.freeze({
    simple:{rate:20,label:'Pequeña o sencilla · 20 %',help:'Para llaveros básicos, soportes y piezas repetibles con poca manipulación.'},
    personalized:{rate:40,label:'Pequeña personalizada · 40 %',help:'Para nombres, iniciales y detalles a medida. Incluye el tiempo de preparar cada personalización en el coste de operarios.'},
    figure:{rate:30,label:'Figura mediana o decorativa · 30 %',help:'Para figuras o decoración con detalle moderado y un acabado sencillo.'},
    large:{rate:25,label:'Figura grande y sencilla · 25 %',help:'Para piezas grandes con poco acabado manual. Revisa el material, las horas de impresión y el factor de error en sus costes.'},
    complex:{rate:50,label:'Compleja o con muchos acabados · 50 %',help:'Para piezas con montaje, lijado, pintura o detalles delicados. Añade también esos tiempos y materiales al cálculo de costes.'}
  });
  function normalize(id,rate){return id!=='manual'&&Object.hasOwn(profiles,id)&&String(rate).trim()!==''&&Number(rate)===profiles[id].rate?id:'manual';}
  scope.DEV3D_PROFIT_PROFILES={profiles,normalize};if(typeof module!=='undefined')module.exports=scope.DEV3D_PROFIT_PROFILES;
})(typeof window==='undefined'?globalThis:window);
