// Reminder engine — works with local store, no external services
import {
  Invoice, InvoiceWithCustomer, FollowUpAction,
} from '@/types';
import {
  getStore, computeStatus, addFollowUpAction, addActivity, addNotificationRecord,
  updateInvoice, DEMO_BUSINESS_ID, DEMO_BUSINESS_NAME,
} from './store';
import { subtractMoney, sumMoney, daysOverdue, daysBetween, formatMYR } from './format';

export interface CheckpointResult {
  checkpoint: number;
  reason: string;
  shouldPrepare: boolean;
}

export function determineCheckpoint(inv: Invoice, todayStr: string): CheckpointResult | null {
  if (inv.status === 'paid') return null;
  const daysToDue = daysBetween(todayStr, inv.due_date);
  const dOverdue = daysOverdue(inv.due_date, todayStr);

  if (daysToDue >= 0 && daysToDue <= 3) {
    return { checkpoint: 1, reason: `Invoice due in ${daysToDue} day(s). Upcoming payment reminder.`, shouldPrepare: true };
  }
  if (dOverdue >= 21) {
    return { checkpoint: 5, reason: 'Invoice is 21+ days overdue. Stop automatic follow-ups. Escalate to seller.', shouldPrepare: false };
  }
  if (dOverdue >= 14) {
    return { checkpoint: 4, reason: 'Invoice is 14 days overdue. Additional follow-up reminder.', shouldPrepare: true };
  }
  if (dOverdue >= 7) {
    return { checkpoint: 3, reason: 'Invoice is 7 days overdue. Follow-up reminder.', shouldPrepare: true };
  }
  if (dOverdue >= 1) {
    return { checkpoint: 2, reason: 'Invoice is 1 day overdue. First overdue reminder.', shouldPrepare: true };
  }
  return null;
}

export function isReminderPaused(inv: Invoice, today: string): { paused: boolean; reason?: string } {
  if (inv.status === 'paid') return { paused: true, reason: 'Invoice is fully paid' };
  if (inv.dispute_active) return { paused: true, reason: 'Dispute is active' };
  if (inv.verification_hold) return { paused: true, reason: 'Payment verification pending' };
  if (inv.promise_confirmed && inv.promise_to_pay_date && inv.promise_to_pay_date >= today) {
    return { paused: true, reason: 'Confirmed payment promise has not expired' };
  }
  return { paused: false };
}

export function messageHash(msg: string): string {
  let hash = 0;
  for (let i = 0; i < msg.length; i++) {
    const char = msg.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/** Demo approval snapshot. This is a consistency check, NOT a security signature. */
export function approvalFingerprint(fu: FollowUpAction, invoice: Invoice, data: ReturnType<typeof getStore>): string {
  const payments = data.payments.filter(p => p.business_id === invoice.business_id && p.invoice_id === invoice.id && p.verification_status === 'recorded')
    .map(p => [p.id, p.amount, p.payment_date]).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
  const credits = data.credits.filter(c => c.business_id === invoice.business_id && c.invoice_id === invoice.id)
    .map(c => [c.id, c.amount]).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
  const customer = data.customers.find(c => c.id === invoice.customer_id && c.business_id === invoice.business_id);
  // For the local demo, phone is the placeholder recipient. Telegram will replace it later.
  return messageHash(JSON.stringify({
    business: fu.business_id, invoice: invoice.id, customer: invoice.customer_id,
    amount: invoice.invoice_amount, issued: invoice.issue_date, due: invoice.due_date,
    dispute: invoice.dispute_active, verification: invoice.verification_hold,
    promise: invoice.promise_confirmed ? invoice.promise_to_pay_date : null,
    payments, credits, message: fu.message, messageVersion: fu.message_version,
    recipient: fu.recipient, actualRecipient: customer?.phone ?? null,
  }));
}

function formatDateStr(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
}

export function generateReminderMessage(inv: InvoiceWithCustomer, checkpoint: number, businessName: string = DEMO_BUSINESS_NAME): string {
  const customerName = inv.customer?.name ?? 'Valued Customer';
  const amount = formatMYR(inv.outstanding_balance);
  const invNum = inv.invoice_number;
  if (checkpoint === 1) {
    return `Dear ${customerName}, this is a friendly reminder that invoice ${invNum} for ${amount} is due on ${formatDateStr(inv.due_date)}. Kindly arrange payment before the due date. Thank you. — ${businessName}`;
  }
  if (checkpoint === 2) {
    return `Dear ${customerName}, this is a friendly reminder that invoice ${invNum} for ${amount} is now overdue. Kindly arrange payment at your earliest convenience. Thank you. — ${businessName}`;
  }
  return `Dear ${customerName}, our records show that invoice ${invNum} for ${amount} remains unpaid. We kindly request your urgent attention to settle this balance. If you have already paid, please share the payment reference so we can verify. Thank you. — ${businessName}`;
}

export function runInvoiceCheck(businessId: string = DEMO_BUSINESS_ID, businessName: string = DEMO_BUSINESS_NAME): { prepared: number; escalated: number; skipped: number; details: string[] } {
  const data = getStore();
  const todayStr = data.demoState.simulated_date;

  // First update statuses
  for (const inv of data.invoices) {
    if (inv.business_id !== businessId) continue;
    const newStatus = computeStatus(inv, data, todayStr);
    if (newStatus !== inv.status) {
      updateInvoice(inv.id, { status: newStatus });
      addActivity(businessId, inv.id, 'status_changed', 'system', 'system', `${inv.invoice_number} status changed to ${newStatus}`);
    }
  }

  const refreshed = getStore();
  const invoices = refreshed.invoices.filter((i) => i.business_id === businessId);
  const existing = refreshed.followUpActions.filter((f) => f.business_id === businessId);

  let prepared = 0;
  let escalated = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const inv of invoices) {
    const today = refreshed.demoState.simulated_date;
    const payments = refreshed.payments.filter((p) => p.invoice_id === inv.id && p.verification_status === 'recorded');
    const credits = refreshed.credits.filter((c) => c.invoice_id === inv.id);
    const totalPaid = sumMoney(payments.map((p) => p.amount));
    const outstanding = Math.max(0, subtractMoney(subtractMoney(inv.invoice_amount, totalPaid), sumMoney(credits.map((c) => c.amount))));
    const invWithCustomer: InvoiceWithCustomer = {
      ...inv,
      customer: refreshed.customers.find((c) => c.id === inv.customer_id),
      outstanding_balance: outstanding, total_paid: totalPaid,
      total_credits: sumMoney(credits.map((c) => c.amount)),
      days_overdue: inv.status === 'overdue' ? daysOverdue(inv.due_date, today) : 0,
      is_partially_paid: totalPaid > 0 && outstanding > 0,
    };

    const cp = determineCheckpoint(inv, today);
    if (!cp) { skipped++; continue; }

    // A missed confirmed promise is an exception, independently of regular checkpoints.
    if (inv.promise_confirmed && inv.promise_to_pay_date && inv.promise_to_pay_date < today && outstanding > 0) {
      const key = `Missed promise ${inv.promise_to_pay_date}`;
      const alreadyReported = getStore().activityEvents.some(e => e.business_id === businessId && e.invoice_id === inv.id && e.event_type === 'missed_promise' && e.description?.includes(key));
      if (!alreadyReported) {
        addActivity(businessId, inv.id, 'missed_promise', 'system', 'system', `${key} for ${inv.invoice_number}; seller review required`);
        addNotificationRecord(businessId, 'Missed payment promise', `${inv.invoice_number} promised for ${inv.promise_to_pay_date} remains unpaid. Seller review required.`, 'exception', 'action-center');
      }
    }
    const pause = isReminderPaused(inv, today);
    if (pause.paused) { skipped++; details.push(`${inv.invoice_number}: paused — ${pause.reason}`); continue; }

    if (cp.checkpoint === 5) {
      const alreadyEscalated = getStore().followUpActions.some((e) => e.business_id === businessId && e.invoice_id === inv.id && e.checkpoint === 5);
      if (!alreadyEscalated) {
        // Persist the escalation checkpoint, not just an activity/notification event.
        addFollowUpAction({
          business_id: businessId, invoice_id: inv.id, customer_id: inv.customer_id,
          checkpoint: 5, reason: cp.reason, message: '', message_version: 1,
          approval_state: 'cancelled', approved_by: null, approved_at: null,
          approved_message_hash: null, send_state: 'cancelled', sent_at: null,
          delivery_status: 'seller_decision_required', recipient: invWithCustomer.customer?.phone ?? null,
        });
        addNotificationRecord(businessId, 'Escalation: 21+ days overdue', `${inv.invoice_number} (${invWithCustomer.customer?.name}) is 21+ days overdue and requires your decision.`, 'exception', 'action-center');
        addActivity(businessId, inv.id, 'escalation', 'system', 'system', `${inv.invoice_number} escalated to seller — 21+ days overdue`);
        escalated++;
        details.push(`${inv.invoice_number}: escalated`);
      } else { skipped++; }
      continue;
    }

    const existingForInvoice = existing.filter(
      (e) => e.invoice_id === inv.id && e.checkpoint === cp.checkpoint
    );
    if (existingForInvoice.length > 0) { skipped++; details.push(`${inv.invoice_number}: checkpoint ${cp.checkpoint} already has a follow-up`); continue; }

    const message = generateReminderMessage(invWithCustomer, cp.checkpoint, businessName);
    const recipient = invWithCustomer.customer?.phone ?? 'unknown';
    addFollowUpAction({
      business_id: businessId, invoice_id: inv.id, customer_id: inv.customer_id,
      checkpoint: cp.checkpoint, reason: cp.reason, message, message_version: 1,
      approval_state: 'pending', approved_by: null, approved_at: null,
      approved_message_hash: null, send_state: 'not_sent', sent_at: null,
      delivery_status: null, recipient,
    });
    addActivity(businessId, inv.id, 'reminder_generated', 'system', 'system', `Checkpoint ${cp.checkpoint} reminder draft generated for ${inv.invoice_number} — awaiting approval`);
    addNotificationRecord(businessId, 'Reminder awaiting approval', `${inv.invoice_number} (${invWithCustomer.customer?.name}) checkpoint ${cp.checkpoint} reminder needs your review`, 'approval', 'action-center');
    prepared++;
    details.push(`${inv.invoice_number}: prepared checkpoint ${cp.checkpoint}`);
  }

  return { prepared, escalated, skipped, details };
}
