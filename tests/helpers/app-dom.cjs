const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../..');
async function appDOM(page){
 const {window}=parseHTML(fs.readFileSync(path.join(root,page),'utf8')),document=window.document;
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){const options=[...this.querySelectorAll('option')];const selected=options.find(o=>o.hasAttribute('selected'))||options[0];return selected?.getAttribute('value')??selected?.textContent??'';},set(value){for(const o of this.querySelectorAll('option')){if((o.getAttribute('value')??o.textContent)===String(value))o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 window.HTMLElement.prototype.focus=function(){};window.HTMLElement.prototype.scrollIntoView=function(){};
 for(const form of document.querySelectorAll('form')){
  const controls=[...form.querySelectorAll('input,select,textarea,button')],initial=new Map(controls.map(e=>[e,e.value]));
  Object.defineProperty(form,'elements',{configurable:true,get(){return Object.fromEntries(controls.flatMap(e=>e.name?[[e.name,e]]:e.id?[[e.id,e]]:[]));}});
  form.reset=()=>{for(const [element,value] of initial)element.value=value??'';};form.reportValidity=()=>true;
 }
 for(const input of document.querySelectorAll('input[type=file]'))Object.defineProperty(input,'files',{configurable:true,value:[]});
 const state={authCallback:null,subscriptions:[],writes:[],update:null,set:null,confirm:true,authCalls:[],user:null,wrongPassword:false};
 const database={getDatabase:()=>({}),ref:(_,name)=>{if(name==='')throw Error('child failed: path argument was an invalid path = "".');return name??'/';},push:()=>({key:'test-product'}),onValue(name,callback,error){const sub={name,callback,error,active:true};state.subscriptions.push(sub);return ()=>sub.active=false;},async set(name,value){if(state.set)return state.set(name,value);state.writes.push({method:'set',name,value});},async update(name,value){if(state.update)return state.update(name,value);state.writes.push({method:'update',name,value});}};
 const authentication={getAuth:()=>({}),onAuthStateChanged:(_,fn)=>state.authCallback=fn,EmailAuthProvider:{credential:(email,password)=>({email,password})},async reauthenticateWithCredential(user,credential){state.authCalls.push('reauthenticate');if(state.wrongPassword)throw {code:'auth/invalid-credential'};},async verifyBeforeUpdateEmail(user,email){state.authCalls.push('verify:'+email);},async updatePassword(user,password){state.authCalls.push('password');},async getIdToken(){state.authCalls.push('token');return 'test-only';},async reload(){state.authCalls.push('reload');}};
 window.CATALOGO_CONFIG={firebaseConfig:{databaseURL:'https://example.test'},ADMIN_EMAILS:['admin@example.test']};window.CATALOGO_NAVIGATION=require('../../catalogo-navigation.js');window.CATALOGO_DRAFT=require('../../catalogo-draft.js');window.CATALOGO_ACCOUNT=require('../../catalogo-account.js');window.CATALOGO_PRODUCTS=require('../../catalogo-products.js');
 window.CATALOGO_BOOT={loadFirebase:async()=>[{initializeApp:()=>({})},database,authentication,{getStorage:()=>({}),ref:(_,name)=>name,uploadBytes:async(...args)=>{if(state.upload)return state.upload(...args);throw Error('Unexpected image upload');},getDownloadURL:async()=> 'https://example.test/photo.webp'}]};
 const navigator={onLine:true};
 await vm.runInNewContext(fs.readFileSync(path.join(root,'catalogo-app.js'),'utf8'),{window,document,navigator,location:{origin:'https://example.test',hash:'',replace(){},assign(){}},URL,Intl,console,setTimeout,clearTimeout,confirm:()=>state.confirm});
 return {window,document,state,navigator,node:id=>document.getElementById(id),async session(user){state.user=user;await state.authCallback(user);},emit(name,value){const sub=state.subscriptions.findLast(s=>s.name===name&&s.active);if(!sub)throw Error('No subscription: '+name);sub.callback({val:()=>value});},async submit(id){const form=document.getElementById(id);await form.onsubmit({preventDefault(){},currentTarget:form});}};
}
module.exports={appDOM};
