import { compressToolOutput } from '../../src/index.js';

const output = `INFO test suite started
INFO loading config
WARN retrying database connection timeout attempt=1
WARN retrying database connection timeout attempt=2
ERROR database connection failed code=ECONNREFUSED host=localhost port=5432
ERROR database connection failed code=ECONNREFUSED host=localhost port=5432
INFO cleanup complete`;

const result = await compressToolOutput({ output, type: 'log' }, { maxChars: 400 });

console.log(JSON.stringify(result, null, 2));
