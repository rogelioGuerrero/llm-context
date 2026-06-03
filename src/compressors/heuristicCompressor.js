import { createCompressionReport } from '../reports/createCompressionReport.js';

const DEFAULT_OPTIONS = {
  maxChars: 1200,
  maxSentences: 8,
  preserveSignals: true,
  dedupe: true
};

export class HeuristicCompressor {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async compressText(text, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    const input = normalizeWhitespace(text);
    const compressed = compressTextHeuristically(input, mergedOptions);

    return {
      text: compressed,
      report: createCompressionReport(input, compressed),
      metadata: {
        strategy: 'heuristic',
        options: mergedOptions
      }
    };
  }

  async compressChunks(chunks, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    const compressedChunks = [];

    for (const chunk of chunks) {
      const result = await this.compressText(chunk.content ?? '', mergedOptions);
      compressedChunks.push({
        ...chunk,
        originalContent: chunk.content,
        content: result.text,
        compression: result.report
      });
    }

    return {
      chunks: compressedChunks,
      report: createCompressionReport(joinChunkContent(chunks), joinChunkContent(compressedChunks)),
      metadata: {
        strategy: 'heuristic',
        options: mergedOptions
      }
    };
  }
}

function compressTextHeuristically(text, options) {
  if (text.length <= options.maxChars) return text;

  const sentences = splitSentences(text);
  const selected = [];
  const seen = new Set();

  for (const sentence of sentences) {
    const key = normalizeFingerprint(sentence);
    const isSignal = hasHighValueSignal(sentence);
    const hasRoom = selected.length < options.maxSentences;

    if (options.dedupe && seen.has(key)) continue;
    if (!isSignal && !hasRoom) continue;

    selected.push(sentence);
    seen.add(key);

    const current = selected.join(' ');
    if (current.length >= options.maxChars) break;
  }

  const output = selected.join(' ').slice(0, options.maxChars).trim();
  return output.length < text.length ? `${output}...` : output;
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/g).map((item) => item.trim()).filter(Boolean);
}

function hasHighValueSignal(text) {
  return /\b(error|fatal|warn|failed|failure|timeout|exception|stack|trace|required|missing|invalid|denied|blocked|pending|critical|severe|sql|http\s?\d{3}|\d{3})\b/i.test(text);
}

function normalizeFingerprint(text) {
  return text.toLowerCase().replace(/\d+/g, '#').replace(/[^a-z#]+/g, ' ').trim();
}

function normalizeWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function joinChunkContent(chunks) {
  return chunks.map((chunk) => chunk.content ?? '').join('\n\n');
}
