<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { X, Plus, ShieldCheck, AlertCircle } from 'lucide-vue-next';
import type { InvoiceWithCustomer } from '@/types';
import BaseModal from '@/components/BaseModal.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { computeInvoiceWithCustomer, addActivity } from '@/lib/store';
import { recordPayment, resolveVerificationHold, resolveDispute, confirmPromise } from '@/lib/actions';
import { formatMYR, formatDate, formatDateTime } from '@/lib/format';
import {
  getDerivedLabelChips, formatCheckpoint, formatApprovalState, formatSendState,
  formatAiCategory, formatReviewStatus, formatActivityText, formatOverdueDays,
} from '@/lib/display';

const props = defineProps<{ invoice: InvoiceWithCustomer | null; open: boolean; sellerName: string; sellerRole: string }>();
const emit = defineEmits<{ close: [] }>();

const { data, refreshStore } = useDemoStore();

const current = computed(() => {
  if (!props.invoice) return null;
  const i = data.value.invoices.find(x => x.id === props.invoice?.id);
  return i ? computeInvoiceWithCustomer(i, data.value, data.value.demoState.simulated_date) : null;
});

const payments = computed(() =>
  data.value.payments.filter(p => p.invoice_id === current.value?.id).sort((a, b) => b.payment_date.localeCompare(a.payment_date))
);
const followups = computed(() => data.value.followUpActions.filter(f => f.invoice_id === current.value?.id));
const responses = computed(() => data.value.customerResponses.filter(r => r.invoice_id === current.value?.id));
const activity = computed(() => data.value.activityEvents.filter(e => e.invoice_id === current.value?.id));

const payModal = ref(false);
const amount = ref('');
const date = ref(data.value.demoState.simulated_date);
const method = ref('bank_transfer');
const reference = ref('');
const error = ref('');

watch(() => props.open, (open) => {
  if (open) {
    date.value = data.value.demoState.simulated_date;
    error.value = '';
  }
});

function reviewVerification(verified: boolean) {
  if (!current.value) return;
  resolveVerificationHold(current.value.id, verified, props.sellerName, current.value.business_id);
  addActivity(
    current.value.business_id,
    current.value.id,
    'verification_reviewed',
    props.sellerName,
    props.sellerRole,
    verified ? 'Seller confirmed verification review (does not itself record a payment)' : 'Seller could not verify payment'
  );
  refreshStore();
  emit('close');
}

function resolveDisputeAction() {
  if (!current.value) return;
  resolveDispute(current.value.id, props.sellerName, current.value.business_id);
  refreshStore();
  emit('close');
}

function confirmPromiseAction(confirmed: boolean) {
  if (!current.value?.promise_to_pay_date) return;
  confirmPromise(current.value.id, current.value.promise_to_pay_date, confirmed, props.sellerName, current.value.business_id);
  refreshStore();
  emit('close');
}

function savePayment() {
  if (!current.value) return;
  const n = Number(amount.value);
  if (!Number.isFinite(n) || n <= 0) {
    error.value = 'Enter a valid positive payment amount.';
    return;
  }
  if (!date.value) {
    error.value = 'Select a payment date.';
    return;
  }
  const result = recordPayment(current.value.id, n, date.value, method.value, reference.value, props.sellerName, current.value.business_id);
  if (!result.success) {
    error.value = result.error || 'Could not save payment';
    return;
  }
  amount.value = '';
  reference.value = '';
  error.value = '';
  payModal.value = false;
  refreshStore();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && current" class="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm" @click.self="emit('close')">
      <aside class="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-popover animate-slide-in-right border-l border-slate-200">
        <!-- Header -->
        <div class="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Invoice details</h2>
            <p class="text-xs font-mono text-slate-500">{{ current.invoice_number }}</p>
          </div>
          <button
            type="button"
            aria-label="Close invoice drawer"
            class="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-5 text-xs">
          <!-- Information grid -->
          <section class="space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice information</h3>
            <div class="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p class="text-slate-400 text-[11px]">Invoice number</p>
                <p class="font-mono font-medium text-slate-900 mt-0.5">{{ current.invoice_number }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Customer</p>
                <p class="font-medium text-slate-900 mt-0.5">{{ current.customer?.name }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Invoice amount</p>
                <p class="text-slate-900 tabular-nums mt-0.5">{{ formatMYR(current.invoice_amount) }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Outstanding balance</p>
                <p class="font-bold text-slate-900 tabular-nums mt-0.5">{{ formatMYR(current.outstanding_balance) }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Issue date</p>
                <p class="text-slate-700 tabular-nums mt-0.5">{{ formatDate(current.issue_date) }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Due date</p>
                <p class="text-slate-700 tabular-nums mt-0.5">{{ formatDate(current.due_date) }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Total paid</p>
                <p class="text-slate-700 tabular-nums mt-0.5">{{ formatMYR(current.total_paid) }}</p>
              </div>
              <div>
                <p class="text-slate-400 text-[11px]">Status</p>
                <div class="mt-0.5"><StatusBadge :status="current.status" /></div>
              </div>
            </div>

            <!-- Derived chips -->
            <div v-if="getDerivedLabelChips(current).length" class="flex flex-wrap gap-1.5 pt-1">
              <span
                v-for="chip in getDerivedLabelChips(current)"
                :key="chip.text"
                class="rounded px-2 py-0.5 text-[11px] font-medium"
                :class="chip.className"
              >
                {{ chip.text }}
              </span>
            </div>

            <div v-if="current.days_overdue > 0" class="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 flex items-center gap-1.5 text-xs font-medium">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{{ formatOverdueDays(current.days_overdue) }}</span>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-wrap gap-2 pt-1">
              <button v-if="current.outstanding_balance > 0" class="primary-btn" @click="payModal = true">
                <Plus class="w-3.5 h-3.5" /> Record payment
              </button>
              <template v-if="current.verification_hold">
                <button class="success-btn" @click="reviewVerification(true)">
                  <ShieldCheck class="w-3.5 h-3.5" /> Verification reviewed
                </button>
                <button class="outline-btn" @click="reviewVerification(false)">
                  Cannot verify
                </button>
              </template>
              <button v-if="current.dispute_active" class="outline-btn" @click="resolveDisputeAction">
                Resolve dispute
              </button>
              <template v-if="current.promise_to_pay_date">
                <button class="success-btn" @click="confirmPromiseAction(true)">Confirm promise</button>
                <button class="outline-btn" @click="confirmPromiseAction(false)">Remove promise</button>
              </template>
            </div>
          </section>

          <!-- Payment history -->
          <section class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment history</h3>
            <p v-if="!payments.length" class="text-slate-400">No recorded payments.</p>
            <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div v-for="p in payments" :key="p.id" class="p-2.5 flex items-center justify-between">
                <div>
                  <p class="font-semibold text-slate-900 tabular-nums">{{ formatMYR(p.amount) }}</p>
                  <p class="text-[11px] text-slate-400 tabular-nums">{{ formatDate(p.payment_date) }} · {{ p.method }} · {{ p.reference }}</p>
                </div>
                <span v-if="p.verification_status === 'flagged'" class="text-[11px] text-rose-600 font-medium">Flagged</span>
              </div>
            </div>
          </section>

          <!-- Reminder history -->
          <section class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Reminder history</h3>
            <p v-if="!followups.length" class="text-slate-400">No reminders generated yet.</p>
            <div class="space-y-2">
              <div v-for="f in followups" :key="f.id" class="rounded-lg border border-slate-200 p-2.5 space-y-1 bg-white">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-slate-900">{{ formatCheckpoint(f.checkpoint) }}</span>
                  <span class="text-[11px] text-slate-500">
                    {{ formatApprovalState(f.approval_state) }} / {{ formatSendState(f.send_state) }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500">{{ f.reason }}</p>
                <p class="rounded border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-700 leading-normal">{{ f.message }}</p>
                <p v-if="f.sent_at" class="text-[10px] text-slate-400 tabular-nums">Recorded {{ formatDateTime(f.sent_at) }} (simulated)</p>
              </div>
            </div>
          </section>

          <!-- Customer responses -->
          <section class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer responses</h3>
            <p v-if="!responses.length" class="text-slate-400">No customer responses.</p>
            <div class="space-y-2">
              <div v-for="r in responses" :key="r.id" class="rounded-lg border border-slate-200 p-2.5 space-y-1 bg-white">
                <p class="italic text-slate-800">“{{ r.message }}”</p>
                <p class="text-[11px] text-slate-500">
                  <span class="font-medium text-slate-800">{{ formatAiCategory(r.ai_category) }}</span> · {{ formatReviewStatus(r.review_status) }}
                </p>
                <p class="text-[11px] text-slate-600">{{ r.ai_suggested_action }}</p>
              </div>
            </div>
          </section>

          <!-- Activity timeline -->
          <section class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Activity timeline</h3>
            <p v-if="!activity.length" class="text-slate-400">No activity recorded.</p>
            <div class="space-y-1.5 border-l-2 border-slate-200 pl-3 ml-1">
              <div v-for="e in activity" :key="e.id" class="py-1">
                <p class="text-slate-900 font-medium">{{ formatActivityText(e.description, data) }}</p>
                <p class="text-[10px] text-slate-400 tabular-nums mt-0.5">{{ formatDateTime(e.created_at) }} · {{ e.actor }}</p>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>

  <!-- Record Payment Modal -->
  <BaseModal :open="payModal" title="Record payment (simulation)" @close="payModal = false">
    <div v-if="current" class="space-y-3 text-xs">
      <div class="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
        <p class="font-semibold text-slate-900">{{ current.invoice_number }} · {{ current.customer?.name }}</p>
        <p class="text-slate-500 mt-0.5 tabular-nums">Outstanding: {{ formatMYR(current.outstanding_balance) }}</p>
      </div>
      <p v-if="error" class="rounded-lg bg-rose-50 p-2 text-rose-700 text-xs">{{ error }}</p>
      <label class="form-label">Payment amount (MYR)<input v-model="amount" type="number" min="0.01" step="0.01" class="form-input" /></label>
      <label class="form-label">Payment date<input v-model="date" type="date" class="form-input" /></label>
      <label class="form-label">
        Method
        <select v-model="method" class="form-input">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="duitnow">DuitNow</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
        </select>
      </label>
      <label class="form-label">Reference (optional)<input v-model="reference" class="form-input" placeholder="Reference number" /></label>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button class="outline-btn" @click="payModal = false">Cancel</button>
        <button class="primary-btn" @click="savePayment">Record payment</button>
      </div>
    </template>
  </BaseModal>
</template>
