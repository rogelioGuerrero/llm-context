import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HeuristicCompressor,
  NoopCompressor,
  compressRagContext,
  compressToolOutput,
  createTokenBudget,
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
