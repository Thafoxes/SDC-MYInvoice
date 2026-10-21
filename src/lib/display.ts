import type { Invoice, InvoiceWithCustomer, FollowUpAction, CustomerResponse } from '@/types';

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
        return { text, className: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'Disputed':
        return { text, className: 'bg-red-50 text-red-700 border border-red-200' };
      case 'Awaiting payment verification':
        return { text, className: 'bg-amber-50 text-amber-700 border border-amber-200' };
      case 'Promise to pay':
        return { text, className: 'bg-purple-50 text-purple-700 border border-purple-200' };
      default:
        return { text, className: 'bg-orbyte-bg text-orbyte-muted border border-orbyte-border' };
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

/**
 * Replaces any follow-up id (pattern fu-[a-z0-9]+) with the related invoice number,
 * e.g. "Reminder for INV-1006".
 */
export function formatActivityText(
  description: string | null,
  data?: { followUpActions: FollowUpAction[]; invoices: Invoice[] }
): string {
  if (!description) return '';
  if (!data) return description;
  return description.replace(/(?:Reminder\s+)?(fu-[a-z0-9]+)/gi, (match, fuId) => {
    const fu = data.followUpActions.find(f => f.id === fuId);
    if (!fu) return match;
    const inv = data.invoices.find(i => i.id === fu.invoice_id);
    if (!inv) return match;
    return `Reminder for ${inv.invoice_number}`;
  });
}
