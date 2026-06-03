import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export class FileOriginalStore {
  constructor(options = {}) {
    this.directory = options.directory ?? '.llm-context-store';
  }

  async put(value, metadata = {}) {
    await mkdir(this.directory, { recursive: true });

    const serialized = serialize(value);
    const id = createId(serialized);
    const payload = {
      id,
      value,
      metadata,
      createdAt: new Date().toISOString()
    };

    await writeFile(this.pathFor(id), JSON.stringify(payload, null, 2), 'utf8');
    return id;
  }

  async get(id) {
    const raw = await readFile(this.pathFor(id), 'utf8');
    return JSON.parse(raw).value;
  }

  pathFor(id) {
    return join(this.directory, `${id}.json`);
  }
}

function createId(serialized) {
  return `ctx_${createHash('sha256').update(serialized).digest('hex').slice(0, 16)}`;
}

function serialize(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
