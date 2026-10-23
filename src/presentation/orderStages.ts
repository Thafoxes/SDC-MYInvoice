/**
 * Display-only order progress: Order -> Quotation -> Buyer's PO -> Delivery -> Invoice -> Payment -> Receipt.
 * It reads recorded facts and never authorises anything; the workflow commands still enforce every rule.
 */
import type { PurchaseOrder } from '@/types';
import type { Quotation, OrderEvidence, DeliveryConfirmation } from '@/lib/orderWorkflow';

export type StageKey = 'order' | 'quotation' | 'buyer_po' | 'delivery' | 'invoice' | 'payment' | 'receipt';
export type StageState = 'done' | 'current' | 'blocked' | 'todo' | 'skipped';
export interface OrderStage { key: StageKey; name: string; state: StageState; detail: string }

export interface StageInput {
  order: Pick<PurchaseOrder, 'status' | 'source_mode' | 'details'>;
  quotation?: Pick<Quotation, 'status' | 'reference'>;
  evidence: Pick<OrderEvidence, 'kind'>[];
  deliveries: Pick<DeliveryConfirmation, 'item_name' | 'accepted_quantity'>[];
  invoice?: { invoice_number: string; outstanding_balance: number; total_paid: number; dispute_active: boolean; verification_hold: boolean } | null;
  receiptCount: number;
  criticalBlockers: number;
  money?: (amount: number) => string;
}

export const STAGE_KEYS: StageKey[] = ['order', 'quotation', 'buyer_po', 'delivery', 'invoice', 'payment', 'receipt'];
export const STAGE_NAMES: Record<StageKey, string> = {
  order: 'Order', quotation: 'Quotation', buyer_po: "Buyer's PO", delivery: 'Delivery',
  invoice: 'Invoice', payment: 'Payment', receipt: 'Receipt',
};
export const STATE_LABEL: Record<StageState, string> = {
  done: 'Done', current: 'Now', blocked: 'Blocked', todo: 'Not started', skipped: 'Not provided',
};

/** The buyer's own PO is on file when the order started from it or it was attached later. */
export function hasBuyerPo(input: Pick<StageInput, 'order' | 'evidence'>): boolean {
  return input.order.source_mode === 'uploaded_po' || input.evidence.some(e => e.kind === 'existing_po');
}

type Raw = { state: 'done' | 'blocked' | 'skipped' | 'pending'; detail: string };

export function orderStages(input: StageInput): OrderStage[] {
  const money = input.money ?? ((n: number) => `RM ${n.toFixed(2)}`);
  const q = input.quotation;
  const accepted = q?.status === 'accepted';
  const inv = input.invoice ?? null;
  const lines = (input.order.details?.items ?? []).map(item => ({
    item, delivery: input.deliveries.find(d => d.item_name === item.name),
  }));
  const short = lines.filter(l => l.delivery && l.delivery.accepted_quantity < (l.item.quantity ?? 0));
  const deliveryRecorded = lines.some(l => l.delivery);
  const allAccepted = lines.length > 0 && lines.every(l => l.delivery && l.delivery.accepted_quantity >= (l.item.quantity ?? 0));

  const raw: Record<StageKey, Raw> = {
    order: input.order.status === 'approved'
      ? { state: 'done', detail: 'Approved by seller' }
      : { state: 'pending', detail: 'Check the items and approve the order' },
    quotation: !q ? { state: 'pending', detail: 'Prepare the quotation' }
      : accepted ? { state: 'done', detail: `${q.reference} accepted` }
      : q.status === 'rejected' ? { state: 'blocked', detail: 'Buyer rejected the quotation' }
      : q.status === 'revision_requested' ? { state: 'pending', detail: 'Buyer asked for changes' }
      : q.status === 'sent' ? { state: 'pending', detail: "Waiting for the buyer's answer" }
      : { state: 'pending', detail: 'Draft saved; send it to the buyer' },
    buyer_po: hasBuyerPo(input) ? { state: 'done', detail: "Buyer's PO on file" }
      : deliveryRecorded || inv ? { state: 'skipped', detail: 'No buyer PO on file' }
      : { state: 'pending', detail: "Upload the buyer's PO, or skip if this buyer doesn't use POs" },
    delivery: short.length
      ? { state: 'blocked', detail: short.map(l => `${l.item.name}: ${l.delivery!.accepted_quantity} of ${l.item.quantity} accepted`).join('; ') }
      : allAccepted ? { state: 'done', detail: 'All items accepted' }
      : deliveryRecorded ? { state: 'pending', detail: 'Record acceptance for the remaining items' }
      : inv ? { state: 'skipped', detail: 'Acceptance not recorded' }
      : { state: 'pending', detail: 'Record the quantity the buyer accepted' },
    invoice: inv ? { state: 'done', detail: `${inv.invoice_number} issued` }
      : accepted && input.criticalBlockers > 0 ? { state: 'blocked', detail: 'Resolve the blocker before invoicing' }
      : { state: 'pending', detail: 'Create the invoice for the accepted quantity' },
    payment: !inv ? { state: 'pending', detail: 'Starts when the invoice is issued' }
      : inv.outstanding_balance <= 0 ? { state: 'done', detail: 'Paid in full' }
      : inv.dispute_active ? { state: 'blocked', detail: 'On hold while a dispute is open' }
      : inv.verification_hold ? { state: 'pending', detail: "Verify the buyer's payment claim" }
      : inv.total_paid > 0 ? { state: 'pending', detail: `Part paid; ${money(inv.outstanding_balance)} left` }
      : { state: 'pending', detail: `Waiting for ${money(inv.outstanding_balance)}` },
    receipt: inv && inv.outstanding_balance <= 0 && input.receiptCount > 0 ? { state: 'done', detail: 'Receipt issued' }
      : inv && inv.outstanding_balance <= 0 ? { state: 'pending', detail: 'Issue the receipt' }
      : { state: 'pending', detail: 'Issued after payment is verified' },
  };

  // The first unfinished stage is "Now"; later unfinished stages are "Not started".
  let reached = false;
  return STAGE_KEYS.map(key => {
    const r = raw[key];
    let state: StageState;
    if (r.state === 'pending') { state = reached ? 'todo' : 'current'; reached = true; }
    else { state = r.state; if (r.state === 'blocked') reached = true; }
    return { key, name: STAGE_NAMES[key], state, detail: r.detail };
  });
}

/** The stage the seller should act on first: a blocked stage, otherwise the current one. */
export function nextStage(stages: OrderStage[]): OrderStage | null {
  return stages.find(s => s.state === 'blocked') ?? stages.find(s => s.state === 'current') ?? null;
}

export function stageSummary(stages: OrderStage[]): { label: string; state: StageState } {
  const next = nextStage(stages);
  if (!next) return { label: 'Completed', state: 'done' };
  return { label: next.state === 'blocked' ? `${next.name} · Blocked` : next.name, state: next.state };
}
