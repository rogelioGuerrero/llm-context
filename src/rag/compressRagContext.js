import { createCompressionReport } from '../reports/createCompressionReport.js';
import { rankChunks } from './rankChunks.js';

export async function compressRagContext(input, options = {}) {
  const query = input.query ?? '';
  const chunks = input.chunks ?? [];
  const compressor = options.compressor;
  const limit = options.limit ?? chunks.length;

  if (!compressor || typeof compressor.compressChunks !== 'function') {
    throw new Error('compressRagContext requires a compressor with compressChunks(chunks, options)');
  }

  const rankedChunks = rankChunks(query, chunks, { limit });
  const compressed = await compressor.compressChunks(rankedChunks, options.compression ?? {});

  return {
    query,
    chunks: compressed.chunks,
    report: createCompressionReport(joinChunkContent(rankedChunks), joinChunkContent(compressed.chunks)),
    metadata: {
      rankedCount: rankedChunks.length,
      originalCount: chunks.length,
      compressor: compressed.metadata?.strategy ?? 'unknown'
    }
  };
}

function joinChunkContent(chunks) {
  return chunks.map((chunk) => chunk.content ?? '').join('\n\n');
}
