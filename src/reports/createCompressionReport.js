import { estimateTokens } from '../tokenizers/estimateTokens.js';

export function createCompressionReport(before, after, options = {}) {
  const beforeText = normalizeInput(before);
  const afterText = normalizeInput(after);
  const beforeTokens = estimateTokens(beforeText, options);
  const afterTokens = estimateTokens(afterText, options);

  return {
    beforeChars: beforeText.length,
    afterChars: afterText.length,
    beforeTokens,
    afterTokens,
    charReductionPercent: percentageReduction(beforeText.length, afterText.length),
    tokenReductionPercent: percentageReduction(beforeTokens, afterTokens)
  };
}

function percentageReduction(before, after) {
  if (before === 0) return 0;
  return Number(((1 - after / before) * 100).toFixed(2));
}

function normalizeInput(input) {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  return JSON.stringify(input);
}
