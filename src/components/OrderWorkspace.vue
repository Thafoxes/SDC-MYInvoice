<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types';
import { useDemoStore } from '@/composables/useDemoStore';
import { DEMO_BUSINESS_ID, DEMO_SELLER_ID, computeInvoiceWithCustomer } from '@/lib/store';
import { deriveOrderBlockers } from '@/lib/orderWorkflow';
import { purchaseOrderTotal } from '@/lib/purchaseOrder';
import { downloadDocumentPdf } from '@/lib/documentPdf';
import { saveQuotation,setQuotationDecision,confirmDelivery,issueOrderInvoice,createPaymentClaim,reviewPaymentClaim,
 setOrderCase,resolveOrderCase,uploadOrderEvidence,attachOrderEvidence } from '@/services/commands';
import type { OrderEvidence } from '@/lib/orderWorkflow';
import { Check, AlertTriangle, Minus } from 'lucide-vue-next';
import { orderStages, nextStage, STATE_LABEL } from '@/presentation/orderStages';
import type { StageKey, StageState } from '@/presentation/orderStages';
const props=defineProps<{order:PurchaseOrder}>();
const {data,refreshStore}=useDemoStore();
const actor=computed(()=>data.value.users.find(u=>u.id===DEMO_SELLER_ID)!);
const customer=computed(()=>data.value.customers.find(c=>c.id===props.order.customer_id));
const quote=computed(()=>data.value.quotations.find(q=>q.purchase_order_id===props.order.id));
const invoice=computed(()=>data.value.invoices.find(i=>i.purchase_order_id===props.order.id));
const invoiceView=computed(()=>invoice.value?computeInvoiceWithCustomer(invoice.value,data.value,data.value.demoState.simulated_date):null);
const claims=computed(()=>data.value.paymentClaims.filter(c=>c.purchase_order_id===props.order.id));
const receipts=computed(()=>data.value.settlementReceipts.filter(r=>r.purchase_order_id===props.order.id));
const delivery=computed(()=>data.value.deliveryConfirmations.filter(c=>c.purchase_order_id===props.order.id));
const evidence=computed(()=>data.value.orderEvidence.filter(e=>e.purchase_order_id===props.order.id));
const cases=computed(()=>data.value.orderCases.filter(c=>c.purchase_order_id===props.order.id));
const blockers=computed(()=>{void data.value;return deriveOrderBlockers(props.order.id);});
const activity=computed(()=>data.value.activityEvents.filter(e=>e.metadata?.order_id===props.order.id).slice(0,20));
const busy=ref(false),notice=ref(''),error=ref('');
const qform=reactive({reference:'',currency:'MYR',payment_terms:'',delivery_terms:'',valid_until:'',items:[] as PurchaseOrderItem[]});
const buyerNote=ref(''),buyerEvidence=ref(''),decision=ref<'sent'|'accepted'|'revision_requested'|'rejected'>('sent');
const invForm=reactive({reference:'',issue_date:'',due_date:''});
const claimForm=reactive({amount:null as number|null,reference:'',evidence_id:''});
const verificationNotes=reactive<Record<string,string>>({});
const deliveryForm=reactive({name:'',accepted:null as number|null,note:'',evidence_id:''});
const caseForm=reactive({kind:'dispute' as 'dispute'|'missing_document'|'other',reason:''});
const resolutionNotes=reactive<Record<string,string>>({});
const evidenceKind=ref<OrderEvidence['kind']>('chat_screenshot');
const uploading=ref(false);
const sourceLabel:Record<string,string>={manual:'entered by hand',chat_screenshot:'from a chat screenshot',uploaded_po:"from the buyer's PO"};
const buyerPos=computed(()=>evidence.value.filter(e=>e.kind==='existing_po'));
const stages=computed(()=>orderStages({order:props.order,quotation:quote.value,evidence:evidence.value,deliveries:delivery.value,
 invoice:invoiceView.value,receiptCount:receipts.value.length,criticalBlockers:blockers.value.filter(b=>b.critical).length,money:asMoney}));
const next=computed(()=>nextStage(stages.value));
const stageCard:Record<StageState,string>={done:'border-emerald-200 bg-emerald-50 text-emerald-900',
 current:'border-blue-400 bg-blue-50 text-blue-900 ring-1 ring-blue-400',blocked:'border-rose-300 bg-rose-50 text-rose-900',
 todo:'border-slate-200 bg-white text-slate-500',skipped:'border-dashed border-slate-300 bg-slate-50 text-slate-500'};
const stageDot:Record<StageState,string>={done:'bg-emerald-600 text-white',current:'bg-blue-600 text-white',
 blocked:'bg-rose-600 text-white',todo:'bg-slate-100 text-slate-500',skipped:'bg-slate-200 text-slate-500'};
const sectionFor:Record<StageKey,string>={order:'stage-order',quotation:'stage-quotation',buyer_po:'stage-evidence',
 delivery:'stage-delivery',invoice:'stage-invoice',payment:'stage-payment',receipt:'stage-payment'};
function goTo(key:StageKey){
 if(key==='buyer_po')evidenceKind.value='existing_po';
 document.getElementById(sectionFor[key])?.scrollIntoView({behavior:'smooth',block:'start'});
}
watch(()=>props.order.id,()=>{
 const q=quote.value;qform.reference=q?.reference||`QT-${props.order.reference}`;
 qform.currency=q?.currency||props.order.details?.currency||'MYR';
 qform.payment_terms=q?.payment_terms||props.order.details?.payment_terms||'';
 qform.delivery_terms=q?.delivery_terms||'';qform.valid_until=q?.valid_until||'';
 qform.items=structuredClone(q?.items||props.order.details?.items||[]).map(line=>({...line,unit_price:line.unit_price??null,discount:line.discount??0}));
 invForm.reference=`INV-${props.order.reference}`;invForm.issue_date=data.value.demoState.simulated_date;
 invForm.due_date='';claimForm.amount=null;claimForm.reference='';claimForm.evidence_id='';
 deliveryForm.name=props.order.details?.items[0]?.name||'';deliveryForm.accepted=null;deliveryForm.note='';buyerNote.value='';buyerEvidence.value='';
}, {immediate:true});
async function run(callback:()=>Promise<unknown>){busy.value=true;error.value='';notice.value='';
 try { const result=await callback() as {success?:boolean;error?:string}|undefined;
  if(result?.success===false)throw Error(result.error||'Action failed');
  refreshStore(); notice.value='Saved. Record updated with seller review.';
 } catch(e){error.value=e instanceof Error?e.message:'Action failed';}finally{busy.value=false;}
}
function args(){return [actor.value.name,actor.value.role,DEMO_BUSINESS_ID] as const;}
function saveQuote(){void run(()=>saveQuotation(props.order.id,{reference:qform.reference,items:qform.items,currency:qform.currency.toUpperCase(),
 payment_terms:qform.payment_terms,delivery_terms:qform.delivery_terms,valid_until:qform.valid_until},...args()));}
function setDecision(){if(!quote.value)return;void run(()=>setQuotationDecision(quote.value!.id,decision.value,buyerNote.value,buyerEvidence.value||null,...args()));}
function makeInvoice(){void run(()=>issueOrderInvoice(props.order.id,invForm.reference,invForm.issue_date,invForm.due_date,...args()));}
function submitClaim(){if(!invoice.value)return;void run(()=>createPaymentClaim(invoice.value!.id,Number(claimForm.amount),claimForm.reference,claimForm.evidence_id||null,...args()));}
function verifyClaim(id:string,yes:boolean){void run(()=>reviewPaymentClaim(id,yes,verificationNotes[id]||'',...args()));}
function confirmDeliveryAction(){void run(()=>confirmDelivery(props.order.id,deliveryForm.name,Number(deliveryForm.accepted),deliveryForm.note,deliveryForm.evidence_id||null,...args()));}
function addCase(){void run(()=>setOrderCase(props.order.id,caseForm.kind,caseForm.reason,...args()));}
function resolveCase(id:string){void run(()=>resolveOrderCase(id,resolutionNotes[id]||'',...args()));}
async function upload(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
 uploading.value=true;error.value='';notice.value='';try{
  const result=await uploadOrderEvidence(file);
  await attachOrderEvidence(props.order.id,{id:result.evidence.id,filename:result.evidence.filename,
   mime_type:result.evidence.content_type,kind:evidenceKind.value,extracted_text:result.extracted_text},...args());
  refreshStore();notice.value='Original evidence saved. Its content does not automatically establish agreement or settlement.';
 }catch(e){error.value=e instanceof Error?e.message:'Upload failed';}finally{uploading.value=false;input.value='';}
}
function asMoney(n:number|null|undefined){return `${quote.value?.currency||props.order.details?.currency||'MYR'} ${(n||0).toFixed(2)}`;}
function download(kind:'po'|'quote'|'invoice'|'receipt', receiptId?:string){
 const po=props.order;const lines=(kind==='quote'?quote.value?.items:po.details?.items)||[];
 const title=kind==='po'?'ORDER SUMMARY FOR BUYER REVIEW':kind==='quote'?'QUOTATION':kind==='invoice'?'INVOICE TRACKING COPY':'PAYMENT RECEIPT';
 const reference=kind==='po'?po.reference:kind==='quote'?quote.value?.reference:kind==='invoice'?invoice.value?.invoice_number:receipts.value.find(r=>r.id===receiptId)?.receipt_number;
 const sections=[{heading:'Document information',lines:[`Reference: ${reference||'N/A'}`,`Customer: ${customer.value?.name||'N/A'}`,
   `Seller: ${data.value.businesses.find(b=>b.id===DEMO_BUSINESS_ID)?.name||'Seller'}`,`Status: ${kind==='quote'?quote.value?.status:kind==='po'?po.status:'Seller recorded'}`]}];
 if(kind==='receipt'){
  const rec=receipts.value.find(r=>r.id===receiptId);sections.push({heading:'Seller-verified settlement',lines:[
   `Invoice: ${invoice.value?.invoice_number||'N/A'}`,`Payment received: ${asMoney(rec?.amount)}`,`Verified / recorded: ${rec?.issued_at||''}`]});
 }else{
  sections.push({heading:'Items',lines:lines.map((line,i)=>`${i+1}. ${line.name} | Qty ${line.quantity} | Price ${line.unit_price??'TBC'} | Discount ${line.discount??0}`)});
  sections.push({heading:'Commercial terms',lines:[`Total: ${asMoney(kind==='quote'?quote.value?.amount:kind==='invoice'?invoice.value?.invoice_amount:purchaseOrderTotal(lines))}`,
   `Payment terms: ${quote.value?.payment_terms||po.details?.payment_terms||'To be confirmed'}`,
   `Delivery terms: ${quote.value?.delivery_terms||'To be confirmed'}`]});
 }
 downloadDocumentPdf(`${kind}-${reference||po.reference}.pdf`,title,sections);
}
</script>
<template>
 <section class="card p-4 sm:p-6 space-y-6" aria-label="Order progress and documents">
  <div><div class="flex flex-wrap justify-between items-center gap-2"><h3 class="text-lg font-semibold">Order progress · {{order.reference}}</h3><button class="outline-btn" type="button" @click="download('po')">Download order summary PDF</button></div>
  <p class="text-xs text-slate-500 mt-1">Progress reflects recorded seller decisions. This is not an automatic buyer approval or statutory e-invoice.</p></div>
  <ol class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" aria-label="Order progress">
   <li v-for="(s,i) in stages" :key="s.key">
    <button type="button" class="flex h-full w-full flex-col items-stretch justify-start rounded-lg border p-3 text-left transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
     :class="stageCard[s.state]" :aria-current="s.state==='current'?'step':undefined" :title="s.detail" @click="goTo(s.key)">
     <span class="flex items-center gap-2"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold" :class="stageDot[s.state]">
      <Check v-if="s.state==='done'" class="h-3.5 w-3.5" /><AlertTriangle v-else-if="s.state==='blocked'" class="h-3.5 w-3.5" /><Minus v-else-if="s.state==='skipped'" class="h-3.5 w-3.5" /><template v-else>{{i+1}}</template>
     </span><strong class="text-sm leading-tight">{{s.name}}</strong></span>
     <span class="mt-2 block text-xs font-semibold">{{STATE_LABEL[s.state]}}</span>
     <span v-if="s.state!=='todo'" class="mt-0.5 block text-xs leading-snug opacity-90">{{s.detail}}</span>
    </button>
   </li>
  </ol>
  <div v-if="next" role="status" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4" :class="next.state==='blocked'?'border-rose-200 bg-rose-50':'border-blue-200 bg-blue-50'">
   <div><p class="text-xs font-semibold uppercase tracking-wide" :class="next.state==='blocked'?'text-rose-700':'text-blue-700'">{{next.state==='blocked'?'Blocked':'Next step'}} · {{next.name}}</p>
    <p class="mt-1 text-sm font-medium text-slate-900">{{next.detail}}</p></div>
   <button type="button" class="primary-btn" @click="goTo(next.key)">Open {{next.name}}</button>
  </div>
  <p v-else role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">All stages complete. Documents and history are kept.</p>
  <div class="grid gap-4 sm:grid-cols-2 text-sm rounded-lg bg-slate-50 p-4"><div><p class="font-semibold">Buyer</p><p>{{customer?.name||'Unknown buyer'}}</p><p>{{customer?.phone||'No phone'}} · {{customer?.email||'No email'}}</p></div>
   <div><p class="font-semibold">Order</p><p>{{order.details?.items?.length||0}} {{(order.details?.items?.length||0)===1?'item line':'item lines'}} · {{sourceLabel[order.source_mode||'manual']}}</p><p>Seller approval: {{order.status==='approved'?'Approved':'Draft'}}</p></div></div>
  <p v-if="error" role="alert" class="text-sm p-3 rounded bg-red-50 text-red-700">{{error}}</p>
  <p v-if="notice" role="status" class="text-sm p-3 rounded bg-emerald-50 text-emerald-800">{{notice}}</p>
  <div id="stage-evidence" class="scroll-mt-48 lg:scroll-mt-28 rounded-lg border border-slate-200 p-4 space-y-3"><h4 class="font-semibold">Buyer's PO and supporting evidence</h4>
   <p v-if="buyerPos.length" class="rounded bg-emerald-50 p-2 text-sm text-emerald-900">Buyer's PO on file: {{buyerPos.map(e=>e.filename).join(', ')}}</p>
   <p v-else class="rounded bg-blue-50 p-2 text-sm text-blue-900">No buyer's PO yet. Choose <strong>Original buyer PO</strong> below and upload it. Skip this if the buyer does not use POs.</p>
   <p class="text-xs text-slate-600">Optional original screenshots and documents remain available; uploads are never automatic approval or payment proof.</p>
   <div class="flex flex-wrap gap-2 items-center"><select v-model="evidenceKind" class="form-input !mt-0 w-auto" aria-label="Evidence type">
     <option value="chat_screenshot">Order conversation</option><option value="existing_po">Original buyer PO</option>
     <option value="buyer_approval">Buyer approval</option><option value="delivery_proof">Delivery proof</option>
     <option value="promise_proof">Promise-to-pay proof</option><option value="payment_proof">Payment claim</option><option value="other">Other</option></select>
    <input aria-label="Add evidence" type="file" accept="image/png,image/jpeg,application/pdf" :disabled="uploading||busy" @change="upload" />
   </div><p v-if="uploading" class="text-xs">Saving evidence…</p>
   <div v-if="evidence.length" class="space-y-1 text-sm"><div v-for="e in evidence" :key="e.id" class="flex justify-between gap-2 border-b py-1"><span>{{e.kind.replace(/_/g,' ')}} · {{e.filename}}</span><a class="text-blue-700 underline" :href="`/api/po-evidence/${e.id}`" target="_blank" rel="noopener">View original</a></div></div>
  </div>
  <div id="stage-quotation" class="scroll-mt-48 lg:scroll-mt-28 rounded-lg border p-4 space-y-3"><div class="flex justify-between"><h4 class="font-semibold">Quotation</h4><button v-if="quote" class="outline-btn" @click="download('quote')">Download PDF</button></div>
    <p class="text-xs text-slate-600">Confirm prices and terms before saving a quotation. Drafts are not buyer acceptance.</p>
    <div v-if="!quote||quote.status==='draft'" class="space-y-3">
     <div class="grid sm:grid-cols-3 gap-2"><label class="text-xs">Reference<input v-model="qform.reference" class="form-input" maxlength="80" /></label>
      <label class="text-xs">Currency<input v-model="qform.currency" class="form-input" maxlength="3" /></label>
      <label class="text-xs">Valid until<input type="date" v-model="qform.valid_until" class="form-input" /></label></div>
     <div class="grid sm:grid-cols-2 gap-2"><label class="text-xs">Payment terms<input v-model="qform.payment_terms" class="form-input" /></label><label class="text-xs">Delivery terms<input v-model="qform.delivery_terms" class="form-input" /></label></div>
     <div v-for="(line,i) in qform.items" :key="i" class="grid grid-cols-6 items-end gap-2 text-xs"><span class="col-span-3">{{line.name}} · Qty {{line.quantity}}</span><label class="col-span-2">Unit price<input v-model.number="line.unit_price" type="number" min="0" step="0.01" class="form-input" /></label><label>Discount<input v-model.number="line.discount" type="number" min="0" step="0.01" class="form-input" /></label></div>
     <button class="primary-btn" :disabled="busy||!qform.items.length" @click="saveQuote">Save quotation draft</button>
    </div><p v-if="quote" class="text-sm">{{quote.reference}} · {{asMoney(quote.amount)}} · {{quote.status}}</p>
    <div v-if="quote&&quote.status!=='accepted'&&quote.status!=='rejected'" class="space-y-2 border-t pt-3"><h5 class="font-semibold text-sm">Record buyer response (seller confirmation)</h5>
     <select class="form-input !mt-0" v-model="decision"><option value="sent">Sent manually</option><option value="accepted">Accepted</option><option value="revision_requested">Revision requested</option><option value="rejected">Rejected</option></select>
     <textarea v-model="buyerNote" rows="2" class="form-input" placeholder="How was the buyer decision confirmed? Include message/date or approval reference." />
     <select v-model="buyerEvidence" class="form-input !mt-0"><option value="">No attached buyer confirmation</option><option v-for="e in evidence.filter(x=>x.kind==='buyer_approval')" :key="e.id" :value="e.id">{{e.filename}}</option></select>
     <button class="primary-btn" :disabled="busy" @click="setDecision">Record buyer response</button>
    </div>
  </div>
  <div id="stage-delivery" class="scroll-mt-48 lg:scroll-mt-28 rounded-lg border p-4 space-y-3"><h4 class="font-semibold">Delivery and acceptance</h4>
    <p class="text-xs text-slate-600">Record the quantity the buyer accepted. Less than ordered creates a blocker that must be resolved before invoicing.</p>
    <div v-if="order.details?.items.length" class="grid sm:grid-cols-2 gap-2"><select v-model="deliveryForm.name" class="form-input !mt-0"><option v-for="line in order.details?.items" :key="line.name" :value="line.name">{{line.name}} (ordered {{line.quantity}})</option></select>
     <input v-model.number="deliveryForm.accepted" type="number" min="0" step="0.001" class="form-input !mt-0" placeholder="Accepted quantity" /></div>
    <input v-model="deliveryForm.note" class="form-input" placeholder="Seller verification / delivery reference" />
    <select v-model="deliveryForm.evidence_id" class="form-input !mt-0"><option value="">No attachment</option><option v-for="e in evidence.filter(x=>x.kind==='delivery_proof')" :value="e.id" :key="e.id">{{e.filename}}</option></select>
    <button class="outline-btn" :disabled="busy||!order.details?.items.length" @click="confirmDeliveryAction">Confirm accepted quantity</button>
    <p v-for="d in delivery" :key="d.id" class="text-xs">{{d.item_name}}: {{d.accepted_quantity}} accepted · {{d.reviewer_note}}</p>
  </div>
  <div id="stage-invoice" class="scroll-mt-48 lg:scroll-mt-28 rounded-lg border p-4 space-y-3"><h4 class="font-semibold">Invoice</h4>
   <div v-if="!invoice"><p class="text-sm text-slate-600">Requires an accepted quotation and no critical blockers.</p>
    <div class="grid sm:grid-cols-3 gap-2"><label class="text-xs">Invoice reference<input v-model="invForm.reference" class="form-input" /></label><label class="text-xs">Issue date<input type="date" v-model="invForm.issue_date" class="form-input" /></label><label class="text-xs">Agreed due date<input type="date" v-model="invForm.due_date" class="form-input" /></label></div>
    <button class="primary-btn" :disabled="busy||quote?.status!=='accepted'" @click="makeInvoice">Create invoice record</button>
   </div><div v-else class="flex items-center flex-wrap gap-3 text-sm"><strong>{{invoice.invoice_number}}</strong><span>{{asMoney(invoice.invoice_amount)}} · {{invoiceView?.status}}</span><button class="outline-btn" @click="download('invoice')">Download invoice PDF</button></div>
  </div>
  <div id="stage-payment" class="scroll-mt-48 lg:scroll-mt-28 rounded-lg border p-4 space-y-3"><h4 class="font-semibold">Payment and receipt</h4>
    <p class="text-sm">Outstanding: <strong>{{asMoney(invoiceView?.outstanding_balance)}}</strong> · Evidence alone never verifies a bank transfer.</p>
    <div v-if="invoice && invoiceView && invoiceView.outstanding_balance>0" class="grid sm:grid-cols-3 gap-2"><input v-model.number="claimForm.amount" type="number" min="0.01" step="0.01" class="form-input !mt-0" placeholder="Claimed amount" />
      <input v-model="claimForm.reference" class="form-input !mt-0" placeholder="Payment reference" />
      <select v-model="claimForm.evidence_id" class="form-input !mt-0"><option value="">No screenshot</option><option v-for="e in evidence.filter(x=>x.kind==='payment_proof')" :key="e.id" :value="e.id">{{e.filename}}</option></select>
      <button class="outline-btn" :disabled="busy" @click="submitClaim">Record unverified payment claim</button></div>
    <div v-for="claim in claims" :key="claim.id" class="rounded bg-slate-50 p-3 space-y-2 text-xs"><strong>{{asMoney(claim.amount)}} · {{claim.status}}</strong> · {{claim.reference||'No reference'}}
     <div v-if="claim.status==='pending'" class="space-y-2"><input v-model="verificationNotes[claim.id]" class="form-input" placeholder="Verification source / reason (required)" />
      <button class="primary-btn" :disabled="busy" @click="verifyClaim(claim.id,true)">Seller confirms funds received</button>
      <button class="outline-btn ml-2" :disabled="busy" @click="verifyClaim(claim.id,false)">Reject claim</button></div></div>
    <div v-for="receipt in receipts" :key="receipt.id" class="flex gap-2 items-center text-xs"><span>{{receipt.receipt_number}} · {{asMoney(receipt.amount)}}</span><button class="outline-btn" @click="download('receipt',receipt.id)">Download receipt PDF</button></div>
  </div>
  <div class="rounded-lg border p-4 space-y-3"><h4 class="font-semibold">Payment blockers &amp; seller review</h4>
   <p v-for="(b,i) in blockers" :key="i" class="rounded p-2 text-sm" :class="b.critical?'bg-amber-50 text-amber-900':'bg-slate-50'">{{b.critical?'⚠ ':''}}{{b.reason}} <span class="text-xs">({{b.source}})</span></p>
   <p v-if="!blockers.length" class="text-sm text-emerald-700">No known blockers in the currently recorded evidence.</p>
   <div class="grid sm:grid-cols-2 gap-2"><select v-model="caseForm.kind" class="form-input !mt-0"><option value="dispute">Dispute</option><option value="missing_document">Missing document</option><option value="other">Other blocker</option></select>
    <input v-model="caseForm.reason" class="form-input !mt-0" placeholder="Describe issue or mismatch" /></div><button class="outline-btn" :disabled="busy" @click="addCase">Open review blocker</button>
   <div v-for="c in cases.filter(x=>x.status==='open')" :key="c.id" class="bg-amber-50 p-3 text-sm"><p>{{c.kind}}: {{c.reason}}</p><input v-model="resolutionNotes[c.id]" class="form-input" placeholder="Seller resolution explanation" />
    <button class="outline-btn mt-2" :disabled="busy" @click="resolveCase(c.id)">Seller resolves</button></div>
  </div>
  <div class="rounded-lg bg-slate-50 p-4 space-y-2"><h4 class="font-semibold">Activity timeline</h4><p v-for="entry in activity" :key="entry.id" class="text-xs">{{entry.created_at.slice(0,16).replace('T',' ')}} · {{entry.description}}</p>
   <p v-if="!activity.length" class="text-xs text-slate-500">No recorded activity.</p></div>
 </section>
</template>
