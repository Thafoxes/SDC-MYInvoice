/** Tone & language studio: templates and AI-output validation. Run: npm run test:ui */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function load(file, deps = {}) {
  const src = readFileSync(join(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => deps[name] ?? require(name), module, module.exports);
  return module.exports;
}
const format = load('src/lib/format.ts');
const tone = load('src/lib/reminderTemplates.ts', { './format': format });

const facts = { customerName: 'Chong Kah Mun', invoiceNumber: 'INV-1006', amount: 1800, dueDate: '2026-10-19', daysOverdue: 3, businessName: 'Kedai Maju Jaya' };

test('every tone and language template includes the exact invoice and amount and passes validation', () => {
  for (const t of ['friendly', 'neutral', 'firm']) for (const l of ['en', 'ms', 'zh']) {
    const text = tone.templateReminder(facts, t, l);
    assert.ok(text.includes('INV-1006'), `${t}/${l} invoice`);
    assert.equal(tone.rewriteProblem(text, facts), null, `${t}/${l}: ${text}`);
  }
});

test('firm tone never threatens or adds penalties', () => {
  for (const l of ['en', 'ms', 'zh']) {
    assert.doesNotMatch(tone.templateReminder(facts, 'firm', l), /legal|lawyer|penalt|interest|mahkamah|denda|法律|罚款|利息/i);
  }
});

test('AI rewrites with a wrong or extra amount, missing invoice or links are rejected', () => {
  assert.equal(tone.rewriteProblem('Hi, invoice INV-1006 for RM 1,800.00 is overdue.', facts), null);
  assert.equal(tone.rewriteProblem('Hi, invoice INV-1006 for RM1800 is overdue.', facts), null);
  assert.match(tone.rewriteProblem('Hi, invoice INV-1006 for RM 1,500.00 is overdue.', facts), /amount/);
  assert.match(tone.rewriteProblem('Invoice INV-1006 RM 1,800.00, pay now and get RM 50 off!', facts), /amount/);
  assert.match(tone.rewriteProblem('Invoice for RM 1,800.00 is overdue.', facts), /invoice number/);
  assert.match(tone.rewriteProblem('Invoice INV-1006 is overdue.', facts), /amount missing/);
  assert.match(tone.rewriteProblem('INV-1006 RM 1,800.00 pay at https://evil.example', facts), /link/);
});

test('not-yet-due invoices are described as upcoming, not overdue', () => {
  const upcoming = { ...facts, daysOverdue: 0, dueDate: '2026-10-25' };
  assert.doesNotMatch(tone.templateReminder(upcoming, 'neutral', 'en'), /overdue/);
  assert.match(tone.templateReminder(upcoming, 'neutral', 'en'), /is due on/);
});
