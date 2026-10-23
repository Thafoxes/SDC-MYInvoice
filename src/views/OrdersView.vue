<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Eye, Pencil, Trash2 } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import CustomerIntake from '@/components/CustomerIntake.vue';
import PurchaseOrderForm from '@/components/PurchaseOrderForm.vue';
import OrderWorkspace from '@/components/OrderWorkspace.vue';
import type { PurchaseOrderDetails, PurchaseOrder } from '@/types';
import { purchaseOrderTotal } from '@/lib/purchaseOrder';
import { computeInvoiceWithCustomer } from '@/lib/store';
import type { CustomerExtraction } from '@/lib/customerOrders';
import { useDemoStore } from '@/composables/useDemoStore';
import { DEMO_BUSINESS_ID, DEMO_SELLER_ID } from '@/lib/store';
import { getOrderEligibility } from '@/lib/customerOrders';
import { approvePurchaseOrder, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, attachOrderEvidence } from '@/services/commands';
import type { ChatOrderUpload } from '@/services/commands';
import { formatMYR } from '@/lib/format';

const { data, refreshStore } = useDemoStore();
const actor = computed(() => data.value.users.find(user => user.id === DEMO_SELLER_ID)!);
const customerId = ref<string | null>(null);
const customer = computed(() => data.value.customers.find(item => item.id === customerId.value));
const eligibility = computed(() => {
  void data.value;
  return customerId.value ? getOrderEligibility(customerId.value, DEMO_BUSINESS_ID) : null;
});
const orders = computed(() => data.value.purchaseOrders.filter(order => order.business_id === DEMO_BUSINESS_ID));
const query=ref('');
const filteredOrders=computed(()=>orders.value.filter(o=>[o.reference, customerName(o.customer_id)].some(t=>t.toLowerCase().includes(query.value.toLowerCase()))));
const customerSearch = ref('');
const availableCustomers=computed(()=>data.value.customers.filter(c=>c.business_id===DEMO_BUSINESS_ID && [c.name, c.phone, c.email || '', c.address || ''].some(value=>(value || '').toLowerCase().includes(customerSearch.value.trim().toLowerCase()))));
const screenshot=ref<ChatOrderUpload|null>(null);
const suggestion = ref<CustomerExtraction>();
const formDirty = ref(false);
const savedRevision = ref(0);
const intakeKey = ref(0);
const reason = ref('');
const activeOrderId = ref('');
const activeOrder = computed(() => orders.value.find(order => order.id === activeOrderId.value));
const busy = ref(false);
const showEditor = ref(false);
const editorMode = ref<'create' | 'upload'>('create');
function startOrder(mode: 'create' | 'upload') {
  selectCustomer(null);
  customerSearch.value = '';
  intakeKey.value += 1;
  savedRevision.value += 1;
  suggestion.value = undefined; screenshot.value = null;
  editorMode.value = mode;
  showEditor.value = true;
}
function closeEditor() { showEditor.value = false; selectCustomer(null); screenshot.value=null; }

const error = ref('');
const notice = ref('');
const route = useRoute();
const router = useRouter();
const recordId = computed(() => typeof route.params.id === 'string' ? route.params.id : '');
const recordPage = computed(() => !!recordId.value);
const recordMode = computed(() => route.params.mode === 'edit' ? 'edit' : 'view');
watch([recordId, recordMode, orders], () => { if(recordId.value && orders.value.some(o => o.id === recordId.value)) openOrder(recordId.value); }, { immediate: true });

watch(() => route.query.customer, id => {
  if (typeof id === 'string' && data.value.customers.some(item => item.id === id && item.business_id === DEMO_BUSINESS_ID)) selectCustomer(id);
}, { immediate: true });

function selectCustomer(id: string | null) {
  customerId.value = id;
  activeOrderId.value = '';
  reason.value = '';
  error.value = '';
  notice.value = '';
}

function openOrder(id: string) {
  const order = orders.value.find(item => item.id === id);
  if (!order) return;
  intakeKey.value += 1;
  selectCustomer(order.customer_id);
  activeOrderId.value = id;
  editorMode.value = 'create';
  showEditor.value = true;
}

async function saveDraft(reference: string, details: PurchaseOrderDetails) {
  if (!customerId.value || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = activeOrderId.value
      ? await updatePurchaseOrder(activeOrderId.value, reference, details, actor.value.name, actor.value.role, DEMO_BUSINESS_ID)
      : await createPurchaseOrder(customerId.value, reference, actor.value.name, actor.value.role, DEMO_BUSINESS_ID, details, editorMode.value === 'upload' ? 'uploaded_po' : screenshot.value ? 'chat_screenshot' : 'manual');
    if (!result.success || !result.id) throw new Error(result.error || 'Could not save PO.');
    activeOrderId.value = result.id;
    const attached = screenshot.value;
    const evidenceId = details.evidence_id;
    if (evidenceId) {
      await attachOrderEvidence(result.id, {id: evidenceId,
        filename: attached?.evidence.filename || (editorMode.value === 'upload' ? `Existing-PO-${reference}` : `Order-evidence-${reference}`),
        mime_type: attached?.evidence.content_type || 'application/pdf',
        kind: attached ? 'chat_screenshot' : editorMode.value === 'upload' ? 'existing_po' : 'other',
        extracted_text: attached?.extracted_text }, actor.value.name,actor.value.role,DEMO_BUSINESS_ID);
    }
    screenshot.value = null;
    refreshStore();
    savedRevision.value += 1;
    notice.value = 'PO details saved. Review eligibility before approval.';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not save PO.';
  } finally { busy.value = false; }
}

async function approve() {
  if (!activeOrder.value || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = await approvePurchaseOrder(activeOrder.value.id, actor.value.name, actor.value.role, DEMO_BUSINESS_ID, reason.value.trim() || undefined);
    if (!result.success) throw new Error(result.error || 'Could not approve PO.');
    refreshStore();
    reason.value = '';
    notice.value = 'Order approved. Previous invoices and disputes remain unchanged.';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not approve PO.';
  } finally { busy.value = false; }
}

async function removeOrder(order: PurchaseOrder) {
  if (busy.value || !window.confirm(`Delete draft PO ${order.reference}? This cannot be undone.`)) return;
  busy.value=true; error.value=''; notice.value='';
  try {const result=await deletePurchaseOrder(order.id,actor.value.name,actor.value.role,DEMO_BUSINESS_ID);
    if(!result.success)throw new Error(result.error||'Could not delete PO');
    if(activeOrderId.value===order.id)closeEditor(); if(recordPage.value) await router.push('/orders'); refreshStore();notice.value=`PO ${order.reference} deleted.`;
  }catch(e){error.value=e instanceof Error?e.message:'Could not delete PO';}finally{busy.value=false;}
}
function orderStage(order: PurchaseOrder) {
  const inv=data.value.invoices.find(x=>x.purchase_order_id===order.id);
  if(inv){const view=computeInvoiceWithCustomer(inv,data.value,data.value.demoState.simulated_date);return view.status==='paid'?'Receipt / settled':'Payment';}
  const q=data.value.quotations.find(x=>x.purchase_order_id===order.id);
  if(q)return q.status==='accepted'?'Invoice preparation':q.status==='draft'?'Quotation draft':'Buyer confirmation';
  return 'PO preparation';
}
function orderAmount(order:PurchaseOrder) {
  const q=data.value.quotations.find(x=>x.purchase_order_id===order.id);
  return q?.amount??purchaseOrderTotal(order.details?.items||[]);
}
function customerName(id: string) {
  return data.value.customers.find(item => item.id === id)?.name ?? 'Customer unavailable';
}
</script>

<template>
  <div class="space-y-5">
    <div v-if="recordPage" class="flex items-center justify-between"><button class="outline-btn" @click="router.push('/orders')">← Back to Purchase Orders</button><div class="flex gap-2" v-if="activeOrder"><button v-if="recordMode==='view'" class="primary-btn" @click="router.push(`/orders/${encodeURIComponent(recordId)}/edit`)">Edit PO</button><button v-else class="outline-btn" @click="router.push(`/orders/${encodeURIComponent(recordId)}/view`)">View Details</button></div></div>
    <p v-if="recordPage && !activeOrder" class="card p-4 text-rose-700">Purchase order not found.</p>
    <div v-if="!recordPage" class="flex flex-wrap justify-between items-center gap-3"><p class="text-sm text-slate-600">Review saved orders or start a new PO. Seller verification is required before approval.</p><div class="flex gap-2"><button type="button" class="primary-btn" :disabled="busy" @click="startOrder('create')">+ Create New PO</button><button type="button" class="outline-btn" :disabled="busy" @click="startOrder('upload')">Upload Existing PO</button></div></div>
    <p v-if="error" role="alert" class="text-sm text-rose-700">{{error}}</p><p v-if="notice" role="status" class="text-sm text-emerald-700">{{notice}}</p>
    <section v-if="!recordPage" class="card overflow-hidden" aria-label="Purchase order list"><div class="px-4 py-3 border-b border-slate-100 flex flex-wrap justify-between gap-2"><h2 class="font-semibold">Purchase orders</h2><input v-model="query" aria-label="Search purchase orders" placeholder="Search PO or customer..." class="form-input !mt-0 max-w-xs" /></div><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-left text-slate-600"><tr><th class="p-3">PO reference</th><th class="p-3">Customer</th><th class="p-3">Date</th><th class="p-3">Amount</th><th class="p-3">Current stage</th><th class="p-3">Status</th><th class="p-3">Action</th></tr></thead><tbody><tr v-for="order in filteredOrders" :key="order.id" class="border-t"><td class="p-3">{{ order.reference }}</td><td class="p-3">{{ customerName(order.customer_id) }}</td><td class="p-3">{{order.created_at.slice(0,10)}}</td><td class="p-3">{{orderAmount(order)===null?'To be priced':formatMYR(orderAmount(order)!)}}</td><td class="p-3">{{orderStage(order)}}</td><td class="p-3 capitalize">{{ order.status }}</td><td class="p-3"><div class="flex items-center gap-2"><button type="button" class="rounded p-1.5 text-slate-700 hover:bg-slate-100" :aria-label="`View PO ${order.reference}`" title="View PO" @click="router.push(`/orders/${encodeURIComponent(order.id)}/view`)"><Eye class="h-4 w-4" /></button><button type="button" class="rounded p-1.5 text-blue-700 hover:bg-blue-50 disabled:opacity-50" :disabled="busy" :aria-label="`View or edit PO ${order.reference}`" title="View / edit details" @click="router.push(`/orders/${encodeURIComponent(order.id)}/edit`)"><Pencil class="h-4 w-4" /></button><button type="button" class="rounded p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40" :disabled="busy" :aria-label="`Delete PO ${order.reference}`" title="Delete draft PO" @click="removeOrder(order)"><Trash2 class="h-4 w-4" /></button></div></td></tr><tr v-if="!filteredOrders.length"><td colspan="7" class="p-4 text-slate-500">No purchase orders yet. Create one or upload an existing PO.</td></tr></tbody></table></div></section>
    <div v-if="showEditor && (!recordPage || activeOrder)" class="space-y-5"><div class="flex justify-between items-center"><h2 class="text-lg font-semibold">{{ activeOrder ? 'PO Details — ' + activeOrder.reference : editorMode === 'upload' ? 'Upload Existing PO' : 'Create New PO' }}</h2><button type="button" class="outline-btn" @click="recordPage ? router.push('/orders') : closeEditor()">Close</button></div>
    <p v-if="editorMode === 'upload' && !activeOrder" class="text-sm text-blue-800 bg-blue-50 rounded p-3">Upload the original PO below to extract its contents. Confirm and save its details; a replacement PO is not generated.</p>
    <section class="card p-4 space-y-3" v-if="!activeOrder"><label class="text-sm font-semibold">Select existing customer <span class="text-rose-700">*</span></label>
      <input v-model="customerSearch" class="form-input !mt-0" type="search" placeholder="Search by customer name, company, phone, or email" aria-label="Search existing customers" />
      <select class="form-input !mt-0" :value="customerId || ''" @change="selectCustomer(($event.target as HTMLSelectElement).value||null)">
       <option value="">Choose a customer...</option><option v-for="c in availableCustomers" :key="c.id" :value="c.id">{{c.name}} · {{c.phone}} · {{c.email || 'No email' }}</option>
      </select><p v-if="!availableCustomers.length" class="text-xs text-slate-500">No matching customers. Try another name or add a new customer.</p><details><summary class="text-blue-700 cursor-pointer text-sm">+ Add a customer or search more options</summary>
      <CustomerIntake :key="intakeKey" :suggestion="suggestion" @selected="selectCustomer" /></details>
    </section>
    <section v-if="customer && eligibility" class="card p-4 sm:p-5 space-y-4" aria-label="Order eligibility">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><h2 class="text-base font-semibold text-slate-900">{{ customer.name }}</h2><p class="mt-1 text-sm text-slate-600">{{ customer.phone }} · {{ customer.email || 'No billing email' }}</p></div>
        <span class="rounded px-2.5 py-1 text-xs font-medium" :class="eligibility.allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'">{{ eligibility.allowed ? 'Eligible for a new order' : 'Order hold' }}</span>
      </div>
      <div v-if="!eligibility.allowed" class="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
        <p class="text-sm font-semibold text-amber-900">Previous disputed invoices require attention</p>
        <p class="text-sm text-amber-900">Resolve the dispute and settle the required balance, or obtain a seller override for this PO.</p>
        <ul class="space-y-2 text-sm text-amber-900">
          <li v-for="blocker in eligibility.blockers" :key="blocker.invoice_id"><strong>{{ blocker.invoice_number }}</strong> · {{ formatMYR(blocker.balance) }} outstanding<br />{{ blocker.reason }}</li>
        </ul>
      </div>
      <div v-if="activeOrder" class="border-t border-slate-100 pt-4 space-y-3">
        <p class="text-sm text-slate-700"><strong>{{ activeOrder.reference }}</strong> · {{ activeOrder.status === 'approved' ? 'Approved' : 'Draft — awaiting approval' }}</p>
        <form v-if="activeOrder.status === 'draft' && (!recordPage || recordMode === 'edit')" class="space-y-3" @submit.prevent="approve">
          <label v-if="!eligibility.allowed && actor.role === 'seller'" class="block text-sm font-medium text-slate-700">Reason for allowing this order<textarea v-model.trim="reason" required maxlength="500" rows="3" class="form-input" placeholder="Explain why this specific PO can proceed despite the hold." :disabled="busy" /></label>
          <p v-if="actor.role !== 'seller'" class="text-sm text-amber-800">Only a seller can approve an order or override. Ask the seller to review this draft.</p>
          <p v-if="formDirty" class="text-sm text-amber-800">Save the edited PO details before approval.</p>
          <button type="submit" class="primary-btn" :disabled="busy || formDirty || actor.role !== 'seller' || (!eligibility.allowed && !reason.trim())">{{ eligibility.allowed ? 'Approve order' : 'Approve this PO with override' }}</button>
        </form>
        <div v-if="activeOrder.override" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
          <p class="font-semibold">Seller override for this order</p>
          <p>{{ activeOrder.override.reason }}</p>
          <p>Approved by {{ activeOrder.override.actor }} · {{ activeOrder.override.approved_at }}</p>
          <p>This approval does not clear previous disputes or apply to future orders.</p>
        </div>
      </div>
      <p v-if="error" role="alert" class="text-sm text-rose-700">{{ error }}</p>
      <p v-if="notice" role="status" class="text-sm text-emerald-700">{{ notice }}</p>
    </section>
    <OrderWorkspace v-if="activeOrder" :key="activeOrder.id" :order="activeOrder" />
    <details v-if="activeOrder && (!recordPage || recordMode === 'edit')" class="card p-4"><summary class="font-semibold cursor-pointer">{{activeOrder.status==='approved'?'View original PO details':'Edit PO details'}}</summary>
     <PurchaseOrderForm :order="activeOrder" :mode="editorMode" :customer="customer" :saving="busy" :saved-revision="savedRevision" @save="saveDraft" @buyer="suggestion=$event" @dirty="formDirty=$event" @screenshot="screenshot=$event" />
    </details>
    <PurchaseOrderForm v-else :mode="editorMode" :customer="customer" :saving="busy" :saved-revision="savedRevision" @save="saveDraft" @buyer="suggestion=$event" @dirty="formDirty=$event" @screenshot="screenshot=$event" />
    </div>
    <p class="text-xs text-slate-500">Seller demo: approvals are recorded under the demo seller. Individual authenticated seller accounts are required before production use.</p>
  </div>
</template>
