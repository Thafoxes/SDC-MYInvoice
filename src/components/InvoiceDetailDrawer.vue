<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { X, FileText, CreditCard, Bell, MessageSquare, Activity, Plus, ShieldCheck, AlertCircle } from 'lucide-vue-next';
import type { InvoiceWithCustomer } from '@/types';
import BaseModal from '@/components/BaseModal.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { computeInvoiceWithCustomer, DEMO_BUSINESS_ID } from '@/lib/store';
import { recordPayment, resolveVerificationHold, resolveDispute, confirmPromise } from '@/services/commands';
import { addActivity } from '@/services/commands';
import { formatMYR, formatDate, formatDateTime } from '@/lib/format';
const props = defineProps<{invoice:InvoiceWithCustomer|null; open:boolean; sellerName:string; sellerRole:string}>();
const emit=defineEmits<{close:[]}>();
const {data,refreshStore}=useDemoStore();
const current = computed(()=> {if(!props.invoice)return null;const i=data.value.invoices.find(x=>x.id===props.invoice?.id);return i?computeInvoiceWithCustomer(i,data.value,data.value.demoState.simulated_date):null;});
const payments=computed(()=>data.value.payments.filter(p=>p.invoice_id===current.value?.id).sort((a,b)=>b.payment_date.localeCompare(a.payment_date)));
const followups=computed(()=>data.value.followUpActions.filter(f=>f.invoice_id===current.value?.id));
const responses=computed(()=>data.value.customerResponses.filter(r=>r.invoice_id===current.value?.id));
const activity=computed(()=>data.value.activityEvents.filter(e=>e.invoice_id===current.value?.id));
const payModal=ref(false), amount=ref(''),date=ref(data.value.demoState.simulated_date),method=ref('bank_transfer'),reference=ref(''),error=ref('');
watch(()=>props.open,(open)=>{if(open){date.value=data.value.demoState.simulated_date;error.value='';}});
async function reviewVerification(verified:boolean){if(!current.value)return;await resolveVerificationHold(current.value.id,verified,props.sellerName);await addActivity(DEMO_BUSINESS_ID,current.value.id,'verification_reviewed',props.sellerName,props.sellerRole,verified?'Seller confirmed verification review (does not itself record a payment)':'Seller could not verify payment');refreshStore();emit('close');}
async function resolveDisputeAction(){if(!current.value)return;await resolveDispute(current.value.id,props.sellerName);refreshStore();emit('close');}
async function confirmPromiseAction(confirmed:boolean){if(!current.value?.promise_to_pay_date)return;await confirmPromise(current.value.id,current.value.promise_to_pay_date,confirmed,props.sellerName);refreshStore();emit('close');}
async function savePayment(){if(!current.value)return;const n=Number(amount.value);if(!Number.isFinite(n)||n<=0){error.value='Enter a valid positive payment amount.';return;}if(!date.value){error.value='Select a payment date.';return;}const result=await recordPayment(current.value.id,n,date.value,method.value,reference.value,props.sellerName);if(!result.success){error.value=result.error||'Could not save payment';return;}amount.value='';reference.value='';error.value='';payModal.value=false;refreshStore();}
</script>
<template>
  <Teleport to="body"><div v-if="open && current" class="fixed inset-0 z-[55] bg-[#162A50]/35" @click.self="emit('close')">
    <aside class="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl animate-slide-in-right">
      <div class="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-orbyte-border px-5 py-4"><div><h3 class="text-lg font-bold">Invoice Details</h3><p class="text-xs text-orbyte-muted">{{current.invoice_number}}</p></div><button aria-label="Close invoice" class="rounded-lg p-2 hover:bg-orbyte-bg" @click="emit('close')"><X class="w-5 h-5"/></button></div>
      <div class="p-6 space-y-6">
        <section><h4 class="section-title"><FileText class="w-4 h-4 text-orbyte-blue"/>Invoice Information</h4><div class="grid grid-cols-2 gap-4 text-sm">
          <div><p class="info-label">Invoice Number</p><p class="font-semibold">{{current.invoice_number}}</p></div><div><p class="info-label">Customer</p><p class="font-semibold">{{current.customer?.name}}</p></div>
          <div><p class="info-label">Invoice Amount</p><p>{{formatMYR(current.invoice_amount)}}</p></div><div><p class="info-label">Outstanding Balance</p><p class="font-bold">{{formatMYR(current.outstanding_balance)}}</p></div>
          <div><p class="info-label">Issue Date</p><p>{{formatDate(current.issue_date)}}</p></div><div><p class="info-label">Due Date</p><p>{{formatDate(current.due_date)}}</p></div>
          <div><p class="info-label">Total Paid</p><p>{{formatMYR(current.total_paid)}}</p></div><div><p class="info-label">Status</p><StatusBadge :status="current.status" /></div>
        </div><div v-if="current.labels.length" class="flex flex-wrap gap-1.5 mt-4"><span v-for="label in current.labels" :key="label" class="rounded-md bg-orbyte-bg px-2 py-1 text-xs text-orbyte-muted">{{label}}</span></div>
        <div v-if="current.days_overdue" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle class="w-4 h-4"/>{{current.days_overdue}} days overdue</div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button v-if="current.outstanding_balance>0" class="primary-btn" @click="payModal=true"><Plus class="w-4 h-4"/> Record Payment (Simulation)</button>
          <template v-if="current.verification_hold"><button class="success-btn" @click="reviewVerification(true)"><ShieldCheck class="w-4 h-4"/>Verification Reviewed</button><button class="outline-btn" @click="reviewVerification(false)">Cannot Verify</button></template>
          <button v-if="current.dispute_active" class="outline-btn" @click="resolveDisputeAction">Resolve Dispute</button>
          <template v-if="current.promise_to_pay_date"><button class="success-btn" @click="confirmPromiseAction(true)">Confirm Promise</button><button class="outline-btn" @click="confirmPromiseAction(false)">Remove Promise</button></template>
        </div></section>
        <section><h4 class="section-title"><CreditCard class="w-4 h-4 text-orbyte-blue"/>Payment History</h4><p v-if="!payments.length" class="empty-text">No payments recorded yet.</p><div v-for="p in payments" :key="p.id" class="detail-row"><div><p class="font-medium">{{formatMYR(p.amount)}}</p><p class="text-xs text-orbyte-muted">{{formatDate(p.payment_date)}} · {{p.method}} · {{p.reference}}</p></div><span v-if="p.verification_status==='flagged'" class="text-xs text-red-600">Flagged</span></div></section>
        <section><h4 class="section-title"><Bell class="w-4 h-4 text-orbyte-blue"/>Reminder History</h4><p v-if="!followups.length" class="empty-text">No reminders yet.</p><div v-for="f in followups" :key="f.id" class="detail-row block"><p class="font-medium">Checkpoint {{f.checkpoint}} <span class="float-right text-xs capitalize text-orbyte-muted">{{f.approval_state}} / {{f.send_state}}</span></p><p class="text-xs text-orbyte-muted mt-1">{{f.reason}}</p><p class="rounded-lg bg-orbyte-bg p-2 text-xs mt-2">{{f.message}}</p><p v-if="f.sent_at" class="text-[11px] text-orbyte-muted mt-1">{{formatDateTime(f.sent_at)}} (simulated, not delivered)</p></div></section>
        <section><h4 class="section-title"><MessageSquare class="w-4 h-4 text-orbyte-blue"/>Customer Responses</h4><p v-if="!responses.length" class="empty-text">No customer responses.</p><div v-for="r in responses" :key="r.id" class="detail-row block"><p class="text-sm italic">“{{r.message}}”</p><p class="text-xs text-orbyte-muted capitalize mt-2">{{r.ai_category?.replace(/_/g,' ')}} · {{r.review_status}}</p><p class="text-xs mt-1">{{r.ai_suggested_action}}</p></div></section>
        <section><h4 class="section-title"><Activity class="w-4 h-4 text-orbyte-blue"/>Activity Timeline</h4><p v-if="!activity.length" class="empty-text">No activity recorded.</p><div v-for="e in activity" :key="e.id" class="relative border-l-2 border-orbyte-border pl-4 py-2 ml-1"><p class="text-sm">{{e.description}}</p><p class="text-xs text-orbyte-muted mt-1">{{formatDateTime(e.created_at)}} · {{e.actor}}</p></div></section>
      </div>
    </aside>
  </div></Teleport>
  <BaseModal :open="payModal" title="Record Payment (Simulation)" @close="payModal=false">
    <div v-if="current" class="space-y-4"><div class="rounded-lg bg-orbyte-bg p-3 text-sm"><p class="font-medium">{{current.invoice_number}} · {{current.customer?.name}}</p><p class="text-orbyte-muted mt-1">Outstanding: {{formatMYR(current.outstanding_balance)}}</p></div>
      <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{error}}</p>
      <label class="form-label">Payment Amount (MYR)<input v-model="amount" type="number" min="0.01" step="0.01" class="form-input" /></label>
      <label class="form-label">Payment Date<input v-model="date" type="date" class="form-input" /></label>
      <label class="form-label">Method<select v-model="method" class="form-input"><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="duitnow">DuitNow</option></select></label>
      <label class="form-label">Reference (optional)<input v-model="reference" class="form-input" placeholder="Reference number" /></label></div>
    <template #footer><div class="flex justify-end gap-2"><button class="outline-btn" @click="payModal=false">Cancel</button><button class="primary-btn" @click="savePayment">Record Payment</button></div></template>
  </BaseModal>
</template>
