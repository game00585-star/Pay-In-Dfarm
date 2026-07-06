import { documentRepository } from './DocumentRepository.js';
import { documentHistoryService, DOCUMENT_HISTORY_ACTIONS } from './DocumentHistoryService.js';

export const RETENTION_OPTIONS = Object.freeze([
  '1_YEAR',
  '2_YEARS',
  '5_YEARS',
  '7_YEARS',
  '10_YEARS',
  'PERMANENT'
]);

export class RetentionPolicyService {
  constructor({ repository = documentRepository, historyService = documentHistoryService } = {}) {
    this.repository = repository;
    this.historyService = historyService;
  }

  getPolicy() {
    return this.repository.getRetentionPolicy();
  }

  updatePolicy(patch = {}, actor = {}) {
    const next = {
      ...this.getPolicy(),
      ...patch,
      updatedBy: actor.email || actor.name || 'system',
      updatedAt: new Date().toISOString()
    };
    this.repository.saveRetentionPolicy(next);
    this.historyService.record('SYSTEM', 'RETENTION_POLICY_UPDATE', actor, next);
    return next;
  }

  archiveDocument(documentId, actor = {}, reason = '') {
    const document = this.repository.getDocument(documentId);
    if (!document) return null;
    const archived = {
      ...document,
      status: 'ARCHIVED',
      archiveReason: reason,
      updatedAt: new Date().toISOString()
    };
    this.repository.saveDocument(archived);
    this.historyService.record(documentId, DOCUMENT_HISTORY_ACTIONS.ARCHIVE_DOCUMENT, actor, { reason });
    return archived;
  }

  restoreDocument(documentId, actor = {}, reason = '') {
    const document = this.repository.getDocument(documentId);
    if (!document) return null;
    const restored = {
      ...document,
      status: 'ACTIVE',
      restoreReason: reason,
      updatedAt: new Date().toISOString()
    };
    this.repository.saveDocument(restored);
    this.historyService.record(documentId, DOCUMENT_HISTORY_ACTIONS.RESTORE_DOCUMENT, actor, { reason });
    return restored;
  }
}

export const retentionPolicyService = new RetentionPolicyService();
