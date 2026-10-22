<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CustomerResponse, InvoiceWithCustomer } from '@/types';
import { responseFlags } from '@/lib/replyAnalysis';
import { reviewCustomerPromise, updateCustomerResponse, resolveVerificationHold, resolveDispute } from '@/services/commands';
import { useDemoStore } from '@/composables/useDemoStore';
import { formatDateTime } from '@/lib/format';
const props = defineProps<{ response: CustomerResponse; invoice?: InvoiceWithCustomer; customerName?: string; sellerName: string }>();
const emit = defineEmits<{ reviewInvoice: [invoice: InvoiceWithCustomer] }>();
const { refreshStore } = useDemoStore();
const flags = computed(() => responseFlags(props.response));
const proposal = computed(() => flags.value.some(f => ['payment_promise', 'extension_request', 'installment_request'].includes(f)));
const date = ref(props.response.ai_extracted_date || '');
const amount = ref(props.response.ai_promised_amount?.toString() || '');
const busy = ref(false), notice = ref('');
watch(() => props.response.ai_extracted_date, value => { date.value = value || ''; });
watch(() => props.response.ai_promised_amount, value => { amount.value = value?.toString() || ''; });
async function act(fn: () => Promise<{ success: boolean; error?: string } | void>, message: string) {
  busy.value = true;
  try { const result = await fn(); notice.value = result && !result.success ? result.error || 'Action failed' : message; refreshStore(); }
  catch (error) { notice.value = error instanceof Error ? error.message : 'Action failed'; }
  finally { busy.value = false; }
}
async function decide(confirmed: boolean) {
  await act(() => reviewCustomerPromise(props.response.id, date.value, confirmed, props.sellerName, amount.value.trim() ? Number(amount.value) : null), confirmed ? 'Promise confirmed. Invoice due date is unchanged.' : 'Proposal declined. Existing confirmed terms remain unchanged.');
}
</script>
<template>
  <article :id="`response-${response.id}`" tabindex="-1" class="card p-5 space-y-3 scroll-mt-24">
    <p class="font-semibold">{{customerName || 'Unmatched customer'}} <span class="text-sm text-orbyte-muted font-normal">· {{invoice?.invoice_number || 'Invoice not found'}}</span></p>
    <blockquote class="rounded-lg bg-orbyte-bg p-3 text-sm whitespace-pre-wrap break-words">{{response.message}}</blockquote>
    <p class="text-xs text-orbyte-muted">{{response.source_update_id!==undefined?'Telegram reply':'Simulated reply'}} · {{formatDateTime(response.sent_at || response.created_at)}} · {{response.ai_state==='processing'?'Reading with Gemma…':response.ai_state==='failed'?'AI could not classify; review original message':flags.map(f=>f.replace(/_/g,' ')).join(' · ')}}</p>
    <p class="text-sm">{{response.ai_suggested_action}}</p>
    <p v-if="response.ai_date_phrase" class="text-sm">Customer’s timing: “{{response.ai_date_phrase}}”</p>
    <p v-if="response.ai_date_note" class="text-xs text-orbyte-muted">{{response.ai_date_note}}</p>
    <p v-if="response.ai_payment_method" class="text-sm">Requested payment method: {{response.ai_payment_method}} — seller approval required.</p>
    <div v-if="proposal && invoice && response.review_status==='pending' && !['confirmed','declined'].includes(response.promise_review || '')" class="rounded-lg border border-orbyte-border p-3 space-y-3">
      <p class="text-sm font-medium">Confirm a payment date with the customer</p>
      <div class="flex flex-wrap gap-3"><label class="form-label">Promised payment date<input v-model="date" type="date" class="form-input"/><span class="block text-xs text-orbyte-muted">End of day in the business timezone.</span></label><label class="form-label">Promised amount (MYR, optional)<input v-model="amount" type="number" min="0.01" step="0.01" class="form-input" placeholder="Full outstanding balance"/></label></div>
      <p v-if="flags.includes('payment_claim') && invoice.verification_hold" class="text-xs text-amber-800">Review the claimed payment and release its verification hold first, so an earlier transfer cannot count toward the new promise.</p>
      <div class="flex flex-wrap gap-2"><button class="success-btn" :disabled="busy || !date || (flags.includes('payment_claim') && invoice.verification_hold)" @click="decide(true)">Confirm promise</button><button class="outline-btn" :disabled="busy" @click="decide(false)">Decline proposal</button></div>
    </div>
    <p v-if="response.promise_review==='confirmed'" class="text-sm text-green-700">Seller confirmed: {{response.promise_reviewed_date || response.ai_extracted_date}}, end of day<span v-if="response.promise_reviewed_amount"> · RM{{response.promise_reviewed_amount}}</span>.</p>
    <p v-if="response.promise_review==='declined'" class="text-sm text-orbyte-muted">Seller declined this proposal.</p>
    <div class="flex gap-2 flex-wrap">
      <button v-if="invoice" class="outline-btn" @click="emit('reviewInvoice',invoice)">{{flags.includes('payment_claim')?'Record verified payment / view invoice':'View invoice'}}</button>
      <button v-if="invoice?.verification_hold && flags.includes('payment_claim')" class="outline-btn" :disabled="busy" @click="act(()=>resolveVerificationHold(invoice!.id,false,sellerName),'Verification hold released. No payment recorded; review or follow up with the customer.')">Cannot verify — release hold</button>
      <button v-if="invoice?.dispute_active && flags.includes('dispute')" class="outline-btn" :disabled="busy" @click="act(()=>resolveDispute(invoice!.id,sellerName),'Dispute resolved.')">Resolve dispute</button>
      <button v-if="response.review_status==='pending'" class="outline-btn" :disabled="busy || response.ai_state==='processing'" @click="act(()=>updateCustomerResponse(response.id,{review_status:'reviewed'}),'Message reviewed. Payments and holds are unchanged.')">Mark message reviewed</button>
    </div>
    <p class="text-xs text-orbyte-muted">Review: {{response.review_status}}. Reviewing a message does not verify funds or record a payment.</p>
    <p v-if="notice" role="status" class="text-sm">{{notice}}</p>
  </article>
</template>
