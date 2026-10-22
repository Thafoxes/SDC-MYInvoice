import { ref } from 'vue';
import * as actions from '@/lib/actions';
import * as store from '@/lib/store';
import * as customerOrders from '@/lib/customerOrders';
import type { PurchaseOrderDetails } from '@/types';
import { runInvoiceCheck as localCheck } from '@/lib/reminderEngine';
import { askAiAssistant as localAssistant } from '@/lib/aiService';
import { refreshStore } from '@/composables/useDemoStore';

export const telegramEnabled = import.meta.env.VITE_TELEGRAM_ENABLED === 'true';
export const backendEnabled = import.meta.env.VITE_BACKEND_ENABLED === 'true' || telegramEnabled;
export const connectionError = ref('');
function checkAccess(response: Response) {
  if (response.status === 401) {
    window.dispatchEvent(new Event('nudgewise:access-required'));
    throw new Error('Demo access required. Enter the passcode again.');
  }
}
export const integration = ref({ model: 'gemma4:31b', botConfigured: false, pollingError: '', lastPollAt: null as string | null, receivingAccountName: '' });
let requestRevision = 0;

export async function refreshServer() {
  if (!backendEnabled) return;
  const revision = ++requestRevision;
  try {
    const response = await fetch('/api/state');
    checkAccess(response);
    if (!response.ok) throw new Error('Local API unavailable. Start npm run server.');
    const body = await response.json();
    if (revision !== requestRevision) return;
    store.replaceSnapshot(body.data); integration.value = body.integration; connectionError.value = ''; refreshStore();
  } catch (error) { connectionError.value = error instanceof Error ? error.message : 'Local API connection failed'; throw error; }
}

function command<F extends (...args: any[]) => any>(name: string, local: F) {
  return async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    if (!backendEnabled) return local(...args);
    ++requestRevision;
    try {
      const response = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nudgewise-Local': '1' }, body: JSON.stringify({ name, args }) });
      checkAccess(response);
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
export const setCustomerLanguage = command('setCustomerLanguage', actions.setCustomerLanguage);
export const createCustomer = command('createCustomer', customerOrders.createCustomer);
export const createPurchaseOrder = command('createPurchaseOrder', customerOrders.createPurchaseOrder);
export const updatePurchaseOrder = command('updatePurchaseOrder', customerOrders.updatePurchaseOrder);
export const approvePurchaseOrder = command('approvePurchaseOrder', customerOrders.approvePurchaseOrder);
async function uploadDocument(file: File, actorRole: string, endpoint: string) {
  if (!backendEnabled) throw new Error('Enable backend mode to read documents, or enter the customer manually.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose a non-empty PDF, JPG or PNG up to 10 MB.');
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read this file. Try again or enter details manually.'));
    reader.onabort = () => reject(new Error('File reading was cancelled.'));
    reader.readAsDataURL(file);
  });
  const response = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nudgewise-Local': '1' },
    body: JSON.stringify({ name: file.name, content, actorRole }) });
  checkAccess(response);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Document extraction failed. Enter details manually or try another file.');
  return body.result;
}
export function extractCustomerDocument(file: File, actorRole = 'seller'): Promise<customerOrders.CustomerExtraction> {
  return uploadDocument(file, actorRole, '/api/customer-document');
}
export interface PurchaseOrderExtraction {
  reference: string;
  details: PurchaseOrderDetails;
  evidence: { id: string; filename: string; content_type: string; size: number; sha256: string };
  extraction_error?: string;
}
export function extractPurchaseOrderDocument(file: File, actorRole = 'seller'): Promise<PurchaseOrderExtraction> {
  return uploadDocument(file, actorRole, '/api/purchase-order-document');
}
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
