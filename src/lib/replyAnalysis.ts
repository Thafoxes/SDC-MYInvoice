import type { CustomerResponse } from '../types';
import { toCents } from './format';

export const REPLY_FLAGS = ['payment_claim', 'payment_promise', 'extension_request', 'payment_method_request', 'installment_request', 'dispute', 'general', 'unclear'] as const;
export interface ReplyAnalysis {
  flags: (typeof REPLY_FLAGS[number])[];
  date_phrase: string | null;
  promised_amount: number | null;
  payment_method: string | null;
}
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function businessDate(value: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function validateReplyAnalysis(value: unknown, message: string): ReplyAnalysis {
  if (!value || typeof value !== 'object') throw new Error('AI reply classification is invalid');
  const x = value as ReplyAnalysis;
  if (!Array.isArray(x.flags) || !x.flags.length || x.flags.length > REPLY_FLAGS.length || x.flags.some(f => !REPLY_FLAGS.includes(f))) throw new Error('AI reply flags are invalid');
  for (const key of ['date_phrase', 'payment_method'] as const) {
    if (x[key] !== null && (typeof x[key] !== 'string' || !x[key]!.trim() || x[key]!.length > 250 || !message.toLowerCase().includes(x[key]!.toLowerCase()))) throw new Error(`AI ${key} must quote the customer message`);
  }
  if (x.promised_amount !== null && (typeof x.promised_amount !== 'number' || !Number.isFinite(x.promised_amount) || x.promised_amount <= 0 || !Number.isSafeInteger(toCents(x.promised_amount)) || Math.abs(toCents(x.promised_amount) / 100 - x.promised_amount) > 1e-7)) throw new Error('AI promised amount is invalid');
  return { ...x, flags: [...new Set(x.flags)] };
}

export function resolvePromiseDate(phrase: string | null, sentAt: string, timezone: string): { date: string | null; note: string } {
  const today = businessDate(sentAt, timezone);
  const add = (days: number) => new Date(Date.parse(today + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
  const text = (phrase || '').trim().toLowerCase().replace(/[.!]$/g, '');
  const day = new Date(today + 'T00:00:00Z').getUTCDay();
  let date: string | null = null;
  let note = `End of day in ${timezone}; seller confirmation required.`;
  if (/^(?:by )?(?:today|tonight|end of (?:the )?day|the end of (?:the )?day|eod|hari ini)$/.test(text)) date = today;
  else if (/^(?:by )?(?:tomorrow|esok)$/.test(text)) date = add(1);
  else if (/^(?:by )?(?:(?:the )?end of (?:the |this )?week|this weekend|end of this week)$/.test(text)) {
    date = add((7 - day) % 7); note = `Week ends Sunday, end of day in ${timezone}; confirm or edit this interpretation.`;
  } else if (/^(?:by )?(?:next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.test(text)) {
    const weekday = /sunday|monday|tuesday|wednesday|thursday|friday|saturday/.exec(text)![0];
    const target = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekday);
    const delta = (target - day + 7) % 7;
    date = add(text.includes('next ') ? delta || 7 : delta);
  } else {
    const iso = /^(?:by )?(\d{4}-\d{2}-\d{2})$/.exec(text);
    const numeric = /^(?:by )?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(text);
    if (iso && validDate(iso[1])) date = iso[1];
    if (numeric) {
      const candidate = `${numeric[3] || today.slice(0, 4)}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;
      if (validDate(candidate)) date = candidate;
    }
  }
  if (!date) note = 'No unambiguous date. Clarify with the customer or choose a date before confirming.';
  return { date, note };
}

export function responseFlags(response: CustomerResponse): string[] {
  if (response.ai_flags) return response.ai_flags;
  const legacy: Record<string, string[]> = { payment_already_made_claim: ['payment_claim'], payment_promise: ['payment_promise'], payment_promise_or_extension_request: ['extension_request'], invoice_dispute: ['dispute'], general_response: ['general'] };
  return legacy[response.ai_category || ''] || ['unclear'];
}
