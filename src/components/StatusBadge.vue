<script setup lang="ts">
import type { InvoiceStatus } from '@/types';
withDefaults(defineProps<{status:InvoiceStatus; small?:boolean}>(),{small:true});
</script>
<template><span class="inline-flex w-fit items-center rounded-full px-2.5 py-1 font-semibold capitalize" :class="[small?'text-[11px]':'text-xs',status==='paid'?'bg-green-50 text-green-700':status==='overdue'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700']">{{status}}</span></template>
