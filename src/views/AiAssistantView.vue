<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { Sparkles, Bot, User, Send, Trash2, AlertCircle } from 'lucide-vue-next';
import { DEMO_BUSINESS_ID, DEMO_SELLER_ID } from '@/lib/store';
import { askAiAssistant, addAiMessage, clearAiConversation, telegramEnabled, integration } from '@/services/commands';
import { useDemoStore } from '@/composables/useDemoStore';
import { formatDateTime } from '@/lib/format';
const {data,refreshStore}=useDemoStore();
const input=ref(''),loading=ref(false),scrollArea=ref<HTMLElement|null>(null);
const messages=computed(()=>data.value.aiConversations.filter(m=>m.business_id===DEMO_BUSINESS_ID));
const prompts=['Which invoices are overdue?','Who owes me the most money?','Which customers need follow-up today?',"Summarize this week's overdue invoices.",'Draft a reminder for invoice INV-1006.','Summarize my pending invoices.'];
async function scrollDown(){await nextTick();if(scrollArea.value)scrollArea.value.scrollTop=scrollArea.value.scrollHeight;}
async function send(text:string){
 const question=text.trim();if(!question||loading.value)return;
 loading.value=true;input.value='';
 try {
  await addAiMessage(DEMO_BUSINESS_ID,DEMO_SELLER_ID,'user',question);refreshStore();void scrollDown();
  const res=await askAiAssistant(question,DEMO_BUSINESS_ID,'Kedai Maju Jaya');
  await addAiMessage(DEMO_BUSINESS_ID,DEMO_SELLER_ID,'assistant',res.answer);
 } catch { /* The shared API banner reports connection and inference errors. */ }
 finally {loading.value=false;refreshStore();void scrollDown();}
}
async function clear(){await clearAiConversation(DEMO_BUSINESS_ID);refreshStore();}
function onKeydown(e:KeyboardEvent){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input.value);}}
</script>
<template>
 <div class="flex flex-col gap-4" style="min-height:calc(100vh - 160px)"><div class="card flex flex-1 flex-col overflow-hidden">
 <div ref="scrollArea" class="flex-1 overflow-y-auto space-y-4 px-5 py-6" style="min-height:330px; max-height:65vh">
   <div v-if="!messages.length&&!loading" class="flex flex-col items-center justify-center py-10 text-center"><div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orbyte-blue to-orbyte-button text-white mb-4"><Sparkles class="w-7 h-7"/></div><h3 class="text-lg font-semibold">AI Invoice Assistant</h3><p class="text-sm text-orbyte-muted mt-1 max-w-md">Ask about your invoices and payment follow-ups. {{telegramEnabled?`Answers use ${integration.model} and your synthetic invoice records.`:'This demo uses rule-based responses from local invoice data.'}}</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg w-full"><button v-for="p in prompts" :key="p" class="rounded-xl border border-orbyte-border bg-orbyte-bg/30 px-4 py-3 text-left text-sm hover:bg-orbyte-bg hover:border-orbyte-blue" @click="send(p)">{{p}}</button></div></div>
   <div v-for="m in messages" :key="m.id" class="flex gap-3" :class="m.role==='user'?'flex-row-reverse':''"><div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orbyte-button text-white"><User v-if="m.role==='user'" class="w-4 h-4"/><Bot v-else class="w-4 h-4"/></div><div class="flex max-w-[80%] flex-col gap-1" :class="m.role==='user'?'items-end':''"><p class="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap" :class="m.role==='user'?'rounded-tr-sm bg-orbyte-button text-white':'rounded-tl-sm bg-orbyte-bg text-orbyte-ink'">{{m.content}}</p><span class="text-[10px] text-orbyte-muted">{{formatDateTime(m.created_at)}}</span></div></div>
   <div v-if="loading" class="flex gap-3"><div class="rounded-full bg-orbyte-button p-2 text-white"><Bot class="w-4 h-4"/></div><p class="rounded-xl bg-orbyte-bg p-3 text-sm text-orbyte-muted">{{telegramEnabled?'Asking Gemma…':'Preparing demo answer…'}}</p></div>
 </div>
 <div class="flex items-center gap-2 border-t border-orbyte-border bg-amber-50/70 px-5 py-2"><AlertCircle class="w-4 h-4 text-amber-600 shrink-0"/><p class="text-xs text-amber-700">{{telegramEnabled?`${integration.model} connected through the local API. Answers do not change records.`:'AI API is not connected. Responses use local, predefined invoice-aware rules.'}}</p></div>
 <div class="border-t border-orbyte-border p-4"><div class="flex items-end gap-2"><textarea aria-label="Ask about invoices" v-model="input" @keydown="onKeydown" rows="1" placeholder="Ask about your invoices..." class="form-input !mt-0 resize-none flex-1"/><button class="primary-btn" :disabled="!input.trim()||loading" @click="send(input)"><Send class="w-4 h-4"/>Send</button><button v-if="messages.length" class="outline-btn" @click="clear"><Trash2 class="w-4 h-4"/>Clear</button></div></div>
 </div></div>
</template>
