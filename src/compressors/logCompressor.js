import { createCompressionReport } from '../reports/createCompressionReport.js';
import { extractSignals } from '../signals/extractSignals.js';

const DEFAULT_OPTIONS = {
  maxLines: 120,
  preserveFirstLines: 5,
  preserveLastLines: 20,
  preserveStackTraceLines: 20,
  groupRepeated: true
};

export class LogCompressor {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async compressText(text, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    const input = String(text ?? '');
    const compressed = compressLog(input, mergedOptions);

    return {
      text: compressed,
      report: createCompressionReport(input, compressed),
      metadata: {
        strategy: 'log-structural',
        options: mergedOptions,
        signals: extractSignals(input).length
      }
    };
  }
}

function compressLog(input, options) {
  const lines = input.split(/\r?\n/g).map((line) => line.trimEnd()).filter(Boolean);
  if (lines.length <= options.maxLines) return dedupe(lines).join('\n').trim();

  const first = lines.slice(0, options.preserveFirstLines);
  const last = lines.slice(-options.preserveLastLines);
  const signalLines = extractSignals(input).map((signal) => signal.text);
  const stackLines = extractStackTraceLines(lines, options.preserveStackTraceLines);
  const repeated = options.groupRepeated ? groupRepeatedLines(lines) : [];
  const output = [
    '=== llm-context log summary ===',
    `total_lines: ${lines.length}`,
    `signals: ${signalLines.length}`,
    '',
    '--- first lines ---',
    ...first,
    '',
    '--- high-signal lines ---',
    ...signalLines,
    '',
    '--- stack trace evidence ---',
    ...stackLines,
    '',
    '--- repeated patterns ---',
    ...repeated,
    '',
    '--- last lines ---',
    ...last
  ];

  return dedupe(output).slice(0, options.maxLines).join('\n').trim();
}

function extractStackTraceLines(lines, limit) {
  const stack = [];
  for (const line of lines) {
    if (/\bat\s+.+:\d+:\d+\)?$/i.test(line) || /File "[^"]+", line \d+/i.test(line) || /\w+\.\w+Error:/.test(line)) {
      stack.push(line);
      if (stack.length >= limit) break;
    }
  }
  return stack;
}

function groupRepeatedLines(lines) {
  const counts = new Map();
  for (const line of lines) {
    if (extractSignals(line, { maxSignals: 1 }).length > 0) continue;
    const key = line.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
    counts.set(key, { sample: line, count: (counts.get(key)?.count ?? 0) + 1 });
  }

  return [...counts.values()]
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((item) => `${item.count}x ${item.sample}`);
}

function dedupe(lines) {
  const seen = new Set();
  const output = [];

  for (const line of lines) {
    const isHeader = /^===|^---|^total_lines:|^signals:$|^signals: \d+$/i.test(line);
    const key = line.toLowerCase().replace(/\d+/g, '#');
    if (line && !isHeader && seen.has(key)) continue;
    if (!isHeader) seen.add(key);
    output.push(line);
  }

  return output;
}
