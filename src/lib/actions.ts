/** Local demo mutations for NudgeWise v1.1. No network delivery or trusted auth. */
import type { FollowUpAction, Invoice } from '@/types';
import {
  getStore, computeStatus, addPayment, addActivity, addNotificationRecord,
  updateInvoice, updateFollowUp, addCustomerResponse, DEMO_BUSINESS_ID,
} from './store';
import { classifyCustomerResponse } from './aiService';
import { approvalFingerprint, determineCheckpoint } from './reminderEngine';
import { subtractMoney, sumMoney, toCents } from './format';

type ActionResult = { success: boolean; error?: string };

function invoiceForBusiness(invoiceId: string, businessId: string): Invoice | undefined {
  return getStore().invoices.find(i => i.id === invoiceId && i.business_id === businessId);
}
function sellerInBusiness(name: string, businessId: string): boolean {
  return getStore().users.some(u => u.name === name && u.business_id === businessId && u.role === 'seller');
}
function actorForBusiness(name: string, role: string, businessId: string): boolean {
  return getStore().users.some(u => u.name === name && u.role === role && u.business_id === businessId);
}
function actionForBusiness(id: string, businessId: string): FollowUpAction | undefined {
  return getStore().followUpActions.find(f => f.id === id && f.business_id === businessId);
}
function balanceForInvoice(invoice: Invoice) {
  const data = getStore();
  const payments = data.payments.filter(p => p.business_id === invoice.business_id && p.invoice_id === invoice.id && p.verification_status === 'recorded');
  const credits = data.credits.filter(c => c.business_id === invoice.business_id && c.invoice_id === invoice.id);
  return subtractMoney(subtractMoney(invoice.invoice_amount, sumMoney(payments.map(p => p.amount))), sumMoney(credits.map(c => c.amount)));
}
function cancelAction(fu: FollowUpAction, reason: string): void {
  updateFollowUp(fu.id, {
    send_state: 'cancelled', approval_state: 'cancelled', approved_by: null,
    approved_at: null, approved_message_hash: null, delivery_status: reason,
  });
  addActivity(fu.business_id, fu.invoice_id, 'reminder_cancelled', 'system', 'system',
    `${fu.id} cancelled: ${reason}`);
}
function invalidateOpenActions(invoiceId: string, businessId: string, reason: string): void {
  const actions = getStore().followUpActions.filter(f => f.invoice_id === invoiceId && f.business_id === businessId
    && f.send_state === 'not_sent' && ['pending','approved'].includes(f.approval_state));
  for (const action of actions) cancelAction(action, reason);
}
function checkEligibility(fu: FollowUpAction, inv: Invoice, now: string): string | null {
  if (balanceForInvoice(inv) <= 0) return 'Invoice fully paid';
  if (inv.dispute_active) return 'Active dispute';
  if (inv.verification_hold) return 'Payment claim awaiting verification';
  if (inv.promise_confirmed && inv.promise_to_pay_date && inv.promise_to_pay_date >= now) return 'Active payment promise';
  const cp = determineCheckpoint({ ...inv, status: computeStatus(inv, getStore(), now) }, now);
  if (!cp || !cp.shouldPrepare || cp.checkpoint !== fu.checkpoint) return 'Reminder checkpoint is no longer eligible';
  if (!fu.message.trim()) return 'Reminder has no message';
  const customer = getStore().customers.find(c => c.id === inv.customer_id && c.business_id === inv.business_id);
  if (!customer || !fu.recipient || fu.recipient !== customer.phone) return 'Recipient changed or missing';
  if (getStore().followUpActions.some(other => other.id !== fu.id && other.business_id === fu.business_id && other.invoice_id === fu.invoice_id && other.checkpoint === fu.checkpoint && other.send_state === 'sent')) return 'Checkpoint already sent';
  return null;
}

export function recordPayment(
  invoiceId: string, amount: number, paymentDate: string, method: string,
  reference: string, actorName: string, businessId: string = DEMO_BUSINESS_ID,
): ActionResult & { newStatus?: string } {
  const inv = invoiceForBusiness(invoiceId, businessId);
  if (!inv) return { success: false, error: 'Invoice not found for this business' };
  if (!sellerInBusiness(actorName, businessId)) return { success: false, error: 'Seller authorization required' };
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(toCents(amount)) || Math.abs(toCents(amount) / 100 - amount) > 0.0000001)
    return { success: false, error: 'Enter a positive MYR amount with at most two decimal places' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(Date.parse(paymentDate)))
    return { success: false, error: 'Invalid payment date' };
  if (paymentDate > getStore().demoState.simulated_date) return { success: false, error: 'Cannot record future payment in the demo' };
  if (toCents(amount) > toCents(balanceForInvoice(inv)))
    return { success: false, error: 'Payment exceeds outstanding balance; review instead of posting an excess payment' };

  addPayment(invoiceId, amount, paymentDate, method, reference, 'recorded');
  addActivity(businessId, invoiceId, 'payment_recorded', actorName, 'seller',
    `Synthetic payment of RM${amount.toFixed(2)} recorded for ${inv.invoice_number}`);
  // Any changed invoice ledger invalidates drafts and previous approvals; new checkpoint
  // cannot silently regenerate a cancelled action, seller must explicitly revisit it.
  invalidateOpenActions(invoiceId, businessId, 'Invoice ledger changed after reminder was drafted');
  const updated = getStore();
  const newStatus = computeStatus(inv, updated, updated.demoState.simulated_date);
  if (newStatus === 'paid') {
    updateInvoice(invoiceId, { status: 'paid', promise_confirmed: false, promise_to_pay_date: null });
    addActivity(businessId, invoiceId, 'settlement_recorded', actorName, 'seller',
      `${inv.invoice_number} fully settled; future reminders stopped`);
  }
  return { success: true, newStatus };
}

export function resolveVerificationHold(invoiceId: string, verified: boolean, actorName: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  if (!invoiceForBusiness(invoiceId, businessId)) return { success: false, error: 'Invoice not found for this business' };
  if (!sellerInBusiness(actorName, businessId)) return { success: false, error: 'Seller authorization required' };
  updateInvoice(invoiceId, { verification_hold: false });
  addActivity(businessId, invoiceId, 'verification_resolved', actorName, 'seller',
    `Payment claim reviewed (${verified ? 'seller reports verified' : 'unverified'}); payment balance changes only through recorded payments`);
  return { success: true };
}
export function resolveDispute(invoiceId: string, actorName: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  if (!invoiceForBusiness(invoiceId, businessId)) return { success: false, error: 'Invoice not found for this business' };
  if (!sellerInBusiness(actorName, businessId)) return { success: false, error: 'Seller authorization required' };
  updateInvoice(invoiceId, { dispute_active: false });
  addActivity(businessId, invoiceId, 'dispute_resolved', actorName, 'seller', 'Invoice dispute resolved');
  return { success: true };
}
export function confirmPromise(invoiceId: string, promiseDate: string, confirmed: boolean, actorName: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  if (!invoiceForBusiness(invoiceId, businessId)) return { success: false, error: 'Invoice not found for this business' };
  if (!sellerInBusiness(actorName, businessId)) return { success: false, error: 'Seller authorization required' };
  if (confirmed && (!/^\d{4}-\d{2}-\d{2}$/.test(promiseDate) || Number.isNaN(Date.parse(promiseDate)))) return { success: false, error: 'Invalid promise date' };
  updateInvoice(invoiceId, { promise_to_pay_date: confirmed ? promiseDate : null, promise_confirmed: confirmed });
  if (confirmed && promiseDate >= getStore().demoState.simulated_date) invalidateOpenActions(invoiceId, businessId, 'Confirmed promise-to-pay supersedes reminder');
  addActivity(businessId, invoiceId, 'promise_updated', actorName, 'seller',
    `Promise ${confirmed ? `confirmed for ${promiseDate}` : 'declined'}; no payment terms changed automatically`);
  return { success: true };
}

export function simulateCustomerResponse(invoiceId: string, customerId: string, message: string, businessId: string = DEMO_BUSINESS_ID): ActionResult & { classification?: ReturnType<typeof classifyCustomerResponse> } {
  const inv = invoiceForBusiness(invoiceId, businessId);
  const customer = getStore().customers.find(c => c.id === customerId && c.business_id === businessId);
  if (!inv || !customer || inv.customer_id !== customer.id) return { success: false, error: 'Customer and invoice do not match this business' };
  if (!message.trim()) return { success: false, error: 'Response cannot be empty' };
  const classification = classifyCustomerResponse(message);
  addCustomerResponse({
    business_id: businessId, invoice_id: invoiceId, customer_id: customerId,
    follow_up_action_id: null, message,
    ai_category: classification.category, ai_confidence: classification.confidence,
    ai_extracted_date: classification.extracted_date, ai_suggested_action: classification.suggested_action,
    review_status: 'pending',
  });
  if (classification.category === 'payment_already_made_claim') {
    updateInvoice(invoiceId, { verification_hold: true });
    invalidateOpenActions(invoiceId, businessId, 'Customer payment claim requires verification');
    addNotificationRecord(businessId, 'Customer payment claim', `${inv.invoice_number}: verification required`, 'response', 'action-center');
  }
  if (classification.category === 'invoice_dispute') {
    updateInvoice(invoiceId, { dispute_active: true });
    invalidateOpenActions(invoiceId, businessId, 'Customer disputes invoice');
    addNotificationRecord(businessId, 'Invoice dispute', `${inv.invoice_number}: seller investigation required`, 'exception', 'action-center');
  }
  addActivity(businessId, invoiceId, 'customer_replied', 'Customer (simulation)', 'customer',
    `Simulated reply: "${message.substring(0, 80)}" classified as ${classification.category}`);
  return { success: true, classification };
}

export function approveFollowUp(followUpId: string, approverId: string, approverName: string, approverRole: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  const data = getStore();
  const user = data.users.find(u => u.id === approverId && u.business_id === businessId && u.role === 'seller' && u.name === approverName);
  if (!user || approverRole !== 'seller') return { success: false, error: 'Only the seller in this business can approve reminders' };
  const fu = actionForBusiness(followUpId, businessId);
  if (!fu) return { success: false, error: 'Follow-up not found for this business' };
  if (fu.approval_state !== 'pending' || fu.send_state !== 'not_sent') return { success: false, error: 'This draft is not awaiting approval' };
  const inv = invoiceForBusiness(fu.invoice_id, businessId);
  if (!inv) return { success: false, error: 'Invoice not found for this business' };
  const issue = checkEligibility(fu, inv, data.demoState.simulated_date);
  if (issue) return { success: false, error: issue };
  updateFollowUp(followUpId, {
    approval_state: 'approved', approved_by: user.id, approved_at: new Date().toISOString(),
    approved_message_hash: approvalFingerprint(fu, inv, data),
  });
  addActivity(businessId, inv.id, 'reminder_approved', approverName, 'seller',
    `Checkpoint ${fu.checkpoint} approved for ${inv.invoice_number} (simulation)`);
  return { success: true };
}
export function editFollowUpMessage(followUpId: string, newMessage: string, editorName: string, editorRole: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  if (!actorForBusiness(editorName, editorRole, businessId) || !['seller','staff'].includes(editorRole)) return { success: false, error: 'Not authorized to edit this business draft' };
  const fu = actionForBusiness(followUpId, businessId);
  if (!fu) return { success: false, error: 'Follow-up not found for this business' };
  if (!['pending','approved'].includes(fu.approval_state) || fu.send_state !== 'not_sent') return { success: false, error: 'This action cannot be edited' };
  if (!newMessage.trim()) return { success: false, error: 'Message cannot be empty' };
  updateFollowUp(followUpId, {
    message: newMessage.trim(), message_version: fu.message_version + 1,
    approval_state: 'pending', approved_by: null, approved_at: null, approved_message_hash: null,
  });
  addActivity(businessId, fu.invoice_id, 'reminder_edited', editorName, editorRole, 'Reminder revised; previous approval invalidated');
  return { success: true };
}
export function rejectFollowUp(followUpId: string, rejectorName: string, rejectorRole: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  if (rejectorRole !== 'seller' || !sellerInBusiness(rejectorName, businessId)) return { success: false, error: 'Seller authorization required' };
  const fu = actionForBusiness(followUpId, businessId);
  if (!fu) return { success: false, error: 'Follow-up not found for this business' };
  if (!['pending','approved'].includes(fu.approval_state) || fu.send_state !== 'not_sent') return { success: false, error: 'This reminder cannot be rejected again' };
  updateFollowUp(followUpId, { approval_state: 'rejected', send_state: 'cancelled', approved_by: null, approved_message_hash: null });
  addActivity(businessId, fu.invoice_id, 'reminder_rejected', rejectorName, 'seller', `Reminder ${fu.id} rejected; checkpoint stays recorded`);
  return { success: true };
}
export function prepareFollowUpDelivery(followUpId: string, senderName: string, businessId: string = DEMO_BUSINESS_ID): ActionResult {
  if (!sellerInBusiness(senderName, businessId)) return { success: false, error: 'Seller authorization required' };
  const fu = actionForBusiness(followUpId, businessId);
  if (!fu) return { success: false, error: 'Follow-up not found for this business' };
  if (fu.approval_state !== 'approved' || fu.send_state !== 'not_sent') return { success: false, error: 'Reminder not in approved/unsent state' };
  const inv = invoiceForBusiness(fu.invoice_id, businessId);
  if (!inv) return { success: false, error: 'Invoice not found for this business' };
  const data = getStore();
  const issue = checkEligibility(fu, inv, data.demoState.simulated_date);
  if (issue) { cancelAction(fu, issue); return { success: false, error: `Stale approved reminder cancelled: ${issue}` }; }
  if (!fu.approved_message_hash || fu.approved_message_hash !== approvalFingerprint(fu, inv, data)) {
    cancelAction(fu, 'Message, recipient or invoice records changed after approval');
    return { success: false, error: 'Approved snapshot changed; reminder cancelled. New seller approval required.' };
  }
  return { success: true };
}

export function sendApprovedFollowUp(followUpId: string, senderName: string, businessId: string = DEMO_BUSINESS_ID): ActionResult & { simulated?: boolean } {
  const result = prepareFollowUpDelivery(followUpId, senderName, businessId);
  if (!result.success) return result;
  const fu = actionForBusiness(followUpId, businessId)!;
  const inv = invoiceForBusiness(fu.invoice_id, businessId)!;
  // Browser-only mode records simulation; the local server uses prepareFollowUpDelivery.
  updateFollowUp(followUpId, {
    send_state: 'sent', approval_state: 'sent', sent_at: new Date().toISOString(),
    delivery_status: 'simulated_not_delivered',
  });
  addActivity(businessId, inv.id, 'reminder_simulated', senderName, 'seller',
    `SIMULATION ONLY: ${fu.id} approved message to ${fu.recipient}; no actual delivery`);
  return { success: true, simulated: true };
}
