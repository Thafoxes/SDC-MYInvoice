/**
 * Reminder wording: deterministic templates per tone and language, the automatic
 * tone for each reminder stage, and validation for AI rewrites. Money, dates and
 * invoice numbers always come from the records, never from the model.
 */
import { formatDate, formatMYR } from './format';

export type Tone = 'friendly' | 'neutral' | 'firm';
export type Lang = 'en' | 'ms' | 'zh';

export const TONES: { id: Tone; label: string }[] = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'firm', label: 'Firm' },
];
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ms', label: 'Bahasa Melayu' },
  { id: 'zh', label: '中文' },
];

export const LANG_SHORT: Record<Lang, string> = { en: 'EN', ms: 'BM', zh: '中文' };

/** Tone follows how late the invoice is: before due = friendly, early overdue = neutral, 14+ days = firm. */
export function stageTone(checkpoint: number): Tone {
  if (checkpoint <= 1) return 'friendly';
  if (checkpoint >= 4) return 'firm';
  return 'neutral';
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ms' || value === 'zh';
}

/** A customer's saved language, defaulting to English. */
export function customerLang(customer: { preferred_language?: string | null } | null | undefined): Lang {
  const lang = customer?.preferred_language;
  return isLang(lang) ? lang : 'en';
}

export interface ReminderFacts {
  customerName: string;
  invoiceNumber: string;
  amount: number; // outstanding balance in MYR
  dueDate: string; // YYYY-MM-DD
  daysOverdue: number;
  businessName: string;
}

export function templateReminder(f: ReminderFacts, tone: Tone, lang: Lang): string {
  const amt = formatMYR(f.amount);
  const due = formatDate(f.dueDate);
  const late = f.daysOverdue > 0;
  const n = f.daysOverdue;
  const name = f.customerName;
  const inv = f.invoiceNumber;
  const biz = f.businessName;

  if (lang === 'ms') {
    const status = late ? `telah tamat tempoh pada ${due}` : `perlu dibayar sebelum ${due}`;
    if (tone === 'friendly') return `Hai ${name}! 😊 Sekadar peringatan mesra, invois ${inv} berjumlah ${amt} ${status}. Bila senang nanti, mohon jelaskan bayaran ya. Jika sudah bayar, sila kongsikan rujukan pembayaran dan abaikan mesej ini. Terima kasih! — ${biz}`;
    if (tone === 'neutral') return `Salam ${name}, ini peringatan bahawa invois ${inv} berjumlah ${amt} ${status}${late ? ` dan kini lewat ${n} hari` : ''}. Mohon buat pembayaran secepat mungkin. Jika sudah membuat pembayaran, sila kongsikan rujukan pembayaran. Terima kasih. — ${biz}`;
    return late
      ? `Salam ${name}, invois ${inv} berjumlah ${amt} masih belum dijelaskan (lewat ${n} hari). Mohon jelaskan baki ini secepat mungkin atau maklumkan tarikh pembayaran akan dibuat. Jika sudah membayar, sila hantar rujukan pembayaran untuk semakan. — ${biz}`
      : `Salam ${name}, invois ${inv} berjumlah ${amt} ${status}. Mohon pastikan pembayaran dibuat sebelum tarikh tersebut. Jika sudah membayar, sila hantar rujukan pembayaran. — ${biz}`;
  }

  if (lang === 'zh') {
    const status = late ? `已于${due}到期` : `将于${due}到期`;
    if (tone === 'friendly') return `${name} 您好！😊 温馨提醒：发票 ${inv}，金额 ${amt}，${status}。方便时请安排付款。如已付款，请提供付款参考号，并忽略此信息。谢谢！— ${biz}`;
    if (tone === 'neutral') return `${name} 您好，提醒您发票 ${inv}（金额 ${amt}）${status}${late ? `，目前已逾期 ${n} 天` : ''}。请尽早安排付款。如已付款，请提供付款参考号。谢谢。— ${biz}`;
    return late
      ? `${name} 您好，发票 ${inv}（金额 ${amt}）仍未付款，已逾期 ${n} 天。请尽快结清余额，或回复告知预计付款日期。如已付款，请发送付款参考号以便核对。— ${biz}`
      : `${name} 您好，发票 ${inv}（金额 ${amt}）${status}。请确保在到期日前付款。如已付款，请发送付款参考号。— ${biz}`;
  }

  const status = late ? `was due on ${due}` : `is due on ${due}`;
  const days = `${n} ${n === 1 ? 'day' : 'days'}`;
  if (tone === 'friendly') return `Hi ${name}! 😊 Just a gentle reminder that invoice ${inv} for ${amt} ${status}. Whenever you're ready, we'd appreciate the payment. If you've already paid, please share the reference and ignore this message. Thank you! — ${biz}`;
  if (tone === 'neutral') return `Dear ${name}, this is a reminder that invoice ${inv} for ${amt} ${status}${late ? ` and is now ${days} overdue` : ''}. Please arrange payment at your earliest convenience. If you have already paid, kindly share the payment reference. Thank you. — ${biz}`;
  return late
    ? `Dear ${name}, invoice ${inv} for ${amt} remains unpaid and is ${days} overdue. Please settle this balance as soon as possible, or reply to let us know when payment will be made. If you have already paid, please send the payment reference so we can verify it. — ${biz}`
    : `Dear ${name}, invoice ${inv} for ${amt} ${status}. Please make sure payment is made by then. If you have already paid, please send the payment reference. — ${biz}`;
}

/**
 * Checks an AI rewrite against the records. Returns a reason if it must be rejected.
 * The message must name the right invoice and amount, and must not mention any other
 * money amount or contain links.
 */
export function rewriteProblem(text: string, f: ReminderFacts): string | null {
  const t = (text || '').trim();
  if (!t) return 'empty message';
  if (t.length > 900) return 'message too long';
  if (/https?:\/\/|www\./i.test(t)) return 'contains a link';
  if (!t.includes(f.invoiceNumber)) return 'invoice number missing';
  const cents = Math.round(f.amount * 100);
  const amounts = [...t.matchAll(/(?:RM|MYR)\s?([\d,]+(?:\.\d{1,2})?)/gi)].map(m => Math.round(Number(m[1].replace(/,/g, '')) * 100));
  if (!amounts.length) return 'amount missing';
  if (amounts.some(a => a !== cents)) return 'amount does not match the invoice';
  return null;
}
