const assert=require('node:assert/strict');const {create,MAX_AGE}=require('../catalogo-order-draft.js');
const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};let time=100000;
const drafts=create(storage,()=>time),line={id:'a',color:'Blanco',quantity:5,customization:'Ana',notes:'Con base',unitCents:999,email:'private@example.test'};
assert.equal(drafts.write('shop-a',[line]),true);const raw=[...values.values()][0];assert(!raw.includes('unitCents'));assert(!raw.includes('private@example.test'));assert.deepEqual(drafts.read('shop-b').lines,[]);assert.equal(drafts.read('shop-a').lines[0].customization,'Ana');
time+=MAX_AGE+1;assert.equal(drafts.read('shop-a').lines.length,0);assert.equal(values.size,0);
drafts.write('shop-a',[line]);values.set([...values.keys()][0],'{bad json');assert.equal(drafts.read('shop-a').lines.length,0);
assert.equal(create(null).write('shop-a',[line]),false);assert.equal(create({setItem(){throw Error('quota');}}).write('shop-a',[line]),false);
assert.equal(drafts.write('shop-a',Array(31).fill(line)),false);assert.equal(drafts.write('shop-a',[{...line,quantity:Infinity}]),false);assert.equal(drafts.write('shop-a',[line]),true);assert.equal(drafts.write('shop-a',[]),true);assert.equal(values.size,0);
console.log('PASS: isolated local drafts, no stored prices/contact data, expiry, invalid JSON, blocked storage, size limits and empty cart cleanup.');
