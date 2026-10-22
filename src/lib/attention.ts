import type { StoreData } from './store';
import { computeInvoiceWithCustomer, addActivity, addNotificationRecord } from './store';
import { responseFlags } from './replyAnalysis';
import { toCents, sumMoney, formatMYR } from './format';
import type { Invoice } from '../types';
import { receiptReason } from './receipts';

export interface AttentionItem {
  id: string; invoiceId: string | null; customer: string; number: string;
  issue: string; reason: string; action: string; priority: 'High' | 'Medium' | 'Low';
  kind: string; target: string; amount: number | null;
}
export function replyNeedsReview(data: StoreData, invoiceId: string, businessId: string): boolean {
  return data.customerResponses.some(r => r.invoice_id === invoiceId && r.business_id === businessId && r.review_status === 'pending' && (r.ai_state === 'processing' || r.ai_state === 'failed' || (r.ai_state === 'complete' && responseFlags(r).includes('unclear'))));
}
export function promiseOutstanding(invoice: Invoice, data: StoreData, today: string): boolean {
  if (computeInvoiceWithCustomer(invoice, data, today).outstanding_balance <= 0) return false;
  if (invoice.promise_amount == null) return true;
  const paid = sumMoney(data.payments.filter(p => p.invoice_id === invoice.id && p.business_id === invoice.business_id && p.verification_status === 'recorded').map(p => p.amount));
  return toCents(paid - (invoice.promise_baseline_paid || 0)) < toCents(invoice.promise_amount);
}
export function getAttention(data: StoreData, businessId: string, today: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  const own = data.invoices.filter(i => i.business_id === businessId);
  const add = (invoice: Invoice | undefined, id: string, issue: string, reason: string, action: string, priority: AttentionItem['priority'], kind: string, target = '') => {
    const customer = data.customers.find(c => c.id === invoice?.customer_id && c.business_id === businessId);
    items.push({ id, invoiceId: invoice?.id || null, customer: customer?.name || 'Unmatched customer', number: invoice?.invoice_number || 'Invoice not found', issue, reason, action, priority, kind, target, amount: invoice ? computeInvoiceWithCustomer(invoice, data, today).outstanding_balance : null });
  };
  for (const invoice of own) {
    const computed = computeInvoiceWithCustomer(invoice, data, today);
    if (computed.outstanding_balance <= 0) continue;
    if (invoice.verification_hold) add(invoice, `verify-${invoice.id}`, 'Payment verification needed', 'Customer reports payment; the invoice remains unpaid until a payment is recorded.', 'Record verified payment or review hold', 'High', 'verification');
    if (invoice.dispute_active) add(invoice, `dispute-${invoice.id}`, 'Invoice disputed', 'Customer disputes this invoice. Reminders are paused.', 'Review dispute', 'High', 'dispute');
    if (!invoice.verification_hold && !invoice.dispute_active && !replyNeedsReview(data, invoice.id, businessId) && invoice.promise_confirmed && invoice.promise_to_pay_date && invoice.promise_to_pay_date < today && promiseOutstanding(invoice, data, today))
      add(invoice, `missed-${invoice.id}-${invoice.promise_to_pay_date}`, 'Payment promise missed', `Promised ${invoice.promise_amount == null ? 'payment' : formatMYR(invoice.promise_amount)} by ${invoice.promise_to_pay_date}, end of day. The promised payment is still outstanding.`, 'Review missed promise', 'High', 'missed_promise');
    const pending = data.followUpActions.some(f => f.business_id === businessId && f.invoice_id === invoice.id && f.approval_state === 'pending');
    if (pending) add(invoice, `approval-${invoice.id}`, 'Reminder awaiting approval', 'Review the prepared reminder before delivery.', 'Review approval', 'Medium', 'approval');
    if (computed.days_overdue > 0 && !invoice.verification_hold && !invoice.dispute_active && !pending && !invoice.promise_confirmed)
      add(invoice, `overdue-${invoice.id}`, `${computed.days_overdue} days overdue`, 'No recorded settlement.', 'Review follow-up', 'Low', 'overdue');
  }
  for (const response of data.customerResponses.filter(r => r.business_id === businessId && r.review_status === 'pending')) {
    const invoice = own.find(i => i.id === response.invoice_id);
    if (invoice && computeInvoiceWithCustomer(invoice, data, today).outstanding_balance <= 0) continue;
    const flags = responseFlags(response);
    if (response.ai_state === 'processing') { add(invoice, `response-${response.id}`, 'Reading customer reply', response.message, 'Wait for classification', 'Medium', 'response', response.id); continue; }
    const proposal = flags.some(f => ['payment_promise', 'extension_request', 'installment_request'].includes(f)) && !['confirmed', 'declined'].includes(response.promise_review || '');
    const request = flags.some(f => ['payment_method_request', 'installment_request'].includes(f));
    if (!invoice || response.ai_state === 'failed' || flags.includes('unclear')) add(invoice, `response-${response.id}`, 'Customer reply needs review', response.message, 'Review original message', 'High', 'response', response.id);
    else if (proposal) add(invoice, `response-${response.id}`, 'Promise or payment date needs confirmation', `${response.message}${response.ai_extracted_date ? ` — proposed ${response.ai_extracted_date}, end of day` : ' — date needs clarification'}`, 'Confirm, edit or decline', 'Medium', 'response', response.id);
    else if (request) add(invoice, `response-${response.id}`, 'Payment arrangement requested', response.message, 'Review payment request', 'Medium', 'response', response.id);
  }
  for (const receipt of (data.receipts || []).filter(r => r.business_id === businessId && r.status === 'attention'))
    add(own.find(i => i.id === receipt.invoice_id), `receipt-${receipt.id}`, 'Receipt requires seller review', receiptReason(receipt.reason), 'Review receipt evidence', 'High', 'receipt', receipt.id);
  const rank = { High: 0, Medium: 1, Low: 2 };
  const kindRank: Record<string, number> = { verification: 0, missed_promise: 1, receipt: 2, response: 3, dispute: 4, approval: 5, overdue: 6 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority] || kindRank[a.kind] - kindRank[b.kind] || a.id.localeCompare(b.id));
}

export function notifyMissedPromises(data: StoreData, businessId: string, today: string): void {
  for (const item of getAttention(data, businessId, today).filter(i => i.kind === 'missed_promise')) {
    const invoice = data.invoices.find(i => i.id === item.invoiceId)!;
    const key = `Missed promise ${invoice.promise_to_pay_date}`;
    if (data.activityEvents.some(e => e.business_id === businessId && e.invoice_id === invoice.id && e.event_type === 'missed_promise' && e.description?.includes(key))) continue;
    addActivity(businessId, invoice.id, 'missed_promise', 'system', 'system', `${key} for ${invoice.invoice_number}; seller review required`);
    addNotificationRecord(businessId, 'Missed payment promise', `${invoice.invoice_number}: ${item.reason}`, 'exception', 'action-center');
  }
}
