import { JsonCompressor, MemoryOriginalStore } from '../../src/index.js';

const store = new MemoryOriginalStore();
const compressor = new JsonCompressor({
  maxArrayItems: 2,
  maxStringLength: 120,
  reversible: true,
  store
});

const records = Array.from({ length: 50 }, (_, index) => ({
  id: `invoice-${index + 1}`,
  status: index === 37 ? 'error' : 'ok',
  code: index === 37 ? 504 : 200,
  message: index === 37
    ? 'ERROR invoice emission failed provider_timeout code=504 order=ORD-7788'
    : 'Invoice emitted successfully',
  payload: 'large repeated payload '.repeat(20)
}));

const result = await compressor.compressJson({ records });

console.log(JSON.stringify({
  compressed: result.json,
  report: result.report,
  metadata: result.metadata,
  originalStillAvailable: store.has(result.metadata.originalRef)
}, null, 2));
