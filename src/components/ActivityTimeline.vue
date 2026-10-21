<script setup lang="ts">
import {
  FilePlus2, FileText, CheckCircle2, Pencil, XCircle, Ban, Send, MessageSquare,
  PauseCircle, Wallet, BadgeCheck, ShieldCheck, CalendarClock, AlertTriangle, RefreshCw,
} from 'lucide-vue-next';
import type { ActivityEvent } from '@/types';
import { useDemoStore } from '@/composables/useDemoStore';
import { formatActivityText, formatActor, timelineKind, type TimelineKind } from '@/lib/display';
import { formatDateTime } from '@/lib/format';

const props = defineProps<{ events: ActivityEvent[]; emptyText?: string }>();
const { data } = useDemoStore();

const kinds: Record<TimelineKind, { icon: unknown; cls: string }> = {
  created: { icon: FilePlus2, cls: 'bg-slate-100 text-slate-600' },
  draft: { icon: FileText, cls: 'bg-blue-50 text-blue-700' },
  approved: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700' },
  edited: { icon: Pencil, cls: 'bg-slate-100 text-slate-600' },
  rejected: { icon: XCircle, cls: 'bg-rose-50 text-rose-600' },
  cancelled: { icon: Ban, cls: 'bg-slate-100 text-slate-500' },
  sent: { icon: Send, cls: 'bg-blue-50 text-blue-700' },
  reply: { icon: MessageSquare, cls: 'bg-purple-50 text-purple-700' },
  hold: { icon: PauseCircle, cls: 'bg-amber-50 text-amber-700' },
  payment: { icon: Wallet, cls: 'bg-emerald-50 text-emerald-700' },
  settled: { icon: BadgeCheck, cls: 'bg-emerald-50 text-emerald-700' },
  resolved: { icon: ShieldCheck, cls: 'bg-emerald-50 text-emerald-700' },
  promise: { icon: CalendarClock, cls: 'bg-purple-50 text-purple-700' },
  alert: { icon: AlertTriangle, cls: 'bg-rose-50 text-rose-600' },
  status: { icon: RefreshCw, cls: 'bg-slate-100 text-slate-500' },
};

function sorted() {
  return [...props.events].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
</script>

<template>
  <p v-if="!events.length" class="text-xs text-slate-400">{{ emptyText || 'No activity recorded.' }}</p>
  <ol v-else class="relative space-y-3">
    <li v-for="(e, idx) in sorted()" :key="e.id" class="relative flex gap-3">
      <span
        v-if="idx < events.length - 1"
        class="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-slate-200"
        aria-hidden="true"
      ></span>
      <span class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" :class="kinds[timelineKind(e.event_type)].cls">
        <component :is="kinds[timelineKind(e.event_type)].icon" class="h-3.5 w-3.5" />
      </span>
      <div class="min-w-0 flex-1 pt-0.5">
        <p class="text-xs leading-relaxed text-slate-900">{{ formatActivityText(e.description, data) }}</p>
        <p class="mt-0.5 text-[13px] text-slate-400 tabular-nums">{{ formatActor(e.actor, e.actor_role) }} · {{ formatDateTime(e.created_at) }}</p>
      </div>
    </li>
  </ol>
</template>
