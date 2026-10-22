import { ref } from 'vue';
import * as actions from '@/lib/actions';
import * as store from '@/lib/store';
import { runInvoiceCheck as localCheck } from '@/lib/reminderEngine';
import { askAiAssistant as localAssistant } from '@/lib/aiService';
import { refreshStore } from '@/composables/useDemoStore';

export const telegramEnabled = import.meta.env.VITE_TELEGRAM_ENABLED === 'true';
export const connectionError = ref('');
export const integration = ref({ model: 'gemma4:31b', botConfigured: false, pollingError: '', lastPollAt: null as string | null, receivingAccountName: '' });
let requestRevision = 0;

export async function refreshServer() {
  if (!telegramEnabled) return;
  const revision = ++requestRevision;
  try {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('Local Telegram API unavailable. Start npm run server.');
    const body = await response.json();
    if (revision !== requestRevision) return;
    store.replaceSnapshot(body.data); integration.value = body.integration; connectionError.value = ''; refreshStore();
  } catch (error) { connectionError.value = error instanceof Error ? error.message : 'Local API connection failed'; throw error; }
}

function command<F extends (...args: any[]) => any>(name: string, local: F) {
  return async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    if (!telegramEnabled) return local(...args);
    ++requestRevision;
    try {
      const response = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nudgewise-Local': '1' }, body: JSON.stringify({ name, args }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Operation failed');
      ++requestRevision;
      store.replaceSnapshot(body.data); connectionError.value = ''; refreshStore();
      return body.result;
    } catch (error) { connectionError.value = error instanceof Error ? error.message : 'Local API connection failed'; throw error; }
  };
}

export const approveFollowUp = command('approveFollowUp', actions.approveFollowUp);
export const rejectFollowUp = command('rejectFollowUp', actions.rejectFollowUp);
export const editFollowUpMessage = command('editFollowUpMessage', actions.editFollowUpMessage);
export const sendApprovedFollowUp = command('sendApprovedFollowUp', actions.sendApprovedFollowUp);
export const resolveVerificationHold = command('resolveVerificationHold', actions.resolveVerificationHold);
export const resolveDispute = command('resolveDispute', actions.resolveDispute);
export const confirmPromise = command('confirmPromise', actions.confirmPromise);
export const reviewCustomerPromise = command('reviewCustomerPromise', actions.reviewCustomerPromise);
export const simulateCustomerResponse = command('simulateCustomerResponse', actions.simulateCustomerResponse);
export const recordPayment = command('recordPayment', actions.recordPayment);
export const runInvoiceCheck = command('runInvoiceCheck', localCheck);
export const setDemoDate = command('setDemoDate', store.setDemoDate);
export const resetStore = command('resetStore', store.resetStore);
export const markNotificationReadById = command('markNotificationReadById', store.markNotificationReadById);
export const updateCustomerResponse = command('updateCustomerResponse', store.updateCustomerResponse);
export const addActivity = command('addActivity', store.addActivity);
export const addAiMessage = command('addAiMessage', store.addAiMessage);
export const clearAiConversation = command('clearAiConversation', store.clearAiConversation);
export const askAiAssistant = command('askAiAssistant', localAssistant);
const unavailable = (..._args: string[]) => ({ success: false, error: 'Enable Telegram mode first' });
export const linkTelegram = command('linkTelegram', unavailable);
export const resolveReceipt = command('resolveReceipt', unavailable);
