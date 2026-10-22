<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useDemoStore } from '@/composables/useDemoStore';
import { getAttention, type AttentionItem } from '@/lib/attention';
import { DEMO_BUSINESS_ID } from '@/lib/store';
import { formatMYR } from '@/lib/format';
const props = defineProps<{ limit?: number }>();
const emit = defineEmits<{ review: [item: AttentionItem] }>();
const { data } = useDemoStore();
const expanded = ref(false);
const items = computed(() => getAttention(data.value, DEMO_BUSINESS_ID, data.value.demoState.simulated_date));
const visible = computed(() => props.limit && !expanded.value ? items.value.slice(0, props.limit) : items.value);
function destination(item: AttentionItem) {
  const query = item.kind === 'response' ? { reply: item.target } : item.kind === 'receipt' ? { receipt: item.target } : { invoice: item.invoiceId || '', tab: item.kind === 'approval' ? 'approval' : 'exceptions' };
  return { path: '/action-center', query };
}
</script>
<template>
  <section class="card overflow-hidden" aria-label="Needs your attention">
    <div class="px-5 py-4 border-b border-orbyte-border"><h3 class="font-semibold">Needs your attention <span class="text-orbyte-muted">({{items.length}})</span></h3><p class="text-xs text-orbyte-muted mt-1">Promises, payment verification and customer requests across all invoices. A payment claim is not a recorded payment.</p></div>
    <div v-if="!items.length" class="flex flex-col items-center px-5 py-10 text-center"><span class="text-3xl" aria-hidden="true">☕</span><p class="mt-2 text-base font-semibold text-slate-900">All caught up!</p><p class="mt-1 text-sm text-orbyte-muted">Nothing needs you right now — time for teh tarik.</p></div>
    <div v-for="item in visible" :key="item.id" class="flex flex-col gap-3 border-b border-orbyte-border p-4 last:border-0 sm:flex-row sm:justify-between">
      <div class="min-w-0 space-y-1"><p class="text-sm font-semibold">{{item.issue}} <span class="rounded-full px-2 py-0.5 text-xs" :class="item.priority==='High'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-800'">{{item.priority}}</span></p><p class="text-sm">{{item.customer}} · {{item.number}} <span v-if="item.amount!==null">· {{formatMYR(item.amount)}} outstanding</span></p><p class="text-xs text-orbyte-muted break-words">{{item.reason}}</p><p class="text-xs">{{item.action}}</p></div>
      <RouterLink :to="destination(item)" class="outline-btn shrink-0 self-start" @click="emit('review',item)">Review</RouterLink>
    </div>
    <button v-if="limit && items.length>limit" class="outline-btn m-4" @click="expanded=!expanded">{{expanded?'Show fewer':`View all ${items.length} items`}}</button>
  </section>
</template>
