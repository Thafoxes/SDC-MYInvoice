<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next';
import { useToast } from '@/composables/useToast';
const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-14 z-[80] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      role="status"
      class="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-xs shadow-popover"
      :class="t.kind === 'error' ? 'border-rose-200' : 'border-slate-200'"
    >
      <AlertCircle v-if="t.kind === 'error'" class="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <CheckCircle2 v-else-if="t.kind === 'success'" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <Info v-else class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <p class="flex-1 leading-relaxed text-slate-800">{{ t.message }}</p>
      <button type="button" class="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss" @click="dismiss(t.id)">
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
