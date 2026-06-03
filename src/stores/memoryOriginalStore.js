import { createHash } from 'node:crypto';

export class MemoryOriginalStore {
  constructor() {
    this.items = new Map();
  }

  put(value, metadata = {}) {
    const serialized = serialize(value);
    const id = createId(serialized);

    this.items.set(id, {
      id,
      value,
      metadata,
      createdAt: new Date().toISOString()
    });

    return id;
  }

  get(id) {
    return this.items.get(id)?.value;
  }

  has(id) {
    return this.items.has(id);
  }

  delete(id) {
    return this.items.delete(id);
  }

  size() {
    return this.items.size;
  }
}

export function createReference(id, metadata = {}) {
  return {
    __llmContextRef: id,
    ...metadata
  };
}

function createId(serialized) {
  return `ctx_${createHash('sha256').update(serialized).digest('hex').slice(0, 16)}`;
}

function serialize(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
