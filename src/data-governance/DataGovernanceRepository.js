const STORE_KEY = 'dfarm_data_governance_platform';

const DEFAULT_STORE = {
  issues: [],
  metadata: [],
  lineage: [],
  catalog: [],
  retentionPolicies: [],
  archives: [],
  validationRuns: []
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

export class DataGovernanceRepository {
  list(collectionName) {
    return readStore()[collectionName] || [];
  }

  save(collectionName, idField, item) {
    const store = readStore();
    store[collectionName] = upsert(store[collectionName] || [], idField, item);
    writeStore(store);
    return item;
  }

  replace(collectionName, items) {
    const store = readStore();
    store[collectionName] = items;
    writeStore(store);
    return items;
  }
}

export const dataGovernanceRepository = new DataGovernanceRepository();
