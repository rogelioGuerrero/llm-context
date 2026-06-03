import { estimateTokens } from '../tokenizers/estimateTokens.js';

export function createTokenBudget(options = {}) {
  const maxTokens = options.maxTokens ?? 8000;
  const reservedOutputTokens = options.reservedOutputTokens ?? 1000;
  const safetyMarginPercent = options.safetyMarginPercent ?? 10;

  if (maxTokens <= 0) throw new Error('maxTokens must be greater than zero');
  if (reservedOutputTokens < 0) throw new Error('reservedOutputTokens cannot be negative');
  if (safetyMarginPercent < 0 || safetyMarginPercent >= 100) {
    throw new Error('safetyMarginPercent must be between 0 and 99');
  }

  const usableTokens = Math.floor((maxTokens - reservedOutputTokens) * (1 - safetyMarginPercent / 100));

  return {
    maxTokens,
    reservedOutputTokens,
    safetyMarginPercent,
    usableTokens: Math.max(0, usableTokens)
  };
}

export function fitsTokenBudget(input, budget, options = {}) {
  const tokens = estimateTokens(input, options);

  return {
    fits: tokens <= budget.usableTokens,
    tokens,
    budget: budget.usableTokens,
    overflowTokens: Math.max(0, tokens - budget.usableTokens)
  };
}
