import { createCompressionReport } from '../reports/createCompressionReport.js';
import { extractSignals } from '../signals/extractSignals.js';

const DEFAULT_OPTIONS = {
  keepLastMessages: 6,
  maxOldMessageChars: 280,
  preserveSystem: true,
  preserveSignals: true
};

export class MessageCompressor {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async compressMessages(messages, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    const input = normalizeMessages(messages);
    const compressed = compressMessages(input, mergedOptions);

    return {
      messages: compressed,
      report: createCompressionReport(input, compressed),
      metadata: {
        strategy: 'message-window-extractive',
        originalCount: input.length,
        compressedCount: compressed.length,
        options: mergedOptions
      }
    };
  }

  async compressText(text, options = {}) {
    const messages = [{ role: 'user', content: text }];
    const result = await this.compressMessages(messages, options);
    return {
      text: result.messages.map((message) => message.content).join('\n\n'),
      report: result.report,
      metadata: result.metadata
    };
  }
}

function compressMessages(messages, options) {
  const lastStart = Math.max(0, messages.length - options.keepLastMessages);
  const output = [];

  for (const [index, message] of messages.entries()) {
    const isRecent = index >= lastStart;
    const isSystem = message.role === 'system' || message.role === 'developer';

    if ((options.preserveSystem && isSystem) || isRecent) {
      output.push(message);
      continue;
    }

    const signals = options.preserveSignals ? extractSignals(message.content ?? '', { maxSignals: 5 }) : [];
    const summary = summarizeOldMessage(message, signals, options.maxOldMessageChars);

    if (summary) output.push(summary);
  }

  return output;
}

function summarizeOldMessage(message, signals, maxChars) {
  const content = String(message.content ?? '').replace(/\s+/g, ' ').trim();
  if (!content && signals.length === 0) return undefined;

  const signalText = signals.map((signal) => signal.text).join('\n');
  const preview = content.slice(0, maxChars).trim();
  const sections = [
    `[compressed ${message.role ?? 'message'}]`,
    preview ? `preview: ${preview}${content.length > maxChars ? '...' : ''}` : '',
    signalText ? `signals:\n${signalText}` : ''
  ].filter(Boolean);

  return {
    role: message.role ?? 'user',
    content: sections.join('\n')
  };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('messages must be an array');
  return messages.map((message) => ({
    role: message.role ?? 'user',
    content: String(message.content ?? '')
  }));
}
