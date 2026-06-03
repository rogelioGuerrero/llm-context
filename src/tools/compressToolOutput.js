import { HeuristicCompressor } from '../compressors/heuristicCompressor.js';
import { createCompressionReport } from '../reports/createCompressionReport.js';

export async function compressToolOutput(input, options = {}) {
  const output = typeof input === 'string' ? input : input.output;
  const type = typeof input === 'string' ? options.type ?? 'text' : input.type ?? options.type ?? 'text';
  const maxChars = options.maxChars ?? 1600;

  const compressed = type === 'json'
    ? compressJsonLike(output, maxChars)
    : compressLogsAndText(output, maxChars);

  return {
    output: compressed,
    report: createCompressionReport(output, compressed),
    metadata: {
      strategy: 'tool-output-heuristic',
      type,
      maxChars
    }
  };
}

function compressLogsAndText(output, maxChars) {
  const lines = String(output ?? '').split(/\r?\n/g);
  const signalLines = [];
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const fingerprint = trimmed.toLowerCase().replace(/\d+/g, '#');
    const signal = /\b(error|fatal|warn|failed|timeout|exception|trace|denied|invalid|missing|http\s?\d{3}|\d{3})\b/i.test(trimmed);

    if (!signal && signalLines.length > 20) continue;
    if (seen.has(fingerprint)) continue;

    seen.add(fingerprint);
    signalLines.push(trimmed);

    if (signalLines.join('\n').length >= maxChars) break;
  }

  const result = signalLines.join('\n').slice(0, maxChars).trim();

  if (result) return result;

  const compressor = new HeuristicCompressor({ maxChars });
  return String(output ?? '').slice(0, maxChars).trim();
}

function compressJsonLike(output, maxChars) {
  try {
    const parsed = typeof output === 'string' ? JSON.parse(output) : output;
    const compact = JSON.stringify(parsed);
    return compact.length > maxChars ? `${compact.slice(0, maxChars).trim()}...` : compact;
  } catch {
    return compressLogsAndText(output, maxChars);
  }
}
