# llm-context

Model-agnostic context preparation, compression, budgeting, and reporting utilities for LLM applications.

`llm-context` helps you decide what to keep, reduce, rank, or discard before sending context to a model. It is designed for RAG, agents, tool outputs, logs, local models, Groq, LM Studio, OpenAI-compatible APIs, and future local ONNX/Transformers.js flows.

## Status

Early reusable core. No external dependencies.

## Install from GitHub

```powershell
npm install github:rogelioGuerrero/llm-context
```

## Quick start

```js
import {
  HeuristicCompressor,
  compressRagContext,
  createTokenBudget,
  fitsTokenBudget
} from 'llm-context';

const compressor = new HeuristicCompressor({ maxChars: 1000 });

const result = await compressRagContext({
  query: 'Why did invoice emission fail?',
  chunks: [
    { id: 'log-1', content: 'ERROR invoice emission failed provider_timeout code=504' }
  ]
}, {
  compressor,
  limit: 5
});

const budget = createTokenBudget({ maxTokens: 8000, reservedOutputTokens: 1000 });
const budgetCheck = fitsTokenBudget(result.chunks, budget);

console.log(result.report, budgetCheck);
```

## What it provides

- Token estimation
- Token budget checks
- No-op compressor for baselines
- Heuristic local compressor
- Structural JSON compression
- Structural log compression
- Message/history compression
- Signal extraction
- Budgeted context building
- In-memory and file original stores
- RAG chunk ranking
- RAG context compression
- Tool output/log compression
- Compression reports

## API

### `estimateTokens(input, options?)`

Estimates tokens using a simple chars-per-token heuristic.

### `createTokenBudget(options?)`

Creates a budget object with reserved output tokens and safety margin.

### `fitsTokenBudget(input, budget, options?)`

Checks whether text/object input fits the usable token budget.

### `new NoopCompressor()`

Baseline compressor that preserves input.

### `new HeuristicCompressor(options?)`

Local dependency-free compressor for text and chunks.

### `new JsonCompressor(options?)`

Structural JSON compressor for large arrays, nested objects, repeated schemas, signal preservation, array statistics, and optional reversible references.

### `new LogCompressor(options?)`

Structural log compressor that preserves first lines, last lines, high-signal lines, stack traces, and repeated-pattern summaries.

### `new MessageCompressor(options?)`

Conversation/history compressor that preserves system/developer messages, recent turns, and high-signal evidence from older messages.

### `compressRagContext({ query, chunks }, options)`

Ranks and compresses RAG chunks using a compressor implementation.

### `compressToolOutput(input, options?)`

Compresses logs, terminal output, JSON-like strings, and noisy tool outputs.

### `createCompressionReport(before, after, options?)`

Returns before/after chars, estimated tokens, and reduction percentages.

### `extractSignals(input, options?)`

Finds high-value evidence such as errors, warnings, timeouts, HTTP failures, IDs, file paths, stack traces, and infrastructure failures.

### `new BudgetedContextBuilder({ budget })`

Builds a prioritized context package that includes required sections first and omits lower-priority sections when the token budget is exceeded.

## Examples

```powershell
npm run example:rag
npm run example:json
npm run example:tool-output
```

## Test

```powershell
npm test
```

Or run the full local check:

```powershell
npm run check
```

## Design principles

- Model-agnostic
- Provider-agnostic
- Local-first
- Zero dependencies initially
- Measurable over magical
- Easy to disable with `NoopCompressor`
- Safe default behavior: preserve high-signal errors, warnings, and required fields

## Intended integrations

- Groq
- LM Studio
- OpenAI-compatible APIs
- Anthropic/OpenAI/Gemini adapters
- RAG apps
- Agentic coding tools
- Local embeddings/reranking with Transformers.js or ONNX

## Roadmap

- `HeadroomCompressor` adapter
- `OpenAICompatibleModelAdapter`
- `GroqModelAdapter`
- `LmStudioModelAdapter`
- `TransformersJsReranker`
- stronger persistent reversible compression references
- better tokenizer adapters
- benchmark fixtures for RAG/tool-output workloads

## License

MIT
