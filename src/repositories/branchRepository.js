import { BaseRepository } from './baseRepository.js';

export class BranchRepository extends BaseRepository {
  constructor({ database }) {
    super({ database, collectionName: 'branches' });
  }

  listActive() {
    return this.list((branch) => branch.active);
  }
}

