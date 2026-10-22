<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import CustomerIntake from '@/components/CustomerIntake.vue';
import PurchaseOrderForm from '@/components/PurchaseOrderForm.vue';
import type { PurchaseOrderDetails } from '@/types';
import type { CustomerExtraction } from '@/lib/customerOrders';
import { useDemoStore } from '@/composables/useDemoStore';
import { DEMO_BUSINESS_ID, DEMO_SELLER_ID } from '@/lib/store';
import { getOrderEligibility } from '@/lib/customerOrders';
import { approvePurchaseOrder, createPurchaseOrder, updatePurchaseOrder } from '@/services/commands';
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
const suggestion = ref<CustomerExtraction>();
const formDirty = ref(false);
const savedRevision = ref(0);
const intakeKey = ref(0);
const reason = ref('');
const activeOrderId = ref('');
const activeOrder = computed(() => orders.value.find(order => order.id === activeOrderId.value));
const busy = ref(false);
const error = ref('');
const notice = ref('');
const route = useRoute();

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
}

async function saveDraft(reference: string, details: PurchaseOrderDetails) {
  if (!customerId.value || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = activeOrderId.value
      ? await updatePurchaseOrder(activeOrderId.value, reference, details, actor.value.name, actor.value.role, DEMO_BUSINESS_ID)
      : await createPurchaseOrder(customerId.value, reference, actor.value.name, actor.value.role, DEMO_BUSINESS_ID, details);
    if (!result.success || !result.id) throw new Error(result.error || 'Could not save PO.');
    activeOrderId.value = result.id;
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

function customerName(id: string) {
  return data.value.customers.find(item => item.id === id)?.name ?? 'Customer unavailable';
}
</script>

<template>
  <div class="space-y-5">
    <p class="text-sm text-slate-600">Find the buyer, review previous disputes, then accept their PO. A held order can remain saved as a draft.</p>
    <div class="flex justify-end"><button type="button" class="outline-btn" :disabled="busy" @click="selectCustomer(null); intakeKey += 1; savedRevision += 1">Start another PO</button></div>
    <CustomerIntake :key="intakeKey" :suggestion="suggestion" @selected="selectCustomer" />
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
        <form v-if="activeOrder.status === 'draft'" class="space-y-3" @submit.prevent="approve">
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
    <PurchaseOrderForm :order="activeOrder" :customer="customer" :saving="busy" :saved-revision="savedRevision" @save="saveDraft" @buyer="suggestion = $event" @dirty="formDirty = $event" />
    <section class="card overflow-hidden" aria-label="Saved purchase orders">
      <div class="px-4 py-3 border-b border-slate-100"><h2 class="text-base font-semibold text-slate-900">Saved purchase orders</h2><p class="mt-1 text-xs text-slate-500">Buyer PO details and original evidence, with a separate processing approval.</p></div>
      <ul class="divide-y divide-slate-100">
        <li v-for="order in orders" :key="order.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div class="text-sm"><strong>{{ order.reference }}</strong><p class="text-slate-600">{{ customerName(order.customer_id) }} · {{ order.status }}{{ order.override ? ' · Seller override' : '' }}</p></div>
          <button type="button" class="text-sm font-medium text-blue-700" :disabled="busy" :aria-label="`Review ${order.reference}`" @click="openOrder(order.id)">Review</button>
        </li>
        <li v-if="!orders.length" class="px-4 py-6 text-sm text-slate-500">No purchase orders yet. Find a customer to save the first draft.</li>
      </ul>
    </section>
    <p class="text-xs text-slate-500">Seller demo: approvals are recorded under the demo seller. Individual authenticated seller accounts are required before production use.</p>
  </div>
</template>
