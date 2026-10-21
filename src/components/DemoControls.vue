<script setup lang="ts">
import { computed, ref } from 'vue';
import { FlaskConical, CalendarClock, Play, RotateCcw, MessageSquarePlus, DollarSign, ChevronDown, ChevronUp, Info } from 'lucide-vue-next';
import BaseModal from '@/components/BaseModal.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { setDemoDate, resetStore, computeInvoiceWithCustomer } from '@/lib/store';
import { runInvoiceCheck } from '@/lib/reminderEngine';
import { simulateCustomerResponse, recordPayment } from '@/lib/actions';
import { formatMYR } from '@/lib/format';

const props = defineProps<{ sellerName: string }>();
const { data, refreshStore } = useDemoStore();
const { currentUser, currentBusiness } = useCurrentUser();

const expanded = ref(false), notice = ref(''), showResponse = ref(false), showPayment = ref(false);
const responseInvoice = ref(''), responseText = ref(''), paymentInvoice = ref(''), paymentAmount = ref('');
const paymentDate = ref(data.value.demoState.simulated_date), paymentMethod = ref('bank_transfer'), paymentRef = ref('');

const invoices = computed(() =>
  data.value.invoices
    .filter(i => i.business_id === currentUser.value.business_id)
    .map(i => computeInvoiceWithCustomer(i, data.value, data.value.demoState.simulated_date))
);

const suggestions = [
  'Boss, I already paid yesterday via online transfer.',
  'Can I pay next Friday?',
  'I never received the products from this invoice.',
  'Okay, will pay tomorrow.',
];

let timer: ReturnType<typeof setTimeout> | undefined;
function toast(s: string) {
  notice.value = s;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => notice.value = '', 4500);
}

function setDate(value: string) {
  setDemoDate(value);
  refreshStore();
}

function advanceDate(days: number) {
  const d = new Date(data.value.demoState.simulated_date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  toast(`Demo date advanced by ${days} day(s)`);
}

function runCheck() {
  const r = runInvoiceCheck(currentUser.value.business_id, currentBusiness.value?.name || 'Business');
  refreshStore();
  toast(`Invoice check (${currentBusiness.value?.name}): ${r.prepared} prepared, ${r.escalated} escalated, ${r.skipped} skipped`);
}

function reset() {
  if (window.confirm('Reset all local demo data? This will undo changes.')) {
    resetStore();
    refreshStore();
    toast('Demo data reset.');
  }
}

function saveResponse() {
  if (!responseInvoice.value || !responseText.value.trim()) {
    toast('Select an invoice and enter a message');
    return;
  }
  const i = invoices.value.find(x => x.id === responseInvoice.value);
  if (!i) return;
  const r = simulateCustomerResponse(i.id, i.customer_id, responseText.value, currentUser.value.business_id);
  if (r.success) {
    showResponse.value = false;
    responseText.value = '';
    refreshStore();
    toast(`Response classified: ${r.classification?.category.replace(/_/g, ' ')}`);
  } else {
    toast(r.error || 'Error');
  }
}

function savePayment() {
  const i = invoices.value.find(x => x.id === paymentInvoice.value);
  const value = Number(paymentAmount.value);
  if (!i || !Number.isFinite(value) || value <= 0) {
    toast('Select an invoice and valid payment amount');
    return;
  }
  const r = recordPayment(i.id, value, paymentDate.value, paymentMethod.value, paymentRef.value, props.sellerName, currentUser.value.business_id);
  if (!r.success) {
    toast(r.error || 'Payment error');
    return;
  }
  showPayment.value = false;
  paymentAmount.value = '';
  paymentRef.value = '';
  refreshStore();
  toast('Synthetic payment recorded');
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-30 w-72 max-w-[90vw] rounded-2xl border border-orbyte-border bg-white shadow-xl">
    <button class="flex w-full items-center justify-between px-4 py-3" @click="expanded = !expanded">
      <span class="flex items-center gap-2 text-sm font-semibold">
        <span class="rounded-lg bg-purple-50 p-1.5"><FlaskConical class="h-4 w-4 text-purple-600" /></span>
        Demo Controls
      </span>
      <ChevronDown v-if="expanded" class="w-4 h-4 text-orbyte-muted" />
      <ChevronUp v-else class="w-4 h-4 text-orbyte-muted" />
    </button>
    <div v-if="expanded" class="border-t border-orbyte-border px-4 py-3 space-y-3">
      <div>
        <label class="flex items-center gap-1 text-xs font-medium text-orbyte-muted">
          <CalendarClock class="w-4 h-4" />Simulated Date
        </label>
        <div class="flex gap-1 mt-1">
          <input
            :value="data.demoState.simulated_date"
            type="date"
            class="form-input !mt-0 min-w-0 flex-1 !px-1 !text-xs"
            @change="setDate(($event.target as HTMLInputElement).value)"
          />
          <button class="outline-btn !px-2 !text-xs" @click="advanceDate(1)">+1d</button>
          <button class="outline-btn !px-2 !text-xs" @click="advanceDate(7)">+7d</button>
        </div>
      </div>
      <div class="space-y-1.5">
        <button class="primary-btn w-full" @click="runCheck"><Play class="w-4 h-4" />Run Invoice Check</button>
        <button class="outline-btn w-full" @click="showResponse = true"><MessageSquarePlus class="w-4 h-4" />Simulate Customer Reply</button>
        <button class="outline-btn w-full" @click="paymentDate = data.demoState.simulated_date; showPayment = true"><DollarSign class="w-4 h-4" />Simulate Payment</button>
        <button class="danger-btn w-full" @click="reset"><RotateCcw class="w-4 h-4" />Reset Demo Data</button>
      </div>
      <p class="flex items-start gap-2 rounded-lg bg-orbyte-bg p-2 text-[10px] leading-relaxed text-orbyte-muted">
        <Info class="h-4 w-4 shrink-0 text-orbyte-blue" />
        Local browser storage only. No API, actual customer delivery, or verified bank payments.
      </p>
    </div>
    <div v-if="notice" role="status" class="border-t border-orbyte-border bg-orbyte-ink p-3 text-xs text-white">{{ notice }}</div>
  </div>

  <BaseModal :open="showResponse" title="Simulate Customer Response" @close="showResponse = false">
    <div class="space-y-4">
      <label class="form-label">
        Invoice
        <select v-model="responseInvoice" class="form-input">
          <option value="">Choose an invoice…</option>
          <option v-for="i in invoices" :key="i.id" :value="i.id">{{ i.invoice_number }} — {{ i.customer?.name }}</option>
        </select>
      </label>
      <label class="form-label">
        Customer Message
        <textarea v-model="responseText" rows="4" class="form-input" placeholder="Boss, I already paid yesterday."></textarea>
      </label>
      <div class="flex flex-wrap gap-1.5">
        <button v-for="s in suggestions" :key="s" class="rounded-lg border border-orbyte-border bg-orbyte-bg/30 px-2 py-1 text-xs hover:bg-orbyte-bg" @click="responseText = s">{{ s }}</button>
      </div>
      <p class="text-xs text-orbyte-muted">Rule-based demo classification; no real AI API is connected.</p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button class="outline-btn" @click="showResponse = false">Cancel</button>
        <button class="primary-btn" @click="saveResponse">Simulate Response</button>
      </div>
    </template>
  </BaseModal>

  <BaseModal :open="showPayment" title="Simulate Payment" @close="showPayment = false">
    <div class="space-y-4">
      <label class="form-label">
        Invoice
        <select v-model="paymentInvoice" class="form-input">
          <option value="">Choose an invoice…</option>
          <option v-for="i in invoices.filter(x => x.outstanding_balance > 0)" :key="i.id" :value="i.id">{{ i.invoice_number }} — {{ formatMYR(i.outstanding_balance) }} outstanding</option>
        </select>
      </label>
      <label class="form-label">
        Amount (MYR)
        <input v-model="paymentAmount" type="number" step="0.01" min="0.01" class="form-input" />
      </label>
      <label class="form-label">
        Payment Date
        <input v-model="paymentDate" type="date" class="form-input" />
      </label>
      <label class="form-label">
        Method
        <select v-model="paymentMethod" class="form-input">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="duitnow">DuitNow</option>
          <option value="cash">Cash</option>
        </select>
      </label>
      <label class="form-label">
        Reference
        <input v-model="paymentRef" class="form-input" placeholder="Synthetic reference" />
      </label>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button class="outline-btn" @click="showPayment = false">Cancel</button>
        <button class="primary-btn" @click="savePayment">Record Payment</button>
      </div>
    </template>
  </BaseModal>
</template>
