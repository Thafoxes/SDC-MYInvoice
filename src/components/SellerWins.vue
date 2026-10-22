<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { Target, Clock3, PartyPopper, Pencil, Check, X } from 'lucide-vue-next';
import { useDemoStore } from '@/composables/useDemoStore';
import { formatMYR } from '@/lib/format';
import { plural } from '@/presentation/display';
import {
  estimateTimeSaved, weeklyWins, collectedThisMonth, loadGoal, saveGoal, formatDuration,
} from '@/presentation/sellerWins';

const props = defineProps<{ businessId: string }>();
const { data } = useDemoStore();
const today = computed(() => data.value.demoState.simulated_date);
const monthName = computed(() => new Date(today.value + 'T12:00:00').toLocaleDateString('en-MY', { month: 'long' }));

/* ---- Monthly goal ---- */
const goal = ref(loadGoal(props.businessId));
watch(() => props.businessId, id => { goal.value = loadGoal(id); });
const collected = computed(() => collectedThisMonth(data.value, props.businessId, today.value));
const pct = computed(() => Math.min(100, Math.round((collected.value / goal.value) * 100)));
const remaining = computed(() => Math.max(0, goal.value - collected.value));
const R = 34;
const C = 2 * Math.PI * R;
const dash = computed(() => `${(pct.value / 100) * C} ${C}`);

const editing = ref(false);
const draft = ref('');
const input = ref<HTMLInputElement | null>(null);
async function startEdit() {
  draft.value = String(goal.value);
  editing.value = true;
  await nextTick();
  input.value?.select();
}
function saveEdit() {
  const v = Math.round(Number(draft.value));
  if (Number.isFinite(v) && v > 0) { goal.value = v; saveGoal(props.businessId, v); }
  editing.value = false;
}

/* ---- Time saved ---- */
const saved = computed(() => estimateTimeSaved(data.value, props.businessId, today.value));
const showHow = ref(false);

/* ---- This week ---- */
const week = computed(() => weeklyWins(data.value, props.businessId, today.value));
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <!-- Monthly goal -->
    <section class="card flex items-center gap-5 p-5" aria-label="Monthly collection goal">
      <div class="relative h-[84px] w-[84px] shrink-0">
        <svg viewBox="0 0 84 84" class="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="42" cy="42" :r="R" fill="none" stroke="#E2E8F0" stroke-width="8" />
          <circle
            cx="42" cy="42" :r="R" fill="none" stroke-width="8" stroke-linecap="round"
            :stroke="pct >= 100 ? '#059669' : '#1D4ED8'" :stroke-dasharray="dash"
            class="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <span class="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums text-slate-900">{{ pct }}%</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-1.5 text-xs font-medium text-slate-600"><Target class="h-4 w-4 text-slate-400" /> {{ monthName }} goal</p>
        <p class="mt-1 text-lg font-semibold tabular-nums text-slate-900">{{ formatMYR(collected) }}</p>
        <div v-if="!editing" class="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-500">
          <span class="tabular-nums">of {{ formatMYR(goal) }}</span>
          <button type="button" class="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Edit monthly goal" @click="startEdit">
            <Pencil class="h-3.5 w-3.5" />
          </button>
        </div>
        <form v-else class="mt-1 flex items-center gap-1" @submit.prevent="saveEdit">
          <span class="text-[13px] text-slate-500">RM</span>
          <input ref="input" v-model="draft" type="number" min="1" step="100" class="form-input !mt-0 !w-28 !py-1" aria-label="Monthly goal in MYR" @keydown.esc="editing = false" />
          <button type="submit" class="rounded p-1 text-emerald-600 hover:bg-emerald-50" aria-label="Save goal"><Check class="h-4 w-4" /></button>
          <button type="button" class="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Cancel" @click="editing = false"><X class="h-4 w-4" /></button>
        </form>
        <p class="mt-1 text-[13px]" :class="pct >= 100 ? 'font-medium text-emerald-700' : 'text-slate-500'">
          {{ pct >= 100 ? 'Goal reached — well done! 🎉' : `${formatMYR(remaining)} to go` }}
        </p>
      </div>
    </section>

    <!-- Time saved -->
    <section class="card p-5" aria-label="Time saved this month">
      <p class="flex items-center gap-1.5 text-xs font-medium text-slate-600"><Clock3 class="h-4 w-4 text-slate-400" /> Time saved this month</p>
      <p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-emerald-700">~{{ formatDuration(saved.minutes) }}</p>
      <p class="mt-0.5 text-[13px] text-slate-500">compared with chasing invoices by hand</p>
      <button type="button" class="mt-2 text-[13px] font-medium text-blue-700 hover:text-blue-800" :aria-expanded="showHow" @click="showHow = !showHow">
        {{ showHow ? 'Hide breakdown' : 'How is this estimated?' }}
      </button>
      <ul v-if="showHow" class="mt-2 space-y-1 rounded-lg bg-slate-50 p-2.5 text-[12px] text-slate-600">
        <li v-for="l in saved.lines" :key="l.label" class="flex justify-between gap-2">
          <span>{{ l.label }} <span class="text-slate-400">· {{ l.detail }}</span></span><span class="tabular-nums">{{ formatDuration(l.minutes) }}</span>
        </li>
        <li class="pt-1 text-slate-400">Estimate based on typical manual minutes per task.</li>
      </ul>
    </section>

    <!-- This week -->
    <section class="card p-5" aria-label="This week's wins">
      <p class="flex items-center gap-1.5 text-xs font-medium text-slate-600"><PartyPopper class="h-4 w-4 text-slate-400" /> This week</p>
      <p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{{ formatMYR(week.collected) }}</p>
      <p class="mt-0.5 text-[13px] text-slate-500">collected since Monday</p>
      <p v-if="week.settled.length" class="mt-2 text-[13px] font-medium text-emerald-700">
        🎉 {{ plural(week.settled.length, 'invoice') }} fully paid
        <span class="block truncate font-normal text-slate-500">{{ week.settled.map(i => i.customer?.name).join(', ') }}</span>
      </p>
      <p v-else class="mt-2 text-[13px] text-slate-500">Your first settled invoice this week will show up here.</p>
    </section>
  </div>
</template>
