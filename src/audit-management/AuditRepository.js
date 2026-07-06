const STORE_KEY = 'dfarm_internal_audit_management';

const DEFAULT_STORE = {
  plans: [],
  schedules: [],
  cases: [],
  findings: [],
  correctiveActions: [],
  evidence: [],
  reports: [],
  history: []
};

function readStore() {
  try {
    return { ...DEFAULT_STORE, ...(JSON.parse(localStorage.getItem(STORE_KEY)) || {}) };
  } catch {
    return DEFAULT_STORE;
  }
}

function writeStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function upsert(items, idField, item) {
  return items.some((entry) => entry[idField] === item[idField])
    ? items.map((entry) => (entry[idField] === item[idField] ? item : entry))
    : [item, ...items];
}

export class AuditRepository {
  list(collectionName) {
    return readStore()[collectionName] || [];
  }

  save(collectionName, idField, item) {
    const store = readStore();
    store[collectionName] = upsert(store[collectionName] || [], idField, item);
    writeStore(store);
    return item;
  }

  appendHistory(entry) {
    const store = readStore();
    store.history = [entry, ...(store.history || [])].slice(0, 100000);
    writeStore(store);
    return entry;
  }
}

export const auditRepository = new AuditRepository();
