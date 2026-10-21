// Local data store using localStorage — no external services
import {
  Business, User, Customer, Invoice, Payment, Credit, FollowUpAction,
  CustomerResponse, ActivityEvent, Notification, AiConversation, DemoState,
  InvoiceWithCustomer,
} from '@/types';
import { subtractMoney, sumMoney, daysOverdue, daysBetween } from './format';

const STORAGE_KEY = 'nudgewise-demo-v1.1'; // new seed with v1.1 historical invoice test cases

export interface StoreData {
  businesses: Business[];
  users: User[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  credits: Credit[];
  followUpActions: FollowUpAction[];
  customerResponses: CustomerResponse[];
  activityEvents: ActivityEvent[];
  notifications: Notification[];
  aiConversations: AiConversation[];
  demoState: DemoState;
}

function uid(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ---- Seed data ----
function getSeedData(): StoreData {
  const today = '2026-10-20';
  const businessId = 'biz-001';
  const business2Id = 'biz-002';

  const businesses: Business[] = [
    { id: businessId, name: 'Kedai Maju Jaya', display_name: 'Kedai Maju Jaya Sdn Bhd', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
    { id: business2Id, name: 'Syarikat Delta Niaga', display_name: 'Delta Niaga Enterprise', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  ];

  const users: User[] = [
    { id: 'user-seller', business_id: businessId, name: 'Siti Aishah', email: 'siti@majujaya.my', role: 'seller', avatar_color: '#1D72E0' },
    { id: 'user-staff', business_id: businessId, name: 'Tan Wei Long', email: 'tan@majujaya.my', role: 'staff', avatar_color: '#4096EE' },
    { id: 'user-seller2', business_id: business2Id, name: 'Rajesh Kumar', email: 'rajesh@deltaniaga.my', role: 'seller', avatar_color: '#16A34A' },
  ];

  const customers: Customer[] = [
    { id: 'cust-01', business_id: businessId, name: 'Ahmad Farid Bin Hassan', phone: '0123456789', telegram_chat_id: '100001', email: 'ahmad@example.my' },
    { id: 'cust-02', business_id: businessId, name: 'Sarah Lim Mei Ling', phone: '0129876543', telegram_chat_id: '100002', email: 'sarah@example.my' },
    { id: 'cust-03', business_id: businessId, name: 'ABC Trading Sdn Bhd', phone: '0379123456', telegram_chat_id: '100003', email: 'accounts@abctrading.my' },
    { id: 'cust-04', business_id: businessId, name: 'XYZ Enterprise', phone: '0379654321', telegram_chat_id: '100004', email: 'finance@xyz.my' },
    { id: 'cust-05', business_id: businessId, name: 'Nurul Aina Binti Osman', phone: '0135678901', telegram_chat_id: '100005', email: 'nurul@example.my' },
    { id: 'cust-06', business_id: businessId, name: 'Chong Kah Mun', phone: '0162345678', telegram_chat_id: '100006', email: 'chong@example.my' },
    { id: 'cust-07', business_id: businessId, name: 'Warung Sedap Pak Mat', phone: '0112345670', telegram_chat_id: '100007', email: 'pakmat@warung.my' },
    { id: 'cust-08', business_id: businessId, name: 'Lee Holdings Sdn Bhd', phone: '0380012300', telegram_chat_id: '100008', email: 'ap@leeholdings.my' },
    { id: 'cust-09', business_id: businessId, name: 'Kedai Runcit Sri Kembangan', phone: '0120001122', telegram_chat_id: '100009', email: 'sri@runcit.my' },
    { id: 'cust-10', business_id: businessId, name: 'Mega Supply Co', phone: '0379009000', telegram_chat_id: '100010', email: 'ap@megasupply.my' },
    { id: 'cust-11', business_id: businessId, name: 'Fatimah Binti Abdullah', phone: '0147896541', telegram_chat_id: '100011', email: 'fatimah@example.my' },
    { id: 'cust-12', business_id: businessId, name: 'Goh Enterprise', phone: '0187654321', telegram_chat_id: '100012', email: 'goh@enterprise.my' },
    { id: 'cust-delta', business_id: business2Id, name: 'Parmjit Singh', phone: '0192233445', telegram_chat_id: null, email: null },
  ];

  const rawInvoices: Array<Partial<Invoice> & { customer: string; amount: number; issue: string; due: string; status: Invoice['status']; labels: string[] }> = [
    { id: 'inv-1001', invoice_number: 'INV-1001', customer: 'cust-01', amount: 1500, issue: '2026-09-10', due: '2026-09-24', status: 'paid', labels: [] },
    { id: 'inv-1002', invoice_number: 'INV-1002', customer: 'cust-02', amount: 3200, issue: '2026-09-15', due: '2026-09-29', status: 'paid', labels: [] },
    { id: 'inv-1003', invoice_number: 'INV-1003', customer: 'cust-03', amount: 4800, issue: '2026-10-08', due: '2026-10-22', status: 'pending', labels: [] },
    { id: 'inv-1004', invoice_number: 'INV-1004', customer: 'cust-04', amount: 2200, issue: '2026-10-10', due: '2026-10-25', status: 'pending', labels: [] },
    { id: 'inv-1005', invoice_number: 'INV-1005', customer: 'cust-05', amount: 950, issue: '2026-10-12', due: '2026-10-30', status: 'pending', labels: [] },
    { id: 'inv-1006', invoice_number: 'INV-1006', customer: 'cust-06', amount: 1800, issue: '2026-09-20', due: '2026-10-19', status: 'overdue', labels: [] },
    { id: 'inv-1007', invoice_number: 'INV-1007', customer: 'cust-07', amount: 3600, issue: '2026-09-25', due: '2026-10-13', status: 'overdue', labels: [] },
    { id: 'inv-1008', invoice_number: 'INV-1008', customer: 'cust-08', amount: 5400, issue: '2026-09-20', due: '2026-10-06', status: 'overdue', labels: [] },
    { id: 'inv-1009', invoice_number: 'INV-1009', customer: 'cust-09', amount: 2700, issue: '2026-09-15', due: '2026-09-29', status: 'overdue', labels: [] },
    { id: 'inv-1010', invoice_number: 'INV-1010', customer: 'cust-10', amount: 6100, issue: '2026-09-05', due: '2026-09-20', status: 'overdue', labels: [] },
    { id: 'inv-1011', invoice_number: 'INV-1011', customer: 'cust-01', amount: 4000, issue: '2026-09-18', due: '2026-10-02', status: 'overdue', labels: ['Partially Paid'] },
    { id: 'inv-1012', invoice_number: 'INV-1012', customer: 'cust-02', amount: 5000, issue: '2026-10-01', due: '2026-10-28', status: 'pending', labels: ['Partially Paid'] },
    { id: 'inv-1013', invoice_number: 'INV-1013', customer: 'cust-03', amount: 2900, issue: '2026-09-22', due: '2026-10-06', status: 'overdue', labels: ['Disputed'], dispute_active: true },
    { id: 'inv-1014', invoice_number: 'INV-1014', customer: 'cust-04', amount: 3300, issue: '2026-09-20', due: '2026-10-04', status: 'overdue', labels: ['Awaiting Payment Verification'], verification_hold: true },
    { id: 'inv-1015', invoice_number: 'INV-1015', customer: 'cust-05', amount: 2600, issue: '2026-09-18', due: '2026-10-02', status: 'overdue', labels: ['Promise to Pay'], promise_to_pay_date: '2026-10-25', promise_confirmed: true },
    { id: 'inv-1016', invoice_number: 'INV-1016', customer: 'cust-06', amount: 4200, issue: '2026-09-10', due: '2026-09-24', status: 'overdue', labels: ['Promise to Pay'], promise_to_pay_date: '2026-10-15', promise_confirmed: true },
    { id: 'inv-1017', invoice_number: 'INV-1017', customer: 'cust-07', amount: 1200, issue: '2026-09-05', due: '2026-09-19', status: 'paid', labels: [] },
    { id: 'inv-1018', invoice_number: 'INV-1018', customer: 'cust-08', amount: 7500, issue: '2026-10-07', due: '2026-10-23', status: 'pending', labels: [] },
    { id: 'inv-1019', invoice_number: 'INV-1019', customer: 'cust-09', amount: 1900, issue: '2026-09-25', due: '2026-10-17', status: 'overdue', labels: [] },
    { id: 'inv-1020', invoice_number: 'INV-1020', customer: 'cust-10', amount: 2800, issue: '2026-10-10', due: '2026-10-21', status: 'pending', labels: [] },
  ];

  const invoices: Invoice[] = rawInvoices.map((r) => ({
    id: r.id!,
    business_id: businessId,
    customer_id: r.customer,
    invoice_number: r.invoice_number!,
    invoice_amount: r.amount,
    issue_date: r.issue,
    due_date: r.due,
    status: r.status,
    labels: r.labels,
    dispute_active: r.dispute_active ?? false,
    verification_hold: r.verification_hold ?? false,
    promise_to_pay_date: r.promise_to_pay_date ?? null,
    promise_confirmed: r.promise_confirmed ?? false,
    created_at: r.issue + 'T00:00:00Z',
  }));

  // Additional SETTLED histories for priority-rule testing (synthetic only).
  // Green: 5/5 settled on time. Yellow: 2/5 settled late. No actual customer data.
  customers.push(
    { id: 'cust-green', business_id: businessId, name: 'Kopitiam Ah Seng', phone: null, telegram_chat_id: null, email: null },
    { id: 'cust-yellow', business_id: businessId, name: 'Bengkel Motor Zainal', phone: null, telegram_chat_id: null, email: null },
    { id: 'cust-grey', business_id: businessId, name: 'Butik Nur Ain', phone: null, telegram_chat_id: null, email: null },
  );
  for (let k = 1; k <= 5; k++) {
    for (const [kind, cid] of [['green','cust-green'],['yellow','cust-yellow']] as const) {
      const day = String(k + 1).padStart(2, '0');
      invoices.push({
        id: `hist-${kind}-${k}`, business_id: businessId, customer_id: cid,
        invoice_number: `HIST-${kind.toUpperCase()}-${k}`, invoice_amount: 100 + k * 10,
        issue_date: `2026-09-${day}`, due_date: `2026-09-${String(k + 10).padStart(2, '0')}`,
        status: 'paid', labels: [], dispute_active: false, verification_hold: false,
        promise_to_pay_date: null, promise_confirmed: false, created_at: `2026-09-${day}T00:00:00Z`,
      });
    }
  }

  // Business 2 invoice for isolation test
  invoices.push({
    id: 'inv-delta-001', business_id: business2Id, customer_id: 'cust-delta',
    invoice_number: 'DEL-001', invoice_amount: 9999, issue_date: '2026-10-01',
    due_date: '2026-10-15', status: 'overdue', labels: [],
    dispute_active: false, verification_hold: false, promise_to_pay_date: null,
    promise_confirmed: false, created_at: '2026-10-01T00:00:00Z',
  });

  const payments: Payment[] = [
    { id: 'pay-001', invoice_id: 'inv-1001', business_id: businessId, amount: 1500, payment_date: '2026-09-22', method: 'bank_transfer', reference: 'TXN-9001', verification_status: 'recorded', created_at: '2026-09-22T00:00:00Z' },
    { id: 'pay-002', invoice_id: 'inv-1002', business_id: businessId, amount: 3200, payment_date: '2026-09-28', method: 'bank_transfer', reference: 'TXN-9002', verification_status: 'recorded', created_at: '2026-09-28T00:00:00Z' },
    { id: 'pay-003', invoice_id: 'inv-1011', business_id: businessId, amount: 2000, payment_date: '2026-10-01', method: 'cash', reference: 'TXN-9003', verification_status: 'recorded', created_at: '2026-10-01T00:00:00Z' },
    { id: 'pay-004', invoice_id: 'inv-1012', business_id: businessId, amount: 1500, payment_date: '2026-10-10', method: 'bank_transfer', reference: 'TXN-9004', verification_status: 'recorded', created_at: '2026-10-10T00:00:00Z' },
    { id: 'pay-005', invoice_id: 'inv-1017', business_id: businessId, amount: 1200, payment_date: '2026-09-18', method: 'cash', reference: 'TXN-9005', verification_status: 'recorded', created_at: '2026-09-18T00:00:00Z' },
  ];

  for (let k = 1; k <= 5; k++) {
    for (const kind of ['green', 'yellow'] as const) {
      const amount = 100 + k * 10;
      const late = kind === 'yellow' && k <= 2;
      const paymentDay = String(k + (late ? 13 : 9)).padStart(2, '0');
      payments.push({
        id: `hist-pay-${kind}-${k}`, invoice_id: `hist-${kind}-${k}`,
        business_id: businessId, amount, payment_date: `2026-09-${paymentDay}`,
        method: 'demo', reference: `HIST-${kind}-${k}`, verification_status: 'recorded',
        created_at: `2026-09-${paymentDay}T00:00:00Z`,
      });
    }
  }
  const credits: Credit[] = [];

  const followUpActions: FollowUpAction[] = [
    {
      id: 'fu-001', business_id: businessId, invoice_id: 'inv-1006', customer_id: 'cust-06',
      checkpoint: 2, reason: 'Invoice is 1 day overdue. First overdue reminder.',
      message: 'Dear Chong Kah Mun, this is a friendly reminder that invoice INV-1006 for RM1,800.00 is now 1 day overdue. Kindly arrange payment at your earliest convenience. Thank you. — Kedai Maju Jaya',
      message_version: 1, approval_state: 'pending', approved_by: null, approved_at: null,
      approved_message_hash: null, send_state: 'not_sent', sent_at: null,
      delivery_status: null, recipient: '0162345678',
      created_at: '2026-10-19T00:00:00Z', updated_at: '2026-10-19T00:00:00Z',
    },
  ];

  const customerResponses: CustomerResponse[] = [
    { id: 'cr-001', business_id: businessId, invoice_id: 'inv-1014', customer_id: 'cust-04', follow_up_action_id: null, message: 'Boss, I already paid yesterday via online transfer. Please check.', ai_category: 'payment_already_made_claim', ai_confidence: 0.92, ai_extracted_date: null, ai_suggested_action: 'Pause reminders and request payment verification. Do not mark as paid.', review_status: 'pending', created_at: '2026-10-18T00:00:00Z' },
    { id: 'cr-002', business_id: businessId, invoice_id: 'inv-1015', customer_id: 'cust-05', follow_up_action_id: null, message: 'Can I pay next Friday? Salary just came in late.', ai_category: 'payment_promise_or_extension_request', ai_confidence: 0.88, ai_extracted_date: '2026-10-30', ai_suggested_action: 'Extract proposed date (2026-10-30). Request seller confirmation. Do not change terms automatically.', review_status: 'pending', created_at: '2026-10-17T00:00:00Z' },
    { id: 'cr-003', business_id: businessId, invoice_id: 'inv-1013', customer_id: 'cust-03', follow_up_action_id: null, message: 'I never received the products from this invoice. Please check with your delivery team.', ai_category: 'invoice_dispute', ai_confidence: 0.95, ai_extracted_date: null, ai_suggested_action: 'Pause reminders. Create exception. Notify seller to investigate delivery.', review_status: 'pending', created_at: '2026-10-16T00:00:00Z' },
    { id: 'cr-004', business_id: businessId, invoice_id: 'inv-1007', customer_id: 'cust-07', follow_up_action_id: null, message: 'Okay, will pay tomorrow Insyalah.', ai_category: 'payment_promise', ai_confidence: 0.80, ai_extracted_date: '2026-10-21', ai_suggested_action: 'Extract proposed date (2026-10-21). Request seller confirmation before recording.', review_status: 'pending', created_at: '2026-10-19T00:00:00Z' },
  ];

  const activityEvents: ActivityEvent[] = [
    { id: 'ae-001', business_id: businessId, invoice_id: 'inv-1001', event_type: 'invoice_created', actor: 'system', actor_role: 'system', description: 'Invoice INV-1001 created for Ahmad Farid Bin Hassan', metadata: null, created_at: '2026-09-10T00:00:00Z' },
    { id: 'ae-002', business_id: businessId, invoice_id: 'inv-1001', event_type: 'payment_recorded', actor: 'Siti Aishah', actor_role: 'seller', description: 'Payment of RM1,500.00 recorded for INV-1001', metadata: null, created_at: '2026-09-22T00:00:00Z' },
    { id: 'ae-003', business_id: businessId, invoice_id: 'inv-1001', event_type: 'status_changed', actor: 'system', actor_role: 'system', description: 'INV-1001 status changed to Paid', metadata: null, created_at: '2026-09-22T00:00:01Z' },
    { id: 'ae-004', business_id: businessId, invoice_id: 'inv-1014', event_type: 'customer_replied', actor: 'XYZ Enterprise', actor_role: 'customer', description: 'Customer claims payment already made — verification hold applied', metadata: null, created_at: '2026-10-18T00:00:00Z' },
    { id: 'ae-005', business_id: businessId, invoice_id: 'inv-1013', event_type: 'dispute_raised', actor: 'system', actor_role: 'system', description: 'Invoice dispute raised by ABC Trading — reminders paused', metadata: null, created_at: '2026-10-16T00:00:00Z' },
    { id: 'ae-006', business_id: businessId, invoice_id: 'inv-1006', event_type: 'reminder_generated', actor: 'system', actor_role: 'system', description: 'Checkpoint 2 reminder draft generated for INV-1006 — awaiting approval', metadata: null, created_at: '2026-10-19T00:00:00Z' },
  ];

  const notifications: Notification[] = [
    { id: 'nt-001', business_id: businessId, title: 'Reminder awaiting approval', body: 'INV-1006 (Chong Kah Mun) checkpoint 2 reminder needs your review', kind: 'approval', link: 'action-center', read: false, created_at: '2026-10-19T00:00:00Z' },
    { id: 'nt-002', business_id: businessId, title: 'Customer payment claim', body: 'XYZ Enterprise claims INV-1014 is already paid — verification needed', kind: 'response', link: 'action-center', read: false, created_at: '2026-10-18T00:00:00Z' },
    { id: 'nt-003', business_id: businessId, title: 'Invoice dispute', body: 'ABC Trading disputes INV-1013 — reminders paused', kind: 'exception', link: 'action-center', read: false, created_at: '2026-10-16T00:00:00Z' },
    { id: 'nt-004', business_id: businessId, title: 'Missed payment promise', body: 'Chong Kah Mun missed promise date 15 Oct for INV-1016', kind: 'exception', link: 'action-center', read: false, created_at: '2026-10-16T00:00:00Z' },
  ];

  return {
    businesses, users, customers, invoices, payments, credits,
    followUpActions, customerResponses, activityEvents, notifications,
    aiConversations: [],
    demoState: { business_id: businessId, simulated_date: today, last_check_at: null },
  };
}

// ---- Storage operations ----
let cache: StoreData | null = null;

function load(): StoreData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as StoreData;
      return cache;
    }
  } catch { /* ignore */ }
  cache = getSeedData();
  save(cache);
  return cache;
}

function save(data: StoreData): void {
  cache = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

function update(mutator: (data: StoreData) => void): StoreData {
  const data = load();
  // Deep clone to trigger Vue store revisions on refresh
  const cloned: StoreData = JSON.parse(JSON.stringify(data));
  mutator(cloned);
  save(cloned);
  return cloned;
}

export function resetStore(): StoreData {
  const fresh = getSeedData();
  save(fresh);
  return fresh;
}

export function getStore(): StoreData {
  return load();
}

export function getDemoState(): DemoState {
  return load().demoState;
}

export function setDemoDate(date: string): void {
  update((d) => { d.demoState.simulated_date = date; });
}

// ---- Constants ----
export const DEMO_BUSINESS_ID = 'biz-001';
export const DEMO_SELLER_ID = 'user-seller';
export const DEMO_BUSINESS_NAME = 'Kedai Maju Jaya';

// ---- Computed invoice helpers ----
export function computeInvoiceWithCustomer(inv: Invoice, data: StoreData, todayStr: string): InvoiceWithCustomer {
  const payments = data.payments.filter((p) => p.invoice_id === inv.id && p.verification_status === 'recorded');
  const credits = data.credits.filter((c) => c.invoice_id === inv.id);
  const totalPaid = sumMoney(payments.map((p) => p.amount));
  const totalCredits = sumMoney(credits.map((c) => c.amount));
  const outstanding = Math.max(0, subtractMoney(subtractMoney(inv.invoice_amount, totalPaid), totalCredits));
  const dOverdue = outstanding > 0 ? daysOverdue(inv.due_date, todayStr) : 0;
  return {
    ...inv,
    status: outstanding <= 0 ? 'paid' : dOverdue > 0 ? 'overdue' : 'pending',
    customer: data.customers.find((c) => c.id === inv.customer_id),
    outstanding_balance: outstanding,
    total_paid: totalPaid,
    total_credits: totalCredits,
    days_overdue: dOverdue,
    is_partially_paid: totalPaid > 0 && outstanding > 0,
  };
}

export function computeStatus(inv: Invoice, data: StoreData, todayStr: string): 'paid' | 'pending' | 'overdue' {
  const payments = data.payments.filter((p) => p.invoice_id === inv.id && p.verification_status === 'recorded');
  const credits = data.credits.filter((c) => c.invoice_id === inv.id);
  const totalPaid = sumMoney(payments.map((p) => p.amount));
  const totalCredits = sumMoney(credits.map((c) => c.amount));
  const outstanding = Math.max(0, subtractMoney(subtractMoney(inv.invoice_amount, totalPaid), totalCredits));
  if (outstanding <= 0) return 'paid';
  return daysOverdue(inv.due_date, todayStr) > 0 ? 'overdue' : 'pending';
}

// ---- Mutation helpers ----
export function addPayment(invoiceId: string, amount: number, date: string, method: string, reference: string, verificationStatus: Payment['verification_status'] = 'recorded'): void {
  update((d) => {
    const inv = d.invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    d.payments.push({
      id: uid('pay'), invoice_id: invoiceId, business_id: inv.business_id,
      amount, payment_date: date, method, reference: reference || null,
      verification_status: verificationStatus, created_at: new Date().toISOString(),
    });
    // Update status
    const today = d.demoState.simulated_date;
    inv.status = computeStatus(inv, d, today);
  });
}

export function addActivity(businessId: string, invoiceId: string | null, eventType: string, actor: string, actorRole: string, description: string): void {
  update((d) => {
    d.activityEvents.unshift({
      id: uid('ae'), business_id: businessId, invoice_id: invoiceId,
      event_type: eventType, actor, actor_role: actorRole, description,
      metadata: null, created_at: new Date().toISOString(),
    });
  });
}

export function addNotificationRecord(businessId: string, title: string, body: string, kind: string, link?: string): void {
  update((d) => {
    d.notifications.unshift({
      id: uid('nt'), business_id: businessId, title, body, kind,
      link: link ?? null, read: false, created_at: new Date().toISOString(),
    });
  });
}

export function markNotificationReadById(id: string): void {
  update((d) => {
    const n = d.notifications.find((n) => n.id === id);
    if (n) n.read = true;
  });
}

export function updateInvoice(invoiceId: string, patch: Partial<Invoice>): void {
  update((d) => {
    const inv = d.invoices.find((i) => i.id === invoiceId);
    if (inv) Object.assign(inv, patch);
  });
}

export function addFollowUpAction(action: Omit<FollowUpAction, 'id' | 'created_at' | 'updated_at'>): void {
  update((d) => {
    const now = new Date().toISOString();
    d.followUpActions.unshift({
      ...action, id: uid('fu'), created_at: now, updated_at: now,
    });
  });
}

export function updateFollowUp(id: string, patch: Partial<FollowUpAction>): void {
  update((d) => {
    const fu = d.followUpActions.find((f) => f.id === id);
    if (fu) { Object.assign(fu, patch); fu.updated_at = new Date().toISOString(); }
  });
}

export function addCustomerResponse(resp: Omit<CustomerResponse, 'id' | 'created_at'>): void {
  update((d) => {
    d.customerResponses.unshift({
      ...resp, id: uid('cr'), created_at: new Date().toISOString(),
    });
  });
}

export function updateCustomerResponse(id: string, patch: Partial<CustomerResponse>): void {
  update((d) => {
    const cr = d.customerResponses.find((c) => c.id === id);
    if (cr) Object.assign(cr, patch);
  });
}

export function addAiMessage(businessId: string, userId: string | null, role: 'user' | 'assistant', content: string): void {
  update((d) => {
    d.aiConversations.push({
      id: uid('ai'), business_id: businessId, user_id: userId, role, content,
      created_at: new Date().toISOString(),
    });
  });
}

export function clearAiConversation(businessId: string): void {
  update((d) => {
    d.aiConversations = d.aiConversations.filter((c) => c.business_id !== businessId);
  });
}
