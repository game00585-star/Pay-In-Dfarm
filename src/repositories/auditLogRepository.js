import { BaseRepository } from './baseRepository.js';

export class AuditLogRepository extends BaseRepository {
  constructor({ database }) {
    super({ database, collectionName: 'auditLogs' });
  }

  listByRecordId(recordId) {
    return this.list((log) => log.recordId === recordId);
  }
}

