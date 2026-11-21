const assert=require('node:assert/strict');const {appDOM}=require('./helpers/app-dom.cjs');
(async()=>{
 let change;const media={matches:false,addEventListener(type,callback){assert.equal(type,'change');change=callback;}};
 const app=await appDOM('admin.html',media),menu=app.node('mainMenu'),content=app.node('loginOpen').parentElement;
 assert.equal(content.parentElement.className,'desktop-account');
 await app.session({uid:'admin',email:'admin@example.test'});assert.equal(app.node('adminLink').hidden,false);assert.equal(app.node('logout').hidden,false);
 media.matches=true;change();assert.equal(content.parentElement,menu);assert.equal(menu.open,false);assert.equal(app.node('adminLink').hidden,false);
 menu.open=true;media.matches=false;change();assert.equal(content.parentElement.className,'desktop-account');assert.equal(menu.open,false);assert.equal(app.document.querySelectorAll('#loginOpen').length,1);
 console.log('PASS: account links move between desktop bar and mobile menu without duplicating controls or losing role state.');
})().catch(error=>{console.error(error);process.exitCode=1;});
