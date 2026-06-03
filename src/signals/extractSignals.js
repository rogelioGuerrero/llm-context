const DEFAULT_SIGNAL_PATTERNS = [
  /\b(error|fatal|failed|failure|exception|timeout|denied|invalid|missing|required|blocked|critical|severe)\b/i,
  /\b(warn|warning|retry|retries|pending)\b/i,
  /\b(http\s?4\d{2}|http\s?5\d{2}|\b4\d{2}\b|\b5\d{2}\b)\b/i,
  /\b(sql|database|connection|econnrefused|enotfound|etimedout)\b/i,
  /\b[A-Z]{2,}[-_]?\d{2,}\b/,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /(?:[A-Za-z]:\\|\/)[^\s]+/,
  /\b\w+\.(js|ts|jsx|tsx|py|go|rs|java|json|md|sql):\d+\b/i
];

export function extractSignals(input, options = {}) {
  const text = normalizeInput(input);
  const maxSignals = options.maxSignals ?? 100;
  const patterns = options.patterns ?? DEFAULT_SIGNAL_PATTERNS;
  const lines = text.split(/\r?\n/g);
  const signals = [];
  const seen = new Set();

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matched = patterns.find((pattern) => pattern.test(trimmed));
    if (!matched) continue;

    const fingerprint = fingerprintSignal(trimmed);
    if (seen.has(fingerprint)) continue;

    seen.add(fingerprint);
    signals.push({
      line: index + 1,
      text: trimmed,
      type: classifySignal(trimmed)
    });

    if (signals.length >= maxSignals) break;
  }

  return signals;
}

export function hasSignal(input, options = {}) {
  return extractSignals(input, { ...options, maxSignals: 1 }).length > 0;
}

function classifySignal(text) {
  if (/\b(error|fatal|failed|failure|exception|critical|severe)\b/i.test(text)) return 'error';
  if (/\b(warn|warning|retry|pending)\b/i.test(text)) return 'warning';
  if (/\b(http\s?4\d{2}|http\s?5\d{2}|\b4\d{2}\b|\b5\d{2}\b)\b/i.test(text)) return 'http';
  if (/\b(sql|database|connection|econnrefused|enotfound|etimedout)\b/i.test(text)) return 'infra';
  if (/(?:[A-Za-z]:\\|\/)[^\s]+/.test(text)) return 'path';
  return 'signal';
}

function fingerprintSignal(text) {
  return text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

function normalizeInput(input) {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  return JSON.stringify(input, null, 2);
}
