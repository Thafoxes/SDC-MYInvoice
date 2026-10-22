<script setup lang="ts">
import { X } from 'lucide-vue-next';
withDefaults(defineProps<{open:boolean; title:string; width?:string}>(),{width:'max-w-lg'});
const emit = defineEmits<{close:[]} >();
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center bg-[#162A50]/45 p-4" @mousedown.self="emit('close')">
      <div role="dialog" aria-modal="true" :aria-label="title" class="w-full rounded-2xl border border-orbyte-border bg-white shadow-2xl max-h-[90vh] flex flex-col" :class="width">
        <div class="flex items-center justify-between border-b border-orbyte-border px-5 py-4"><h3 class="font-semibold text-orbyte-ink">{{title}}</h3><button aria-label="Close" class="rounded-lg p-1 hover:bg-orbyte-bg" @click="emit('close')"><X class="h-5 w-5" /></button></div>
        <div class="overflow-y-auto p-5"><slot /></div>
        <div v-if="$slots.footer" class="border-t border-orbyte-border px-5 py-4"><slot name="footer" /></div>
      </div>
    </div>
  </Teleport>
</template>
