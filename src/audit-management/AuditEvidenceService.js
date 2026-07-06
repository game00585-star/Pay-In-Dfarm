import { auditRepository } from './AuditRepository.js';

export const AUDIT_EVIDENCE_TYPES = Object.freeze(['IMAGE', 'PDF', 'EXCEL', 'VIDEO', 'ZIP', 'DOCUMENT_VERSION']);

export class AuditEvidenceService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  list(sourceId = '') {
    const evidence = this.repository.list('evidence');
    return sourceId ? evidence.filter((item) => item.auditCaseId === sourceId || item.findingId === sourceId || item.actionId === sourceId) : evidence;
  }

  attach(input = {}, actor = {}) {
    const saved = {
      evidenceId: input.evidenceId || `AE-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      auditCaseId: input.auditCaseId || '',
      findingId: input.findingId || '',
      actionId: input.actionId || '',
      evidenceType: input.evidenceType || 'IMAGE',
      fileName: input.fileName || '',
      fileSize: Number(input.fileSize || 0),
      sourceDocumentId: input.sourceDocumentId || '',
      evidenceUrl: input.evidenceUrl || '',
      uploadedBy: input.uploadedBy || actor.email || actor.name || 'system',
      uploadedAt: input.uploadedAt || new Date().toISOString(),
      note: input.note || ''
    };
    this.repository.save('evidence', 'evidenceId', saved);
    this.repository.appendHistory(this.history(saved.evidenceId, 'ATTACH_AUDIT_EVIDENCE', actor, saved));
    return saved;
  }

  history(sourceId, action, actor, payload) {
    return {
      historyId: `AUDH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceId,
      action,
      actor: actor.email || actor.name || 'system',
      actorRole: actor.role || 'SYSTEM',
      payload,
      createdAt: new Date().toISOString()
    };
  }
}

export const auditEvidenceService = new AuditEvidenceService();
