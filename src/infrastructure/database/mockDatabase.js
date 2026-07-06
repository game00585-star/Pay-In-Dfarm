import { seedCollections } from './seedData.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class MockDatabase {
  constructor({ storageClient, initialData = seedCollections } = {}) {
    this.storageClient = storageClient;
    this.initialData = initialData;
  }

  collection(name) {
    return this.storageClient.read(name, clone(this.initialData[name] || []));
  }

  persist(name, rows) {
    this.storageClient.write(name, rows);
    return rows;
  }

  async list(name, predicate = () => true) {
    return this.collection(name).filter(predicate);
  }

  async getById(name, id) {
    return this.collection(name).find((item) => item.id === id) || null;
  }

  async upsert(name, item) {
    const rows = this.collection(name);
    const exists = rows.some((row) => row.id === item.id);
    const nextRows = exists ? rows.map((row) => (row.id === item.id ? item : row)) : [item, ...rows];
    this.persist(name, nextRows);
    return item;
  }

  async append(name, item) {
    const nextRows = [item, ...this.collection(name)];
    this.persist(name, nextRows);
    return item;
  }
}

