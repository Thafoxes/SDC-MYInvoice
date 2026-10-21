<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { Bot, User, Send, Trash2, AlertCircle } from 'lucide-vue-next';
import { addAiMessage, clearAiConversation } from '@/lib/store';
import { askAiAssistant } from '@/lib/aiService';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { formatDateTime } from '@/lib/format';

const { data, refreshStore } = useDemoStore();
const { currentUser, currentBusiness } = useCurrentUser();

const input = ref('');
const loading = ref(false);
const scrollArea = ref<HTMLElement | null>(null);

const messages = computed(() =>
  data.value.aiConversations.filter(m => m.business_id === currentUser.value.business_id)
);

const prompts = [
  'Which invoices are overdue?',
  'Who owes me the most money?',
  'Which customers need follow-up today?',
  "Summarize this week's overdue invoices.",
  'Draft a reminder for invoice INV-1006.',
  'Summarize my pending invoices.',
];

async function scrollDown() {
  await nextTick();
  if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight;
}

function send(text: string) {
  const question = text.trim();
  if (!question || loading.value) return;
  const bId = currentUser.value.business_id;
  const uId = currentUser.value.id;
  const bName = currentBusiness.value?.name || 'Business';

  addAiMessage(bId, uId, 'user', question);
  input.value = '';
  loading.value = true;
  refreshStore();
  void scrollDown();

  setTimeout(() => {
    try {
      const res = askAiAssistant(question, bId, bName);
      addAiMessage(bId, uId, 'assistant', res.answer);
    } catch {
      addAiMessage(bId, uId, 'assistant', 'Response unavailable for this query.');
    } finally {
      loading.value = false;
      refreshStore();
      void scrollDown();
    }
  }, 450);
}

function clear() {
  clearAiConversation(currentUser.value.business_id);
  refreshStore();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send(input.value);
  }
}
</script>

<template>
  <div class="flex flex-col gap-3" style="min-height: calc(100vh - 120px)">
    <div class="card flex flex-1 flex-col overflow-hidden">
      <!-- Chat history area -->
      <div ref="scrollArea" class="flex-1 overflow-y-auto space-y-3.5 px-4 py-5" style="min-height: 320px; max-height: 65vh">
        <div v-if="!messages.length && !loading" class="flex flex-col items-center justify-center py-10 text-center">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 mb-3">
            <Bot class="w-5 h-5" />
          </div>
          <h2 class="text-base font-semibold text-slate-900">AI invoice assistant</h2>
          <p class="text-xs text-slate-500 mt-1 max-w-sm">
            Ask questions about receivables, overdue balances, and customer accounts for {{ currentBusiness?.name }}.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 max-w-lg w-full">
            <button
              v-for="p in prompts"
              :key="p"
              class="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 transition"
              @click="send(p)"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <!-- Chat messages -->
        <div
          v-for="m in messages"
          :key="m.id"
          class="flex gap-2.5"
          :class="m.role === 'user' ? 'flex-row-reverse' : ''"
        >
          <div
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs"
            :class="m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'"
          >
            <User v-if="m.role === 'user'" class="w-3.5 h-3.5" />
            <Bot v-else class="w-3.5 h-3.5" />
          </div>
          <div class="flex max-w-[80%] flex-col gap-0.5" :class="m.role === 'user' ? 'items-end' : ''">
            <div
              class="rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap"
              :class="m.role === 'user' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-800'"
            >
              {{ m.content }}
            </div>
            <span class="text-[12px] text-slate-400 tabular-nums px-1">{{ formatDateTime(m.created_at) }}</span>
          </div>
        </div>

        <div v-if="loading" class="flex gap-2.5 items-center">
          <div class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-600">
            <Bot class="w-3.5 h-3.5" />
          </div>
          <p class="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">Formulating response…</p>
        </div>
      </div>

      <!-- Footer disclaimer & input -->
      <div class="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2">
        <AlertCircle class="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p class="text-[13px] text-slate-500">
          Simulated local responses generated from active business invoice records.
        </p>
      </div>

      <div class="border-t border-slate-200 p-3 bg-white">
        <div class="flex items-center gap-2">
          <textarea
            v-model="input"
            @keydown="onKeydown"
            rows="1"
            placeholder="Ask about invoices, balances or customers..."
            class="form-input !mt-0 resize-none flex-1 !py-2"
          ></textarea>
          <button class="primary-btn" :disabled="!input.trim() || loading" @click="send(input)">
            <Send class="w-3.5 h-3.5" /> Send
          </button>
          <button v-if="messages.length" class="outline-btn" @click="clear" title="Clear conversation">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
