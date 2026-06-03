import { HeuristicCompressor, compressRagContext, createTokenBudget, fitsTokenBudget } from '../../src/index.js';

const query = 'Por qué falló la emisión de factura y qué datos debo revisar?';
const chunks = [
  {
    id: 'billing-1',
    title: 'Facturación',
    content: 'Para emitir una factura se necesita nombre fiscal, identificación tributaria, correo electrónico, dirección y detalle de productos. Si falta algún dato obligatorio, la factura queda pendiente.'
  },
  {
    id: 'logs-1',
    title: 'Logs de proveedor fiscal',
    content: 'INFO request started. WARN retrying provider timeout attempt=1. WARN retrying provider timeout attempt=2. ERROR invoice emission failed provider_timeout code=504 order=ORD-7788. INFO request finished status=500 duration_ms=8123.'
  },
  {
    id: 'support-1',
    title: 'Soporte',
    content: 'Los tickets de severidad alta incluyen caída total, errores de pago, pérdida de datos, bloqueo de acceso y fallos persistentes que afectan procesos críticos.'
  }
];

const compressor = new HeuristicCompressor({ maxChars: 180 });
const result = await compressRagContext({ query, chunks }, { compressor, limit: 3 });
const budget = createTokenBudget({ maxTokens: 1000, reservedOutputTokens: 200 });
const budgetCheck = fitsTokenBudget(result.chunks, budget);

console.log(JSON.stringify({ result, budgetCheck }, null, 2));
