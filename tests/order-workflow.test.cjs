const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createBackend } = require('../server/app.cjs');
const core = require('../.server-build/lib/store.js');
const customers = require('../.server-build/lib/customerOrders.js');
const po = require('../.server-build/lib/purchaseOrder.js');
const workflow = require('../.server-build/lib/orderWorkflow.js');

const actor = ['Seller','seller','biz-001'];
function fixture(t) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nudgewise-flow-'));
 const backend=createBackend({directory:dir,api:{ extractOrderChat: async () => ({ items:[{name:'Box A',quantity:50,code:'',unit_price:null,discount:0}],buyer_name:'Buyer',warnings:[],extracted_text:'Buyer wants 50 Box A' }) }});
 t.after(()=>{backend.stop();backend.db.close();fs.rmSync(dir,{recursive:true,force:true});});
 const customer=customers.createCustomer({name:'Buyer Sdn Bhd',phone:'0123456789',email:'buyer@example.test'},...actor);
 assert.equal(customer.success,true);
 const details=po.emptyPurchaseOrderDetails();Object.assign(details,{currency:'MYR',items:[{name:'Box A',code:'',quantity:50,unit_price:null,discount:0}],document_total:null});
 const order=customers.createPurchaseOrder(customer.id,'PO-DEMO-01',...actor,details,'chat_screenshot');
 assert.equal(order.success,true);
 return {backend,orderId:order.id,details,customerId:customer.id};
}
function quotation(orderId) {
 return workflow.saveQuotation(orderId,{reference:'QT-DEMO-01',currency:'MYR',payment_terms:'Net 30 from confirmed invoice receipt',delivery_terms:'Agreed delivery',valid_until:'2026-12-30',
 items:[{name:'Box A',code:'',quantity:50,unit_price:10,discount:0}]},...actor);
}
function command(backend,name,args){return new Promise(resolve=>{
 const req=Readable.from([JSON.stringify({name,args})]);Object.assign(req,{method:'POST',url:'/api/command',headers:{host:'127.0.0.1:8787','content-type':'application/json','x-nudgewise-local':'1'}});
 let status;const res={writeHead:code=>{status=code;},end:body=>resolve({status,result:JSON.parse(body)})};backend.server.emit('request',req,res);
});}
function upload(backend,url,bytes){return new Promise(resolve=>{
 const req=Readable.from([JSON.stringify({name:'chat.png',content:bytes.toString('base64'),actorRole:'seller'})]);
 Object.assign(req,{method:'POST',url,headers:{host:'127.0.0.1:8787','content-type':'application/json','x-nudgewise-local':'1'}});
 let status;const res={writeHead:code=>{status=code;},end:body=>resolve({status,result:JSON.parse(body)})};backend.server.emit('request',req,res);
});}

test('Chat order can be unpriced, quotation reviewed, buyer accepted, invoice issued, payment verified',t=>{
 const {orderId}=fixture(t);
 assert.equal(core.getStore().purchaseOrders[0].source_mode,'chat_screenshot');
 assert.equal(po.purchaseOrderTotal(core.getStore().purchaseOrders[0].details.items),null);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 const q=quotation(orderId);assert.equal(q.success,true);
 assert.throws(()=>workflow.issueOrderInvoice(orderId,'INV-001','2026-10-23','2026-11-22',...actor),/acceptance/);
 workflow.setQuotationDecision(q.id,'accepted','Buyer said yes via email on 23 October',null,...actor);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 const issued=workflow.issueOrderInvoice(orderId,'INV-001','2026-10-23','2026-11-22',...actor);
 assert.equal(issued.success,true);
 const claim=workflow.createPaymentClaim(issued.id,200,'BANK-REF-001',null,...actor);
 assert.equal(core.computeInvoiceWithCustomer(core.getStore().invoices[0],core.getStore(),'2026-10-23').outstanding_balance,500);
 assert.equal(core.getStore().invoices[0].verification_hold,true);
 assert.throws(()=>workflow.reviewPaymentClaim(claim.id,true,'','Buyer','customer','biz-001'),/Seller approval/);
 workflow.reviewPaymentClaim(claim.id,true,'Seller checked actual bank statement',...actor);
 assert.equal(core.computeInvoiceWithCustomer(core.getStore().invoices[0],core.getStore(),'2026-10-23').outstanding_balance,300);
 assert.equal(core.getStore().settlementReceipts.length,1);
 const rest=workflow.createPaymentClaim(issued.id,300,'BANK-REF-002',null,...actor);
 workflow.reviewPaymentClaim(rest.id,true,'Bank transfer confirmed',...actor);
 assert.equal(core.computeInvoiceWithCustomer(core.getStore().invoices[0],core.getStore(),'2026-10-23').status,'paid');
});

test('Partial delivery and seller-recorded dispute block invoice and can be resolved explicitly',t=>{
 const {orderId}=fixture(t);assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);const q=quotation(orderId);
 workflow.setQuotationDecision(q.id,'accepted','Buyer confirmed via chat',null,...actor);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 workflow.confirmDelivery(orderId,'Box A',40,'Only 40 accepted',null,...actor);
 assert.equal(workflow.deriveOrderBlockers(orderId).some(b=>b.critical),true);
 assert.throws(()=>workflow.issueOrderInvoice(orderId,'INV-002','2026-10-23','2026-11-22',...actor),/Resolve blocker/);
 workflow.confirmDelivery(orderId,'Box A',50,'Remaining 10 accepted',null,...actor);
 workflow.setOrderCase(orderId,'dispute','Buyer queries product quality',...actor);
 assert.throws(()=>workflow.issueOrderInvoice(orderId,'INV-002','2026-10-23','2026-11-22',...actor),/Resolve blocker/);
 const caseId=core.getStore().orderCases[0].id;
 workflow.resolveOrderCase(caseId,'Buyer and seller confirmed resolution',...actor);
 assert.equal(workflow.issueOrderInvoice(orderId,'INV-002','2026-10-23','2026-11-22',...actor).success,true);
});

test('Evidence screenshot OCR: stored original, review required, and linked to correct PO',async t=>{
 const {backend,orderId}=fixture(t);
 const bytes=fs.readFileSync(path.join(__dirname,'fixtures/PO.png'));
 const uploaded=await upload(backend,'/api/order-chat',bytes);
 assert.equal(uploaded.status,200);
 assert.equal(uploaded.result.result.items[0].quantity,50);
 assert.equal(core.getStore().orderEvidence.length,0,'AI must not auto-attach evidence');
 const meta=uploaded.result.result.evidence;
 const saved=await command(backend,'attachOrderEvidence',[orderId,{id:meta.id,filename:meta.filename,mime_type:meta.content_type,kind:'chat_screenshot',extracted_text:'Buyer wants 50 Box A'},...actor]);
 assert.equal(saved.status,200);
 assert.equal(saved.result.result.success,true);
 assert.equal(core.getStore().orderEvidence.length,1);
});

test('A payment screenshot is only a claim and cannot auto-settle the invoice',t=>{
 const {orderId}=fixture(t);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 const q=quotation(orderId);workflow.setQuotationDecision(q.id,'accepted','Buyer confirmed',null,...actor);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 const inv=workflow.issueOrderInvoice(orderId,'INV-003','2026-10-23','2026-11-22',...actor);
 const claim=workflow.createPaymentClaim(inv.id,500,'BANK-REF-FAKE',null,...actor);
 assert.equal(core.getStore().payments.length,0);
 workflow.reviewPaymentClaim(claim.id,false,'Bank records do not show the transfer',...actor);
 assert.equal(core.getStore().payments.length,0);
 assert.equal(core.getStore().settlementReceipts.length,0);
});

test('quotation revisions before agreement copy validated items to the order and require fresh processing approval',async t=>{
 const {backend,orderId}=fixture(t);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 const q=quotation(orderId);
 const call=(name,args)=>command(backend,name,args);
 assert.equal((await call('setQuotationDecision',[q.id,'sent','Sent to buyer',null,...actor])).status,200);
 const input={reference:'QT-REVISED',currency:'MYR',payment_terms:'Net 14',delivery_terms:'Delivery agreed',valid_until:'',
  items:[{name:'Revised box',code:'REV',quantity:20,unit_price:38,discount:0}]};
 let result=await call('saveQuotation',[orderId,input,...actor]);
 assert.equal(result.status,200);assert.equal(result.result.result.success,true);
 assert.equal(core.getStore().quotations[0].status,'draft');
 assert.equal(core.getStore().activityEvents.find(e=>e.event_type==='quotation_saved').metadata.previous_quotation.status,'sent');
 assert.equal((await call('saveQuotation',[orderId,{...input,items:[{...input.items[0],quantity:-1}]},...actor])).status,400);
 assert.equal((await call('setQuotationDecision',[q.id,'accepted','',null,...actor])).status,400);
 assert.equal((await call('setQuotationDecision',[q.id,'accepted','Buyer confirmed the revised quote',null,...actor])).status,200);
 const order=core.getStore().purchaseOrders.find(o=>o.id===orderId);
 assert.deepEqual(order.details.items,input.items);assert.equal(order.details.payment_terms,'Net 14');assert.equal(order.status,'draft');
 assert.equal(order.approved_at,undefined);
 assert.equal((await call('copyQuotationToOrder',[q.id,...actor])).status,200);
 assert.equal((await call('saveQuotation',[orderId,input,...actor])).status,400);
 assert.equal(customers.updatePurchaseOrder(orderId,order.reference,{...order.details,items:[{...input.items[0],quantity:1}]},...actor).success,false);
 assert.equal(customers.updatePurchaseOrder(orderId,order.reference,{...order.details,document_total:null},...actor).success,true);
 assert.equal(customers.approvePurchaseOrder(orderId,...actor).success,true);
 assert.equal(workflow.issueOrderInvoice(orderId,'INV-REVISED','2026-10-23','2026-11-22',...actor).success,true);
 assert.equal(core.getStore().invoices[0].invoice_amount,760);
 assert.equal((await call('copyQuotationToOrder',[q.id,...actor])).status,400);
});

test('buyer request can be revised and agreement can use optional attached evidence instead of a note',t=>{
 const {orderId}=fixture(t);const q=quotation(orderId);
 workflow.setQuotationDecision(q.id,'revision_requested','Buyer asked for Net 14',null,...actor);
 quotation(orderId);
 assert.equal(core.getStore().quotations[0].status,'draft');
 const evidenceId=crypto.randomUUID();
 assert.throws(()=>workflow.setQuotationDecision(q.id,'accepted','',evidenceId,...actor),/not linked/);
 workflow.attachOrderEvidence(orderId,{id:evidenceId,filename:'buyer-agreement.png',mime_type:'image/png',kind:'buyer_approval'},...actor);
 workflow.setQuotationDecision(q.id,'accepted','',evidenceId,...actor);
 assert.equal(core.getStore().quotations[0].buyer_decision_evidence_id,evidenceId);
 assert.throws(()=>quotation(orderId),/Accepted quotations/);
});
