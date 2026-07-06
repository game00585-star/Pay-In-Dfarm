import { BaseRepository } from './baseRepository.js';

export class UserRepository extends BaseRepository {
  constructor({ database }) {
    super({ database, collectionName: 'users' });
  }

  async getByEmail(email) {
    const users = await this.list((user) => user.email === email);
    return users[0] || null;
  }
}

