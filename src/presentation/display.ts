import type { Invoice, InvoiceWithCustomer } from '@/types';
import type { CustomerPriority } from '@/lib/priorityEngine';

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

export function plural(n: number, word: string, pluralWord = word + 's'): string { return `${n} ${n === 1 ? word : pluralWord}`; }

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

