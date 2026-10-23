const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/presentation/orderStages.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const mod = import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const items = [{ name: 'Kuih box', quantity: 100, unit_price: 5 }];
const base = { order: { status: 'approved', source_mode: 'manual', details: { items } }, evidence: [], deliveries: [], invoice: null, receiptCount: 0, criticalBlockers: 0 };
const states = stages => Object.fromEntries(stages.map(s => [s.key, s.state]));

test('stages run in business order: quotation before the buyer PO, delivery before invoice', async () => {
  const { STAGE_KEYS } = await mod;
  assert.deepEqual(STAGE_KEYS, ['order', 'quotation', 'buyer_po', 'delivery', 'invoice', 'payment', 'receipt']);
});

test('a draft order shows only the order stage as the next step', async () => {
  const { orderStages, nextStage } = await mod;
  const s = orderStages({ ...base, order: { ...base.order, status: 'draft' } });
  assert.equal(states(s).order, 'current');
  assert.ok(s.slice(1).every(x => x.state === 'todo'));
  assert.equal(nextStage(s).key, 'order');
});

test('after acceptance the buyer PO is next, and a PO the order started from counts as on file', async () => {
  const { orderStages } = await mod;
  const accepted = { ...base, quotation: { status: 'accepted', reference: 'QT-1' } };
  assert.equal(states(orderStages(accepted)).buyer_po, 'current');
  const fromPo = { ...accepted, order: { ...base.order, source_mode: 'uploaded_po' } };
  assert.equal(states(orderStages(fromPo)).buyer_po, 'done');
  assert.equal(states(orderStages(fromPo)).delivery, 'current');
});

test('80 of 100 accepted blocks delivery and invoicing, and the blocker is the next step', async () => {
  const { orderStages, nextStage, stageSummary } = await mod;
  const s = orderStages({ ...base, quotation: { status: 'accepted', reference: 'QT-1' },
    deliveries: [{ item_name: 'Kuih box', accepted_quantity: 80 }], criticalBlockers: 1 });
  const st = states(s);
  assert.equal(st.buyer_po, 'skipped');
  assert.equal(st.delivery, 'blocked');
  assert.equal(st.invoice, 'blocked');
  assert.equal(s.find(x => x.key === 'delivery').detail, 'Kuih box: 80 of 100 accepted');
  assert.equal(nextStage(s).key, 'delivery');
  assert.equal(stageSummary(s).label, 'Delivery · Blocked');
});

test('payment shows holds and part payments, and a settled order is completed', async () => {
  const { orderStages, stageSummary } = await mod;
  const invoiced = { ...base, quotation: { status: 'accepted', reference: 'QT-1' }, evidence: [{ kind: 'existing_po' }],
    deliveries: [{ item_name: 'Kuih box', accepted_quantity: 100 }] };
  const inv = { invoice_number: 'INV-1', outstanding_balance: 300, total_paid: 200, dispute_active: false, verification_hold: false };
  const part = orderStages({ ...invoiced, invoice: inv });
  assert.equal(states(part).payment, 'current');
  assert.equal(part.find(x => x.key === 'payment').detail, 'Part paid; RM 300.00 left');
  assert.equal(states(orderStages({ ...invoiced, invoice: { ...inv, dispute_active: true } })).payment, 'blocked');
  const paid = orderStages({ ...invoiced, invoice: { ...inv, outstanding_balance: 0, total_paid: 500 }, receiptCount: 1 });
  assert.ok(paid.every(x => x.state === 'done'));
  assert.deepEqual(stageSummary(paid), { label: 'Completed', state: 'done' });
});
