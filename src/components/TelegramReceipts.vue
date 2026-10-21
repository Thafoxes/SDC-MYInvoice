<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { DEMO_BUSINESS_ID } from '@/lib/store';
import { telegramEnabled, integration, linkTelegram, resolveReceipt } from '@/services/commands';
const { data } = useDemoStore();
const customerId = ref(''), chatId = ref(''), notice = ref(''), busy = ref(false);
const customers = computed(() => data.value.customers.filter(c => c.business_id === DEMO_BUSINESS_ID));
const receipts = computed(() => (data.value.receipts || []).filter(r => r.business_id === DEMO_BUSINESS_ID));
async function run(action: () => Promise<{ success: boolean; error?: string }>, message: string) {
  busy.value = true;
  try { const result = await action(); notice.value = result.success ? message : result.error || 'Operation failed'; }
  catch (error) { notice.value = error instanceof Error ? error.message : 'Operation failed'; }
  finally { busy.value = false; }
}
</script>
<template>
  <section v-if="telegramEnabled" class="card p-5 space-y-4">
    <h3 class="font-semibold">Telegram payment receipts</h3>
    <p class="text-sm text-orbyte-muted">{{integration.model}} · {{integration.botConfigured ? 'Bot configured' : 'Bot token missing'}}. Receipt matches settle synthetic invoices only.</p>
    <p v-if="integration.pollingError" role="alert" class="text-sm text-red-600">{{integration.pollingError}}</p>
    <details>
      <summary class="cursor-pointer text-sm font-medium">Link a test customer</summary>
      <p class="text-xs text-orbyte-muted my-2">Start a private chat with your bot, then send /start. Enter that chat's numeric ID and link it before approving a reminder. Existing seeded IDs are placeholders.</p>
      <form class="flex flex-wrap items-end gap-2" @submit.prevent="run(()=>linkTelegram(customerId,chatId.trim()),'Telegram chat linked; approve the invoice reminder before sending.')">
        <label class="form-label">Customer<select v-model="customerId" required class="form-input"><option value="">Choose customer</option><option v-for="c in customers" :key="c.id" :value="c.id">{{c.name}}</option></select></label>
        <label class="form-label">Private chat ID<input v-model="chatId" required pattern="[1-9][0-9]*" class="form-input" inputmode="numeric"/></label>
        <button class="primary-btn" :disabled="busy">Link chat</button>
      </form>
    </details>
    <p v-if="notice" role="status" class="text-sm">{{notice}}</p>
    <p v-if="!receipts.length" class="text-sm text-orbyte-muted">No receipts received. After an invoice message is sent, reply to it with a PDF, PNG or JPEG.</p>
    <article v-for="r in receipts" :key="r.id" class="rounded-lg border border-orbyte-border p-3 space-y-2">
      <p class="text-sm font-medium">{{r.status === 'attention' ? 'Requires seller attention' : r.status}} · {{data.invoices.find(i=>i.id===r.invoice_id)?.invoice_number || 'Invoice not found'}}</p>
      <p class="text-xs text-orbyte-muted">{{r.reason || 'Reading receipt…'}} · Chat {{r.chat_id}}</p>
      <p v-if="r.extraction" class="text-sm">{{r.extraction.currency}} {{r.extraction.amount}} · {{r.extraction.payment_date}} · {{r.extraction.reference}} · {{r.extraction.beneficiary}}</p>
      <div class="flex gap-2 flex-wrap">
        <a v-if="r.extension" :href="`/api/receipts/${r.id}/file`" class="outline-btn">Download receipt</a>
        <button v-if="r.status==='attention'" class="outline-btn" :disabled="busy" @click="run(()=>resolveReceipt(r.id),'Receipt reviewed. Use the invoice payment form to record a verified payment or release its hold.')">Mark reviewed</button>
      </div>
    </article>
  </section>
</template>
