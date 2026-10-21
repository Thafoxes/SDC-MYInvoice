<script setup lang="ts">
import { computed, ref } from 'vue';
import { AlertTriangle, Eye, Check, Pencil, X, Send, ShieldCheck, PauseCircle, AlertCircle } from 'lucide-vue-next';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { computeInvoiceWithCustomer, updateCustomerResponse } from '@/lib/store';
import {
  approveFollowUp, rejectFollowUp, editFollowUpMessage, sendApprovedFollowUp,
  resolveVerificationHold, resolveDispute, confirmPromise,
} from '@/lib/actions';
import { formatMYR, formatDate, formatDateTime, daysOverdue } from '@/lib/format';
import {
  formatCheckpoint, formatApprovalState, formatSendState,
  formatDeliveryStatus, formatAiCategory,
} from '@/lib/display';
import type { FollowUpAction, InvoiceWithCustomer } from '@/types';
import BaseModal from '@/components/BaseModal.vue';
import InvoiceDetailDrawer from '@/components/InvoiceDetailDrawer.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const { data, refreshStore } = useDemoStore();
const { currentUser, currentBusiness } = useCurrentUser();

const invoices = computed(() =>
  data.value.invoices
    .filter(i => i.business_id === currentUser.value.business_id)
    .map(i => computeInvoiceWithCustomer(i, data.value, data.value.demoState.simulated_date))
);
const invMap = computed(() => new Map(invoices.value.map(i => [i.id, i])));
const custMap = computed(() => new Map(data.value.customers.map(c => [c.id, c])));

const followUps = computed(() =>
  data.value.followUpActions
    .filter(f => f.business_id === currentUser.value.business_id && f.checkpoint < 5)
    .map(f => ({ ...f, invoice: invMap.value.get(f.invoice_id), customer: custMap.value.get(f.customer_id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
);

const responses = computed(() =>
  data.value.customerResponses
    .filter(r => r.business_id === currentUser.value.business_id)
    .map(r => ({ ...r, invoice: invMap.value.get(r.invoice_id), customer: custMap.value.get(r.customer_id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
);

const exceptions = computed(() => {
  const result: { invoice: InvoiceWithCustomer; title: string; reason: string; action: string }[] = [];

  // 1. Regular exceptions from invoice flags
  for (const i of invoices.value) {
    if (i.dispute_active) {
      result.push({
        invoice: i,
        title: 'Invoice Dispute',
        reason: 'Customer has disputed this invoice; reminders are paused.',
        action: 'Investigate dispute',
      });
    }
    if (i.verification_hold) {
      result.push({
        invoice: i,
        title: 'Payment Verification Pending',
        reason: 'Customer claims payment has been made, but it is not verified.',
        action: 'Verify recorded payment',
      });
    }
    if (i.promise_confirmed && i.promise_to_pay_date && daysOverdue(i.promise_to_pay_date, data.value.demoState.simulated_date) > 0 && i.outstanding_balance > 0) {
      result.push({
        invoice: i,
        title: 'Missed Payment Promise',
        reason: `Promised payment by ${formatDate(i.promise_to_pay_date)} was not recorded.`,
        action: 'Contact seller for review',
      });
    }
  }

  // 2. 21+ day escalations (checkpoint 5 with delivery_status 'seller_decision_required' on unpaid invoices)
  const escalations = data.value.followUpActions.filter(
    f => f.business_id === currentUser.value.business_id &&
         f.checkpoint === 5 &&
         f.delivery_status === 'seller_decision_required'
  );
  for (const esc of escalations) {
    const inv = invMap.value.get(esc.invoice_id);
    if (inv && inv.outstanding_balance > 0 && inv.status !== 'paid') {
      result.push({
        invoice: inv,
        title: 'Escalation: seller decision needed',
        reason: esc.reason || `Invoice is 21+ days overdue (${inv.days_overdue} days). Automatic follow-ups stopped. Seller decision required.`,
        action: 'Review invoice for direct escalation or legal follow-up',
      });
    }
  }

  return result;
});

const activity = computed(() =>
  data.value.activityEvents
    .filter(a => a.business_id === currentUser.value.business_id)
    .slice(0, 50)
);

const tab = ref<'all' | 'approval' | 'responses' | 'exceptions' | 'history'>('all');
const tabs = computed(() => [
  { id: 'all', label: 'All', count: 0 },
  { id: 'approval', label: 'Awaiting Approval', count: followUps.value.filter(f => f.approval_state === 'pending').length },
  { id: 'responses', label: 'Customer Responses', count: responses.value.filter(r => r.review_status === 'pending').length },
  { id: 'exceptions', label: 'Exceptions', count: exceptions.value.length },
  { id: 'history', label: 'History', count: 0 },
] as const);

const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);
const editId = ref<string | null>(null);
const editText = ref('');
const editError = ref('');
const toast = ref('');
const toastIsError = ref(false);

const selected = computed(() => invoices.value.find(i => i.id === selectedId.value) ?? null);

function openInvoice(i: InvoiceWithCustomer) {
  selectedId.value = i.id;
  drawerOpen.value = true;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function notice(msg: string, isError = false) {
  toast.value = msg;
  toastIsError.value = isError;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
    toastIsError.value = false;
  }, 4200);
}

function execute(fn: () => { success: boolean; error?: string }, ok: string) {
  const r = fn();
  if (r.success) {
    notice(ok, false);
  } else {
    // If staff attempted seller action, show clear staff notice as requested
    if (currentUser.value.role === 'staff') {
      notice('Staff can prepare drafts but cannot approve reminders', true);
    } else {
      notice(r.error || 'Action failed', true);
    }
  }
  refreshStore();
}

function handleApprove(f: FollowUpAction) {
  execute(
    () => approveFollowUp(f.id, currentUser.value.id, currentUser.value.name, currentUser.value.role, currentUser.value.business_id),
    'Reminder approved'
  );
}

function handleReject(f: FollowUpAction) {
  execute(
    () => rejectFollowUp(f.id, currentUser.value.name, currentUser.value.role, currentUser.value.business_id),
    'Reminder rejected'
  );
}

function handleSend(f: FollowUpAction) {
  execute(
    () => sendApprovedFollowUp(f.id, currentUser.value.name, currentUser.value.business_id),
    'Message sent (simulated only)'
  );
}

function beginEdit(f: FollowUpAction) {
  editId.value = f.id;
  editText.value = f.message;
  editError.value = '';
}

function saveEdit() {
  if (!editId.value) return;
  if (!editText.value.trim()) {
    editError.value = 'Message is required';
    return;
  }
  const result = editFollowUpMessage(
    editId.value,
    editText.value,
    currentUser.value.name,
    currentUser.value.role,
    currentUser.value.business_id
  );
  if (result.success) {
    editId.value = null;
    notice('Reminder saved; approval reset.', false);
  } else {
    editError.value = result.error || 'Could not edit';
  }
  refreshStore();
}

function reviewResponse(id: string) {
  updateCustomerResponse(id, { review_status: 'reviewed' });
  notice('Response marked as reviewed', false);
  refreshStore();
}

function keepResponseOnHold() {
  // Leaves review_status 'pending' and only shows a toast
  notice('Response kept on hold for later follow-up', false);
}
</script>

<template>
  <div class="space-y-5">
    <!-- Feedback Toast -->
    <div
      v-if="toast"
      role="status"
      class="fixed right-5 top-20 z-50 rounded-xl p-3 text-sm text-white shadow-xl flex items-center gap-2"
      :class="toastIsError ? 'bg-red-600 border border-red-700' : 'bg-orbyte-ink'"
    >
      <AlertCircle v-if="toastIsError" class="w-4 h-4 shrink-0" />
      <span>{{ toast }}</span>
    </div>

    <!-- Tabs Header -->
    <div class="card flex flex-wrap gap-1.5 p-1.5">
      <button
        v-for="t in tabs"
        :key="t.id"
        @click="tab = t.id"
        class="rounded-lg px-3.5 py-2 text-sm font-medium transition"
        :class="tab === t.id ? 'bg-orbyte-button text-white shadow-sm' : 'text-orbyte-muted hover:bg-orbyte-bg'"
      >
        {{ t.label }}
        <span
          v-if="t.count"
          class="ml-1 rounded-full px-1.5 text-[10px]"
          :class="tab === t.id ? 'bg-white/20' : 'bg-orbyte-bg'"
        >
          {{ t.count }}
        </span>
      </button>
    </div>

    <!-- Section 1: Reminder Approvals -->
    <section v-if="tab === 'all' || tab === 'approval'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Reminder Approvals</h3>
        <span class="text-xs text-orbyte-muted">{{ currentBusiness?.name }}</span>
      </div>
      <p v-if="!followUps.length" class="card p-6 text-sm text-orbyte-muted">
        No reminders yet for {{ currentBusiness?.name }}. Use Demo Controls → Run Invoice Check to create drafts.
      </p>

      <!-- Approval Cards (spec section 7: customer, exact recipient, invoice number, outstanding amount, due date, overdue duration, reason, exact message) -->
      <div v-for="f in followUps" :key="f.id" class="card p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div class="space-y-3 flex-1">
            <!-- Header: Customer, Invoice Number, Status Badge -->
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-semibold text-base">{{ f.customer?.name || '—' }}</h4>
              <span class="text-sm font-mono text-orbyte-muted font-medium">{{ f.invoice?.invoice_number }}</span>
              <StatusBadge v-if="f.invoice" :status="f.invoice.status" />
            </div>

            <!-- Metadata row (spec section 7) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs bg-orbyte-bg/40 p-3 rounded-xl border border-orbyte-border">
              <div>
                <p class="text-orbyte-muted">Exact Recipient</p>
                <p class="font-medium text-orbyte-ink mt-0.5">{{ f.recipient || f.customer?.phone || 'No phone recorded' }}</p>
              </div>
              <div>
                <p class="text-orbyte-muted">Outstanding Amount</p>
                <p class="font-bold text-orbyte-ink mt-0.5">{{ formatMYR(f.invoice?.outstanding_balance || 0) }}</p>
              </div>
              <div>
                <p class="text-orbyte-muted">Due Date</p>
                <p class="font-medium text-orbyte-ink mt-0.5">{{ formatDate(f.invoice?.due_date || '') }}</p>
              </div>
              <div>
                <p class="text-orbyte-muted">Overdue Duration</p>
                <p class="font-medium mt-0.5" :class="f.invoice?.days_overdue ? 'text-red-600 font-semibold' : 'text-orbyte-muted'">
                  {{ f.invoice?.days_overdue ? `${f.invoice.days_overdue} days overdue` : 'Not overdue' }}
                </p>
              </div>
              <div>
                <p class="text-orbyte-muted">Reminder Stage</p>
                <p class="font-medium text-orbyte-ink mt-0.5">{{ formatCheckpoint(f.checkpoint) }}</p>
              </div>
            </div>

            <!-- Reason -->
            <div>
              <p class="text-[11px] font-medium text-orbyte-muted uppercase tracking-wider">Reason</p>
              <p class="text-xs text-orbyte-ink mt-0.5">{{ f.reason }}</p>
            </div>

            <!-- Exact Message -->
            <div>
              <p class="text-[11px] font-medium text-orbyte-muted uppercase tracking-wider mb-1">Exact Message</p>
              <div class="rounded-xl border border-orbyte-border bg-orbyte-bg/70 p-3 text-sm text-orbyte-ink font-mono whitespace-pre-wrap leading-relaxed">
                {{ f.message }}
              </div>
            </div>

            <!-- State Chips -->
            <div class="flex flex-wrap gap-2 items-center text-xs pt-1">
              <span class="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-700 font-medium">
                {{ formatApprovalState(f.approval_state) }}
              </span>
              <span class="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-700 font-medium">
                {{ formatSendState(f.send_state) }}
              </span>
              <span v-if="f.delivery_status" class="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-700">
                {{ formatDeliveryStatus(f.delivery_status) }}
              </span>
              <span v-if="f.approved_at" class="text-orbyte-muted text-[11px]">
                Approved on {{ formatDateTime(f.approved_at) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2 lg:flex-col lg:min-w-[170px] justify-start">
            <template v-if="f.approval_state === 'pending'">
              <button class="success-btn" @click="handleApprove(f)">
                <Check class="w-4 h-4" />Approve
              </button>
              <button class="outline-btn" @click="beginEdit(f)">
                <Pencil class="w-4 h-4" />Edit Draft
              </button>
              <button class="danger-btn" @click="handleReject(f)">
                <X class="w-4 h-4" />Reject
              </button>
            </template>
            <button
              v-if="f.approval_state === 'approved' && f.send_state === 'not_sent'"
              class="primary-btn"
              @click="handleSend(f)"
            >
              <Send class="w-4 h-4" />Send (Simulation)
            </button>
            <button v-if="f.invoice" class="outline-btn" @click="openInvoice(f.invoice)">
              <Eye class="w-4 h-4" />View Invoice
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Customer Responses -->
    <section v-if="tab === 'all' || tab === 'responses'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Customer Responses</h3>
        <span class="text-xs text-orbyte-muted">{{ currentBusiness?.name }}</span>
      </div>
      <p v-if="!responses.length" class="card p-6 text-sm text-orbyte-muted">
        No customer responses recorded yet for {{ currentBusiness?.name }}.
      </p>

      <div v-for="r in responses" :key="r.id" class="card p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div class="flex-1 space-y-3">
            <p class="font-semibold text-base">
              {{ r.customer?.name }}
              <span class="ml-2 font-normal text-sm font-mono text-orbyte-muted">{{ r.invoice?.invoice_number }}</span>
              <span v-if="r.invoice" class="ml-2 text-xs font-normal text-orbyte-muted">
                (Outstanding: {{ formatMYR(r.invoice.outstanding_balance) }})
              </span>
            </p>
            <p class="rounded-xl bg-orbyte-bg p-3 text-sm italic border border-orbyte-border">“{{ r.message }}”</p>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-orbyte-border bg-white p-3">
                <p class="info-label">SIMULATED RESPONSE CLASSIFICATION</p>
                <p class="text-sm font-semibold capitalize text-orbyte-ink mt-0.5">{{ formatAiCategory(r.ai_category) }}</p>
                <p class="text-xs text-orbyte-muted mt-1" v-if="r.ai_confidence !== null">
                  Confidence: {{ Math.round(r.ai_confidence * 100) }}%
                </p>
              </div>
              <div class="rounded-xl border border-orbyte-border bg-white p-3">
                <p class="info-label">SUGGESTED ACTION</p>
                <p class="text-sm text-orbyte-ink mt-0.5">{{ r.ai_suggested_action }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-4 text-xs text-orbyte-muted">
              <span v-if="r.ai_extracted_date" class="font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Proposed promise date: {{ formatDate(r.ai_extracted_date) }}
              </span>
              <span class="capitalize">Review status: <strong>{{ r.review_status }}</strong></span>
              <span>Received: {{ formatDateTime(r.created_at) }}</span>
            </div>
          </div>

          <!-- Buttons strictly follow invoice's CURRENT state (spec requirement 6) -->
          <div class="flex flex-wrap gap-2 lg:flex-col lg:min-w-[170px] justify-start">
            <button v-if="r.invoice" class="outline-btn" @click="openInvoice(r.invoice)">
              <Eye class="w-4 h-4" />Review Invoice
            </button>

            <!-- Verification buttons: only while verification_hold is active -->
            <template v-if="r.invoice?.verification_hold">
              <button
                class="success-btn"
                @click="execute(() => resolveVerificationHold(r.invoice!.id, true, currentUser.name, currentUser.business_id), 'Verification hold reviewed — payment remains unpaid until recorded')"
              >
                <ShieldCheck class="w-4 h-4" />Review Verification
              </button>
              <button
                class="outline-btn"
                @click="execute(() => resolveVerificationHold(r.invoice!.id, false, currentUser.name, currentUser.business_id), 'Hold released for seller follow-up')"
              >
                Cannot Verify
              </button>
            </template>

            <!-- Resolve Dispute: only while dispute_active is true -->
            <button
              v-if="r.invoice?.dispute_active"
              class="outline-btn"
              @click="execute(() => resolveDispute(r.invoice!.id, currentUser.name, currentUser.business_id), 'Dispute resolved')"
            >
              Resolve Dispute
            </button>

            <!-- Promise buttons: only while unpaid (outstanding > 0 and status !== 'paid'), for payment_promise OR payment_promise_or_extension_request with ai_extracted_date -->
            <template v-if="r.invoice && r.invoice.outstanding_balance > 0 && r.invoice.status !== 'paid' && ['payment_promise', 'payment_promise_or_extension_request'].includes(r.ai_category || '') && r.ai_extracted_date">
              <button
                class="success-btn"
                @click="execute(() => confirmPromise(r.invoice!.id, r.ai_extracted_date!, true, currentUser.name, currentUser.business_id), 'Promise confirmed')"
              >
                Confirm Promise
              </button>
              <button
                class="outline-btn"
                @click="execute(() => confirmPromise(r.invoice!.id, r.ai_extracted_date!, false, currentUser.name, currentUser.business_id), 'Promise declined')"
              >
                Decline
              </button>
            </template>

            <!-- Mark as reviewed and Keep on Hold -->
            <template v-if="r.review_status === 'pending'">
              <button class="outline-btn" @click="reviewResponse(r.id)">
                <Check class="w-4 h-4" />Mark as reviewed
              </button>
              <button class="outline-btn" @click="keepResponseOnHold()">
                <PauseCircle class="w-4 h-4" />Keep On Hold
              </button>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Exceptions (including 21+ day escalations on unpaid invoices) -->
    <section v-if="tab === 'all' || tab === 'exceptions'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Exceptions</h3>
        <span class="text-xs text-orbyte-muted">{{ currentBusiness?.name }}</span>
      </div>
      <p v-if="!exceptions.length" class="card p-6 text-sm text-orbyte-muted">
        No exceptions requiring attention for {{ currentBusiness?.name }}.
      </p>

      <div v-for="(e, k) in exceptions" :key="k" class="card flex gap-3 p-4">
        <span class="rounded-lg bg-red-50 p-2 h-fit border border-red-100">
          <AlertTriangle class="w-4 h-4 text-red-500" />
        </span>
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="font-semibold text-sm">{{ e.title }}</h4>
            <span class="text-orbyte-muted font-normal text-xs font-mono">· {{ e.invoice.invoice_number }}</span>
            <span class="text-xs text-orbyte-muted font-medium">({{ e.invoice.customer?.name }})</span>
            <span class="text-xs font-bold text-orbyte-ink ml-auto">{{ formatMYR(e.invoice.outstanding_balance) }}</span>
          </div>
          <p class="text-sm text-orbyte-muted mt-1">{{ e.reason }}</p>
          <p class="text-xs mt-1.5 font-medium text-orbyte-ink">Recommended: <span class="text-orbyte-muted font-normal">{{ e.action }}</span></p>
          <button class="outline-btn mt-3 !py-1 !text-xs" @click="openInvoice(e.invoice)">
            View Invoice
          </button>
        </div>
      </div>
    </section>

    <!-- Section 4: History -->
    <section v-if="tab === 'history'" class="card p-5">
      <h3 class="font-semibold mb-4">Activity History ({{ currentBusiness?.name }})</h3>
      <p v-if="!activity.length" class="empty-text">No activity recorded for this business.</p>
      <div
        v-for="(e, k) in activity"
        :key="e.id"
        class="border-l-2 pl-4 py-2"
        :class="k === 0 ? 'border-orbyte-blue' : 'border-orbyte-border'"
      >
        <p class="text-sm text-orbyte-ink">{{ e.description }}</p>
        <p class="text-xs text-orbyte-muted mt-1">{{ formatDateTime(e.created_at) }} · {{ e.actor }} ({{ e.actor_role }})</p>
      </div>
    </section>

    <!-- Invoice Detail Drawer -->
    <InvoiceDetailDrawer
      :invoice="selected"
      :open="drawerOpen"
      :seller-name="currentUser.name"
      :seller-role="currentUser.role"
      @close="drawerOpen = false"
    />

    <!-- Edit Reminder Modal -->
    <BaseModal :open="!!editId" title="Edit Reminder Message" @close="editId = null">
      <p class="text-sm text-orbyte-muted mb-3">
        Changing the reminder invalidates previous approval. Seller approval is required again before sending.
      </p>
      <p v-if="editError" class="text-sm text-red-600 mb-2">{{ editError }}</p>
      <textarea v-model="editText" rows="6" class="form-input"></textarea>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="outline-btn" @click="editId = null">Cancel</button>
          <button class="primary-btn" @click="saveEdit">Save & Reset Approval</button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
