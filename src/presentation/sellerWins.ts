/**
 * Seller-facing "wins": progress toward a monthly goal, an honest estimate of
 * time saved, and invoices settled this week. Display only — no business rules.
 */
import type { InvoiceWithCustomer } from '@/types';
import type { StoreData } from '@/lib/store';
import { computeInvoiceWithCustomer } from '@/lib/store';
import { sumMoney } from '@/lib/format';

/** Minutes a seller would typically spend doing each step by hand (demo assumptions). */
export const MANUAL_MINUTES = {
  checkOpenInvoicePerWeek: 2, // look up balance, due date and payments for one open invoice
  draftReminder: 4,          // write and double-check one reminder message
  readReply: 3,              // read a customer reply and decide what it means
  checkReceipt: 8,           // compare a receipt with the invoice and bank record
  sendReminder: 1,           // copy/paste and send one message
} as const;

export interface TimeSaved {
  minutes: number;
  lines: { label: string; detail: string; minutes: number }[];
}

function startOfWeek(today: string): string {
  const d = new Date(today + 'T12:00:00');
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Invoices NudgeWise watched this month: still open, or settled this month. */
export function invoicesTrackedThisMonth(data: StoreData, businessId: string, today: string): number {
  const from = today.slice(0, 8) + '01';
  return data.invoices
    .filter(i => i.business_id === businessId && !i.invoice_number.startsWith('HIST-'))
    .map(i => computeInvoiceWithCustomer(i, data, today))
    .filter(i => i.outstanding_balance > 0 || data.payments.some(p =>
      p.invoice_id === i.id && p.verification_status === 'recorded' && p.payment_date >= from && p.payment_date <= today))
    .length;
}

export function estimateTimeSaved(data: StoreData, businessId: string, today: string): TimeSaved {
  const tracked = invoicesTrackedThisMonth(data, businessId, today);
  const month = today.slice(0, 7);
  const events = data.activityEvents.filter(e => e.business_id === businessId && e.created_at.slice(0, 7) === month);
  const count = (...types: string[]) => events.filter(e => types.includes(e.event_type)).length;
  const weeksSoFar = Math.max(1, Math.ceil(Number(today.slice(8, 10)) / 7));

  const n = (k: number, word: string) => `${k} ${k === 1 ? word : word + 's'}`;
  const raw = [
    { label: 'Invoice status checks', detail: `${n(tracked, 'invoice')} × ${n(weeksSoFar, 'week')}`, count: tracked * weeksSoFar, per: MANUAL_MINUTES.checkOpenInvoicePerWeek },
    { label: 'Reminders drafted for you', count: count('reminder_generated'), per: MANUAL_MINUTES.draftReminder },
    { label: 'Reminders sent', count: count('telegram_invoice_sent', 'reminder_simulated'), per: MANUAL_MINUTES.sendReminder },
    { label: 'Customer replies read for you', count: count('customer_reply_classified', 'customer_replied'), per: MANUAL_MINUTES.readReply },
    { label: 'Receipts checked', count: count('receipt_payment_recorded', 'receipt_attention'), per: MANUAL_MINUTES.checkReceipt },
  ];
  const lines = raw
    .filter(l => l.count > 0)
    .map(l => ({ label: l.label, detail: l.detail ?? String(l.count), minutes: l.count * l.per }));
  return { minutes: lines.reduce((a, l) => a + l.minutes, 0), lines };
}

export interface WeeklyWins {
  collected: number;
  settled: InvoiceWithCustomer[];
}

export function weeklyWins(data: StoreData, businessId: string, today: string): WeeklyWins {
  const from = startOfWeek(today);
  const payments = data.payments.filter(p =>
    p.business_id === businessId && p.verification_status === 'recorded' && p.payment_date >= from && p.payment_date <= today);
  const paidInvoiceIds = new Set(payments.map(p => p.invoice_id));
  const settled = data.invoices
    .filter(i => i.business_id === businessId && paidInvoiceIds.has(i.id) && !i.invoice_number.startsWith('HIST-'))
    .map(i => computeInvoiceWithCustomer(i, data, today))
    .filter(i => i.outstanding_balance <= 0);
  return { collected: sumMoney(payments.map(p => p.amount)), settled };
}

export function collectedThisMonth(data: StoreData, businessId: string, today: string): number {
  const from = today.slice(0, 8) + '01';
  return sumMoney(data.payments
    .filter(p => p.business_id === businessId && p.verification_status === 'recorded' && p.payment_date >= from && p.payment_date <= today)
    .map(p => p.amount));
}

/** Monthly goal is a per-viewer preference kept in browser storage. */
const goalKey = (businessId: string) => `nudgewise-monthly-goal-${businessId}`;
export function loadGoal(businessId: string, fallback = 10000): number {
  try {
    const v = Number(localStorage.getItem(goalKey(businessId)));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch { return fallback; }
}
export function saveGoal(businessId: string, value: number): void {
  try { localStorage.setItem(goalKey(businessId), String(value)); } catch { /* ignore */ }
}
