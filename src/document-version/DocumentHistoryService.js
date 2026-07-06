import { documentRepository } from './DocumentRepository.js';

export const DOCUMENT_HISTORY_ACTIONS = Object.freeze({
  CREATE_DOCUMENT: 'CREATE_DOCUMENT',
  CREATE_VERSION: 'CREATE_VERSION',
  RESTORE_VERSION: 'RESTORE_VERSION',
  COMMENT_VERSION: 'COMMENT_VERSION',
  DOWNLOAD_VERSION: 'DOWNLOAD_VERSION',
  ARCHIVE_DOCUMENT: 'ARCHIVE_DOCUMENT',
  RESTORE_DOCUMENT: 'RESTORE_DOCUMENT',
  EXPORT_EVIDENCE: 'EXPORT_EVIDENCE'
});

export class DocumentHistoryService {
  constructor({ repository = documentRepository } = {}) {
    this.repository = repository;
  }

  record(documentId, action, actor = {}, payload = {}) {
    return this.repository.appendEvent({
      eventId: `doc-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      documentId,
      action,
      actor: actor.email || actor.name || actor.id || 'system',
      actorRole: actor.role || 'SYSTEM',
      payload,
      createdAt: new Date().toISOString()
    });
  }

  getTimeline(documentId) {
    return this.repository.listEvents(documentId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
}

export const documentHistoryService = new DocumentHistoryService();
