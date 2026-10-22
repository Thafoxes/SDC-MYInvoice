<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import InvoiceDetailDrawer from '@/components/InvoiceDetailDrawer.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { DEMO_BUSINESS_ID, DEMO_SELLER_ID } from '@/lib/store';
import { computeInvoiceWithCustomer } from '@/lib/store';
import { calculateCustomerPriorities } from '@/lib/priorityEngine';
import type { CustomerPriority, PriorityLevel } from '@/lib/priorityEngine';
import { formatMYR, formatDate, sumMoney } from '@/lib/format';
import { getDerivedLabelChips, formatShortPriorityReason, plural } from '@/presentation/display';
import type { InvoiceWithCustomer } from '@/types';
import { useRoute } from 'vue-router';

const { data } = useDemoStore();
const currentUser = computed(() => data.value.users.find(u => u.id === DEMO_SELLER_ID)!);
const currentBusiness = computed(() => data.value.businesses.find(b => b.id === DEMO_BUSINESS_ID));
const route = useRoute();
const today = computed(() => data.value.demoState.simulated_date);

const invoices = computed(() =>
  data.value.invoices
    .filter(i => i.business_id === currentUser.value.business_id)
    .map(i => computeInvoiceWithCustomer(i, data.value, today.value))
);
const priorityRecords = computed(() => calculateCustomerPriorities(currentUser.value.business_id, today.value, data.value));
const priorityMap = computed(() => new Map(priorityRecords.value.map(p => [p.customerId, p])));

function priorityBadgeClass(level: PriorityLevel) {
  return {
    red: 'bg-rose-50 text-rose-700',
    yellow: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    grey: 'bg-slate-100 text-slate-600',
  }[level];
}

const selectedId = ref<string | null>(null);
const drawerOpen = ref(false);
const selectedInvoice = computed(() => invoices.value.find(i => i.id === selectedId.value) ?? null);
function openInvoice(i: InvoiceWithCustomer | null | undefined) {
  if (!i) return;
  selectedId.value = i.id;
  drawerOpen.value = true;
}

const levelFilter = ref<'all' | PriorityLevel>(
  (['red', 'yellow', 'green', 'grey'] as const).includes(route.query.level as PriorityLevel) ? (route.query.level as PriorityLevel) : 'all'
);
const levels = computed(() => ([
  { id: 'all', label: 'All' },
  { id: 'red', label: 'Needs attention' },
  { id: 'yellow', label: 'Follow-up due' },
  { id: 'green', label: 'Routine monitoring' },
  { id: 'grey', label: 'Insufficient history' },
] as const).map(l => ({ ...l, count: l.id === 'all' ? priorityRecords.value.length : priorityRecords.value.filter(p => p.level === l.id).length })));

const priorityList = computed(() => [...priorityRecords.value].sort((a, b) => {
  const rank: Record<PriorityLevel, number> = { red: 0, yellow: 1, grey: 2, green: 3 };
  return rank[a.level] - rank[b.level] || a.customerName.localeCompare(b.customerName);
}));
const visiblePriorities = computed(() => levelFilter.value === 'all' ? priorityList.value : priorityList.value.filter(p => p.level === levelFilter.value));
const expandedPriority = ref<string | null>(null);

function priorityInvoiceRefs(priority: CustomerPriority) {
  return priority.supportingInvoiceIds.map(id => invoices.value.find(i => i.id === id)?.invoice_number ?? id).join(', ') || 'None';
}
function outstandingFor(customerId: string) {
  return sumMoney(invoices.value.filter(i => i.customer_id === customerId).map(i => i.outstanding_balance));
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-slate-600">Follow-up priority is rule-based and explainable — it is not a credit score and never bypasses reminder approval.</p>
    </div>
    <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by priority">
      <button
        v-for="l in levels"
        :key="l.id"
        role="tab"
        :aria-selected="levelFilter === l.id"
        class="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
        :class="levelFilter === l.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
        @click="levelFilter = l.id"
      >
        {{ l.label }} <span class="ml-1 tabular-nums opacity-70">{{ l.count }}</span>
      </button>
    </div>

    <!-- Customer Priorities Section -->
    <section class="card overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">
            Customer follow-up priorities
          </h2>
        </div>
        <span class="text-[13px] text-slate-500 tabular-nums">{{ plural(visiblePriorities.length, 'customer') }}</span>
      </div>

      <!-- Mobile: stacked cards -->
      <ul class="divide-y divide-slate-100 md:hidden">
        <li v-for="p in visiblePriorities" :key="'m-' + p.customerId" class="px-4 py-3">
          <div class="flex items-start justify-between gap-2">
            <p class="text-xs font-semibold text-slate-900">{{ p.customerName }}</p>
            <span class="shrink-0 rounded px-2 py-0.5 text-[12px] font-medium" :class="priorityBadgeClass(p.level)">{{ p.label }}</span>
          </div>
          <p class="mt-1 text-[13px] text-slate-600">{{ formatShortPriorityReason(p, invoices) }}</p>
          <button
            class="mt-1.5 text-[13px] font-medium text-blue-700"
            :aria-expanded="expandedPriority === p.customerId"
            @click="expandedPriority = expandedPriority === p.customerId ? null : p.customerId"
          >
            {{ expandedPriority === p.customerId ? 'Hide details' : 'Explain' }}
          </button>
          <div v-if="expandedPriority === p.customerId" class="mt-2 space-y-1 rounded-lg bg-slate-50 p-2.5 text-[13px] text-slate-600">
            <p><strong>Supporting invoices:</strong> {{ priorityInvoiceRefs(p) }}</p>
            <p><strong>Last 5 settled:</strong> {{ p.settledCount }} · <strong>Late:</strong> {{ p.lateCount }}</p>
            <p v-for="flag in p.reviewFlags" :key="flag" class="font-medium text-amber-700">⚠ {{ flag }}</p>
          </div>
        </li>
        <li v-if="!visiblePriorities.length" class="p-4 text-center text-xs text-slate-400">No customer priorities in this view.</li>
      </ul>

      <div class="hidden overflow-x-auto md:block">
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
                  <span class="rounded px-2 py-0.5 text-[12px] font-medium" :class="priorityBadgeClass(p.level)">
                    {{ p.label }}
                  </span>
                </td>
                <td class="px-4 py-2 text-slate-600 max-w-sm truncate">
                  {{ formatShortPriorityReason(p, invoices) }}
                </td>
                <td class="px-4 py-2 text-right">
                  <button
                    class="text-slate-500 hover:text-slate-900 text-[13px] font-medium"
                    @click="expandedPriority = expandedPriority === p.customerId ? null : p.customerId"
                  >
                    {{ expandedPriority === p.customerId ? 'Hide' : 'Explain' }}
                  </button>
                </td>
              </tr>
              <tr v-if="expandedPriority === p.customerId" class="bg-slate-50/80">
                <td colspan="4" class="px-4 py-3 text-[13px] text-slate-600 space-y-1.5">
                  <p><strong>Supporting invoices:</strong> {{ priorityInvoiceRefs(p) }}</p>
                  <p><strong>Last 5 settled:</strong> {{ p.settledCount }} · <strong>Late:</strong> {{ p.lateCount }}</p>
                  <p v-for="x in p.lastFiveSettled" :key="x.invoiceId" class="text-slate-500">
                    {{ x.invoiceNumber }}: due {{ formatDate(x.dueDate) }}, settled {{ formatDate(x.settledDate) }} — {{ x.late ? `Late (${x.daysLate}d)` : 'On time' }}
                  </p>
                  <p v-for="flag in p.reviewFlags" :key="flag" class="text-amber-700 font-medium">⚠ {{ flag }}</p>
                  <p class="text-slate-400 text-[12px]">As of {{ formatDate(today) }}</p>
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

    <InvoiceDetailDrawer
      :invoice="selectedInvoice"
      :open="drawerOpen"
      :seller-name="currentUser.name"
      :seller-role="currentUser.role"
      @close="drawerOpen = false"
    />
  </div>
</template>
