<script setup lang="ts">
import type { InvoiceStatus } from '@/types';
withDefaults(defineProps<{ status: InvoiceStatus; small?: boolean }>(), { small: true });
</script>

<template>
  <span
    class="inline-flex w-fit items-center rounded px-2 py-0.5 font-medium capitalize tabular-nums"
    :class="[
      small ? 'text-[11px]' : 'text-xs',
      status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
      status === 'overdue' ? 'bg-rose-50 text-rose-700' :
      'bg-amber-50 text-amber-700'
    ]"
  >
    {{ status }}
  </span>
</template>
