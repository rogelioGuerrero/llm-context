import { createCompressionReport } from '../reports/createCompressionReport.js';
import { extractSignals } from '../signals/extractSignals.js';
import { createReference } from '../stores/memoryOriginalStore.js';

const DEFAULT_OPTIONS = {
  maxArrayItems: 3,
  maxStringLength: 240,
  maxDepth: 8,
  includeSchema: true,
  includeStats: true,
  preserveKeys: ['id', 'uuid', 'status', 'state', 'type', 'name', 'title', 'error', 'errors', 'message', 'code', 'reason', 'path', 'file', 'line', 'timestamp', 'createdAt', 'updatedAt'],
  dropKeys: [],
  reversible: false,
  store: undefined
};

export class JsonCompressor {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async compressJson(input, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    const parsed = parseInput(input);
    const before = JSON.stringify(parsed);
    const refId = mergedOptions.reversible && mergedOptions.store
      ? await mergedOptions.store.put(parsed, { strategy: 'json-structural' })
      : undefined;
    const compressed = compressValue(parsed, mergedOptions, 0, '$');

    if (refId) {
      compressed.__original = createReference(refId, { reversible: true });
    }

    const after = JSON.stringify(compressed);

    return {
      json: compressed,
      text: after,
      report: createCompressionReport(before, after),
      metadata: {
        strategy: 'json-structural',
        reversible: Boolean(refId),
        originalRef: refId
      }
    };
  }

  async compressText(text, options = {}) {
    const result = await this.compressJson(text, options);
    return {
      text: result.text,
      report: result.report,
      metadata: result.metadata
    };
  }
}

function compressValue(value, options, depth, path) {
  if (depth > options.maxDepth) return summarizeValue(value, path);
  if (Array.isArray(value)) return compressArray(value, options, depth, path);
  if (value && typeof value === 'object') return compressObject(value, options, depth, path);
  if (typeof value === 'string') return compressString(value, options);
  return value;
}

function compressArray(array, options, depth, path) {
  if (array.length <= options.maxArrayItems * 2) {
    return array.map((item, index) => compressValue(item, options, depth + 1, `${path}[${index}]`));
  }

  const first = array.slice(0, options.maxArrayItems);
  const last = array.slice(-options.maxArrayItems);
  const signalItems = array.filter((item) => extractSignals(item, { maxSignals: 1 }).length > 0).slice(0, options.maxArrayItems);
  const summary = {
    __compressed: true,
    type: 'array',
    length: array.length,
    first: first.map((item, index) => compressValue(item, options, depth + 1, `${path}[${index}]`)),
    last: last.map((item, index) => compressValue(item, options, depth + 1, `${path}[-${last.length - index}]`))
  };

  if (signalItems.length > 0) {
    summary.signals = signalItems.map((item, index) => compressValue(item, options, depth + 1, `${path}.signals[${index}]`));
  }

  if (options.includeSchema) summary.schema = inferArraySchema(array);
  if (options.includeStats) summary.stats = inferArrayStats(array);

  return summary;
}

function compressObject(object, options, depth, path) {
  const output = {};
  const preserve = new Set(options.preserveKeys);
  const drop = new Set(options.dropKeys);

  for (const [key, value] of Object.entries(object)) {
    if (drop.has(key)) continue;

    const shouldPreserve = preserve.has(key) || extractSignals(value, { maxSignals: 1 }).length > 0 || depth < options.maxDepth;
    if (!shouldPreserve) continue;

    output[key] = compressValue(value, options, depth + 1, `${path}.${key}`);
  }

  return output;
}

function compressString(value, options) {
  if (value.length <= options.maxStringLength) return value;
  const signals = extractSignals(value, { maxSignals: 5 }).map((signal) => signal.text);

  return {
    __compressed: true,
    type: 'string',
    length: value.length,
    preview: `${value.slice(0, options.maxStringLength).trim()}...`,
    signals
  };
}

function summarizeValue(value, path) {
  if (Array.isArray(value)) return { __compressed: true, type: 'array', path, length: value.length };
  if (value && typeof value === 'object') return { __compressed: true, type: 'object', path, keys: Object.keys(value) };
  if (typeof value === 'string') return { __compressed: true, type: 'string', path, length: value.length };
  return value;
}

function inferArraySchema(array) {
  const keys = new Set();
  for (const item of array) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    for (const key of Object.keys(item)) keys.add(key);
  }
  return [...keys];
}

function inferArrayStats(array) {
  const stats = {};
  const candidates = ['status', 'state', 'type', 'level', 'severity', 'code'];

  for (const key of candidates) {
    const counts = {};
    for (const item of array) {
      if (!item || typeof item !== 'object' || !(key in item)) continue;
      const value = String(item[key]);
      counts[value] = (counts[value] ?? 0) + 1;
    }
    if (Object.keys(counts).length > 0) stats[key] = counts;
  }

  return stats;
}

function parseInput(input) {
  if (typeof input === 'string') return JSON.parse(input);
  return input;
}
