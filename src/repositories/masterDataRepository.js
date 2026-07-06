const MASTER_COLLECTIONS = Object.freeze([
  'branches',
  'banks',
  'users',
  'roles',
  'paymentTypes',
  'documentTypes',
  'riskFlags',
  'statuses',
  'validationRules'
]);

export class MasterDataRepository {
  constructor({ database }) {
    this.database = database;
  }

  ensureCollection(name) {
    if (!MASTER_COLLECTIONS.includes(name)) {
      throw new Error(`Unknown master data collection: ${name}`);
    }
  }

  list(collectionName, predicate) {
    this.ensureCollection(collectionName);
    return this.database.list(collectionName, predicate);
  }

  getById(collectionName, id) {
    this.ensureCollection(collectionName);
    return this.database.getById(collectionName, id);
  }

  upsert(collectionName, item) {
    this.ensureCollection(collectionName);
    return this.database.upsert(collectionName, item);
  }

  listCollections() {
    return [...MASTER_COLLECTIONS];
  }
}

