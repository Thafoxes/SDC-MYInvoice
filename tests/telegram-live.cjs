// Opt-in smoke test: real Docling + Gemma cloud, synthetic files, no Telegram messages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createBackend } = require('../server/app.cjs');
const integrations = require('../server/integrations.cjs');
const store = require('../.server-build/lib/store.js');
const actions = require('../.server-build/lib/actions.js');
const { getAttention } = require('../.server-build/lib/attention.js');

(async () => {
  for (const extension of ['reply', 'png', 'pdf']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nudgewise-live-'));
    // The committed PDF and PNG use different recipient names.
    process.env.RECEIPT_BENEFICIARY = extension === 'pdf' ? 'Siti Aishah' : 'Test Seller';
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
      if (extension === 'reply') {
        await backend.receive({ update_id: 2, message: { message_id: 902, date: Date.parse('2026-10-22T09:00:00+08:00') / 1000, chat: { id: 123456, type: 'private' }, reply_to_message: { message_id: 900 }, text: 'I will pay by the end of the week.' } });
        const response = backend.snapshot().customerResponses.find(r => r.id === 'tg-reply-2');
        assert.equal(response.ai_state, 'complete', response.ai_suggested_action);
        assert.equal(response.ai_extracted_date, '2026-10-25');
        assert.ok(actions.reviewCustomerPromise(response.id, '2026-10-25', true, 'Siti Aishah').success);
        store.setDemoDate('2026-10-26');
        assert.ok(getAttention(backend.snapshot(), 'biz-001', '2026-10-26').some(i => i.invoiceId === 'inv-1006' && i.kind === 'missed_promise'));
        console.log('REPLY: Gemma → Sunday deadline → seller confirmation → missed-promise attention: PASS');
        continue;
      }
      await backend.receive({ update_id: 1, message: { message_id: 901, chat: { id: 123456, type: 'private' }, reply_to_message: { message_id: 900 }, document: { file_id: 'synthetic', file_unique_id: 'synthetic' } } });
      const data = backend.snapshot();
      assert.equal(data.receipts[0].status, 'recorded', data.receipts[0].reason);
      assert.equal(data.invoices.find(i => i.id === 'inv-1006').status, 'paid');
      assert.equal(data.payments.filter(p => p.reference === 'TEST-TRANSFER-1').length, 1);
      console.log(`${extension.toUpperCase()}: Docling → Ollama cloud API → exact match → paid: PASS`);
    } finally {
      backend.stop(); backend.db.close();
      assert.equal(path.dirname(directory), os.tmpdir());
      assert.ok(path.basename(directory).startsWith('nudgewise-live-'));
      fs.rmSync(directory, { recursive: true });
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
