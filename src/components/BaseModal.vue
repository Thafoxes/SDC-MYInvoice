<script setup lang="ts">
import { X } from 'lucide-vue-next';
withDefaults(defineProps<{ open: boolean; title: string; width?: string }>(), { width: 'max-w-md' });
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      @mousedown.self="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="w-full rounded-lg border border-slate-200 bg-white shadow-popover max-h-[90vh] flex flex-col"
        :class="width"
      >
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-xs font-semibold text-slate-900">{{ title }}</h3>
          <button
            type="button"
            aria-label="Close dialog"
            class="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="overflow-y-auto p-4 text-xs"><slot /></div>
        <div v-if="$slots.footer" class="border-t border-slate-100 px-4 py-3 bg-slate-50/50 rounded-b-lg">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
