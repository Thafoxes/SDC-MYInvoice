<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { Customer } from '@/types';
import { DEMO_BUSINESS_ID, DEMO_SELLER_ID } from '@/lib/store';
import { lookupCustomersByPhone } from '@/lib/customerOrders';
import { backendEnabled, createCustomer, extractCustomerDocument } from '@/services/commands';
import type { CustomerExtraction } from '@/lib/customerOrders';
import { useDemoStore } from '@/composables/useDemoStore';

const emit = defineEmits<{ selected: [id: string | null] }>();
const props = defineProps<{ suggestion?: CustomerExtraction }>();
const { data, refreshStore } = useDemoStore();
const phone = ref('');
const matches = ref<Customer[]>([]);
const searched = ref(false);
const selected = ref('');
const error = ref('');
const notice = ref('');
const busy = ref(false);
const reviewed = ref(false);
const extracted = ref(false);
const form = reactive({ name: '', phone: '', email: '', address: '' });
let intakeRevision = 0;

watch(phone, () => {
  intakeRevision += 1;
  searched.value = false;
  matches.value = [];
  selected.value = '';
  error.value = '';
  notice.value = '';
  extracted.value = false;
  reviewed.value = false;
  Object.assign(form, { name: '', phone: '', email: '', address: '' });
  emit('selected', null);
});

watch(() => props.suggestion, suggestion => {
  if (!suggestion) return;
  phone.value = suggestion.phone || '';
}, { flush: 'sync' });

watch(() => props.suggestion, suggestion => {
  if (!suggestion) return;
  Object.assign(form, { name: suggestion.name || '', phone: suggestion.phone || '', email: suggestion.email || '', address: suggestion.address || '' });
  extracted.value = true;
  reviewed.value = false;
  notice.value = 'Buyer details suggested from the PO. Confirm the phone country code, then find the customer.';
});

function choose(id: string) {
  selected.value = id;
  emit('selected', id || null);
}

function search() {
  error.value = '';
  notice.value = '';
  try {
    matches.value = lookupCustomersByPhone(phone.value, DEMO_BUSINESS_ID);
    searched.value = true;
    form.phone = phone.value;
    if (!matches.value.length && props.suggestion) {
      Object.assign(form, { name: props.suggestion.name || '', email: props.suggestion.email || '', address: props.suggestion.address || '' });
      extracted.value = true;
    }
    choose(matches.value.length === 1 ? matches.value[0]!.id : '');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Enter a valid phone number.';
  }
}

async function readDocument(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const revision = ++intakeRevision;
  busy.value = true;
  error.value = '';
  reviewed.value = false;
  try {
    const result = await extractCustomerDocument(file);
    if (revision !== intakeRevision) return;
    Object.assign(form, {
      name: result.name ?? '', phone: result.phone || phone.value,
      email: result.email ?? '', address: result.address ?? '',
    });
    extracted.value = true;
    notice.value = 'Document read. Check every field against the original before saving.';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not read this document. Enter the details manually.';
  } finally {
    busy.value = false;
    input.value = '';
  }
}

async function save() {
  if (busy.value || !reviewed.value) return;
  busy.value = true;
  error.value = '';
  try {
    const existing = lookupCustomersByPhone(form.phone, DEMO_BUSINESS_ID);
    if (existing.length) {
      matches.value = existing;
      choose(existing.length === 1 ? existing[0]!.id : '');
      notice.value = 'This phone already belongs to a customer. Confirm the existing record instead of creating a duplicate.';
      return;
    }
    const actor = data.value.users.find(user => user.id === DEMO_SELLER_ID)!;
    const result = await createCustomer({ ...form }, actor.name, actor.role, DEMO_BUSINESS_ID);
    if (!result.success || !result.id) throw new Error(result.error || 'Could not create customer.');
    refreshStore();
    const customer = data.value.customers.find(item => item.id === result.id);
    if (customer) matches.value = [customer];
    choose(result.id);
    notice.value = 'Customer saved. Review their order eligibility below.';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not save customer.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="card p-4 sm:p-5 space-y-4" aria-label="Find or add customer">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Find or add a customer</h2>
      <p class="mt-1 text-sm text-slate-600">Start with their phone number. Check the company details before continuing.</p>
    </div>
    <form class="flex flex-col sm:flex-row sm:items-end gap-3" @submit.prevent="search">
      <label class="flex-1 text-sm font-medium text-slate-700">Customer phone
        <input v-model="phone" type="tel" autocomplete="tel" placeholder="e.g. 0133456789 or +60133456789" class="form-input" required :disabled="busy" />
      </label>
      <button type="submit" class="primary-btn" :disabled="busy">Find customer</button>
    </form>
    <p v-if="error" role="alert" class="text-sm text-rose-700">{{ error }}</p>
    <p v-if="notice" role="status" class="text-sm text-blue-700">{{ notice }}</p>
    <div v-if="searched && matches.length" class="space-y-2">
      <p class="text-sm text-slate-600">{{ matches.length > 1 ? 'This number has multiple matches. Select the correct customer.' : 'Existing customer found.' }}</p>
      <label v-for="customer in matches" :key="customer.id" class="flex gap-3 rounded-lg border p-3 cursor-pointer" :class="selected === customer.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200'">
        <input type="radio" :checked="selected === customer.id" :value="customer.id" name="customer-match" class="mt-1" @change="choose(customer.id)" />
        <span class="min-w-0 text-sm"><strong class="block text-slate-900">{{ customer.name }}</strong><span class="block break-words text-slate-600">{{ customer.phone }} · {{ customer.email || 'No billing email' }}</span><span v-if="customer.address" class="block text-slate-600">{{ customer.address }}</span></span>
      </label>
    </div>
    <form v-if="searched && !matches.length" class="space-y-4 border-t border-slate-100 pt-4" @submit.prevent="save">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">New customer</h3>
        <p class="mt-1 text-sm text-slate-600">Enter details manually, or read them from a business document.</p>
      </div>
      <label class="block text-sm font-medium text-slate-700">Read a PO or business document
        <input type="file" accept="application/pdf,image/png,image/jpeg" class="mt-2 block w-full text-sm" :disabled="!backendEnabled || busy" @change="readDocument" />
      </label>
      <p v-if="!backendEnabled" class="text-xs text-slate-500">Document reading needs the connected backend. Manual entry is available here.</p>
      <p v-if="busy" role="status" class="text-sm text-slate-600">Processing…</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium text-slate-700">Company / customer name<input v-model.trim="form.name" class="form-input" autocomplete="organization" maxlength="120" required :disabled="busy" /></label>
        <label class="text-sm font-medium text-slate-700">Phone number<input v-model.trim="form.phone" class="form-input" type="tel" autocomplete="tel" required :disabled="busy" /></label>
        <label class="text-sm font-medium text-slate-700">Billing email (if available)<input v-model.trim="form.email" class="form-input" type="email" autocomplete="email" maxlength="254" :disabled="busy" /></label>
        <label class="text-sm font-medium text-slate-700">Address <span class="font-normal text-slate-500">(optional)</span><input v-model.trim="form.address" class="form-input" autocomplete="street-address" maxlength="500" :disabled="busy" /></label>
      </div>
      <label class="flex items-start gap-2 text-sm text-slate-700"><input v-model="reviewed" type="checkbox" class="mt-1" required :disabled="busy" /><span>{{ extracted ? 'I checked the extracted details against the original document.' : 'I checked the customer details and phone number.' }}</span></label>
      <button type="submit" class="primary-btn" :disabled="busy || !reviewed">Save customer</button>
    </form>
    <p class="text-xs text-slate-500">A phone match helps find records; it does not verify customer identity.</p>
  </section>
</template>
