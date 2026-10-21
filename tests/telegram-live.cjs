// Opt-in smoke test: real Docling + Gemma cloud, synthetic files, no Telegram messages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createBackend } = require('../server/app.cjs');
const integrations = require('../server/integrations.cjs');
const store = require('../.server-build/lib/store.js');
const actions = require('../.server-build/lib/actions.js');

(async () => {
  for (const extension of ['png', 'pdf']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nudgewise-live-'));
    process.env.RECEIPT_BENEFICIARY = 'Test Seller';
    const backend = createBackend({ directory, api: {
      ...integrations,
      telegram: async () => ({ message_id: 900 }),
      download: async () => fs.readFileSync(path.join(__dirname, 'fixtures', `transfer-receipt.${extension}`)),
    } });
    try {
      store.update(data => { data.customers.find(c => c.id === 'cust-06').telegram_chat_id = '123456'; });
      backend.db.prepare('INSERT INTO state VALUES (?, ?)').run('telegram-link:cust-06', '123456');
      assert.ok(actions.approveFollowUp('fu-001', 'user-seller', 'Siti Aishah', 'seller').success);
      assert.ok((await backend.sendApproved('fu-001', 'Siti Aishah')).success);
      await backend.receive({ update_id: 1, message: { message_id: 901, chat: { id: 123456, type: 'private' }, reply_to_message: { message_id: 900 }, document: { file_id: 'synthetic', file_unique_id: 'synthetic' } } });
      const data = backend.snapshot();
      assert.equal(data.receipts[0].status, 'recorded', data.receipts[0].reason);
      assert.equal(data.invoices.find(i => i.id === 'inv-1006').status, 'paid');
      assert.equal(data.payments.filter(p => p.reference === 'TEST-TRANSFER-1').length, 1);
      console.log(`${extension.toUpperCase()}: Docling → gemma4:31b-cloud → exact match → paid: PASS`);
    } finally {
      backend.stop(); backend.db.close();
      assert.equal(path.dirname(directory), os.tmpdir());
      assert.ok(path.basename(directory).startsWith('nudgewise-live-'));
      fs.rmSync(directory, { recursive: true });
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
