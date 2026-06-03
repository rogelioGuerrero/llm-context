import { createCompressionReport } from '../reports/createCompressionReport.js';

export class NoopCompressor {
  async compressText(text) {
    return {
      text,
      report: createCompressionReport(text, text),
      metadata: {
        strategy: 'noop'
      }
    };
  }

  async compressChunks(chunks) {
    return {
      chunks,
      report: createCompressionReport(chunks, chunks),
      metadata: {
        strategy: 'noop'
      }
    };
  }
}
