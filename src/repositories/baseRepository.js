export class BaseRepository {
  constructor({ database, collectionName }) {
    this.database = database;
    this.collectionName = collectionName;
  }

  list(predicate) {
    return this.database.list(this.collectionName, predicate);
  }

  getById(id) {
    return this.database.getById(this.collectionName, id);
  }

  upsert(item) {
    return this.database.upsert(this.collectionName, item);
  }

  append(item) {
    return this.database.append(this.collectionName, item);
  }
}

