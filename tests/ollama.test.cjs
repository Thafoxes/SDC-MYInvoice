const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chat, classifyReply } = require('../server/integrations.cjs');

function configure(t, key = 'test-ollama-key') {
  const previous = { OLLAMA_API_KEY: process.env.OLLAMA_API_KEY, OLLAMA_MODEL: process.env.OLLAMA_MODEL };
  process.env.OLLAMA_API_KEY = key;
  delete process.env.OLLAMA_MODEL;
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
}

test('cloud chat sends the API key only in the authorization header', async t => {
  configure(t);
  const messages = [{ role: 'user', content: 'Synthetic test question' }];
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://ollama.com/api/chat');
    assert.equal(options.headers.Authorization, 'Bearer test-ollama-key');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), { model: 'gemma4:31b', messages, stream: false });
    assert.ok(!options.body.includes('test-ollama-key'));
    return { ok: true, json: async () => ({ message: { content: 'OK' } }) };
  });
  assert.equal(await chat(messages), 'OK');
});

test('missing API key fails before any network request', async t => {
  configure(t, '');
  const fetch = t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected network request'); });
  await assert.rejects(chat([]), /OLLAMA_API_KEY/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('configured cloud model is preserved', async t => {
  configure(t); process.env.OLLAMA_MODEL = 'another-cloud-model';
  t.mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(JSON.parse(options.body).model, 'another-cloud-model');
    return { ok: true, json: async () => ({ message: { content: 'OK' } }) };
  });
  await chat([]);
});

for (const status of [401, 403, 429, 500]) test(`cloud HTTP ${status} gives a safe actionable error`, async t => {
  configure(t);
  t.mock.method(global, 'fetch', async () => ({ ok: false, status }));
  await assert.rejects(chat([]), error => {
    assert.ok(error.message.includes(status === 401 || status === 403 ? 'OLLAMA_API_KEY' : String(status)));
    assert.ok(!error.message.includes('test-ollama-key'));
    return true;
  });
});

test('network errors do not expose request credentials', async t => {
  configure(t);
  t.mock.method(global, 'fetch', async () => { throw new Error('test-ollama-key'); });
  await assert.rejects(chat([]), /^Error: Ollama API is unavailable or timed out$/);
});

test('malformed cloud responses cannot be used as answers', async t => {
  configure(t);
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }));
  await assert.rejects(chat([]), /Invalid Ollama API response/);
});

test('reply classification uses the same authenticated cloud chat', async t => {
  configure(t);
  const analysis = { flags: ['payment_promise'], date_phrase: 'tonight', promised_amount: null, payment_method: null };
  t.mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-ollama-key');
    return { ok: true, json: async () => ({ message: { content: JSON.stringify(analysis) } }) };
  });
  assert.deepEqual(await classifyReply('I will pay tonight'), analysis);
});
