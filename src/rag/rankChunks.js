export function rankChunks(query, chunks, options = {}) {
  const limit = options.limit ?? chunks.length;
  const queryTerms = tokenize(query);

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTerms, chunk)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function scoreChunk(queryTerms, chunk) {
  const haystack = `${chunk.title ?? ''} ${chunk.content ?? ''}`.toLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function tokenize(text) {
  const stopwords = new Set([
    'que',
    'por',
    'para',
    'con',
    'los',
    'las',
    'una',
    'uno',
    'del',
    'debo',
    'debe',
    'deben',
    'the',
    'and',
    'for',
    'with',
    'why',
    'what',
    'how'
  ]);

  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length > 2 && !stopwords.has(term));
}
