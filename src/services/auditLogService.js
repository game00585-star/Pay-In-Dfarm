import { createAuditLog } from '../domain/models/auditLog.js';

export class AuditLogService {
  constructor({ auditLogRepository }) {
    this.auditLogRepository = auditLogRepository;
  }

  async record({ action, recordId, actor, actorRole, before = null, after = null }) {
    const log = createAuditLog({ action, recordId, actor, actorRole, before, after });
    return this.auditLogRepository.append(log);
  }
}

