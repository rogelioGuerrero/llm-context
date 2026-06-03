export function estimateTokens(input, options = {}) {
  const text = normalizeInput(input);
  const charsPerToken = options.charsPerToken ?? 4;

  if (charsPerToken <= 0) {
    throw new Error('charsPerToken must be greater than zero');
  }

  return Math.ceil(text.length / charsPerToken);
}

function normalizeInput(input) {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  return JSON.stringify(input);
}
