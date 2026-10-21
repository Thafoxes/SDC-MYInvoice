<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowRight, ChevronRight } from 'lucide-vue-next';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import InvoiceDetailDrawer from '@/components/InvoiceDetailDrawer.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { computeInvoiceWithCustomer } from '@/lib/store';
import { calculateCustomerPriorities } from '@/lib/priorityEngine';
import type { PriorityLevel } from '@/lib/priorityEngine';
import { formatMYR, formatDate, sumMoney, daysOverdue } from '@/lib/format';
import { formatShortPriorityReason, plural } from '@/lib/display';
import type { InvoiceWithCustomer } from '@/types';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const { data } = useDemoStore();
const { currentUser, currentBusiness } = useCurrentUser();
const today = computed(() => data.value.demoState.simulated_date);
const bizId = computed(() => currentUser.value.business_id);

/* ---------- Source data (current business only; settled HIST-* history excluded) ---------- */
const allInvoices = computed(() =>
  data.value.invoices
    .filter(i => i.business_id === bizId.value)
    .map(i => computeInvoiceWithCustomer(i, data.value, today.value)),
);
const invoices = computed(() => allInvoices.value.filter(i => !i.invoice_number.startsWith('HIST-')));
const openInvoices = computed(() => invoices.value.filter(i => i.outstanding_balance > 0));
const overdueInvoices = computed(() => invoices.value.filter(i => i.status === 'overdue'));

/* ---------- Period (affects "Collected") ---------- */
const periods = [
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
] as const;
type PeriodId = (typeof periods)[number]['id'];
const period = ref<PeriodId>('month');

function periodStart(): string {
  if (period.value === 'today') return today.value;
  if (period.value === 'month') return today.value.slice(0, 8) + '01';
  const d = new Date(today.value + 'T12:00:00');
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const recordedPayments = computed(() =>
  data.value.payments.filter(p => p.business_id === bizId.value && p.verification_status === 'recorded'),
);
const collected = computed(() =>
  sumMoney(recordedPayments.value.filter(p => p.payment_date >= periodStart() && p.payment_date <= today.value).map(p => p.amount)),
);

/* ---------- Work queue ---------- */
const pendingApprovals = computed(() =>
  data.value.followUpActions.filter(f => f.business_id === bizId.value && f.approval_state === 'pending' && f.send_state === 'not_sent'),
);
const exceptions = computed(() => {
  const out: { invoice: InvoiceWithCustomer; reason: string }[] = [];
  for (const i of invoices.value) {
    if (i.dispute_active) out.push({ invoice: i, reason: 'Customer disputed invoice' });
    if (i.verification_hold) out.push({ invoice: i, reason: 'Claims already paid — verify' });
    if (i.promise_confirmed && i.promise_to_pay_date && i.outstanding_balance > 0 && daysOverdue(i.promise_to_pay_date, today.value) > 0) {
      out.push({ invoice: i, reason: `Missed promise (${formatDate(i.promise_to_pay_date)})` });
    }
  }
  for (const esc of data.value.followUpActions.filter(f => f.business_id === bizId.value && f.checkpoint === 5 && f.delivery_status === 'seller_decision_required')) {
    const inv = invoices.value.find(i => i.id === esc.invoice_id);
    if (inv && inv.outstanding_balance > 0) out.push({ invoice: inv, reason: '21+ days overdue — your decision needed' });
  }
  return out;
});

/* ---------- Customer health ---------- */
const priorities = computed(() => calculateCustomerPriorities(bizId.value, today.value, data.value));
const levelMeta: { id: PriorityLevel; label: string; color: string }[] = [
  { id: 'red', label: 'Needs attention', color: 'bg-rose-500' },
  { id: 'yellow', label: 'Follow-up due', color: 'bg-amber-400' },
  { id: 'green', label: 'Routine', color: 'bg-emerald-500' },
  { id: 'grey', label: 'New / limited history', color: 'bg-slate-300' },
];
const levelCounts = computed(() =>
  levelMeta.map(l => ({ ...l, count: priorities.value.filter(p => p.level === l.id).length })),
);
const topAttention = computed(() => priorities.value.filter(p => p.level === 'red').slice(0, 3));

/* ---------- KPIs ---------- */
const needsActionCount = computed(() => pendingApprovals.value.length + exceptions.value.length);
const outstandingTotal = computed(() => sumMoney(openInvoices.value.map(i => i.outstanding_balance)));
const overdueTotal = computed(() => sumMoney(overdueInvoices.value.map(i => i.outstanding_balance)));
const overduePct = computed(() => (outstandingTotal.value > 0 ? Math.round((overdueTotal.value / outstandingTotal.value) * 100) : 0));
const kpis = computed(() => [
  {
    label: 'Outstanding',
    value: formatMYR(outstandingTotal.value),
    sub: plural(openInvoices.value.length, 'open invoice'),
    to: '/invoices',
    tone: 'text-slate-900',
  },
  {
    label: 'Overdue',
    value: formatMYR(overdueTotal.value),
    sub: `${plural(overdueInvoices.value.length, 'invoice')} · ${overduePct.value}% of outstanding`,
    to: '/invoices?status=overdue',
    tone: overdueInvoices.value.length ? 'text-rose-600' : 'text-slate-900',
  },
  {
    label: 'Collected',
    value: formatMYR(collected.value),
    sub: periods.find(p => p.id === period.value)!.label,
    to: '/invoices?status=paid',
    tone: 'text-slate-900',
  },
  {
    label: 'Needs your action',
    value: String(needsActionCount.value),
    sub: `${plural(pendingApprovals.value.length, 'approval')} · ${plural(exceptions.value.length, 'exception')}`,
    to: '/action-center',
    tone: needsActionCount.value ? 'text-blue-700' : 'text-slate-900',
  },
]);

/* ---------- Today's priorities: one row per customer + invoice ---------- */
interface QueueItem { key: string; kind: 'Approval' | 'Exception' | 'Overdue'; customer: string; invoice: InvoiceWithCustomer | null; text: string }
const queue = computed<QueueItem[]>(() => {
  const items: QueueItem[] = [];
  for (const f of pendingApprovals.value) {
    const inv = invoices.value.find(i => i.id === f.invoice_id) ?? null;
    items.push({ key: 'a' + f.id, kind: 'Approval', customer: inv?.customer?.name ?? '—', invoice: inv, text: 'Reminder ready for your approval' });
  }
  for (const e of exceptions.value) {
    items.push({ key: 'e' + e.invoice.id + e.reason, kind: 'Exception', customer: e.invoice.customer?.name ?? '—', invoice: e.invoice, text: e.reason });
  }
  for (const p of priorities.value.filter(x => x.level === 'red')) {
    const inv = invoices.value.find(i => i.id === p.supportingInvoiceIds[0]) ?? null;
    items.push({ key: 'r' + p.customerId, kind: 'Overdue', customer: p.customerName, invoice: inv, text: formatShortPriorityReason(p, invoices.value).replace(/^INV-\d+ · /, '').replace(/ · INV-\d+$/, '') });
  }
  const seen = new Set<string>();
  const customers = new Set<string>();
  return items.filter(it => {
    const k = `${it.customer}|${it.invoice?.id}`;
    if (seen.has(k) || (it.kind === 'Overdue' && customers.has(it.customer))) return false;
    seen.add(k);
    customers.add(it.customer);
    return true;
  });
});
const queuePreview = computed(() => queue.value.slice(0, 5));
const kindClass: Record<QueueItem['kind'], string> = {
  Approval: 'bg-blue-50 text-blue-700',
  Exception: 'bg-amber-50 text-amber-800',
  Overdue: 'bg-rose-50 text-rose-700',
};

/* ---------- Overdue aging ---------- */
const aging = computed(() => {
  const buckets = [
    { label: '1–7 days', min: 1, max: 7, color: 'bg-blue-500' },
    { label: '8–14 days', min: 8, max: 14, color: 'bg-amber-400' },
    { label: '15–21 days', min: 15, max: 21, color: 'bg-orange-500' },
    { label: 'Over 21 days', min: 22, max: Infinity, color: 'bg-rose-500' },
  ].map(b => {
    const m = overdueInvoices.value.filter(i => i.days_overdue >= b.min && i.days_overdue <= b.max);
    return { ...b, count: m.length, amount: sumMoney(m.map(i => i.outstanding_balance)) };
  });
  const max = Math.max(1, ...buckets.map(b => b.amount));
  return buckets.map(b => ({ ...b, pct: Math.max(b.amount ? 2 : 0, Math.round((b.amount / max) * 100)) }));
});

/* ---------- Payments chart: last 30 days, daily ---------- */
const paymentsChart = computed(() => {
  const end = new Date(today.value + 'T12:00:00');
  const days: string[] = [];
  for (let k = 29; k >= 0; k--) {
    const d = new Date(end);
    d.setDate(d.getDate() - k);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  const byDay = new Map<string, number>();
  for (const p of recordedPayments.value) byDay.set(p.payment_date, (byDay.get(p.payment_date) ?? 0) + p.amount);
  return {
    labels: days.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })),
    datasets: [{
      label: 'Payments (MYR)',
      data: days.map(d => byDay.get(d) ?? 0),
      backgroundColor: '#1D4ED8',
      hoverBackgroundColor: '#1E40AF',
      borderRadius: 3,
      maxBarThickness: 14,
    }],
  };
});
const paymentsLast30 = computed(() => sumMoney(paymentsChart.value.datasets[0].data));
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 6, color: '#64748B', font: { size: 12 } } },
    y: { grid: { color: '#F1F5F9' }, border: { display: false }, ticks: { maxTicksLimit: 4, color: '#64748B', font: { size: 12 } } },
  },
};

/* ---------- Drawer ---------- */
const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);
const selectedInvoice = computed(() => allInvoices.value.find(i => i.id === selectedId.value) ?? null);
function openInvoice(i: InvoiceWithCustomer | null) {
  if (!i) return;
  selectedId.value = i.id;
  drawerOpen.value = true;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Context + period -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-slate-600">{{ currentBusiness?.name }} · as of {{ formatDate(today) }}</p>
      <div class="inline-flex self-start rounded-lg border border-slate-200 bg-white p-1 sm:self-auto" role="tablist" aria-label="Reporting period">
        <button
          v-for="p in periods"
          :key="p.id"
          role="tab"
          :aria-selected="period === p.id"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition"
          :class="period === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          @click="period = p.id"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <RouterLink v-for="k in kpis" :key="k.label" :to="k.to" class="card group block p-5 transition hover:border-slate-300">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-slate-600">{{ k.label }}</p>
          <ArrowRight class="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </div>
        <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums" :class="k.tone">{{ k.value }}</p>
        <p class="mt-1 text-[13px] text-slate-500">{{ k.sub }}</p>
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <!-- Today's priorities -->
      <section class="card overflow-hidden xl:col-span-2">
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Today's priorities</h2>
            <p class="mt-0.5 text-[13px] text-slate-500">{{ plural(queue.length, 'item') }} waiting on you</p>
          </div>
          <RouterLink to="/action-center" class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800">
            Action Center <ArrowRight class="h-4 w-4" />
          </RouterLink>
        </header>
        <ul v-if="queuePreview.length" class="divide-y divide-slate-100">
          <li v-for="item in queuePreview" :key="item.key">
            <button type="button" class="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50" @click="openInvoice(item.invoice)">
              <span class="w-[78px] shrink-0 rounded-md px-2 py-1 text-center text-[12px] font-medium" :class="kindClass[item.kind]">{{ item.kind }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-slate-900">{{ item.customer }}</span>
                <span class="block truncate text-[13px] text-slate-500">
                  <span class="font-mono">{{ item.invoice?.invoice_number }}</span> · {{ item.text }}
                </span>
              </span>
              <span class="hidden shrink-0 text-right sm:block">
                <span class="block text-sm font-semibold text-slate-900 tabular-nums">{{ formatMYR(item.invoice?.outstanding_balance ?? 0) }}</span>
                <span v-if="item.invoice?.days_overdue" class="block text-[12px] text-rose-600">{{ plural(item.invoice.days_overdue, 'day') }} overdue</span>
              </span>
              <ChevronRight class="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          </li>
        </ul>
        <p v-else class="px-5 py-10 text-center text-sm text-slate-500">You're all caught up.</p>
        <RouterLink
          v-if="queue.length > queuePreview.length"
          to="/action-center"
          class="block border-t border-slate-100 px-5 py-3 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          View {{ queue.length - queuePreview.length }} more in Action Center
        </RouterLink>
      </section>

      <!-- Customer health -->
      <section class="card flex flex-col">
        <header class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900">Customer health</h2>
          <p class="mt-0.5 text-[13px] text-slate-500">{{ plural(priorities.length, 'customer') }} · rule-based, not a credit score</p>
        </header>
        <div class="space-y-4 px-5 py-4">
          <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div
              v-for="l in levelCounts"
              :key="l.id"
              :class="l.color"
              :style="{ width: priorities.length ? (l.count / priorities.length) * 100 + '%' : '0%' }"
            ></div>
          </div>
          <ul class="space-y-2">
            <li v-for="l in levelCounts" :key="l.id">
              <RouterLink :to="`/customers?level=${l.id}`" class="flex items-center gap-2.5 rounded text-xs text-slate-700 hover:text-slate-900">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="l.color"></span>
                <span>{{ l.label }}</span>
                <span class="ml-auto font-semibold tabular-nums text-slate-900">{{ l.count }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
        <div class="flex-1 border-t border-slate-100 px-5 py-4">
          <p class="text-[13px] font-medium text-slate-500">Most urgent</p>
          <ul class="mt-2 space-y-2.5">
            <li v-for="p in topAttention" :key="p.customerId" class="min-w-0">
              <span class="block truncate text-sm font-medium text-slate-900">{{ p.customerName }}</span>
              <span class="block truncate text-[13px] text-slate-500">{{ formatShortPriorityReason(p, invoices) }}</span>
            </li>
            <li v-if="!topAttention.length" class="text-[13px] text-slate-500">No customers need urgent attention.</li>
          </ul>
        </div>
        <RouterLink to="/customers" class="block border-t border-slate-100 px-5 py-3 text-center text-xs font-medium text-slate-600 hover:bg-slate-50">
          View all customers
        </RouterLink>
      </section>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <!-- Overdue aging -->
      <section class="card">
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Overdue by age</h2>
            <p class="mt-0.5 text-[13px] text-slate-500">{{ plural(overdueInvoices.length, 'overdue invoice') }} · {{ formatMYR(overdueTotal) }}</p>
          </div>
          <RouterLink to="/invoices?status=overdue" class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800">
            Invoices <ArrowRight class="h-4 w-4" />
          </RouterLink>
        </header>
        <ul class="space-y-4 px-5 py-5">
          <li v-for="b in aging" :key="b.label">
            <div class="flex items-baseline justify-between text-xs">
              <span class="text-slate-700">{{ b.label }} <span class="text-slate-400">· {{ plural(b.count, 'invoice') }}</span></span>
              <span class="font-semibold text-slate-900 tabular-nums">{{ formatMYR(b.amount) }}</span>
            </div>
            <div class="mt-1.5 h-2 rounded-full bg-slate-100">
              <div class="h-2 rounded-full" :class="b.color" :style="{ width: b.pct + '%' }"></div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Payments -->
      <section class="card">
        <header class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900">Payments received</h2>
          <p class="mt-0.5 text-[13px] text-slate-500">Last 30 days · {{ formatMYR(paymentsLast30) }}</p>
        </header>
        <div class="h-[232px] px-4 py-4">
          <Bar :data="paymentsChart" :options="chartOptions" />
        </div>
      </section>
    </div>

    <InvoiceDetailDrawer
      :invoice="selectedInvoice"
      :open="drawerOpen"
      :seller-name="currentUser.name"
      :seller-role="currentUser.role"
      @close="drawerOpen = false"
    />
  </div>
</template>
