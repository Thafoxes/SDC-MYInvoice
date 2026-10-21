import type { Invoice, InvoiceWithCustomer, FollowUpAction } from '@/types';

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

/** Human-readable text for AI classification categories */
export function formatAiCategory(category: string | null): string {
  if (!category) return '—';
  switch (category) {
    case 'payment_already_made_claim': return 'Payment already made claim';
    case 'payment_promise': return 'Payment promise';
    case 'payment_promise_or_extension_request': return 'Payment promise / extension request';
    case 'invoice_dispute': return 'Invoice dispute';
    case 'unrelated_or_unclear': return 'Unclear / unrelated';
    default: return category.replace(/_/g, ' ');
  }
}
