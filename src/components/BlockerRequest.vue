<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MessageSquare, Copy, ExternalLink } from 'lucide-vue-next';
import { draftBlockerRequest, whatsappLink, REQUEST_TITLES, type RequestFacts, type RequestLang } from '@/presentation/blockerRequest';

const props = defineProps<{ facts: RequestFacts; phone?: string | null; lang?: RequestLang }>();
const open = ref(false);
const lang = ref<RequestLang>(props.lang ?? 'en');
const text = ref('');
const copied = ref(false);
const langs: { id: RequestLang; label: string }[] = [{ id: 'en', label: 'EN' }, { id: 'ms', label: 'BM' }, { id: 'zh', label: '中文' }];
watch([() => props.facts, lang, open], () => { if (open.value) text.value = draftBlockerRequest(props.facts, lang.value); }, { deep: true, immediate: true });
const wa = computed(() => whatsappLink(props.phone, text.value));
async function copy() {
  try { await navigator.clipboard.writeText(text.value); copied.value = true; setTimeout(() => (copied.value = false), 2000); }
  catch { copied.value = false; }
}
</script>

<template>
  <div class="text-sm">
    <button v-if="!open" type="button" class="outline-btn inline-flex items-center gap-1.5" @click="open = true">
      <MessageSquare class="h-4 w-4" /> Draft request: {{ REQUEST_TITLES[facts.kind].toLowerCase() }}
    </button>
    <div v-else class="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-semibold text-slate-900">{{ REQUEST_TITLES[facts.kind] }}</p>
        <div class="inline-flex rounded-md border border-slate-200 p-0.5" role="radiogroup" aria-label="Message language">
          <button v-for="l in langs" :key="l.id" type="button" role="radio" :aria-checked="lang === l.id"
            class="rounded px-2 py-0.5 text-xs font-medium" :class="lang === l.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'"
            @click="lang = l.id">{{ l.label }}</button>
        </div>
      </div>
      <textarea v-model="text" rows="6" class="form-input !mt-0 text-sm" aria-label="Message to the buyer" />
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="primary-btn inline-flex items-center gap-1.5" @click="copy"><Copy class="h-4 w-4" />{{ copied ? 'Copied' : 'Copy message' }}</button>
        <a v-if="wa" :href="wa" target="_blank" rel="noopener" class="outline-btn inline-flex items-center gap-1.5"><ExternalLink class="h-4 w-4" />Open in WhatsApp</a>
        <span v-else class="text-xs text-slate-500">Add the buyer's phone number to open WhatsApp.</span>
        <button type="button" class="text-xs text-slate-500 underline" @click="open = false">Close</button>
      </div>
      <p class="text-xs text-slate-500">NudgeWise does not send this. Check it, then send it yourself.</p>
    </div>
  </div>
</template>
