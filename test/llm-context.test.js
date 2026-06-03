import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BudgetedContextBuilder,
  HeuristicCompressor,
  JsonCompressor,
  LogCompressor,
  MemoryOriginalStore,
  MessageCompressor,
  NoopCompressor,
  compressRagContext,
  compressToolOutput,
  createTokenBudget,
  extractSignals,
  estimateTokens,
  fitsTokenBudget,
  rankChunks
} from '../src/index.js';

test('estimateTokens estimates from strings and objects', () => {
  assert.equal(estimateTokens('12345678'), 2);
  assert.equal(estimateTokens({ hello: 'world' }) > 0, true);
});

test('token budget detects overflow', () => {
  const budget = createTokenBudget({ maxTokens: 100, reservedOutputTokens: 20, safetyMarginPercent: 0 });
  const result = fitsTokenBudget('x'.repeat(400), budget);
  assert.equal(result.fits, false);
  assert.equal(result.overflowTokens > 0, true);
});

test('noop compressor preserves text', async () => {
  const compressor = new NoopCompressor();
  const result = await compressor.compressText('hello');
  assert.equal(result.text, 'hello');
  assert.equal(result.report.tokenReductionPercent, 0);
});

test('heuristic compressor reduces long repetitive text', async () => {
  const compressor = new HeuristicCompressor({ maxChars: 80, maxSentences: 2 });
  const input = 'INFO startup complete. INFO startup complete. ERROR payment failed code=500. WARN retrying request. '.repeat(10);
  const result = await compressor.compressText(input);
  assert.equal(result.text.length <= input.length, true);
  assert.equal(result.report.beforeTokens >= result.report.afterTokens, true);
});

test('rankChunks prioritizes query matches', () => {
  const chunks = [
    { id: 'a', content: 'authentication login jwt' },
    { id: 'b', content: 'billing invoice tax' }
  ];
  const ranked = rankChunks('invoice tax', chunks);
  assert.equal(ranked[0].id, 'b');
});

test('compressRagContext compresses ranked chunks', async () => {
  const compressor = new HeuristicCompressor({ maxChars: 80 });
  const result = await compressRagContext({
    query: 'invoice error',
    chunks: [
      { id: 'a', content: 'invoice error timeout failed. '.repeat(20) },
      { id: 'b', content: 'unrelated content' }
    ]
  }, { compressor, limit: 1 });

  assert.equal(result.chunks.length, 1);
  assert.equal(result.metadata.compressor, 'heuristic');
});

test('compressToolOutput keeps error signal and dedupes repeated lines', async () => {
  const output = 'INFO ok\nERROR failed code=500\nERROR failed code=500\nWARN retrying';
  const result = await compressToolOutput({ output, type: 'log' });
  assert.equal(result.output.includes('ERROR failed'), true);
  assert.equal(result.output.match(/ERROR failed/g).length, 1);
});

test('extractSignals finds high-value evidence', () => {
  const signals = extractSignals('INFO ok\nERROR invoice failed code=504\nWARN retrying');
  assert.equal(signals.length >= 2, true);
  assert.equal(signals[0].type, 'error');
});

test('JsonCompressor compresses large arrays and preserves signal items', async () => {
  const store = new MemoryOriginalStore();
  const compressor = new JsonCompressor({ maxArrayItems: 1, reversible: true, store });
  const input = {
    records: Array.from({ length: 20 }, (_, index) => ({
      id: index,
      status: index === 10 ? 'error' : 'ok',
      message: index === 10 ? 'ERROR timeout code=504' : 'ok',
      payload: 'x'.repeat(200)
    }))
  };

  const result = await compressor.compressJson(input);
  assert.equal(result.json.records.__compressed, true);
  assert.equal(result.json.records.signals.length > 0, true);
  assert.equal(store.has(result.metadata.originalRef), true);
});

test('LogCompressor summarizes long logs while keeping errors', async () => {
  const compressor = new LogCompressor({ maxLines: 10 });
  const log = Array.from({ length: 80 }, (_, index) => (
    index === 40 ? 'ERROR database connection failed code=ECONNREFUSED' : `INFO line ${index}`
  )).join('\n');

  const result = await compressor.compressText(log);
  assert.equal(result.text.includes('ERROR database connection failed'), true);
  assert.equal(result.report.afterTokens < result.report.beforeTokens, true);
});

test('MessageCompressor preserves system and recent messages', async () => {
  const compressor = new MessageCompressor({ keepLastMessages: 2 });
  const messages = [
    { role: 'system', content: 'Be precise' },
    { role: 'user', content: 'Old context with ERROR timeout' },
    { role: 'assistant', content: 'Old answer' },
    { role: 'user', content: 'Recent question' },
    { role: 'assistant', content: 'Recent answer' }
  ];

  const result = await compressor.compressMessages(messages);
  assert.equal(result.messages[0].content, 'Be precise');
  assert.equal(result.messages.at(-1).content, 'Recent answer');
  assert.equal(result.messages.some((message) => message.content.includes('ERROR timeout')), true);
});

test('BudgetedContextBuilder includes required sections and omits low priority overflow', async () => {
  const budget = createTokenBudget({ maxTokens: 80, reservedOutputTokens: 20, safetyMarginPercent: 0 });
  const builder = new BudgetedContextBuilder({ budget });

  const result = await builder
    .addSection('system', 'required instructions', { required: true, priority: 100 })
    .addSection('large', 'x'.repeat(1000), { priority: 1 })
    .build();

  assert.equal(result.sections.some((section) => section.name === 'system'), true);
  assert.equal(result.report.omittedSections.some((section) => section.name === 'large'), true);
});
