import type { Invoice, InvoiceWithCustomer, FollowUpAction, CustomerResponse, Customer } from '@/types';
import { formatDate } from './format';
import type { CustomerPriority } from './priorityEngine';

export interface DerivedLabel {
  text: string;
  className: string;
}

/**
 * Derives status chips directly from current invoice state.
 * Stored `invoice.labels` is ignored per spec.
 * Rules:
 * - Partially paid: total_paid > 0 and outstanding_balance > 0 (or is_partially_paid)
 * - Disputed: dispute_active is true
 * - Awaiting payment verification: verification_hold is true
 * - Promise to pay: only while unpaid (outstanding > 0) and promise_confirmed is true
 */
export function getDerivedLabels(inv: Invoice | InvoiceWithCustomer): string[] {
  const labels: string[] = [];
  const isPartiallyPaid = 'is_partially_paid' in inv
    ? inv.is_partially_paid
    : (inv.status !== 'paid' && ('total_paid' in inv ? (inv as any).total_paid > 0 : false));

  const isUnpaid = 'outstanding_balance' in inv
    ? (inv as InvoiceWithCustomer).outstanding_balance > 0
    : inv.status !== 'paid';

  if (isPartiallyPaid) {
    labels.push('Partially paid');
  }
  if (inv.dispute_active) {
    labels.push('Disputed');
  }
  if (inv.verification_hold) {
    labels.push('Awaiting payment verification');
  }
  if (inv.promise_confirmed && isUnpaid) {
    labels.push('Promise to pay');
  }

  return labels;
}

export function getDerivedLabelChips(inv: Invoice | InvoiceWithCustomer): DerivedLabel[] {
  const raw = getDerivedLabels(inv);
  return raw.map(text => {
    switch (text) {
      case 'Partially paid':
        return { text, className: 'bg-blue-50 text-blue-700' };
      case 'Disputed':
        return { text, className: 'bg-rose-50 text-rose-700' };
      case 'Awaiting payment verification':
        return { text, className: 'bg-amber-50 text-amber-700' };
      case 'Promise to pay':
        return { text, className: 'bg-purple-50 text-purple-700' };
      default:
        return { text, className: 'bg-slate-100 text-slate-700' };
    }
  });
}

/** Human-readable text for reminder checkpoints 1-5 */
export function formatCheckpoint(cp: number): string {
  switch (cp) {
    case 1:
      return 'Upcoming due reminder';
    case 2:
      return '1 day overdue reminder';
    case 3:
      return '7 days overdue follow-up';
    case 4:
      return '14 days overdue follow-up';
    case 5:
      return '21+ days overdue escalation';
    default:
      return `Checkpoint ${cp}`;
  }
}

/** Human-readable text for follow-up approval state */
export function formatApprovalState(state: FollowUpAction['approval_state']): string {
  switch (state) {
    case 'pending': return 'Pending approval';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'cancelled': return 'Cancelled';
    case 'sent': return 'Sent';
    case 'edited': return 'Edited';
    default: return state;
  }
}

/** Human-readable text for follow-up send state */
export function formatSendState(state: FollowUpAction['send_state']): string {
  switch (state) {
    case 'not_sent': return 'Not sent';
    case 'sending': return 'Sending';
    case 'sent': return 'Sent (simulated)';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    default: return state;
  }
}

/** Human-readable text for delivery status */
export function formatDeliveryStatus(status: string | null): string {
  if (!status) return '';
  switch (status) {
    case 'simulated_not_delivered': return 'Simulated (not delivered)';
    case 'seller_decision_required': return 'Seller decision needed';
    default: return status;
  }
}

/**
 * Human-readable text for AI classification categories:
 * - payment_already_made_claim → "Claims already paid"
 * - payment_promise → "Payment promise"
 * - payment_promise_or_extension_request → "Asks for more time"
 * - invoice_dispute → "Dispute"
 * - general_response → "General reply"
 * - unclear_requires_review → "Unclear – needs review"
 */
export function formatAiCategory(category: string | null | undefined): string {
  if (!category) return '—';
  switch (category) {
    case 'payment_already_made_claim': return 'Claims already paid';
    case 'payment_promise': return 'Payment promise';
    case 'payment_promise_or_extension_request': return 'Asks for more time';
    case 'invoice_dispute': return 'Dispute';
    case 'general_response': return 'General reply';
    case 'unclear_requires_review': return 'Unclear – needs review';
    default: return category.replace(/_/g, ' ');
  }
}

/**
 * Human-readable text for customer response review status:
 * - pending → "Needs review"
 * - reviewed → "Reviewed"
 * - resolved → "Resolved"
 */
export function formatReviewStatus(status: CustomerResponse['review_status'] | string | null | undefined): string {
  if (!status) return '—';
  switch (status) {
    case 'pending': return 'Needs review';
    case 'reviewed': return 'Reviewed';
    case 'resolved': return 'Resolved';
    default: return status;
  }
}

/** Replace ISO dates (YYYY-MM-DD) inside free text with a readable date. */
export function formatTextDates(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (m) => formatDate(m));
}

/** "1 approval", "2 approvals" */
export function plural(n: number, word: string, pluralWord = word + 's'): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

/**
 * Makes stored activity/notification text readable:
 * - follow-up ids (fu-xxxx) → "Reminder for INV-1006"
 * - "Checkpoint N" → readable stage name
 * - ISO dates → formatted dates
 */
export function formatActivityText(
  description: string | null,
  data?: { followUpActions: FollowUpAction[]; invoices: Invoice[] }
): string {
  if (!description) return '';
  let text = description;
  if (data) {
    text = text.replace(/(?:Reminder\s+)?(fu-[a-z0-9]+)/gi, (match, fuId) => {
      const fu = data.followUpActions.find(f => f.id === fuId);
      if (!fu) return 'Reminder';
      const inv = data.invoices.find(i => i.id === fu.invoice_id);
      return inv ? `Reminder for ${inv.invoice_number}` : 'Reminder';
    });
  }
  text = text.replace(/checkpoint\s+(\d+)(\s+reminder)?/gi, (_m, n) => formatCheckpoint(Number(n)));
  text = formatTextDates(text);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type TimelineKind =
  | 'created' | 'draft' | 'approved' | 'edited' | 'rejected' | 'cancelled' | 'sent'
  | 'reply' | 'hold' | 'payment' | 'settled' | 'resolved' | 'promise' | 'alert' | 'status';

/** Groups stored activity event types into a small set of timeline icon kinds. */
export function timelineKind(eventType: string): TimelineKind {
  switch (eventType) {
    case 'invoice_created': return 'created';
    case 'reminder_generated': return 'draft';
    case 'reminder_approved': return 'approved';
    case 'reminder_edited': return 'edited';
    case 'reminder_rejected': return 'rejected';
    case 'reminder_cancelled': return 'cancelled';
    case 'reminder_simulated':
    case 'reminder_sent': return 'sent';
    case 'customer_replied': return 'reply';
    case 'dispute_raised': return 'hold';
    case 'payment_recorded': return 'payment';
    case 'settlement_recorded': return 'settled';
    case 'verification_resolved':
    case 'verification_reviewed':
    case 'dispute_resolved': return 'resolved';
    case 'promise_updated': return 'promise';
    case 'missed_promise':
    case 'escalation': return 'alert';
    default: return 'status';
  }
}

export function formatActor(actor: string | null, role: string | null): string {
  if (!actor || actor === 'system') return 'System';
  if (!role || role === 'system') return actor;
  return `${actor} · ${role.charAt(0).toUpperCase() + role.slice(1)}`;
}

export interface SafetyCheck {
  label: string;
  ok: boolean;
}

/**
 * Display-only checklist mirroring the pre-send revalidation in actions.ts.
 * It does not authorise anything; the rule functions still decide.
 */
export function reminderSafetyChecks(
  fu: FollowUpAction,
  inv: InvoiceWithCustomer | undefined,
  data: { followUpActions: FollowUpAction[]; customers: Customer[] },
  today: string,
): SafetyCheck[] {
  if (!inv) return [{ label: 'Invoice record found', ok: false }];
  const customer = data.customers.find(c => c.id === inv.customer_id && c.business_id === inv.business_id);
  const promiseActive = !!(inv.promise_confirmed && inv.promise_to_pay_date && inv.promise_to_pay_date >= today);
  const alreadySent = data.followUpActions.some(o =>
    o.id !== fu.id && o.business_id === fu.business_id && o.invoice_id === fu.invoice_id &&
    o.checkpoint === fu.checkpoint && o.send_state === 'sent');
  return [
    { label: 'Balance still outstanding', ok: inv.outstanding_balance > 0 },
    { label: 'No active dispute', ok: !inv.dispute_active },
    { label: 'No payment-verification hold', ok: !inv.verification_hold },
    { label: 'No active payment promise', ok: !promiseActive },
    { label: 'Recipient matches customer record', ok: !!fu.recipient && !!customer && fu.recipient === customer.phone },
    { label: 'Not already sent for this stage', ok: !alreadySent },
  ];
}

/**
 * Shorten priority reasons for concise enterprise display and fix "(s)" plurals.
 * E.g.: "INV-1008 · 14 days overdue", "Missed promise · INV-1016"
 */
export function formatShortPriorityReason(
  p: CustomerPriority,
  invoices?: (Invoice | InvoiceWithCustomer)[]
): string {
  // If missed payment promise
  if (p.reason.toLowerCase().includes('missed')) {
    const match = p.reason.match(/INV-\d+/);
    if (match) return `Missed promise · ${match[0]}`;
    if (p.supportingInvoiceIds.length && invoices) {
      const inv = invoices.find(i => i.id === p.supportingInvoiceIds[0]);
      if (inv) return `Missed promise · ${inv.invoice_number}`;
    }
    return 'Missed payment promise';
  }

  // If overdue with supporting invoices
  if (invoices && p.supportingInvoiceIds.length > 0) {
    const inv = invoices.find(i => i.id === p.supportingInvoiceIds[0]);
    if (inv && 'days_overdue' in inv && (inv as InvoiceWithCustomer).days_overdue > 0) {
      const d = (inv as InvoiceWithCustomer).days_overdue;
      return `${inv.invoice_number} · ${d} ${d === 1 ? 'day' : 'days'} overdue`;
    }
  }

  // Pluralization and template cleanups
  let clean = p.reason
    .replace(/1 invoice\(s\)/g, '1 invoice')
    .replace(/(\d+) invoice\(s\)/g, '$1 invoices')
    .replace(/1 day\(s\)/g, '1 day')
    .replace(/(\d+) day\(s\)/g, '$1 days')
    .replace(/1 days/g, '1 day');

  if (clean.includes('5 required for history-based classification')) {
    return `${p.settledCount}/5 settled invoices recorded`;
  }
  if (clean.includes('were paid late')) {
    return `${p.lateCount} of last 5 invoices paid late`;
  }
  if (clean.includes('no undisputed overdue balance')) {
    return 'Consistent on-time settlement';
  }

  return clean;
}

/**
 * Format duration helper fixing "1 days" -> "1 day"
 */
export function formatOverdueDays(days: number): string {
  if (days <= 0) return 'Not overdue';
  return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
}
