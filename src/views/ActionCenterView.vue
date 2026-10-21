<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { AlertTriangle, Check, Send, MoreHorizontal, CheckCircle2, XCircle, ShieldCheck } from 'lucide-vue-next';
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
  formatDeliveryStatus, formatAiCategory, formatReviewStatus, formatActivityText,
  formatOverdueDays, formatTextDates, reminderSafetyChecks, plural,
} from '@/lib/display';
import { useToast } from '@/composables/useToast';
import { useEscape } from '@/composables/useEscape';
import ActivityTimeline from '@/components/ActivityTimeline.vue';
import TelegramPreview from '@/components/TelegramPreview.vue';
import type { FollowUpAction, InvoiceWithCustomer } from '@/types';
import BaseModal from '@/components/BaseModal.vue';
import InvoiceDetailDrawer from '@/components/InvoiceDetailDrawer.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const toast = useToast();

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

  for (const i of invoices.value) {
    if (i.dispute_active) {
      result.push({
        invoice: i,
        title: 'Invoice dispute',
        reason: 'Customer has disputed this invoice; automatic reminders are paused.',
        action: 'Investigate dispute',
      });
    }
    if (i.verification_hold) {
      result.push({
        invoice: i,
        title: 'Payment verification pending',
        reason: 'Customer claims payment has been made, but it is not verified.',
        action: 'Verify recorded payment',
      });
    }
    if (i.promise_confirmed && i.promise_to_pay_date && daysOverdue(i.promise_to_pay_date, data.value.demoState.simulated_date) > 0 && i.outstanding_balance > 0) {
      result.push({
        invoice: i,
        title: 'Missed payment promise',
        reason: `Promised payment by ${formatDate(i.promise_to_pay_date)} was not recorded.`,
        action: 'Contact seller for review',
      });
    }
  }

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

const today = computed(() => data.value.demoState.simulated_date);
function checksFor(f: FollowUpAction & { invoice?: InvoiceWithCustomer }) {
  return reminderSafetyChecks(f, f.invoice, data.value, today.value);
}
function isOpen(f: FollowUpAction) {
  return f.send_state === 'not_sent' && (f.approval_state === 'pending' || f.approval_state === 'approved');
}
function wasCancelledByCheck(f: FollowUpAction) {
  return f.send_state === 'cancelled' && f.approval_state === 'cancelled' && !!f.delivery_status && f.delivery_status !== 'seller_decision_required';
}

const tab = ref<'all' | 'approval' | 'responses' | 'exceptions' | 'history'>('all');
const tabs = computed(() => [
  { id: 'all', label: 'All', count: 0 },
  { id: 'approval', label: 'Awaiting approval', count: followUps.value.filter(f => f.approval_state === 'pending').length },
  { id: 'responses', label: 'Customer responses', count: responses.value.filter(r => r.review_status === 'pending').length },
  { id: 'exceptions', label: 'Exceptions', count: exceptions.value.length },
  { id: 'history', label: 'Activity history', count: 0 },
] as const);

const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);
const editId = ref<string | null>(null);
const editText = ref('');
const editError = ref('');

// Active "⋯" more options menu id
const activeMenuId = ref<string | null>(null);

function toggleMenu(id: string) {
  activeMenuId.value = activeMenuId.value === id ? null : id;
}

function closeMenu() {
  activeMenuId.value = null;
}

const onGlobalClick = () => closeMenu();
useEscape(closeMenu);
onMounted(() => window.addEventListener('click', onGlobalClick));
onUnmounted(() => window.removeEventListener('click', onGlobalClick));

const selected = computed(() => invoices.value.find(i => i.id === selectedId.value) ?? null);

function openInvoice(i: InvoiceWithCustomer) {
  closeMenu();
  selectedId.value = i.id;
  drawerOpen.value = true;
}

function notice(msg: string, isError = false) {
  if (isError) toast.error(msg);
  else toast.success(msg);
}

function execute(fn: () => { success: boolean; error?: string }, ok: string) {
  closeMenu();
  const r = fn();
  if (r.success) {
    notice(ok, false);
  } else {
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
    'Message recorded (simulated send)'
  );
}

function beginEdit(f: FollowUpAction) {
  closeMenu();
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
    notice('Reminder saved; previous approval reset.', false);
  } else {
    editError.value = result.error || 'Could not edit';
  }
  refreshStore();
}

function reviewResponse(id: string) {
  closeMenu();
  updateCustomerResponse(id, { review_status: 'reviewed' });
  notice('Response marked as reviewed', false);
  refreshStore();
}

function keepResponseOnHold() {
  closeMenu();
  notice('Response kept on hold for later follow-up', false);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tabs Header -->
    <div class="flex flex-wrap gap-1 p-1 border-b border-slate-200">
      <button
        v-for="t in tabs"
        :key="t.id"
        @click="tab = t.id"
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
        :class="tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
      >
        {{ t.label }}
        <span
          v-if="t.count"
          class="ml-1 rounded px-1.5 py-0.2 text-[12px] tabular-nums"
          :class="tab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-700'"
        >
          {{ t.count }}
        </span>
      </button>
    </div>

    <!-- Section 1: Reminder Approvals -->
    <section v-if="tab === 'all' || tab === 'approval'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-900">Reminder approvals</h2>
        <span class="text-[13px] text-slate-500">{{ currentBusiness?.name }}</span>
      </div>

      <p v-if="!followUps.length" class="card p-6 text-center text-xs text-slate-400">
        No reminders currently awaiting approval for {{ currentBusiness?.name }}.
      </p>

      <!-- Approval Cards with 1 primary button + ⋯ menu -->
      <div v-for="f in followUps" :key="f.id" class="card p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <!-- Main details -->
          <div class="space-y-2 flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold text-xs text-slate-900">{{ f.customer?.name || '—' }}</h3>
              <span class="font-mono text-xs text-slate-500 font-medium">{{ f.invoice?.invoice_number }}</span>
              <StatusBadge v-if="f.invoice" :status="f.invoice.status" />
            </div>

            <!-- Key metadata -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 py-1 tabular-nums">
              <div>
                <span class="text-slate-400 block text-[13px]">Recipient</span>
                <span class="font-medium text-slate-800">{{ f.recipient || f.customer?.phone || 'No phone recorded' }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[13px]">Outstanding</span>
                <span class="font-semibold text-slate-900">{{ formatMYR(f.invoice?.outstanding_balance || 0) }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[13px]">Due date</span>
                <span>{{ formatDate(f.invoice?.due_date || '') }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[13px]">Duration</span>
                <span :class="f.invoice?.days_overdue ? 'text-rose-600 font-medium' : 'text-slate-600'">
                  {{ formatOverdueDays(f.invoice?.days_overdue || 0) }}
                </span>
              </div>
            </div>

            <p class="text-xs text-slate-500">
              <span class="font-medium text-slate-700">{{ formatCheckpoint(f.checkpoint) }}:</span> {{ f.reason }}
            </p>

            <!-- Message preview (Telegram-style) -->
            <TelegramPreview :message="f.message" :recipient-name="f.customer?.name" :sender-name="currentBusiness?.name" />

            <!-- Safety checks (display only; the send action re-checks on its own) -->
            <div v-if="isOpen(f)" class="rounded-lg border border-slate-200 bg-white p-3">
              <p class="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <ShieldCheck class="h-3.5 w-3.5 text-slate-500" />
                Safety checks before {{ f.approval_state === 'approved' ? 'sending' : 'approval' }}
                <span class="ml-auto text-[13px] font-normal text-slate-500 tabular-nums">
                  {{ checksFor(f).filter(c => c.ok).length }}/{{ checksFor(f).length }} passed
                </span>
              </p>
              <ul class="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <li v-for="c in checksFor(f)" :key="c.label" class="flex items-center gap-1.5 text-[13px]" :class="c.ok ? 'text-slate-700' : 'font-medium text-rose-700'">
                  <CheckCircle2 v-if="c.ok" class="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <XCircle v-else class="h-3.5 w-3.5 shrink-0 text-rose-600" />
                  {{ c.label }}
                </li>
              </ul>
            </div>
            <div v-else-if="wasCancelledByCheck(f)" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
              <strong>Not sent.</strong> Stopped by a safety check: {{ f.delivery_status }}.
            </div>

            <!-- State chips -->
            <div class="flex flex-wrap gap-1.5 items-center text-[13px] pt-1">
              <span class="rounded px-2 py-0.5 font-medium bg-amber-50 text-amber-700">
                {{ formatApprovalState(f.approval_state) }}
              </span>
              <span class="rounded px-2 py-0.5 font-medium bg-slate-100 text-slate-600">
                {{ formatSendState(f.send_state) }}
              </span>
              <span v-if="f.delivery_status && !wasCancelledByCheck(f)" class="rounded px-2 py-0.5 font-medium bg-blue-50 text-blue-700">
                {{ formatDeliveryStatus(f.delivery_status) }}
              </span>
              <span v-if="f.approved_at" class="text-slate-400 text-[12px] tabular-nums">
                Approved {{ formatDateTime(f.approved_at) }}
              </span>
            </div>
          </div>

          <!-- Actions: 1 primary button + ⋯ dropdown menu -->
          <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-auto" @click.stop>
            <template v-if="f.approval_state === 'pending'">
              <button class="primary-btn" @click="handleApprove(f)">
                <Check class="w-3.5 h-3.5" /> Approve
              </button>
            </template>
            <template v-else-if="f.approval_state === 'approved' && f.send_state === 'not_sent'">
              <button class="primary-btn" @click="handleSend(f)">
                <Send class="w-3.5 h-3.5" /> Send (simulation)
              </button>
            </template>
            <template v-else-if="f.invoice">
              <button class="outline-btn" @click="openInvoice(f.invoice)">
                View invoice
              </button>
            </template>

            <!-- ⋯ more menu -->
            <div class="relative">
              <button
                type="button"
                class="outline-btn !px-2"
                aria-label="More actions"
                @click.stop="toggleMenu('fu-' + f.id)"
              >
                <MoreHorizontal class="w-4 h-4 text-slate-600" />
              </button>

              <div
                v-if="activeMenuId === 'fu-' + f.id"
                class="absolute right-0 mt-1 w-44 rounded-lg bg-white shadow-popover border border-slate-200 py-1 z-30 text-xs"
              >
                <button
                  v-if="f.approval_state === 'pending'"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="beginEdit(f)"
                >
                  Edit draft
                </button>
                <button
                  v-if="f.approval_state === 'pending'"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-rose-600"
                  @click="handleReject(f)"
                >
                  Reject
                </button>
                <button
                  v-if="f.invoice"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="openInvoice(f.invoice)"
                >
                  View invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Customer Responses -->
    <section v-if="tab === 'all' || tab === 'responses'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-900">Customer responses</h2>
        <span class="text-[13px] text-slate-500">{{ currentBusiness?.name }}</span>
      </div>

      <p v-if="!responses.length" class="card p-6 text-center text-xs text-slate-400">
        No customer responses recorded yet for {{ currentBusiness?.name }}.
      </p>

      <div v-for="r in responses" :key="r.id" class="card p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="flex-1 space-y-2 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-xs text-slate-900">{{ r.customer?.name }}</span>
              <span class="font-mono text-xs text-slate-500 font-medium">{{ r.invoice?.invoice_number }}</span>
              <span v-if="r.invoice" class="text-xs text-slate-500 tabular-nums">
                ({{ formatMYR(r.invoice.outstanding_balance) }} outstanding)
              </span>
            </div>

            <!-- Customer message in normal clean font -->
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 italic">
              “{{ r.message }}”
            </div>

            <!-- Details: category, suggested action -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div class="rounded-lg border border-slate-200 p-2.5 bg-white">
                <span class="text-[13px] text-slate-500 block">Classification</span>
                <span class="font-medium text-slate-900 mt-0.5 block">
                  {{ formatAiCategory(r.ai_category) }}
                </span>
                <span v-if="r.ai_confidence !== null" class="text-[12px] text-slate-400 mt-0.5 block tabular-nums">
                  Confidence: {{ Math.round(r.ai_confidence * 100) }}%
                </span>
              </div>
              <div class="rounded-lg border border-slate-200 p-2.5 bg-white">
                <span class="text-[13px] text-slate-500 block">Suggested action</span>
                <span class="text-slate-800 text-[13px] mt-0.5 block leading-normal">
                  {{ formatTextDates(r.ai_suggested_action) }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 text-[13px] text-slate-500 pt-0.5">
              <span v-if="r.ai_extracted_date" class="rounded px-1.5 py-0.5 font-medium bg-purple-50 text-purple-700">
                Proposed date: {{ formatDate(r.ai_extracted_date) }}
              </span>
              <span>Review status: <strong class="text-slate-700">{{ formatReviewStatus(r.review_status) }}</strong></span>
              <span class="tabular-nums">Received {{ formatDateTime(r.created_at) }}</span>
            </div>
          </div>

          <!-- Actions: 1 primary button + ⋯ dropdown menu -->
          <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-auto" @click.stop>
            <!-- Primary Action selection -->
            <template v-if="r.invoice?.verification_hold">
              <button
                class="primary-btn"
                @click="execute(() => resolveVerificationHold(r.invoice!.id, true, currentUser.name, currentUser.business_id), 'Verification hold reviewed')"
              >
                Review verification
              </button>
            </template>
            <template v-else-if="r.invoice?.dispute_active">
              <button
                class="primary-btn"
                @click="execute(() => resolveDispute(r.invoice!.id, currentUser.name, currentUser.business_id), 'Dispute resolved')"
              >
                Resolve dispute
              </button>
            </template>
            <template v-else-if="r.invoice && r.invoice.outstanding_balance > 0 && r.invoice.status !== 'paid' && ['payment_promise', 'payment_promise_or_extension_request'].includes(r.ai_category || '') && r.ai_extracted_date">
              <button
                class="primary-btn"
                @click="execute(() => confirmPromise(r.invoice!.id, r.ai_extracted_date!, true, currentUser.name, currentUser.business_id), 'Promise confirmed')"
              >
                Confirm promise
              </button>
            </template>
            <template v-else-if="r.review_status === 'pending'">
              <button class="primary-btn" @click="reviewResponse(r.id)">
                Mark as reviewed
              </button>
            </template>
            <template v-else-if="r.invoice">
              <button class="outline-btn" @click="openInvoice(r.invoice)">
                View invoice
              </button>
            </template>

            <!-- ⋯ more menu -->
            <div class="relative">
              <button
                type="button"
                class="outline-btn !px-2"
                aria-label="More response actions"
                @click.stop="toggleMenu('cr-' + r.id)"
              >
                <MoreHorizontal class="w-4 h-4 text-slate-600" />
              </button>

              <div
                v-if="activeMenuId === 'cr-' + r.id"
                class="absolute right-0 mt-1 w-44 rounded-lg bg-white shadow-popover border border-slate-200 py-1 z-30 text-xs"
              >
                <!-- Verification hold secondary -->
                <button
                  v-if="r.invoice?.verification_hold"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="execute(() => resolveVerificationHold(r.invoice!.id, false, currentUser.name, currentUser.business_id), 'Verification unconfirmed')"
                >
                  Cannot verify
                </button>

                <!-- Promise decline secondary -->
                <button
                  v-if="r.invoice && r.invoice.outstanding_balance > 0 && r.invoice.status !== 'paid' && ['payment_promise', 'payment_promise_or_extension_request'].includes(r.ai_category || '') && r.ai_extracted_date"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="execute(() => confirmPromise(r.invoice!.id, r.ai_extracted_date!, false, currentUser.name, currentUser.business_id), 'Promise declined')"
                >
                  Decline promise
                </button>

                <!-- Mark as reviewed (if not primary) -->
                <button
                  v-if="r.review_status === 'pending' && (r.invoice?.verification_hold || r.invoice?.dispute_active || (r.invoice?.outstanding_balance && r.ai_extracted_date))"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="reviewResponse(r.id)"
                >
                  Mark as reviewed
                </button>

                <!-- Keep on hold -->
                <button
                  v-if="r.review_status === 'pending'"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="keepResponseOnHold()"
                >
                  Keep on hold
                </button>

                <!-- Review invoice -->
                <button
                  v-if="r.invoice"
                  class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  @click="openInvoice(r.invoice)"
                >
                  View invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Exceptions -->
    <section v-if="tab === 'all' || tab === 'exceptions'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-900">Exceptions</h2>
        <span class="text-[13px] text-slate-500">{{ currentBusiness?.name }}</span>
      </div>

      <p v-if="!exceptions.length" class="card p-6 text-center text-xs text-slate-400">
        No exceptions currently requiring attention for {{ currentBusiness?.name }}.
      </p>

      <div v-for="(e, k) in exceptions" :key="k" class="card p-4 flex items-center justify-between gap-3">
        <div class="flex items-start gap-2.5 min-w-0">
          <span class="rounded p-1.5 bg-rose-50 text-rose-600 shrink-0 mt-0.5">
            <AlertTriangle class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold text-slate-900">{{ e.title }}</span>
              <span class="text-xs font-mono text-slate-500">· {{ e.invoice.invoice_number }}</span>
              <span class="text-xs text-slate-500 font-medium">({{ e.invoice.customer?.name }})</span>
              <span class="text-xs font-bold text-slate-900 tabular-nums ml-1">
                {{ formatMYR(e.invoice.outstanding_balance) }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5 leading-normal">{{ e.reason }}</p>
            <p class="text-[13px] text-slate-400 mt-1">Recommended: {{ e.action }}</p>
          </div>
        </div>

        <button class="outline-btn !py-1 !px-2.5 shrink-0" @click="openInvoice(e.invoice)">
          Review
        </button>
      </div>
    </section>

    <!-- Section 4: History -->
    <section v-if="tab === 'history'" class="card p-4 space-y-3">
      <h2 class="text-base font-semibold text-slate-900">Activity history</h2>
      <ActivityTimeline :events="activity" empty-text="No activity recorded for this business." />
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
    <BaseModal :open="!!editId" title="Edit reminder draft" @close="editId = null">
      <p class="text-xs text-slate-500 mb-3">
        Editing the draft message invalidates previous approvals. Seller approval is required before sending.
      </p>
      <p v-if="editError" class="text-xs text-rose-600 mb-2">{{ editError }}</p>
      <textarea v-model="editText" rows="5" class="form-input"></textarea>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="outline-btn" @click="editId = null">Cancel</button>
          <button class="primary-btn" @click="saveEdit">Save draft</button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
