<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertCircle } from 'lucide-vue-next';
import { Doughnut, Line } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import StatusBadge from '@/components/StatusBadge.vue';
import InvoiceDetailDrawer from '@/components/InvoiceDetailDrawer.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { computeInvoiceWithCustomer } from '@/lib/store';
import { calculateCustomerPriorities } from '@/lib/priorityEngine';
import type { CustomerPriority, PriorityLevel } from '@/lib/priorityEngine';
import { formatMYR, formatDate, sumMoney, daysOverdue } from '@/lib/format';
import { getDerivedLabelChips, formatShortPriorityReason } from '@/lib/display';
import type { InvoiceWithCustomer } from '@/types';

ChartJS.register(ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const { data } = useDemoStore();
const { currentUser, currentBusiness } = useCurrentUser();

const today = computed(() => data.value.demoState.simulated_date);

const invoices = computed(() =>
  data.value.invoices
    .filter(i => i.business_id === currentUser.value.business_id)
    .map(i => computeInvoiceWithCustomer(i, data.value, today.value))
);

// Date period filter: default = This Month ('month')
const dateFilterOptions = [
  { id: 'month', label: 'This Month' },
  { id: 'week', label: 'This Week' },
  { id: 'today', label: 'Today' },
  { id: 'custom', label: 'Custom' },
] as const;
const dateFilter = ref<'today' | 'week' | 'month' | 'custom'>('month');
const customStart = ref('2026-10-01');
const customEnd = ref('2026-10-20');

function periodBounds() {
  const d = new Date(today.value + 'T12:00:00');
  if (dateFilter.value === 'today') return { start: today.value, end: today.value };
  if (dateFilter.value === 'custom') return { start: customStart.value, end: customEnd.value };
  if (dateFilter.value === 'month') return { start: today.value.slice(0, 8) + '01', end: today.value };
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return {
    start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    end: today.value,
  };
}

const collected = computed(() => {
  const p = periodBounds();
  return sumMoney(
    data.value.payments
      .filter(x => x.business_id === currentUser.value.business_id && x.payment_date >= p.start && x.payment_date <= p.end && x.verification_status === 'recorded')
      .map(x => x.amount)
  );
});

const totalOutstanding = computed(() => sumMoney(invoices.value.map(i => i.outstanding_balance)));
const overdueInvoices = computed(() => invoices.value.filter(i => i.status === 'overdue'));
const overdueAmount = computed(() => sumMoney(overdueInvoices.value.map(i => i.outstanding_balance)));

const pendingApprovals = computed(() =>
  data.value.followUpActions.filter(f => f.business_id === currentUser.value.business_id && f.approval_state === 'pending')
);

// Exceptions calculation
const exceptions = computed(() => {
  const result: { invoice: InvoiceWithCustomer; title: string; reason: string }[] = [];
  for (const i of invoices.value) {
    if (i.dispute_active) {
      result.push({ invoice: i, title: 'Dispute active', reason: 'Customer disputed invoice' });
    }
    if (i.verification_hold) {
      result.push({ invoice: i, title: 'Verification pending', reason: 'Customer claims payment made' });
    }
    if (i.promise_confirmed && i.promise_to_pay_date && daysOverdue(i.promise_to_pay_date, today.value) > 0 && i.outstanding_balance > 0) {
      result.push({ invoice: i, title: 'Missed promise', reason: `Promise date ${formatDate(i.promise_to_pay_date)} missed` });
    }
  }
  const escalations = data.value.followUpActions.filter(
    f => f.business_id === currentUser.value.business_id && f.checkpoint === 5 && f.delivery_status === 'seller_decision_required'
  );
  for (const esc of escalations) {
    const inv = invoices.value.find(i => i.id === esc.invoice_id);
    if (inv && inv.outstanding_balance > 0 && inv.status !== 'paid') {
      result.push({ invoice: inv, title: 'Escalation needed', reason: '21+ days overdue' });
    }
  }
  return result;
});

// 4 KPI Cards (no icon tiles; label, number, sub-line)
const kpis = computed(() => [
  {
    label: 'Outstanding',
    value: formatMYR(totalOutstanding.value),
    sub: `${invoices.value.filter(i => i.status !== 'paid').length} open invoices`,
  },
  {
    label: 'Overdue',
    value: formatMYR(overdueAmount.value),
    sub: `${overdueInvoices.value.length} overdue invoices`,
    highlight: overdueInvoices.value.length > 0,
  },
  {
    label: 'Collected',
    value: formatMYR(collected.value),
    sub: dateFilter.value === 'month' ? 'This month' : dateFilter.value === 'week' ? 'This week' : dateFilter.value === 'today' ? 'Today' : 'Custom period',
  },
  {
    label: 'Needs action',
    value: String(pendingApprovals.value.length + exceptions.value.length),
    sub: `${pendingApprovals.value.length} approvals · ${exceptions.value.length} exceptions`,
    highlight: (pendingApprovals.value.length + exceptions.value.length) > 0,
  },
]);

// Priorities
const priorityRecords = computed(() =>
  calculateCustomerPriorities(currentUser.value.business_id, today.value, data.value)
);
const priorityList = computed(() => [...priorityRecords.value].sort((a, b) => {
  const rank: Record<PriorityLevel, number> = { red: 0, yellow: 1, grey: 2, green: 3 };
  return rank[a.level] - rank[b.level] || a.customerName.localeCompare(b.customerName);
}));

const showAllPriorities = ref(false);
const visiblePriorities = computed(() =>
  showAllPriorities.value
    ? priorityList.value
    : priorityList.value.filter(p => p.level === 'red' || p.level === 'yellow')
);

const priorityMap = computed(() => new Map(priorityRecords.value.map(p => [p.customerId, p])));
const expandedPriority = ref<string | null>(null);

function priorityBadgeClass(level: PriorityLevel) {
  return {
    red: 'bg-rose-50 text-rose-700',
    yellow: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    grey: 'bg-slate-100 text-slate-600',
  }[level];
}

function priorityInvoiceRefs(priority: CustomerPriority) {
  return priority.supportingInvoiceIds
    .map(id => invoices.value.find(i => i.id === id)?.invoice_number ?? id)
    .join(', ') || 'None';
}

// "Needs action" list (max 6 rows: approvals, exceptions, Red customers)
interface NeedsActionItem {
  id: string;
  customer: string;
  invoiceNumber: string;
  issue: string;
  tag: string;
  tagClass: string;
  invoice: InvoiceWithCustomer | null;
}

const needsActionItems = computed<NeedsActionItem[]>(() => {
  const items: NeedsActionItem[] = [];

  // 1. Pending approvals
  for (const f of pendingApprovals.value) {
    const inv = invoices.value.find(i => i.id === f.invoice_id) ?? null;
    const cust = data.value.customers.find(c => c.id === f.customer_id);
    items.push({
      id: 'app-' + f.id,
      customer: cust?.name || 'Customer',
      invoiceNumber: inv?.invoice_number || '—',
      issue: 'Reminder awaiting approval',
      tag: 'Approval',
      tagClass: 'bg-blue-50 text-blue-700',
      invoice: inv,
    });
  }

  // 2. Exceptions
  for (const e of exceptions.value) {
    items.push({
      id: 'exc-' + e.invoice.id + '-' + e.title,
      customer: e.invoice.customer?.name || 'Customer',
      invoiceNumber: e.invoice.invoice_number,
      issue: e.reason || e.title,
      tag: 'Exception',
      tagClass: 'bg-rose-50 text-rose-700',
      invoice: e.invoice,
    });
  }

  // 3. Red customers
  const redPriorities = priorityList.value.filter(p => p.level === 'red');
  for (const p of redPriorities) {
    const custInvoices = invoices.value.filter(i => i.customer_id === p.customerId);
    const primaryInv = custInvoices.find(i => i.outstanding_balance > 0) || custInvoices[0] || null;
    items.push({
      id: 'red-' + p.customerId,
      customer: p.customerName,
      invoiceNumber: primaryInv ? primaryInv.invoice_number : 'Multiple',
      issue: formatShortPriorityReason(p, invoices.value),
      tag: 'Priority',
      tagClass: 'bg-rose-50 text-rose-700',
      invoice: primaryInv,
    });
  }

  return items.slice(0, 6);
});

// Invoice Table Filters
const search = ref('');
const statusFilter = ref('all');
const sortBy = ref<'overdue' | 'dueDate' | 'outstanding'>('overdue');
const showSettledHistory = ref(false);
const currentPage = ref(0);
const pageSize = 10;
const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);

const filteredInvoices = computed(() => {
  let list = invoices.value;
  // Hide HIST-* settled history unless toggled
  if (!showSettledHistory.value) {
    list = list.filter(i => !i.invoice_number.startsWith('HIST-'));
  }
  // Status filter
  if (statusFilter.value !== 'all') {
    list = list.filter(i => i.status === statusFilter.value);
  }
  // Search filter
  if (search.value.trim()) {
    const q = search.value.toLowerCase().trim();
    list = list.filter(i =>
      i.invoice_number.toLowerCase().includes(q) ||
      (i.customer?.name.toLowerCase().includes(q) ?? false)
    );
  }
  // Default sort by days overdue desc, then due date
  return [...list].sort((a, b) => {
    if (sortBy.value === 'overdue') {
      if (b.days_overdue !== a.days_overdue) {
        return b.days_overdue - a.days_overdue;
      }
      return a.due_date.localeCompare(b.due_date);
    }
    if (sortBy.value === 'dueDate') {
      return a.due_date.localeCompare(b.due_date);
    }
    return b.outstanding_balance - a.outstanding_balance;
  });
});

const pages = computed(() => Math.max(1, Math.ceil(filteredInvoices.value.length / pageSize)));
const pageData = computed(() =>
  filteredInvoices.value.slice(
    Math.min(currentPage.value, pages.value - 1) * pageSize,
    (Math.min(currentPage.value, pages.value - 1) + 1) * pageSize
  )
);

watch([search, statusFilter, sortBy, showSettledHistory], () => currentPage.value = 0);

const selectedInvoice = computed(() => invoices.value.find(i => i.id === selectedId.value) ?? null);

function openInvoice(i: InvoiceWithCustomer | null) {
  if (!i) return;
  selectedId.value = i.id;
  drawerOpen.value = true;
}

// Insights Charts & Aging
const aging = computed(() => [
  { label: '1–7 days', min: 1, max: 7 },
  { label: '8–14 days', min: 8, max: 14 },
  { label: '15–21 days', min: 15, max: 21 },
  { label: '21+ days', min: 22, max: 9999 },
].map(b => {
  const matched = overdueInvoices.value.filter(i => {
    const d = daysOverdue(i.due_date, today.value);
    return d >= b.min && d <= b.max;
  });
  return { label: b.label, count: matched.length, amount: sumMoney(matched.map(i => i.outstanding_balance)) };
}));

const statusChart = computed(() => ({
  labels: ['Paid', 'Pending', 'Overdue'],
  datasets: [{
    data: [
      invoices.value.filter(i => i.status === 'paid').length,
      invoices.value.filter(i => i.status === 'pending').length,
      overdueInvoices.value.length,
    ],
    backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
    borderWidth: 0,
    spacing: 2,
  }],
}));

const trendChart = computed(() => {
  const map = new Map<string, number>();
  data.value.payments
    .filter(p => p.business_id === currentUser.value.business_id && p.verification_status === 'recorded')
    .forEach(p => map.set(p.payment_date, (map.get(p.payment_date) || 0) + p.amount));
  const a = [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  return {
    labels: a.map(x => x[0].slice(5)),
    datasets: [{
      label: 'Recorded payments (MYR)',
      data: a.map(x => x[1]),
      borderColor: '#1D4ED8',
      backgroundColor: 'rgba(29, 78, 216, 0.08)',
      pointBackgroundColor: '#1D4ED8',
      fill: true,
      tension: 0.3,
    }],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 } } } },
};
</script>

<template>
  <div class="space-y-5">
    <!-- Top Bar: Period Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p class="text-xs font-medium text-slate-500">Financial overview · {{ currentBusiness?.name }}</p>
      </div>
      <div class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm self-start sm:self-auto">
        <button
          v-for="opt in dateFilterOptions"
          :key="opt.id"
          @click="dateFilter = opt.id"
          class="rounded px-2.5 py-1 text-xs font-medium transition"
          :class="dateFilter === opt.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Custom date inputs if selected -->
    <div v-if="dateFilter === 'custom'" class="card flex gap-3 items-center p-2.5 text-xs">
      <input v-model="customStart" type="date" class="form-input !mt-0 max-w-[150px]" />
      <span class="text-slate-400">to</span>
      <input v-model="customEnd" type="date" class="form-input !mt-0 max-w-[150px]" />
    </div>

    <!-- 4 KPI Cards (label, number, one small sub-line, no icons) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div v-for="k in kpis" :key="k.label" class="card p-4">
        <p class="text-xs font-medium text-slate-500">{{ k.label }}</p>
        <p class="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">{{ k.value }}</p>
        <p class="text-[11px] text-slate-500 mt-1 truncate">{{ k.sub }}</p>
      </div>
    </div>

    <!-- Needs Action List (max 6 items) -->
    <section class="card overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700">Needs action</h2>
        </div>
        <span class="text-[11px] text-slate-500 tabular-nums">{{ needsActionItems.length }} item{{ needsActionItems.length === 1 ? '' : 's' }}</span>
      </div>
      <div v-if="needsActionItems.length" class="divide-y divide-slate-100">
        <div
          v-for="item in needsActionItems"
          :key="item.id"
          class="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
        >
          <div class="min-w-0 flex-1 flex items-center gap-2.5">
            <span class="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0" :class="item.tagClass">
              {{ item.tag }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-xs font-semibold text-slate-900 truncate">{{ item.customer }}</span>
                <span class="text-[11px] font-mono text-slate-400">· {{ item.invoiceNumber }}</span>
              </div>
              <p class="text-[11px] text-slate-500 truncate">{{ item.issue }}</p>
            </div>
          </div>
          <button
            class="outline-btn !py-1 !px-2.5 shrink-0"
            @click="openInvoice(item.invoice)"
          >
            Review
          </button>
        </div>
      </div>
      <div v-else class="p-6 text-center text-xs text-slate-400">
        No immediate actions requiring review.
      </div>
    </section>

    <!-- Customer Priorities Section -->
    <section class="card overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Customer priorities
          </h2>
        </div>
        <button
          class="text-xs text-blue-700 hover:text-blue-800 font-medium"
          @click="showAllPriorities = !showAllPriorities"
        >
          {{ showAllPriorities ? 'Show urgent only' : 'Show all' }}
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-100 text-slate-400 font-medium">
              <th class="px-4 py-2.5">Customer</th>
              <th class="px-4 py-2.5">Priority</th>
              <th class="px-4 py-2.5">Reason</th>
              <th class="px-4 py-2.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template v-for="p in visiblePriorities" :key="p.customerId">
              <tr class="hover:bg-slate-50/60 transition">
                <td class="px-4 py-2 font-medium text-slate-900">{{ p.customerName }}</td>
                <td class="px-4 py-2">
                  <span class="rounded px-2 py-0.5 text-[10px] font-medium" :class="priorityBadgeClass(p.level)">
                    {{ p.label }}
                  </span>
                </td>
                <td class="px-4 py-2 text-slate-600 max-w-sm truncate">
                  {{ formatShortPriorityReason(p, invoices) }}
                </td>
                <td class="px-4 py-2 text-right">
                  <button
                    class="text-slate-500 hover:text-slate-900 text-[11px] font-medium"
                    @click="expandedPriority = expandedPriority === p.customerId ? null : p.customerId"
                  >
                    {{ expandedPriority === p.customerId ? 'Hide' : 'Explain' }}
                  </button>
                </td>
              </tr>
              <tr v-if="expandedPriority === p.customerId" class="bg-slate-50/80">
                <td colspan="4" class="px-4 py-3 text-[11px] text-slate-600 space-y-1.5">
                  <p><strong>Supporting invoices:</strong> {{ priorityInvoiceRefs(p) }}</p>
                  <p><strong>Last 5 settled:</strong> {{ p.settledCount }} · <strong>Late:</strong> {{ p.lateCount }}</p>
                  <p v-for="x in p.lastFiveSettled" :key="x.invoiceId" class="text-slate-500">
                    {{ x.invoiceNumber }}: due {{ formatDate(x.dueDate) }}, settled {{ formatDate(x.settledDate) }} — {{ x.late ? `Late (${x.daysLate}d)` : 'On time' }}
                  </p>
                  <p v-for="flag in p.reviewFlags" :key="flag" class="text-amber-700 font-medium">⚠ {{ flag }}</p>
                  <p class="text-slate-400 text-[10px]">As of {{ formatDate(today) }}</p>
                </td>
              </tr>
            </template>
            <tr v-if="!visiblePriorities.length">
              <td colspan="4" class="p-4 text-center text-slate-400">
                No customer priorities in this view.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Invoice Table Section -->
    <section class="card overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700">Invoices</h2>

        <!-- Filters and search -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="search"
              placeholder="Filter invoices..."
              class="form-input !mt-0 pl-8 !py-1 text-xs max-w-[170px]"
            />
          </div>

          <select v-model="statusFilter" class="form-input !mt-0 !py-1 text-xs w-auto">
            <option value="all">All statuses</option>
            <option value="overdue">Overdue</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>

          <select v-model="sortBy" class="form-input !mt-0 !py-1 text-xs w-auto">
            <option value="overdue">Sort: Overdue days</option>
            <option value="dueDate">Sort: Due date</option>
            <option value="outstanding">Sort: Outstanding</option>
          </select>

          <label class="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              v-model="showSettledHistory"
              class="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <span>Settled history</span>
          </label>
        </div>
      </div>

      <!-- Compact Invoices Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-100 text-slate-400 font-medium">
              <th class="px-4 py-2.5">Invoice</th>
              <th class="px-4 py-2.5">Customer</th>
              <th class="px-4 py-2.5 text-right">Amount</th>
              <th class="px-4 py-2.5 text-right">Outstanding</th>
              <th class="px-4 py-2.5">Due date</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="i in pageData"
              :key="i.id"
              class="hover:bg-slate-50/60 transition cursor-pointer"
              @click="openInvoice(i)"
            >
              <td class="px-4 py-2 font-mono font-medium text-slate-900">{{ i.invoice_number }}</td>
              <td class="px-4 py-2 font-medium text-slate-800">{{ i.customer?.name || '—' }}</td>
              <td class="px-4 py-2 text-right tabular-nums text-slate-500">{{ formatMYR(i.invoice_amount) }}</td>
              <td class="px-4 py-2 text-right tabular-nums font-semibold" :class="i.outstanding_balance > 0 ? 'text-slate-900' : 'text-slate-400'">
                {{ formatMYR(i.outstanding_balance) }}
              </td>
              <td class="px-4 py-2 text-slate-600 tabular-nums">
                {{ formatDate(i.due_date) }}
                <span v-if="i.days_overdue > 0" class="text-[10px] text-rose-600 font-medium ml-1">
                  ({{ i.days_overdue }}d overdue)
                </span>
              </td>
              <td class="px-4 py-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge :status="i.status" />
                  <span
                    v-for="chip in getDerivedLabelChips(i)"
                    :key="chip.text"
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="chip.className"
                  >
                    {{ chip.text }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2 text-right" @click.stop>
                <button
                  class="text-blue-700 hover:text-blue-800 text-[11px] font-medium inline-flex items-center gap-1"
                  @click="openInvoice(i)"
                >
                  <Eye class="w-3.5 h-3.5" /> View
                </button>
              </td>
            </tr>
            <tr v-if="!pageData.length">
              <td colspan="7" class="p-6 text-center text-slate-400">
                No invoices match the selected criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
        <span class="tabular-nums">Page {{ Math.min(currentPage + 1, pages) }} of {{ pages }} ({{ filteredInvoices.length }} invoices)</span>
        <div class="flex gap-1">
          <button
            class="outline-btn !p-1.5"
            :disabled="currentPage <= 0"
            @click="currentPage--"
            aria-label="Previous page"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
          </button>
          <button
            class="outline-btn !p-1.5"
            :disabled="currentPage >= pages - 1"
            @click="currentPage++"
            aria-label="Next page"
          >
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>

    <!-- Insights Section (Aging + Charts) -->
    <section class="card p-4 sm:p-5 space-y-4">
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700">Insights</h2>
        <p class="text-[11px] text-slate-500 mt-0.5">Overdue aging distribution and collection velocity</p>
      </div>

      <!-- Aging Buckets -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div
          v-for="b in aging"
          :key="b.label"
          class="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
        >
          <p class="text-[11px] text-slate-500">{{ b.label }}</p>
          <p class="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{{ b.count }}</p>
          <p class="text-xs text-slate-600 mt-0.5 tabular-nums">{{ formatMYR(b.amount) }}</p>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        <div class="rounded-lg border border-slate-200 p-3.5 bg-white">
          <p class="text-xs font-semibold text-slate-800 mb-2">Invoice status breakdown</p>
          <div class="h-[180px]">
            <Doughnut :data="statusChart" :options="chartOptions" />
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 p-3.5 bg-white">
          <p class="text-xs font-semibold text-slate-800 mb-2">Payment collection velocity</p>
          <div class="h-[180px]">
            <Line :data="trendChart" :options="chartOptions" />
          </div>
        </div>
      </div>
    </section>

    <!-- Invoice Detail Drawer -->
    <InvoiceDetailDrawer
      :invoice="selectedInvoice"
      :open="drawerOpen"
      :seller-name="currentUser.name"
      :seller-role="currentUser.role"
      @close="drawerOpen = false"
    />
  </div>
</template>
