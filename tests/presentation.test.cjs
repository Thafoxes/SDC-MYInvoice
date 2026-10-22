const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/presentation/display.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const display = import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('invoice chips reflect current balances and holds rather than stale stored labels', async () => {
  const { getDerivedLabels } = await display;
  const invoice = { status: 'overdue', outstanding_balance: 100, total_paid: 50, is_partially_paid: true, dispute_active: true, verification_hold: true, promise_confirmed: true, labels: ['Paid'] };
  assert.deepEqual(getDerivedLabels(invoice), ['Partially paid', 'Disputed', 'Awaiting payment verification', 'Promise to pay']);
  assert.deepEqual(getDerivedLabels({ ...invoice, status: 'paid', outstanding_balance: 0, total_paid: 150, is_partially_paid: false, dispute_active: false, verification_hold: false }), []);
});

test('priority text retains the invoice behind a missed promise and formats counts', async () => {
  const { formatShortPriorityReason, plural } = await display;
  assert.equal(formatShortPriorityReason({ reason: 'Missed promise', supportingInvoiceIds: ['inv-1'] }, [{ id: 'inv-1', invoice_number: 'INV-1001' }]), 'Missed promise · INV-1001');
  assert.equal(plural(1, 'invoice'), '1 invoice');
  assert.equal(plural(2, 'invoice'), '2 invoices');
});
