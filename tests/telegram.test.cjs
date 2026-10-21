const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBackend } = require('../server/app.cjs');
const store = require('../.server-build/lib/store.js');
const actions = require('../.server-build/lib/actions.js');
const { validateExtraction, matchReceipt } = require('../.server-build/lib/receipts.js');
const { fileExtension } = require('../server/integrations.cjs');
const { Readable } = require('node:stream');

function request(backend, method, url, body, headers = {}) {
  return new Promise(resolve => {
    const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    Object.assign(req, { method, url, headers: { host: '127.0.0.1:8787', 'content-type': 'application/json', 'x-nudgewise-local': '1', ...headers } });
    let status;
    const res = { writeHead: code => { status = code; }, end: value => resolve({ status, body: JSON.parse(value) }) };
    backend.server.emit('request', req, res);
  });
}

const extraction = () => ({ amount: 1800, currency: 'MYR', payment_date: '2026-10-20', reference: 'TEST-TRANSFER-1', beneficiary: 'Test Seller', status: 'successful', invoice_number: null, transaction_count: 1 });
const update = (id = 1, chat = 123456, reply) => ({ update_id: id, message: { message_id: id + 100, chat: { id: chat, type: 'private' }, document: { file_id: `file-${id}`, file_unique_id: `unique-${id}`, file_size: 200 }, ...(reply === undefined ? {} : { reply_to_message: { message_id: reply } }) } });
function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nudgewise-test-'));
  process.env.RECEIPT_BENEFICIARY = 'Test Seller';
  const api = { telegram: async () => ({ message_id: 900 }), download: async id => Buffer.from('%PDF-1.7 ' + id), extract: async () => extraction(), ...options };
  const backend = createBackend({ directory, api });
  store.update(data => { data.customers.find(c => c.id === 'cust-06').telegram_chat_id = '123456'; });
  backend.db.prepare('INSERT INTO state VALUES (?, ?)').run('telegram-link:cust-06', '123456');
  t.after(() => {
    backend.stop(); backend.db.close();
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('nudgewise-test-'));
    fs.rmSync(directory, { recursive: true });
  });
  return backend;
}
async function send(backend) {
  assert.equal(actions.approveFollowUp('fu-001', 'user-seller', 'Siti Aishah', 'seller').success, true);
  assert.equal((await backend.sendApproved('fu-001', 'Siti Aishah')).success, true);
}

test('real delivery stores mapping and exact receipt settles ledger once', async t => {
  const backend = fixture(t); await send(backend);
  assert.equal(backend.snapshot().followUpActions[0].delivery_status, 'telegram_delivered');
  await backend.receive(update(1, 123456, 900));
  await backend.receive(update(1, 123456, 900));
  const data = backend.snapshot();
  assert.equal(data.receipts[0].status, 'recorded');
  assert.equal(data.invoices.find(i => i.id === 'inv-1006').status, 'paid');
  assert.equal(data.payments.filter(p => p.reference === 'TEST-TRANSFER-1').length, 1);
  assert.equal(data.invoices.find(i => i.id === 'inv-1006').verification_hold, false);
});

test('latest successful message fallback settles without explicit reply', async t => {
  const backend = fixture(t); await send(backend); await backend.receive(update());
  assert.equal(backend.snapshot().receipts[0].status, 'recorded');
});

test('unknown chat and missing sent invoice remain visible without touching ledger', async t => {
  const backend = fixture(t);
  await backend.receive(update(1, 999)); await backend.receive(update(2));
  const data = backend.snapshot();
  assert.equal(data.receipts.length, 2);
  assert.ok(data.receipts.every(r => r.status === 'attention' && r.invoice_id === null));
  assert.equal(data.payments.length, 15);
});

test('reply to unknown message never falls back to a different invoice', async t => {
  const backend = fixture(t); await send(backend); await backend.receive(update(1, 123456, 888));
  assert.equal(backend.snapshot().receipts[0].invoice_id, null);
});

for (const [name, patch] of [
  ['partial payment', { amount: 900 }], ['overpayment', { amount: 1900 }],
  ['wrong currency', { currency: 'USD' }], ['pending transfer', { status: 'pending' }],
  ['wrong beneficiary', { beneficiary: 'Someone Else' }], ['different invoice', { invoice_number: 'INV-1007' }],
  ['multiple transactions', { transaction_count: 2 }], ['bad date', { payment_date: '2026-02-30' }],
  ['missing reference', { reference: null }], ['future date', { payment_date: '2099-01-01' }],
]) test(`${name} requires seller attention and cannot settle`, async t => {
  const backend = fixture(t, { extract: async () => ({ ...extraction(), ...patch }) });
  await send(backend); await backend.receive(update());
  const data = backend.snapshot();
  assert.equal(data.receipts[0].status, 'attention');
  assert.equal(data.invoices.find(i => i.id === 'inv-1006').verification_hold, true);
  assert.equal(data.payments.length, 15);
});

test('OCR/model failure becomes an attention record', async t => {
  const backend = fixture(t, { extract: async () => { throw new Error('OCR unavailable'); } });
  await send(backend); await backend.receive(update());
  assert.equal(backend.snapshot().receipts[0].reason, 'OCR unavailable');
});

test('duplicate transaction and already-paid invoice cannot double-post', async t => {
  const backend = fixture(t); await send(backend);
  await backend.receive(update(1)); await backend.receive(update(2));
  assert.equal(backend.snapshot().payments.filter(p => p.reference === 'TEST-TRANSFER-1').length, 1);
  assert.equal(backend.snapshot().receipts.find(r => r.id === 'tg-2').status, 'attention');
});

test('concurrent receipts cannot post the same settlement twice', async t => {
  const backend = fixture(t); await send(backend);
  await Promise.all([backend.receive(update(1)), backend.receive(update(2))]);
  assert.equal(backend.snapshot().payments.filter(p => p.reference === 'TEST-TRANSFER-1').length, 1);
});

test('transaction rollback restores both cached state and SQLite', t => {
  const backend = fixture(t); const before = structuredClone(backend.snapshot());
  assert.throws(() => backend.transaction(() => { store.addPayment('inv-1006', 100, '2026-10-20', 'bank_transfer', 'rollback'); throw new Error('rollback'); }));
  assert.deepEqual(backend.snapshot(), before);
  assert.equal(JSON.parse(backend.db.prepare('SELECT value FROM state WHERE id = ?').get('nudgewise-demo-v1.1').value).payments.length, before.payments.length);
});

test('changed Telegram recipient invalidates an approved message', async t => {
  const backend = fixture(t);
  actions.approveFollowUp('fu-001', 'user-seller', 'Siti Aishah', 'seller');
  store.update(data => { data.customers.find(c => c.id === 'cust-06').telegram_chat_id = '654321'; });
  assert.equal((await backend.sendApproved('fu-001', 'Siti Aishah')).success, false);
});

test('failed or uncertain delivery is not automatically retried', async t => {
  let sends = 0;
  const backend = fixture(t, { telegram: async () => { sends++; throw new Error('timeout'); } });
  actions.approveFollowUp('fu-001', 'user-seller', 'Siti Aishah', 'seller');
  assert.equal((await backend.sendApproved('fu-001', 'Siti Aishah')).success, false);
  assert.equal((await backend.sendApproved('fu-001', 'Siti Aishah')).success, false);
  assert.equal(sends, 1);
});

test('file signatures and extracted schema fail closed', () => {
  assert.equal(fileExtension(Buffer.from('%PDF-1.7')), 'pdf');
  assert.equal(fileExtension(Buffer.from([255,216,255,0])), 'jpg');
  assert.equal(fileExtension(Buffer.from([137,80,78,71,13,10,26,10])), 'png');
  assert.throws(() => fileExtension(Buffer.from('<script>')));
  assert.throws(() => validateExtraction('fake JSON'));
  assert.throws(() => validateExtraction({ ...extraction(), amount: '1800' }));
});

test('matching is scoped to customer, business, and latest sent invoice even if paid', t => {
  const backend = fixture(t);
  const data = backend.snapshot();
  const sent = [{ business_id: 'biz-001', customer_id: 'cust-06', invoice_id: 'inv-1006', chat_id: '123456', message_id: 1, sent_at: '2026-10-20' }];
  assert.equal(matchReceipt(data, sent, '123456', 'biz-002').invoice, null);
  assert.equal(matchReceipt(data, sent, '123456', 'biz-001', 2).invoice, null);
  assert.equal(matchReceipt(data, sent, '123456', 'biz-001').invoice.id, 'inv-1006');
});

test('API rejects foreign origins, DNS rebinding hosts, missing local header and unknown commands', async t => {
  const backend = fixture(t);
  assert.equal((await request(backend, 'GET', '/api/state', undefined, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await request(backend, 'GET', '/api/state', undefined, { host: 'evil.example' })).status, 403);
  assert.equal((await request(backend, 'POST', '/api/command', { name: 'resetStore', args: [] }, { 'x-nudgewise-local': '' })).status, 403);
  assert.equal((await request(backend, 'POST', '/api/command', { name: '__proto__', args: [] })).status, 400);
  assert.equal((await request(backend, 'GET', '/api/state')).body.integration.model, 'gemma4:31b-cloud');
});

test('seller can link a chat and review an unmatched receipt through the API', async t => {
  const backend = fixture(t);
  actions.approveFollowUp('fu-001', 'user-seller', 'Siti Aishah', 'seller');
  const linked = await request(backend, 'POST', '/api/command', { name: 'linkTelegram', args: ['cust-06', '777777'] });
  assert.equal(linked.body.result.success, true);
  assert.equal(linked.body.data.followUpActions[0].approval_state, 'pending');
  await backend.receive(update(1, 999999));
  const reviewed = await request(backend, 'POST', '/api/command', { name: 'resolveReceipt', args: ['tg-1'] });
  assert.equal(reviewed.body.data.receipts[0].status, 'resolved');
  assert.equal(reviewed.body.data.payments.length, 15);
});

test('seeded or unconfirmed Telegram IDs cannot send real invoice messages', async t => {
  const backend = fixture(t);
  backend.db.prepare('DELETE FROM state WHERE id = ?').run('telegram-link:cust-06');
  actions.approveFollowUp('fu-001', 'user-seller', 'Siti Aishah', 'seller');
  assert.equal((await backend.sendApproved('fu-001', 'Siti Aishah')).success, false);
  assert.equal(backend.snapshot().followUpActions[0].send_state, 'not_sent');
});

test('restart exposes interrupted receipts and uncertain deliveries for review', t => {
  const backend = fixture(t);
  backend.db.prepare('INSERT INTO receipts VALUES (?, ?)').run('tg-99', JSON.stringify({ id: 'tg-99', business_id: 'biz-001', invoice_id: 'inv-1006', customer_id: 'cust-06', chat_id: '123456', message_id: 99, file_id: 'file', file_unique_id: 'unique', status: 'processing', created_at: '2026-10-20' }));
  store.updateFollowUp('fu-001', { send_state: 'sending' });
  const directory = path.dirname(backend.db.prepare('PRAGMA database_list').get().file);
  const reopened = createBackend({ directory, api: {} });
  try {
    assert.equal(reopened.snapshot().receipts[0].status, 'attention');
    assert.equal(reopened.snapshot().followUpActions[0].send_state, 'failed');
  } finally { reopened.db.close(); }
});
