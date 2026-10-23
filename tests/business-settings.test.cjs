const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Readable}=require('node:stream');
const {createBackend}=require('../server/app.cjs');
const store=require('../.server-build/lib/store.js');
const {saveBusinessSettings}=require('../.server-build/lib/businessSettings.js');
const customers=require('../.server-build/lib/customerOrders.js');
const workflow=require('../.server-build/lib/orderWorkflow.js');
const {emptyPurchaseOrderDetails}=require('../.server-build/lib/purchaseOrder.js');
const {projectState}=require('../server/mariadb-adapter.cjs');
const actor=['Seller','seller','biz-001'];
const settings={name:'Supplier Ltd',address:'12 Main Street\nKuala Lumpur',phone:'+60312345678',email:'sales@example.test',salesperson_name:'Alice'};
function fixture(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nw-settings-'));let backend=createBackend({directory,api:{}});
 t.after(()=>{backend.stop();backend.db.close();fs.rmSync(directory,{recursive:true,force:true});});
 return {get backend(){return backend;},reopen(){backend.stop();backend.db.close();backend=createBackend({directory,api:{}});}};}
function command(backend,input,args=actor){return new Promise(resolve=>{
 const req=Readable.from([JSON.stringify({name:'saveBusinessSettings',args:[input,...args]})]);
 Object.assign(req,{method:'POST',url:'/api/command',headers:{host:'127.0.0.1:8787','content-type':'application/json','x-nudgewise-local':'1'}});
 let status;const res={writeHead:code=>status=code,end:text=>resolve({status,body:JSON.parse(text)})};backend.server.emit('request',req,res);
});}
test('seller settings save through the API, survive reopen and project contacts to MariaDB',async t=>{
 const f=fixture(t);const response=await command(f.backend,settings);assert.equal(response.status,200);assert.equal(response.body.result.success,true);
 f.reopen();const business=store.getStore().businesses[0];
 for(const key of Object.keys(settings))assert.equal(business[key],settings[key]);
 const projected=projectState(store.getStore()).businesses[0];
 for(const key of ['name','address','phone','email'])assert.equal(projected[key],settings[key]);
 assert.equal(store.getStore().users[0].name,'Seller','document name does not change authorization identity');
});
test('invalid fields, unauthorized actors and foreign workspace requests cannot change settings',async t=>{
 const f=fixture(t);const before=structuredClone(store.getStore());
 for(const patch of [{name:''},{phone:'x'.repeat(41)},{address:'bad\u0000text'},{email:'not-an-email'},{salesperson_name:'A\nB'}])
  assert.equal((await command(f.backend,{...settings,...patch})).status,400);
 assert.equal((await command(f.backend,settings,['Seller','staff','biz-001'])).status,400);
 assert.equal((await command(f.backend,settings,['Wrong seller','seller','biz-001'])).status,400);
 assert.equal((await command(f.backend,settings,['Seller','seller','other-business'])).status,400);
 assert.deepEqual(store.getStore(),before);
});
test('quotations and invoices retain the salesperson who prepared them after settings change',t=>{
 fixture(t);saveBusinessSettings(settings,...actor);
 const buyer=customers.createCustomer({name:'Buyer',phone:'0123456789',email:''},...actor);
 const details={...emptyPurchaseOrderDetails(),currency:'MYR',items:[{name:'Box',code:'',quantity:2,unit_price:10,discount:0}]};
 const order=customers.createPurchaseOrder(buyer.id,'ORD-SETTINGS',...actor,details,'manual');
 const input={reference:'QT-SETTINGS',currency:'MYR',items:details.items,payment_terms:'',delivery_terms:'',valid_until:''};
 const quote=workflow.saveQuotation(order.id,input,...actor);
 assert.equal(store.getStore().quotations[0].prepared_by,'Alice');
 saveBusinessSettings({...settings,salesperson_name:'Bob'},...actor);
 workflow.saveQuotation(order.id,input,...actor);
 assert.equal(store.getStore().quotations[0].prepared_by,'Alice');
 workflow.setQuotationDecision(quote.id,'accepted','Buyer confirmed',null,...actor);
 assert.equal(customers.approvePurchaseOrder(order.id,...actor).success,true);
 workflow.issueOrderInvoice(order.id,'INV-SETTINGS','2026-10-23','2026-11-22',...actor);
 assert.equal(store.getStore().invoices[0].prepared_by,'Bob');
 saveBusinessSettings({...settings,salesperson_name:'Carol'},...actor);
 assert.equal(store.getStore().quotations[0].prepared_by,'Alice');assert.equal(store.getStore().invoices[0].prepared_by,'Bob');
});
test('browser storage persists settings without a backend and optional fields can be empty',()=>{
 let saved;store.configureStorage({getItem:()=>saved||null,setItem:(_,value)=>saved=value});
 const empty={name:'My seller',address:'',phone:'',email:'',salesperson_name:''};saveBusinessSettings(empty,...actor);
 store.configureStorage({getItem:()=>saved||null,setItem:(_,value)=>saved=value});assert.equal(store.getStore().businesses[0].name,'My seller');
 assert.equal(store.getStore().businesses[0].salesperson_name,'');
});
