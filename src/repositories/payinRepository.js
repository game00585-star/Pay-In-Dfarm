import { BaseRepository } from './baseRepository.js';

export class PayinRepository extends BaseRepository {
  constructor({ database }) {
    super({ database, collectionName: 'payins' });
  }

  listByBranch(branch) {
    return this.list((record) => record.branch === branch);
  }

  listByStatus(status) {
    return this.list((record) => record.status === status);
  }
}

